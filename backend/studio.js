// Espace artiste (statistiques) et radio SONIMUSIC 24h/24.
//
// La radio n'a besoin d'aucun service payant : le serveur calcule, à partir de l'heure,
// quel titre du catalogue passe en ce moment et à quelle seconde. Tous les auditeurs
// entendent donc la même chose au même moment, comme une vraie radio.

const toId = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Mélange déterministe (même graine => même ordre) pour que tout le monde ait la même grille.
const seededShuffle = (items, seed) => {
  const arr = [...items];
  let s = (seed * 2654435761) >>> 0 || 1;
  const rand = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export function registerStudioRoutes(app, deps) {
  const { pool, authenticateToken, SONG_SELECT, withArtist, rateLimit } = deps;

  // ---------- Radio ----------
  let radioCache = { at: 0, songs: [] };
  const radioSongs = async () => {
    if (Date.now() - radioCache.at < 60 * 1000) return radioCache.songs;
    const r = await pool.query(
      `${SONG_SELECT} WHERE s.status = 'ACCEPTED' AND s.duration > 0 AND NOT COALESCE(s."isForSale", false) AND s."audioFile" IS NOT NULL ORDER BY s.id`
    );
    radioCache = { at: Date.now(), songs: r.rows.map(withArtist) };
    return radioCache.songs;
  };

  const radioLimiter = rateLimit({ name: 'radio', windowMs: 60 * 1000, max: 60 });

  app.get('/api/radio/now', radioLimiter, async (req, res) => {
    try {
      const songs = await radioSongs();
      if (songs.length === 0) return res.json({ live: false, current: null, next: [] });
      const total = songs.reduce((sum, s) => sum + Number(s.duration), 0);
      const nowSec = Date.now() / 1000;
      const cycle = Math.floor(nowSec / total);
      let offset = nowSec - cycle * total;
      const order = seededShuffle(songs, cycle + 1);
      let index = 0;
      while (index < order.length && offset >= Number(order[index].duration)) {
        offset -= Number(order[index].duration);
        index += 1;
      }
      if (index >= order.length) { index = 0; offset = 0; }
      const current = order[index];
      const next = [];
      for (let k = 1; k <= 3 && k < order.length; k += 1) next.push(order[(index + k) % order.length]);
      res.set('Cache-Control', 'no-store');
      res.json({
        live: true,
        serverTime: Date.now(),
        current,
        position: Math.round(offset * 10) / 10,
        remaining: Math.max(0, Math.round((Number(current.duration) - offset) * 10) / 10),
        next,
        listeners: null,
      });
    } catch (error) {
      console.error('Erreur radio:', error.message);
      res.status(500).json({ error: 'Radio indisponible' });
    }
  });

  // ---------- Statistiques de l'espace artiste ----------
  const canUseStudio = async (userId) => {
    const r = await pool.query('SELECT role FROM "User" WHERE id = $1', [userId]);
    return ['ARTIST', 'LABEL', 'ADMIN'].includes(r.rows[0]?.role);
  };

  app.get('/api/studio/stats', authenticateToken, async (req, res) => {
    try {
      const me = toId(req.user?.id);
      if (!me || !(await canUseStudio(me))) return res.status(403).json({ error: 'Réservé aux artistes et labels' });

      const totals = await pool.query(
        `SELECT
           (SELECT COALESCE(SUM(plays),0) FROM "Song" WHERE "artistId" = $1 AND status = 'ACCEPTED') AS plays,
           (SELECT COUNT(*) FROM "Play" p JOIN "Song" s ON s.id = p."songId" WHERE s."artistId" = $1 AND p."createdAt" > NOW() - interval '30 days') AS "plays30",
           (SELECT COUNT(DISTINCT p."listenerKey") FROM "Play" p JOIN "Song" s ON s.id = p."songId" WHERE s."artistId" = $1 AND p."createdAt" > NOW() - interval '30 days') AS "listeners30",
           (SELECT COUNT(*) FROM "Favorite" f JOIN "Song" s ON s.id = f."songId" WHERE s."artistId" = $1) AS likes,
           (SELECT COUNT(*) FROM "Comment" c JOIN "Song" s ON s.id = c."songId" WHERE s."artistId" = $1) AS comments,
           (SELECT COUNT(*) FROM "Share" x JOIN "Song" s ON s.id = x."songId" WHERE s."artistId" = $1) AS shares,
           (SELECT COUNT(*) FROM "Follow" WHERE "artistId" = $1) AS followers,
           (SELECT COUNT(*) FROM "Follow" WHERE "artistId" = $1 AND "createdAt" > NOW() - interval '30 days') AS "newFollowers30"`,
        [me]
      );

      const daily = await pool.query(
        `SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(c.n, 0) AS plays
         FROM generate_series(CURRENT_DATE - interval '29 days', CURRENT_DATE, interval '1 day') d
         LEFT JOIN (
           SELECT p."createdAt"::date AS day, COUNT(*) AS n FROM "Play" p JOIN "Song" s ON s.id = p."songId"
           WHERE s."artistId" = $1 AND p."createdAt" > CURRENT_DATE - interval '30 days' GROUP BY 1
         ) c ON c.day = d::date
         ORDER BY d`,
        [me]
      );

      const songs = await pool.query(
        `SELECT s.id, s.title, s.status, s.plays, s."coverArt", s."rejectionReason", s."createdAt", s.duration,
           (SELECT COUNT(*) FROM "Favorite" f WHERE f."songId" = s.id) AS likes,
           (SELECT COUNT(*) FROM "Comment" c WHERE c."songId" = s.id) AS comments,
           (SELECT COUNT(*) FROM "Share" x WHERE x."songId" = s.id) AS shares,
           (SELECT COUNT(*) FROM "Play" p WHERE p."songId" = s.id AND p."createdAt" > NOW() - interval '30 days') AS "plays30"
         FROM "Song" s WHERE s."artistId" = $1 ORDER BY s."createdAt" DESC, s.id DESC`,
        [me]
      );

      const t = totals.rows[0];
      const num = (v) => Number(v) || 0;
      res.json({
        totals: {
          plays: num(t.plays), plays30: num(t.plays30), listeners30: num(t.listeners30), likes: num(t.likes),
          comments: num(t.comments), shares: num(t.shares), followers: num(t.followers), newFollowers30: num(t.newFollowers30),
          songs: songs.rows.length,
          published: songs.rows.filter((s) => s.status === 'ACCEPTED').length,
          pending: songs.rows.filter((s) => s.status === 'PENDING').length,
        },
        daily: daily.rows.map((d) => ({ day: d.day, plays: num(d.plays) })),
        songs: songs.rows.map((s) => ({
          ...s, plays: num(s.plays), likes: num(s.likes), comments: num(s.comments), shares: num(s.shares), plays30: num(s.plays30),
        })),
      });
    } catch (error) {
      console.error('Erreur statistiques artiste:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
}
