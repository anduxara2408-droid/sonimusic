// Fonctionnalités communautaires et statistiques : écoutes, j'aime, abonnements,
// partages, recherche, classements et artiste du jour / de la semaine / du mois.
// Tous les compteurs sont calculés côté serveur à partir d'actions authentifiées
// ou dédoublonnées : un client ne peut pas envoyer lui-même un nombre.
import crypto from 'crypto';

export const FEATURES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Play" (
  id          BIGSERIAL PRIMARY KEY,
  "songId"    INTEGER NOT NULL REFERENCES "Song"(id) ON DELETE CASCADE,
  "userId"    INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  "listenerKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Play_song_created_idx" ON "Play" ("songId", "createdAt");
CREATE INDEX IF NOT EXISTS "Play_created_idx" ON "Play" ("createdAt");
CREATE INDEX IF NOT EXISTS "Play_listener_idx" ON "Play" ("listenerKey", "songId", "createdAt");

CREATE TABLE IF NOT EXISTS "Follow" (
  "followerId" INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "artistId"   INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("followerId", "artistId")
);
CREATE INDEX IF NOT EXISTS "Follow_artist_idx" ON "Follow" ("artistId", "createdAt");

CREATE TABLE IF NOT EXISTS "Share" (
  id          BIGSERIAL PRIMARY KEY,
  "songId"    INTEGER NOT NULL REFERENCES "Song"(id) ON DELETE CASCADE,
  "userId"    INTEGER REFERENCES "User"(id) ON DELETE SET NULL,
  "listenerKey" TEXT NOT NULL,
  channel     TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Share_song_idx" ON "Share" ("songId", "createdAt");
CREATE INDEX IF NOT EXISTS "Favorite_song_created_idx" ON "Favorite" ("songId", "createdAt");
`;

const PERIOD_INTERVALS = { day: '1 day', week: '7 days', month: '30 days' };
const SHARE_CHANNELS = ['whatsapp', 'facebook', 'x', 'telegram', 'copy', 'native', 'other'];
const PLAY_DEDUP_MINUTES = 30;

export function registerFeatureRoutes(app, deps) {
  const { pool, authenticateToken, optionalAuth, rateLimit, SONG_SELECT, withArtist, jwtSecret } = deps;

  const toId = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
  };

  // Identifiant d'auditeur : l'utilisateur connecté, sinon un hash de l'IP + navigateur
  // (l'IP brute n'est jamais stockée).
  const listenerKey = (req) => {
    if (req.user?.id) return `u:${req.user.id}`;
    const raw = `${req.ip}|${req.headers['user-agent'] || ''}`;
    return 'a:' + crypto.createHmac('sha256', jwtSecret).update(raw).digest('hex').slice(0, 32);
  };

  const playLimiter = rateLimit({ name: 'play', windowMs: 15 * 60 * 1000, max: 120 });
  const shareLimiter = rateLimit({ name: 'share', windowMs: 15 * 60 * 1000, max: 60 });
  const followLimiter = rateLimit({ name: 'follow', windowMs: 15 * 60 * 1000, max: 100 });
  const searchLimiter = rateLimit({ name: 'search', windowMs: 60 * 1000, max: 60 });

  const songIsPublic = async (songId) => {
    const r = await pool.query(`SELECT id FROM "Song" WHERE id = $1 AND status = 'ACCEPTED'`, [songId]);
    return r.rows.length > 0;
  };

  // ---------- Écoutes ----------
  // Le lecteur appelle cette route après 30 secondes d'écoute réelle.
  // Une même personne n'est comptée qu'une fois par morceau toutes les 30 minutes.
  app.post('/api/songs/:id/play', playLimiter, optionalAuth, async (req, res) => {
    try {
      const songId = toId(req.params.id);
      if (!songId || !(await songIsPublic(songId))) return res.status(404).json({ error: 'Musique non trouvée' });
      const key = listenerKey(req);
      const recent = await pool.query(
        `SELECT 1 FROM "Play" WHERE "listenerKey" = $1 AND "songId" = $2
           AND "createdAt" > NOW() - ($3 || ' minutes')::interval LIMIT 1`,
        [key, songId, String(PLAY_DEDUP_MINUTES)]
      );
      if (recent.rows.length > 0) {
        return res.json({ success: true, counted: false });
      }
      await pool.query(
        `INSERT INTO "Play" ("songId", "userId", "listenerKey") VALUES ($1, $2, $3)`,
        [songId, req.user?.id || null, key]
      );
      const upd = await pool.query(`UPDATE "Song" SET plays = plays + 1 WHERE id = $1 RETURNING plays`, [songId]);
      res.json({ success: true, counted: true, plays: upd.rows[0]?.plays ?? null });
    } catch (error) {
      console.error('Erreur écoute:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ---------- Partages ----------
  app.post('/api/songs/:id/share', shareLimiter, optionalAuth, async (req, res) => {
    try {
      const songId = toId(req.params.id);
      if (!songId || !(await songIsPublic(songId))) return res.status(404).json({ error: 'Musique non trouvée' });
      const channel = SHARE_CHANNELS.includes(req.body?.channel) ? req.body.channel : 'other';
      const key = listenerKey(req);
      // Un partage par personne, morceau et canal toutes les 10 minutes.
      const recent = await pool.query(
        `SELECT 1 FROM "Share" WHERE "listenerKey" = $1 AND "songId" = $2 AND channel = $3
           AND "createdAt" > NOW() - interval '10 minutes' LIMIT 1`,
        [key, songId, channel]
      );
      if (recent.rows.length === 0) {
        await pool.query(
          `INSERT INTO "Share" ("songId", "userId", "listenerKey", channel) VALUES ($1, $2, $3, $4)`,
          [songId, req.user?.id || null, key, channel]
        );
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur partage:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ---------- Statistiques publiques d'un morceau ----------
  app.get('/api/songs/:id/stats', optionalAuth, async (req, res) => {
    try {
      const songId = toId(req.params.id);
      if (!songId || !(await songIsPublic(songId))) return res.status(404).json({ error: 'Musique non trouvée' });
      const r = await pool.query(
        `SELECT
           (SELECT plays FROM "Song" WHERE id = $1) AS plays,
           (SELECT COUNT(*) FROM "Favorite" WHERE "songId" = $1) AS likes,
           (SELECT COUNT(*) FROM "Share" WHERE "songId" = $1) AS shares,
           (SELECT COUNT(*) FROM "Comment" WHERE "songId" = $1) AS comments,
           (SELECT COUNT(DISTINCT "listenerKey") FROM "Play" WHERE "songId" = $1) AS listeners`,
        [songId]
      );
      const row = r.rows[0];
      let liked = false;
      if (req.user?.id) {
        const l = await pool.query(`SELECT 1 FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2`, [req.user.id, songId]);
        liked = l.rows.length > 0;
      }
      res.json({
        plays: Number(row.plays || 0),
        likes: Number(row.likes),
        shares: Number(row.shares),
        comments: Number(row.comments),
        listeners: Number(row.listeners),
        liked
      });
    } catch (error) {
      console.error('Erreur stats morceau:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ---------- Abonnements aux artistes ----------
  app.post('/api/artists/:id/follow', followLimiter, authenticateToken, async (req, res) => {
    try {
      const artistId = toId(req.params.id);
      if (!artistId) return res.status(404).json({ error: 'Artiste non trouvé' });
      if (artistId === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-même' });
      const a = await pool.query(`SELECT id FROM "User" WHERE id = $1 AND role IN ('ARTIST', 'LABEL')`, [artistId]);
      if (a.rows.length === 0) return res.status(404).json({ error: 'Artiste non trouvé' });
      const del = await pool.query(
        `DELETE FROM "Follow" WHERE "followerId" = $1 AND "artistId" = $2 RETURNING 1`,
        [req.user.id, artistId]
      );
      let following = false;
      if (del.rows.length === 0) {
        await pool.query(`INSERT INTO "Follow" ("followerId", "artistId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.user.id, artistId]);
        following = true;
      }
      const c = await pool.query(`SELECT COUNT(*) FROM "Follow" WHERE "artistId" = $1`, [artistId]);
      res.json({ success: true, following, followers: Number(c.rows[0].count) });
    } catch (error) {
      console.error('Erreur abonnement:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/artists/:id/profile', optionalAuth, async (req, res) => {
    try {
      const artistId = toId(req.params.id);
      if (!artistId) return res.status(404).json({ error: 'Artiste non trouvé' });
      const a = await pool.query(
        `SELECT id, name, "artistName", bio, country, "profilePic", role, "createdAt"
         FROM "User" WHERE id = $1 AND role IN ('ARTIST', 'LABEL')`,
        [artistId]
      );
      if (a.rows.length === 0) return res.status(404).json({ error: 'Artiste non trouvé' });
      const songs = await pool.query(`${SONG_SELECT} WHERE s."artistId" = $1 AND s.status = 'ACCEPTED' ORDER BY s."createdAt" DESC, s.id DESC`, [artistId]);
      const stats = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM "Follow" WHERE "artistId" = $1) AS followers,
           (SELECT COALESCE(SUM(plays), 0) FROM "Song" WHERE "artistId" = $1 AND status = 'ACCEPTED') AS plays,
           (SELECT COUNT(*) FROM "Favorite" f JOIN "Song" s ON s.id = f."songId" WHERE s."artistId" = $1) AS likes,
           (SELECT COUNT(DISTINCT p."listenerKey") FROM "Play" p JOIN "Song" s ON s.id = p."songId"
              WHERE s."artistId" = $1 AND p."createdAt" > NOW() - interval '30 days') AS "monthlyListeners"`,
        [artistId]
      );
      let following = false;
      if (req.user?.id) {
        const f = await pool.query(`SELECT 1 FROM "Follow" WHERE "followerId" = $1 AND "artistId" = $2`, [req.user.id, artistId]);
        following = f.rows.length > 0;
      }
      const s = stats.rows[0];
      res.json({
        ...a.rows[0],
        songs: songs.rows.map(withArtist),
        stats: {
          followers: Number(s.followers),
          plays: Number(s.plays),
          likes: Number(s.likes),
          monthlyListeners: Number(s.monthlyListeners),
          totalSongs: songs.rows.length
        },
        following
      });
    } catch (error) {
      console.error('Erreur profil artiste:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/me/following', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT u.id, u.name, u."artistName", u."profilePic"
         FROM "Follow" f JOIN "User" u ON u.id = f."artistId"
         WHERE f."followerId" = $1 ORDER BY f."createdAt" DESC`,
        [req.user.id]
      );
      res.json(r.rows);
    } catch (error) {
      console.error('Erreur abonnements:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Fil d'actualités : nouveautés des artistes suivis.
  app.get('/api/feed', authenticateToken, async (req, res) => {
    try {
      const r = await pool.query(
        `${SONG_SELECT}
         WHERE s.status = 'ACCEPTED' AND s."artistId" IN (SELECT "artistId" FROM "Follow" WHERE "followerId" = $1)
         ORDER BY s."createdAt" DESC, s.id DESC LIMIT 50`,
        [req.user.id]
      );
      res.json(r.rows.map(withArtist));
    } catch (error) {
      console.error('Erreur fil:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ---------- Recherche ----------
  app.get('/api/search', searchLimiter, async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
      if (q.length < 2) return res.json({ songs: [], artists: [] });
      const like = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
      const songs = await pool.query(
        `${SONG_SELECT}
         WHERE s.status = 'ACCEPTED' AND (s.title ILIKE $1 OR u."artistName" ILIKE $1 OR u.name ILIKE $1 OR s.genre ILIKE $1)
         ORDER BY s.plays DESC, s.id DESC LIMIT 30`,
        [like]
      );
      const artists = await pool.query(
        `SELECT id, name, "artistName", "profilePic", country FROM "User"
         WHERE role IN ('ARTIST', 'LABEL') AND ("artistName" ILIKE $1 OR name ILIKE $1)
         ORDER BY id LIMIT 20`,
        [like]
      );
      res.json({ songs: songs.rows.map(withArtist), artists: artists.rows });
    } catch (error) {
      console.error('Erreur recherche:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ---------- Classements automatiques ----------
  const periodOf = (value) => (PERIOD_INTERVALS[value] ? value : 'week');

  // Les plus écoutés sur la période ; à défaut d'écoutes, les plus écoutés depuis toujours.
  app.get('/api/charts/top-songs', async (req, res) => {
    try {
      const period = req.query.period === 'all' ? 'all' : periodOf(req.query.period);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
      let rows = [];
      if (period !== 'all') {
        const r = await pool.query(
          `SELECT x.*, pc.period_plays AS "periodPlays" FROM (
             SELECT "songId", COUNT(*) AS period_plays FROM "Play"
             WHERE "createdAt" > NOW() - $1::interval GROUP BY "songId"
           ) pc
           JOIN LATERAL (${SONG_SELECT} WHERE s.id = pc."songId" AND s.status = 'ACCEPTED') x ON true
           ORDER BY pc.period_plays DESC, x.plays DESC LIMIT $2`,
          [PERIOD_INTERVALS[period], limit]
        );
        rows = r.rows;
      }
      if (rows.length === 0) {
        const r = await pool.query(
          `${SONG_SELECT} WHERE s.status = 'ACCEPTED' ORDER BY s.plays DESC, s."createdAt" DESC, s.id DESC LIMIT $1`,
          [limit]
        );
        rows = r.rows;
      }
      res.json({
        period,
        songs: rows.map((row) => ({ ...withArtist(row), periodPlays: row.periodPlays != null ? Number(row.periodPlays) : null }))
      });
    } catch (error) {
      console.error('Erreur classement:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Score d'un artiste sur la période : écoutes + 3 x j'aime + 5 x nouveaux abonnés + 2 x partages.
  const artistScores = async (period, limit) => {
    const interval = PERIOD_INTERVALS[period];
    const r = await pool.query(
      `WITH a AS (SELECT id, name, "artistName", "profilePic", country FROM "User" WHERE role IN ('ARTIST', 'LABEL')),
       p AS (SELECT s."artistId" AS id, COUNT(*) AS n FROM "Play" pl JOIN "Song" s ON s.id = pl."songId"
             WHERE pl."createdAt" > NOW() - $1::interval AND s.status = 'ACCEPTED' GROUP BY s."artistId"),
       l AS (SELECT s."artistId" AS id, COUNT(*) AS n FROM "Favorite" f JOIN "Song" s ON s.id = f."songId"
             WHERE f."createdAt" > NOW() - $1::interval AND s.status = 'ACCEPTED' GROUP BY s."artistId"),
       f AS (SELECT "artistId" AS id, COUNT(*) AS n FROM "Follow" WHERE "createdAt" > NOW() - $1::interval GROUP BY "artistId"),
       sh AS (SELECT s."artistId" AS id, COUNT(*) AS n FROM "Share" x JOIN "Song" s ON s.id = x."songId"
              WHERE x."createdAt" > NOW() - $1::interval AND s.status = 'ACCEPTED' GROUP BY s."artistId")
       SELECT a.*, COALESCE(p.n,0) AS plays, COALESCE(l.n,0) AS likes, COALESCE(f.n,0) AS "newFollowers", COALESCE(sh.n,0) AS shares,
              COALESCE(p.n,0) + 3*COALESCE(l.n,0) + 5*COALESCE(f.n,0) + 2*COALESCE(sh.n,0) AS score
       FROM a LEFT JOIN p ON p.id = a.id LEFT JOIN l ON l.id = a.id LEFT JOIN f ON f.id = a.id LEFT JOIN sh ON sh.id = a.id
       WHERE COALESCE(p.n,0) + COALESCE(l.n,0) + COALESCE(f.n,0) + COALESCE(sh.n,0) > 0
       ORDER BY score DESC, plays DESC LIMIT $2`,
      [interval, limit]
    );
    return r.rows.map((row) => ({
      ...row,
      plays: Number(row.plays), likes: Number(row.likes), newFollowers: Number(row.newFollowers),
      shares: Number(row.shares), score: Number(row.score)
    }));
  };

  app.get('/api/charts/artists', async (req, res) => {
    try {
      const period = periodOf(req.query.period);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
      res.json({ period, artists: await artistScores(period, limit) });
    } catch (error) {
      console.error('Erreur classement artistes:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Artiste du jour, de la semaine et du mois, calculés automatiquement.
  app.get('/api/charts/highlights', async (req, res) => {
    try {
      const [day, week, month] = await Promise.all([artistScores('day', 1), artistScores('week', 1), artistScores('month', 1)]);
      res.json({ day: day[0] || null, week: week[0] || null, month: month[0] || null });
    } catch (error) {
      console.error('Erreur artistes à la une:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Nouveautés.
  app.get('/api/charts/new', async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
      const r = await pool.query(`${SONG_SELECT} WHERE s.status = 'ACCEPTED' ORDER BY s."createdAt" DESC, s.id DESC LIMIT $1`, [limit]);
      res.json(r.rows.map(withArtist));
    } catch (error) {
      console.error('Erreur nouveautés:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
}
