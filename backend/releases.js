// Publication de musique : envois sécurisés, contrôles automatiques,
// validation par l'équipe, avertissements et diffusion protégée.
import crypto from 'crypto';
import {
  storageConfigured, buckets, presign, publicUrl, headObject, readRange, deleteObject, putStream,
} from './s3.js';
import {
  parseAudioHeader, auditAudio, parseImageHeader, auditCover, isValidGtin, isValidIsrc, normalizeIsrc,
} from './media.js';

export const RELEASES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Upload" (
  id             SERIAL PRIMARY KEY,
  "userId"       INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  bucket         TEXT NOT NULL,
  key            TEXT NOT NULL UNIQUE,
  "originalName" TEXT,
  mime           TEXT,
  size           BIGINT,
  status         TEXT NOT NULL DEFAULT 'PENDING',
  meta           JSONB,
  checks         JSONB,
  sha256         TEXT,
  fingerprint    JSONB,
  "expiresAt"    TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS "Upload_user_idx" ON "Upload" ("userId");
CREATE INDEX IF NOT EXISTS "Upload_sha_idx" ON "Upload" (sha256);

CREATE TABLE IF NOT EXISTS "Release" (
  id                SERIAL PRIMARY KEY,
  ref               TEXT UNIQUE,
  "artistId"        INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  mode              TEXT NOT NULL,
  kind              TEXT NOT NULL,
  title             TEXT NOT NULL,
  "primaryArtist"   TEXT,
  featuring         TEXT,
  genre             TEXT,
  language          TEXT,
  "releaseDate"     DATE,
  description       TEXT,
  explicit          BOOLEAN NOT NULL DEFAULT false,
  "coverUploadId"   INTEGER REFERENCES "Upload"(id) ON DELETE SET NULL,
  "coverUrl"        TEXT,
  upc               TEXT,
  price             INTEGER,
  "beatSource"      TEXT,
  "beatProducer"    TEXT,
  "beatLicense"     TEXT,
  "noteToTeam"      TEXT,
  proofs            JSONB NOT NULL DEFAULT '[]'::jsonb,
  declarations      JSONB,
  checks            JSONB,
  status            TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewReasons"   JSONB,
  "rejectionReason" TEXT,
  "reviewedBy"      INTEGER,
  "reviewedAt"      TIMESTAMPTZ,
  "submittedIp"     TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Release_artist_idx" ON "Release" ("artistId");
CREATE INDEX IF NOT EXISTS "Release_status_idx" ON "Release" (status);

CREATE TABLE IF NOT EXISTS "ReleaseTrack" (
  id                SERIAL PRIMARY KEY,
  "releaseId"       INTEGER NOT NULL REFERENCES "Release"(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  title             TEXT NOT NULL,
  featuring         TEXT,
  isrc              TEXT,
  explicit          BOOLEAN NOT NULL DEFAULT false,
  "audioUploadId"   INTEGER REFERENCES "Upload"(id) ON DELETE SET NULL,
  "previewUploadId" INTEGER REFERENCES "Upload"(id) ON DELETE SET NULL,
  duration          INTEGER,
  credits           JSONB,
  "songId"          INTEGER REFERENCES "Song"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "ReleaseTrack_release_idx" ON "ReleaseTrack" ("releaseId");
CREATE INDEX IF NOT EXISTS "ReleaseTrack_song_idx" ON "ReleaseTrack" ("songId");

CREATE TABLE IF NOT EXISTS "Strike" (
  id          SERIAL PRIMARY KEY,
  "userId"    INTEGER NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "releaseId" INTEGER REFERENCES "Release"(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);
CREATE INDEX IF NOT EXISTS "Strike_user_idx" ON "Strike" ("userId");

ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "releaseId" INTEGER;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "isForSale" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS price INTEGER;
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS explicit BOOLEAN NOT NULL DEFAULT false;
`;

// Limites par type de fichier.
const UPLOAD_RULES = {
  audio: { max: 250 * 1024 * 1024, ext: ['mp3', 'wav', 'flac'], bucket: 'private' },
  preview: { max: 15 * 1024 * 1024, ext: ['wav', 'mp3'], bucket: 'private' },
  cover: { max: 10 * 1024 * 1024, ext: ['jpg', 'jpeg', 'png'], bucket: 'public' },
  proof: { max: 10 * 1024 * 1024, ext: ['jpg', 'jpeg', 'png', 'webp', 'pdf'], bucket: 'private' },
};

const MIME_BY_EXT = {
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', webp: 'image/webp', pdf: 'application/pdf',
};

const MAX_ACTIVE_STRIKES = 3;
const KIND_TRACKS = { SINGLE: [1, 3], EP: [2, 7], ALBUM: [6, 30] };
const BEAT_SOURCES = ['own', 'exclusive', 'lease', 'free'];
const REQUIRED_DECLARATIONS = {
  FREE: ['rights', 'samples', 'terms', 'accuracy'],
  SALE: ['rights', 'samples', 'terms', 'accuracy', 'commission', 'beat'],
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const toInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Similarité entre deux empreintes (enveloppes d'énergie normalisées).
const correlation = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  const n = Math.min(a.length, b.length);
  if (n < 16) return 0;
  let ma = 0; let mb = 0;
  for (let i = 0; i < n; i += 1) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] - ma; const y = b[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
};

const sanitizeFingerprint = (fp) => (Array.isArray(fp)
  ? fp.slice(0, 256).map((v) => Math.round(Math.max(0, Math.min(1000, Number(v) || 0))))
  : null);

export function registerReleaseRoutes(app, deps) {
  const {
    pool, authenticateToken, rateLimit, sendEmail, escapeHtml, supportEmail, frontendUrl, publicApiUrl,
  } = deps;

  const uploadLimiter = rateLimit({ name: 'upload-sign', windowMs: 60 * 60 * 1000, max: 80 });
  const submitLimiter = rateLimit({ name: 'release-submit', windowMs: 60 * 60 * 1000, max: 10 });
  const streamLimiter = rateLimit({ name: 'stream', windowMs: 60 * 1000, max: 120 });

  const getUser = async (id) => (await pool.query(
    'SELECT id, email, name, role, "artistName", "emailVerified" FROM "User" WHERE id = $1', [id],
  )).rows[0];

  const requireCreator = async (req, res, next) => {
    try {
      const u = await getUser(req.user?.id);
      if (!u) return res.status(401).json({ error: 'Compte introuvable' });
      if (!['ARTIST', 'LABEL', 'ADMIN'].includes(u.role)) {
        return res.status(403).json({ error: 'La publication est réservée aux comptes Artiste ou Label.' });
      }
      if (!u.emailVerified && u.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Confirme ton adresse e-mail avant de publier.' });
      }
      req.creator = u;
      next();
    } catch (e) {
      console.error('Erreur vérification créateur:', e.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };

  const requireAdmin = async (req, res, next) => {
    try {
      const u = await getUser(req.user?.id);
      if (u?.role !== 'ADMIN') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      req.admin = u;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };

  const requireStorage = (req, res, next) => {
    if (!storageConfigured()) return res.status(503).json({ error: 'Le stockage des fichiers est momentanément indisponible.' });
    next();
  };

  const activeStrikes = async (userId) => Number((await pool.query(
    'SELECT COUNT(*)::int AS n FROM "Strike" WHERE "userId" = $1 AND "expiresAt" > NOW()', [userId],
  )).rows[0].n);

  const notify = (userId, title, message, type = 'release') => pool.query(
    'INSERT INTO "Notification" ("userId", type, title, message) VALUES ($1, $2, $3, $4)', [userId, type, title, message],
  ).catch(() => {});

  const emailLayout = (title, body) => `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
      <h2 style="color:#b45309;margin:0 0 16px">${title}</h2>${body}
      <p style="margin-top:28px;color:#666;font-size:12px">SONIMUSIC — ${escapeHtml(frontendUrl)}</p>
    </div>`;

  // ------------------------------------------------------------
  // 1. Demande d'envoi : le serveur choisit l'emplacement du fichier.
  // ------------------------------------------------------------
  app.post('/api/uploads/sign', authenticateToken, uploadLimiter, requireStorage, requireCreator, async (req, res) => {
    try {
      const kind = str(req.body?.kind, 20);
      const rule = UPLOAD_RULES[kind];
      if (!rule) return res.status(400).json({ error: 'Type de fichier inconnu' });
      const fileName = str(req.body?.fileName, 200) || 'fichier';
      const ext = (fileName.split('.').pop() || '').toLowerCase();
      if (!rule.ext.includes(ext)) {
        return res.status(400).json({ error: `Format refusé. Formats acceptés : ${rule.ext.join(', ').toUpperCase()}.` });
      }
      const size = Number(req.body?.size);
      if (!Number.isFinite(size) || size <= 0) return res.status(400).json({ error: 'Taille de fichier invalide' });
      if (size > rule.max) return res.status(400).json({ error: `Fichier trop lourd (${Math.round(rule.max / 1024 / 1024)} Mo maximum).` });

      const pending = await pool.query(
        `SELECT COUNT(*)::int AS n FROM "Upload" WHERE "userId" = $1 AND status IN ('PENDING','READY') AND "createdAt" > NOW() - INTERVAL '24 hours'`,
        [req.creator.id],
      );
      if (pending.rows[0].n >= 120) return res.status(429).json({ error: 'Trop de fichiers en attente. Termine ou supprime tes envois en cours.' });

      const bucket = buckets()[rule.bucket];
      const key = `u${req.creator.id}/${kind}/${new Date().toISOString().slice(0, 7)}/${crypto.randomBytes(16).toString('hex')}.${ext}`;
      const mime = MIME_BY_EXT[ext];
      const { rows } = await pool.query(
        `INSERT INTO "Upload" ("userId", kind, bucket, key, "originalName", mime, size) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [req.creator.id, kind, bucket, key, fileName, mime, size],
      );
      res.json({
        uploadId: rows[0].id,
        putUrl: presign({ method: 'PUT', bucket, key, expires: 3600 }),
        proxyUrl: `/api/uploads/${rows[0].id}/data`,
        contentType: mime,
      });
    } catch (e) {
      console.error('Erreur préparation envoi:', e.message);
      res.status(500).json({ error: "Impossible de préparer l'envoi" });
    }
  });

  // Envoi de secours via le serveur (si l'envoi direct est bloqué par le navigateur).
  app.put('/api/uploads/:id/data', authenticateToken, requireStorage, async (req, res) => {
    try {
      const id = toInt(req.params.id);
      const { rows } = await pool.query('SELECT * FROM "Upload" WHERE id = $1 AND "userId" = $2', [id, req.user.id]);
      const up = rows[0];
      if (!up || up.status !== 'PENDING') return res.status(404).json({ error: 'Envoi introuvable' });
      const len = Number(req.headers['content-length']);
      const rule = UPLOAD_RULES[up.kind];
      if (!Number.isFinite(len) || len <= 0 || len > rule.max) return res.status(413).json({ error: 'Fichier trop lourd' });
      await putStream(up.bucket, up.key, req, { contentType: up.mime, contentLength: len });
      res.json({ success: true });
    } catch (e) {
      console.error('Erreur envoi via serveur:', e.message);
      if (!res.headersSent) res.status(502).json({ error: "L'envoi a échoué" });
    }
  });

  // ------------------------------------------------------------
  // 2. Fin d'envoi : vérification réelle du fichier côté serveur.
  // ------------------------------------------------------------
  app.post('/api/uploads/:id/complete', authenticateToken, requireStorage, async (req, res) => {
    try {
      const id = toInt(req.params.id);
      const { rows } = await pool.query('SELECT * FROM "Upload" WHERE id = $1 AND "userId" = $2', [id, req.user.id]);
      const up = rows[0];
      if (!up || !['PENDING', 'READY'].includes(up.status)) return res.status(404).json({ error: 'Envoi introuvable' });

      const head = await headObject(up.bucket, up.key);
      if (!head) return res.status(400).json({ error: "Le fichier n'a pas été reçu. Réessaie l'envoi." });
      const rule = UPLOAD_RULES[up.kind];
      const errors = [];
      const warnings = [];
      let meta = null;

      if (head.size > rule.max) errors.push('Fichier trop lourd.');
      const header = await readRange(up.bucket, up.key, 65536);

      if (up.kind === 'audio' || up.kind === 'preview') {
        meta = parseAudioHeader(header, head.size);
        if (up.kind === 'audio') {
          const a = auditAudio(meta, head.size);
          errors.push(...a.errors); warnings.push(...a.warnings);
          // Contrôles fins réalisés par le navigateur (silence, saturation, volume) : à titre indicatif.
          const c = req.body?.clientChecks || {};
          if (Number(c.silenceStart) > 5) warnings.push(`Silence de ${Math.round(c.silenceStart)} s au début.`);
          if (Number(c.silenceEnd) > 10) warnings.push(`Silence de ${Math.round(c.silenceEnd)} s à la fin.`);
          if (Number(c.clippingRatio) > 0.001) warnings.push('Saturation détectée (le son « grésille » par endroits).');
          if (Number.isFinite(Number(c.loudness)) && Number(c.loudness) < -30) warnings.push('Volume très faible.');
          if (c.silent === true) errors.push('Le fichier ne contient que du silence.');
        } else if (!meta) {
          errors.push("L'extrait n'est pas un fichier audio valide.");
        } else if (meta.duration && (meta.duration < 15 || meta.duration > 65)) {
          errors.push("L'extrait doit durer entre 15 et 60 secondes.");
        }
      } else if (up.kind === 'cover') {
        meta = parseImageHeader(header);
        const c = auditCover(meta, head.size);
        errors.push(...c.errors); warnings.push(...c.warnings);
        if (req.body?.clientChecks?.blurry === true) warnings.push('La pochette semble floue ou pixelisée.');
      } else if (up.kind === 'proof') {
        meta = parseImageHeader(header);
        if (!meta || !['jpeg', 'png', 'webp', 'pdf'].includes(meta.format)) errors.push('Justificatif invalide : image ou PDF uniquement.');
      }

      // Détection de doublons (même fichier ou même enregistrement déjà au catalogue).
      const duplicates = [];
      const sha256 = /^[a-f0-9]{64}$/.test(req.body?.sha256 || '') ? req.body.sha256 : null;
      const fingerprint = up.kind === 'audio' ? sanitizeFingerprint(req.body?.fingerprint) : null;
      if (up.kind === 'audio') {
        if (sha256) {
          const same = await pool.query(
            `SELECT u."userId", rt."songId", s.title FROM "Upload" u
               JOIN "ReleaseTrack" rt ON rt."audioUploadId" = u.id
               LEFT JOIN "Song" s ON s.id = rt."songId"
             WHERE u.sha256 = $1 AND u.id <> $2 AND u.status = 'ATTACHED' LIMIT 3`, [sha256, up.id],
          );
          same.rows.forEach((r) => duplicates.push({ songId: r.songId, title: r.title, sameOwner: r.userId === up.userId, exact: true }));
        }
        if (fingerprint && meta?.duration) {
          const cands = await pool.query(
            `SELECT u."userId", u.fingerprint, rt."songId", s.title, rt.duration FROM "Upload" u
               JOIN "ReleaseTrack" rt ON rt."audioUploadId" = u.id
               LEFT JOIN "Song" s ON s.id = rt."songId"
             WHERE u.status = 'ATTACHED' AND u.fingerprint IS NOT NULL AND u.id <> $1
               AND rt.duration BETWEEN $2 AND $3 LIMIT 500`,
            [up.id, Math.floor(meta.duration) - 3, Math.ceil(meta.duration) + 3],
          );
          cands.rows.forEach((r) => {
            if (duplicates.some((d) => d.songId === r.songId)) return;
            if (correlation(fingerprint, r.fingerprint) > 0.96) {
              duplicates.push({ songId: r.songId, title: r.title, sameOwner: r.userId === up.userId, exact: false });
            }
          });
        }
        duplicates.forEach((d) => {
          if (d.sameOwner) warnings.push(`Ce son ressemble à un de tes titres déjà publiés${d.title ? ` (« ${d.title} »)` : ''}.`);
          else warnings.push('Ce son correspond à un titre déjà publié par un autre compte : il sera vérifié par l’équipe.');
        });
      }

      const status = errors.length ? 'REJECTED' : 'READY';
      await pool.query(
        `UPDATE "Upload" SET status = $1, size = $2, meta = $3, checks = $4, sha256 = $5, fingerprint = $6 WHERE id = $7`,
        [status, head.size, meta ? JSON.stringify(meta) : null, JSON.stringify({ errors, warnings, duplicates }),
          sha256, fingerprint ? JSON.stringify(fingerprint) : null, up.id],
      );
      if (errors.length) deleteObject(up.bucket, up.key).catch(() => {});
      res.json({
        uploadId: up.id, ok: !errors.length, meta, errors, warnings, duplicates: duplicates.length,
        url: up.kind === 'cover' && !errors.length ? `${publicApiUrl}/api/media/${up.id}` : undefined,
      });
    } catch (e) {
      console.error('Erreur vérification fichier:', e.message);
      res.status(500).json({ error: 'Vérification impossible pour le moment. Réessaie.' });
    }
  });

  // Pochettes (bucket public) : redirection vers l'adresse publique.
  app.get('/api/media/:id', async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(404).end();
    try {
      const { rows } = await pool.query(`SELECT bucket, key, kind, status FROM "Upload" WHERE id = $1`, [id]);
      const up = rows[0];
      if (!up || up.kind !== 'cover' || up.status === 'DELETED') return res.status(404).end();
      res.set('Cache-Control', 'public, max-age=86400');
      res.redirect(302, publicUrl(up.key));
    } catch {
      res.status(500).end();
    }
  });

  // ------------------------------------------------------------
  // 3. Soumission d'une sortie (single, EP, album ; gratuit ou à vendre).
  // ------------------------------------------------------------
  app.post('/api/releases', authenticateToken, submitLimiter, requireStorage, requireCreator, async (req, res) => {
    const b = req.body || {};
    const userId = req.creator.id;
    try {
      const strikes = await activeStrikes(userId);
      if (strikes >= MAX_ACTIVE_STRIKES) {
        return res.status(403).json({ error: `Ton compte a ${strikes} avertissements actifs : la publication est suspendue. Contacte le service client.` });
      }

      const mode = b.mode === 'SALE' ? 'SALE' : b.mode === 'FREE' ? 'FREE' : null;
      const kind = ['SINGLE', 'EP', 'ALBUM'].includes(b.kind) ? b.kind : null;
      if (!mode || !kind) return res.status(400).json({ error: 'Choisis le type de sortie (gratuit ou à vendre ; single, EP ou album).' });
      const title = str(b.title, 120);
      if (title.length < 1) return res.status(400).json({ error: 'Le titre est obligatoire.' });
      const primaryArtist = str(b.primaryArtist, 100) || req.creator.artistName || req.creator.name;
      const genre = str(b.genre, 50);
      if (!genre) return res.status(400).json({ error: 'Choisis un genre.' });
      const language = str(b.language, 40);
      const description = str(b.description, 2000);
      const featuring = str(b.featuring, 200);
      const explicit = b.explicit === true;
      let releaseDate = null;
      if (b.releaseDate) {
        const d = new Date(b.releaseDate);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Date de sortie invalide.' });
        releaseDate = d.toISOString().slice(0, 10);
      }
      const upc = str(b.upc, 13).replace(/\s/g, '');
      if (upc && !isValidGtin(upc)) return res.status(400).json({ error: 'Code UPC/EAN invalide (vérifie les chiffres).' });

      // Déclarations obligatoires.
      const decl = b.declarations || {};
      const missing = REQUIRED_DECLARATIONS[mode].filter((k) => decl[k] !== true);
      if (missing.length) return res.status(400).json({ error: 'Coche toutes les déclarations obligatoires avant de publier.' });

      // Champs propres à la vente.
      let price = null; let beatSource = null; let beatProducer = ''; let beatLicense = '';
      if (mode === 'SALE') {
        price = Number(b.price);
        if (!Number.isInteger(price) || price < 200 || price > 1000000) return res.status(400).json({ error: 'Prix invalide (entre 200 et 1 000 000 FCFA).' });
        beatSource = BEAT_SOURCES.includes(b.beatSource) ? b.beatSource : null;
        if (!beatSource) return res.status(400).json({ error: "Indique l'origine de la production (beat)." });
        beatProducer = str(b.beatProducer, 120);
        beatLicense = str(b.beatLicense, 500);
        if (beatSource !== 'own' && !beatProducer) return res.status(400).json({ error: 'Indique le nom du beatmaker ou producteur.' });
      }

      // Pistes.
      const tracksIn = Array.isArray(b.tracks) ? b.tracks : [];
      const [minT, maxT] = KIND_TRACKS[kind];
      if (tracksIn.length < minT || tracksIn.length > maxT) {
        return res.status(400).json({ error: `Un ${kind === 'SINGLE' ? 'single' : kind === 'EP' ? 'EP' : 'album'} contient entre ${minT} et ${maxT} titres.` });
      }

      // Vérifie que chaque fichier appartient à l'artiste et a passé les contrôles.
      const ids = new Set();
      const uploadIds = [toInt(b.coverUploadId), ...tracksIn.flatMap((t) => [toInt(t.audioUploadId), toInt(t.previewUploadId)]),
        ...(Array.isArray(b.proofUploadIds) ? b.proofUploadIds.slice(0, 8).map(toInt) : [])].filter(Boolean);
      uploadIds.forEach((i) => ids.add(i));
      const ups = ids.size ? (await pool.query('SELECT * FROM "Upload" WHERE id = ANY($1::int[]) AND "userId" = $2', [[...ids], userId])).rows : [];
      const byId = new Map(ups.map((u) => [u.id, u]));
      const usable = (id, kindWanted) => {
        const u = byId.get(id);
        return u && u.kind === kindWanted && u.status === 'READY' ? u : null;
      };

      const cover = usable(toInt(b.coverUploadId), 'cover');
      if (!cover) return res.status(400).json({ error: 'Ajoute une pochette conforme.' });

      const reviewReasons = [];
      if (mode === 'SALE') reviewReasons.push('Projet à vendre : vérification complète obligatoire.');
      if (cover.checks?.warnings?.length) reviewReasons.push(...cover.checks.warnings.map((w) => `Pochette : ${w}`));

      const tracks = [];
      const seenAudio = new Set();
      for (let i = 0; i < tracksIn.length; i += 1) {
        const t = tracksIn[i] || {};
        const audio = usable(toInt(t.audioUploadId), 'audio');
        if (!audio || seenAudio.has(audio.id)) return res.status(400).json({ error: `Titre ${i + 1} : fichier audio manquant ou non conforme.` });
        seenAudio.add(audio.id);
        const tTitle = str(t.title, 120);
        if (!tTitle) return res.status(400).json({ error: `Titre ${i + 1} : indique le nom du morceau.` });
        const isrc = t.isrc ? normalizeIsrc(t.isrc) : '';
        if (isrc && !isValidIsrc(isrc)) return res.status(400).json({ error: `Titre ${i + 1} : code ISRC invalide (format CC-XXX-AA-NNNNN).` });
        let preview = null;
        if (mode === 'SALE') {
          preview = usable(toInt(t.previewUploadId), 'preview');
          if (!preview) return res.status(400).json({ error: `Titre ${i + 1} : l'extrait d'écoute n'a pas été préparé.` });
        }
        const credits = {
          composer: str(t.credits?.composer, 200), lyricist: str(t.credits?.lyricist, 200),
          producer: str(t.credits?.producer, 200), performers: str(t.credits?.performers, 300),
        };
        if (!credits.composer || !credits.producer) return res.status(400).json({ error: `Titre ${i + 1} : indique au moins le compositeur et le producteur.` });
        const dup = audio.checks?.duplicates || [];
        if (dup.some((d) => !d.sameOwner)) reviewReasons.push(`Titre ${i + 1} : correspond à un titre d'un autre compte.`);
        if (audio.checks?.warnings?.length && mode === 'FREE') {
          // Les simples avertissements de qualité n'empêchent pas la mise en ligne d'un titre gratuit.
        }
        tracks.push({
          position: i + 1, title: tTitle, featuring: str(t.featuring, 200), isrc, explicit: t.explicit === true || explicit,
          audio, preview, credits, duration: Math.round(Number(audio.meta?.duration) || 0),
        });
      }

      const proofs = (Array.isArray(b.proofUploadIds) ? b.proofUploadIds.slice(0, 8) : [])
        .map((i) => usable(toInt(i), 'proof')).filter(Boolean);
      if (mode === 'SALE' && beatSource !== 'own' && proofs.length === 0) {
        return res.status(400).json({ error: 'Ajoute une preuve de licence du beat (contrat, reçu ou capture).' });
      }
      const noteToTeam = str(b.noteToTeam, 3000);

      const publishNow = mode === 'FREE' && reviewReasons.length === 0;
      const status = publishNow ? 'PUBLISHED' : 'PENDING_REVIEW';
      const songStatus = publishNow ? 'ACCEPTED' : 'PENDING';
      const coverUrl = `${publicApiUrl}/api/media/${cover.id}`;

      const client = await pool.connect();
      let release;
      try {
        await client.query('BEGIN');
        // Verrouille les fichiers pour empêcher une double utilisation.
        const lock = await client.query(
          `UPDATE "Upload" SET status = 'ATTACHED' WHERE id = ANY($1::int[]) AND status = 'READY' AND "userId" = $2 RETURNING id`,
          [[cover.id, ...tracks.flatMap((t) => [t.audio.id, t.preview?.id].filter(Boolean)), ...proofs.map((p) => p.id)], userId],
        );
        const expected = 1 + tracks.reduce((n, t) => n + (t.preview ? 2 : 1), 0) + proofs.length;
        if (lock.rowCount !== expected) throw Object.assign(new Error('conflict'), { http: 409 });

        const r = await client.query(
          `INSERT INTO "Release" ("artistId", mode, kind, title, "primaryArtist", featuring, genre, language, "releaseDate", description,
             explicit, "coverUploadId", "coverUrl", upc, price, "beatSource", "beatProducer", "beatLicense", "noteToTeam", proofs,
             declarations, status, "reviewReasons", "submittedIp", "reviewedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING *`,
          [userId, mode, kind, title, primaryArtist, featuring, genre, language, releaseDate, description, explicit, cover.id, coverUrl,
            upc || null, price, beatSource, beatProducer, beatLicense, noteToTeam, JSON.stringify(proofs.map((p) => p.id)),
            JSON.stringify({ ...Object.fromEntries(REQUIRED_DECLARATIONS[mode].map((k) => [k, true])), acceptedAt: new Date().toISOString() }),
            status, JSON.stringify(reviewReasons), req.ip, publishNow ? new Date() : null],
        );
        release = r.rows[0];
        const ref = `SM-${new Date().getFullYear()}-${String(release.id).padStart(6, '0')}`;
        await client.query('UPDATE "Release" SET ref = $1 WHERE id = $2', [ref, release.id]);
        release.ref = ref;

        for (const t of tracks) {
          const credits = { ...t.credits, featuring: t.featuring, isrc: t.isrc || undefined };
          const s = await client.query(
            `INSERT INTO "Song" (title, genre, description, credits, "coverArt", duration, "artistId", status, "releaseId", "isForSale", price, explicit, "audioFile")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'') RETURNING id`,
            [t.title, genre, description, JSON.stringify(credits), coverUrl, t.duration, userId, songStatus, release.id,
              mode === 'SALE', mode === 'SALE' ? price : null, t.explicit],
          );
          const songId = s.rows[0].id;
          await client.query('UPDATE "Song" SET "audioFile" = $1 WHERE id = $2', [`${publicApiUrl}/api/stream/${songId}`, songId]);
          await client.query(
            `INSERT INTO "ReleaseTrack" ("releaseId", position, title, featuring, isrc, explicit, "audioUploadId", "previewUploadId", duration, credits, "songId")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [release.id, t.position, t.title, t.featuring, t.isrc || null, t.explicit, t.audio.id, t.preview?.id || null, t.duration, JSON.stringify(t.credits), songId],
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        if (e.http === 409) return res.status(409).json({ error: 'Un des fichiers est déjà utilisé dans une autre sortie.' });
        throw e;
      } finally {
        client.release();
      }

      const who = escapeHtml(req.creator.artistName || req.creator.name || '');
      if (publishNow) {
        notify(userId, 'Ta sortie est en ligne', `« ${title} » a passé les contrôles automatiques et est maintenant disponible.`);
        sendEmail({
          to: req.creator.email, subject: `« ${title} » est en ligne sur SONIMUSIC`,
          html: emailLayout('Ta musique est en ligne', `<p>Bonjour ${who},</p><p>« <b>${escapeHtml(title)}</b> » (réf. ${release.ref}) a passé les contrôles automatiques et est maintenant disponible.</p><p>L'équipe peut encore la retirer si un problème de droits est signalé.</p><p><a href="${frontendUrl}/artist-dashboard">Voir mes statistiques</a></p>`),
        }).catch(() => {});
      } else {
        notify(userId, 'Sortie en cours de vérification', `« ${title} » est en cours de vérification par l'équipe (réf. ${release.ref}).`);
        sendEmail({
          to: req.creator.email, subject: `Sortie reçue : « ${title} » (${release.ref})`,
          html: emailLayout('Sortie reçue', `<p>Bonjour ${who},</p><p>Nous avons bien reçu « <b>${escapeHtml(title)}</b> » (réf. ${release.ref}). Notre équipe la vérifie (droits, crédits, qualité). Tu recevras un e-mail dès qu'une décision est prise, en général sous 72 heures.</p>`),
        }).catch(() => {});
        sendEmail({
          to: supportEmail, subject: `[À vérifier] ${release.ref} — ${title} (${mode === 'SALE' ? 'vente' : 'gratuit'})`,
          html: emailLayout('Nouvelle sortie à vérifier', `<p>${who} a soumis « <b>${escapeHtml(title)}</b> » (${kind}, ${mode === 'SALE' ? `à vendre ${price} FCFA` : 'gratuit'}).</p><ul>${reviewReasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul><p><a href="${frontendUrl}/admin/releases/${release.id}">Ouvrir dans l'administration</a></p>`),
        }).catch(() => {});
      }

      res.status(201).json({ success: true, id: release.id, ref: release.ref, status });
    } catch (e) {
      console.error('Erreur soumission sortie:', e.message);
      res.status(500).json({ error: "La publication a échoué. Tes fichiers sont conservés : réessaie dans un instant." });
    }
  });

  // Sorties de l'artiste connecté.
  app.get('/api/releases/mine', authenticateToken, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT r.id, r.ref, r.mode, r.kind, r.title, r.status, r."coverUrl", r.price, r."rejectionReason", r."createdAt", r."reviewedAt",
                (SELECT COUNT(*)::int FROM "ReleaseTrack" t WHERE t."releaseId" = r.id) AS tracks
           FROM "Release" r WHERE r."artistId" = $1 ORDER BY r."createdAt" DESC LIMIT 100`, [req.user.id],
      );
      const strikes = (await pool.query(
        `SELECT reason, "createdAt", "expiresAt" FROM "Strike" WHERE "userId" = $1 AND "expiresAt" > NOW() ORDER BY "createdAt" DESC`, [req.user.id],
      )).rows;
      res.json({ releases: rows, strikes, maxStrikes: MAX_ACTIVE_STRIKES });
    } catch (e) {
      console.error('Erreur sorties artiste:', e.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // ------------------------------------------------------------
  // 4. Diffusion protégée : lien signé de courte durée, extrait seulement pour les titres à vendre.
  // ------------------------------------------------------------
  app.get('/api/stream/:songId', streamLimiter, async (req, res) => {
    try {
      const songId = toInt(req.params.songId);
      if (!songId) return res.status(404).end();
      const { rows } = await pool.query(
        `SELECT s.status, s."isForSale", rt."audioUploadId", rt."previewUploadId"
           FROM "Song" s JOIN "ReleaseTrack" rt ON rt."songId" = s.id WHERE s.id = $1`, [songId],
      );
      const row = rows[0];
      if (!row || row.status !== 'ACCEPTED') return res.status(404).end();
      const upId = row.isForSale ? row.previewUploadId : row.audioUploadId;
      const up = (await pool.query('SELECT bucket, key, mime FROM "Upload" WHERE id = $1', [upId])).rows[0];
      if (!up) return res.status(404).end();
      res.set('Cache-Control', 'private, no-store');
      res.redirect(302, presign({
        method: 'GET', bucket: up.bucket, key: up.key, expires: 4 * 3600,
        query: { 'response-content-type': up.mime || 'audio/mpeg' },
      }));
    } catch (e) {
      console.error('Erreur diffusion:', e.message);
      res.status(500).end();
    }
  });

  // ------------------------------------------------------------
  // 5. Administration : file de validation.
  // ------------------------------------------------------------
  app.get('/api/admin/releases', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const status = ['PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'TAKEN_DOWN'].includes(req.query.status) ? req.query.status : 'PENDING_REVIEW';
      const { rows } = await pool.query(
        `SELECT r.id, r.ref, r.mode, r.kind, r.title, r.status, r."coverUrl", r.price, r."reviewReasons", r."createdAt",
                u.id AS "artistId", COALESCE(u."artistName", u.name) AS "artistName", u.email AS "artistEmail",
                (SELECT COUNT(*)::int FROM "ReleaseTrack" t WHERE t."releaseId" = r.id) AS tracks
           FROM "Release" r JOIN "User" u ON u.id = r."artistId"
          WHERE r.status = $1 ORDER BY r."createdAt" ${status === 'PENDING_REVIEW' ? 'ASC' : 'DESC'} LIMIT 200`, [status],
      );
      const counts = (await pool.query(`SELECT status, COUNT(*)::int AS n FROM "Release" GROUP BY status`)).rows;
      res.json({ releases: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) });
    } catch (e) {
      console.error('Erreur liste admin sorties:', e.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/admin/releases/:id', authenticateToken, requireAdmin, requireStorage, async (req, res) => {
    try {
      const id = toInt(req.params.id);
      const r = (await pool.query(
        `SELECT r.*, COALESCE(u."artistName", u.name) AS "artistName", u.email AS "artistEmail", u."createdAt" AS "artistSince"
           FROM "Release" r JOIN "User" u ON u.id = r."artistId" WHERE r.id = $1`, [id],
      )).rows[0];
      if (!r) return res.status(404).json({ error: 'Sortie introuvable' });
      const tracks = (await pool.query(
        `SELECT t.*, a.meta AS "audioMeta", a.checks AS "audioChecks", a.bucket AS "aBucket", a.key AS "aKey", a."originalName" AS "audioName",
                p.bucket AS "pBucket", p.key AS "pKey"
           FROM "ReleaseTrack" t LEFT JOIN "Upload" a ON a.id = t."audioUploadId" LEFT JOIN "Upload" p ON p.id = t."previewUploadId"
          WHERE t."releaseId" = $1 ORDER BY t.position`, [id],
      )).rows.map(({ aBucket, aKey, pBucket, pKey, ...t }) => ({
        ...t,
        audioUrl: aKey ? presign({ method: 'GET', bucket: aBucket, key: aKey, expires: 3600 }) : null,
        previewUrl: pKey ? presign({ method: 'GET', bucket: pBucket, key: pKey, expires: 3600 }) : null,
      }));
      const proofIds = Array.isArray(r.proofs) ? r.proofs : [];
      const proofs = proofIds.length ? (await pool.query('SELECT id, bucket, key, "originalName", meta FROM "Upload" WHERE id = ANY($1::int[])', [proofIds])).rows
        .map((p) => ({ id: p.id, name: p.originalName, format: p.meta?.format, url: presign({ method: 'GET', bucket: p.bucket, key: p.key, expires: 3600 }) })) : [];
      const cover = r.coverUploadId ? (await pool.query('SELECT meta, checks FROM "Upload" WHERE id = $1', [r.coverUploadId])).rows[0] : null;
      const strikes = await activeStrikes(r.artistId);
      const history = (await pool.query(
        `SELECT status, COUNT(*)::int AS n FROM "Release" WHERE "artistId" = $1 GROUP BY status`, [r.artistId],
      )).rows;
      res.json({ release: r, tracks, proofs, cover, strikes, history });
    } catch (e) {
      console.error('Erreur détail admin sortie:', e.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  const decide = async (req, res, action) => {
    const id = toInt(req.params.id);
    const reason = str(req.body?.reason, 2000);
    const giveStrike = req.body?.strike === true;
    if (action !== 'approve' && reason.length < 10) return res.status(400).json({ error: 'Explique la raison (10 caractères minimum) : elle sera envoyée à l’artiste.' });
    try {
      const r = (await pool.query(
        `SELECT r.*, u.email, COALESCE(u."artistName", u.name) AS who FROM "Release" r JOIN "User" u ON u.id = r."artistId" WHERE r.id = $1`, [id],
      )).rows[0];
      if (!r) return res.status(404).json({ error: 'Sortie introuvable' });
      const allowed = { approve: ['PENDING_REVIEW', 'TAKEN_DOWN'], reject: ['PENDING_REVIEW'], takedown: ['PUBLISHED'] };
      if (!allowed[action].includes(r.status)) return res.status(409).json({ error: 'Cette sortie a déjà été traitée.' });

      const newStatus = { approve: 'PUBLISHED', reject: 'REJECTED', takedown: 'TAKEN_DOWN' }[action];
      const songStatus = action === 'approve' ? 'ACCEPTED' : 'REJECTED';
      await pool.query(
        `UPDATE "Release" SET status = $1, "rejectionReason" = $2, "reviewedBy" = $3, "reviewedAt" = NOW(), "updatedAt" = NOW() WHERE id = $4`,
        [newStatus, action === 'approve' ? null : reason, req.admin.id, id],
      );
      await pool.query(
        `UPDATE "Song" SET status = $1, "isVerified" = $2, "rejectionReason" = $3, "updatedAt" = NOW() WHERE "releaseId" = $4`,
        [songStatus, action === 'approve', action === 'approve' ? null : reason, id],
      );
      if (action === 'reject') {
        // Fichiers d'une sortie refusée : conservés 14 jours (litige éventuel), puis supprimés.
        await pool.query(
          `UPDATE "Upload" SET status = 'ORPHAN', "expiresAt" = NOW() + INTERVAL '14 days'
            WHERE id IN (SELECT "audioUploadId" FROM "ReleaseTrack" WHERE "releaseId" = $1
                         UNION SELECT "previewUploadId" FROM "ReleaseTrack" WHERE "releaseId" = $1
                         UNION SELECT "coverUploadId" FROM "Release" WHERE id = $1
                         UNION SELECT (jsonb_array_elements_text(proofs))::int FROM "Release" WHERE id = $1)`, [id],
        );
      }
      if (giveStrike && action !== 'approve') {
        await pool.query('INSERT INTO "Strike" ("userId", "releaseId", reason, "createdBy") VALUES ($1,$2,$3,$4)', [r.artistId, id, reason, req.admin.id]);
      }
      const strikes = await activeStrikes(r.artistId);
      const t = escapeHtml(r.title);
      const strikeHtml = giveStrike && action !== 'approve'
        ? `<p style="background:#fef2f2;padding:12px;border-radius:8px"><b>Avertissement ${strikes}/${MAX_ACTIVE_STRIKES}</b> ajouté à ton compte (valable 90 jours). À ${MAX_ACTIVE_STRIKES} avertissements, la publication est suspendue.</p>` : '';
      const mail = {
        approve: { subject: `« ${r.title} » est validée et en ligne`, title: 'Sortie validée', body: `<p>Bonjour ${escapeHtml(r.who)},</p><p>Bonne nouvelle : « <b>${t}</b> » (réf. ${r.ref}) a été validée par l'équipe et est maintenant en ligne.</p>` },
        reject: { subject: `« ${r.title} » n'a pas été validée`, title: 'Sortie non validée', body: `<p>Bonjour ${escapeHtml(r.who)},</p><p>« <b>${t}</b> » (réf. ${r.ref}) n'a pas pu être validée pour la raison suivante :</p><blockquote style="border-left:3px solid #b45309;padding-left:12px;color:#333">${escapeHtml(reason).replace(/\n/g, '<br>')}</blockquote>${strikeHtml}<p>Tu peux corriger et soumettre à nouveau. Une question ? <a href="${frontendUrl}/contact">Service client</a>.</p>` },
        takedown: { subject: `« ${r.title} » a été retirée`, title: 'Sortie retirée', body: `<p>Bonjour ${escapeHtml(r.who)},</p><p>« <b>${t}</b> » (réf. ${r.ref}) a été retirée de SONIMUSIC pour la raison suivante :</p><blockquote style="border-left:3px solid #b45309;padding-left:12px;color:#333">${escapeHtml(reason).replace(/\n/g, '<br>')}</blockquote>${strikeHtml}<p>Si tu penses qu'il s'agit d'une erreur, réponds via le <a href="${frontendUrl}/contact?type=droits">service client</a> avec tes preuves.</p>` },
      }[action];
      sendEmail({ to: r.email, subject: mail.subject, html: emailLayout(mail.title, mail.body) }).catch(() => {});
      notify(r.artistId, mail.title, action === 'approve' ? `« ${r.title} » est en ligne.` : `« ${r.title} » : ${reason.slice(0, 180)}`);
      res.json({ success: true, status: newStatus, strikes });
    } catch (e) {
      console.error('Erreur décision sortie:', e.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };

  app.post('/api/admin/releases/:id/approve', authenticateToken, requireAdmin, (req, res) => decide(req, res, 'approve'));
  app.post('/api/admin/releases/:id/reject', authenticateToken, requireAdmin, (req, res) => decide(req, res, 'reject'));
  app.post('/api/admin/releases/:id/takedown', authenticateToken, requireAdmin, (req, res) => decide(req, res, 'takedown'));

  // ------------------------------------------------------------
  // 6. Nettoyage : fichiers envoyés mais jamais utilisés (plus de 24 h).
  // ------------------------------------------------------------
  const cleanup = async () => {
    if (!storageConfigured()) return;
    try {
      const { rows } = await pool.query(
        `SELECT id, bucket, key FROM "Upload" WHERE (status IN ('PENDING','READY','REJECTED') AND "createdAt" < NOW() - INTERVAL '24 hours')
            OR (status = 'ORPHAN' AND "expiresAt" < NOW()) LIMIT 200`,
      );
      for (const u of rows) {
        // eslint-disable-next-line no-await-in-loop
        if (await deleteObject(u.bucket, u.key).catch(() => false)) {
          // eslint-disable-next-line no-await-in-loop
          await pool.query(`UPDATE "Upload" SET status = 'DELETED' WHERE id = $1`, [u.id]);
        }
      }
      if (rows.length) console.log(`🧹 ${rows.length} fichier(s) inutilisé(s) supprimé(s)`);
    } catch (e) {
      console.error('Erreur nettoyage:', e.message);
    }
  };
  setTimeout(cleanup, 60 * 1000);
  setInterval(cleanup, 60 * 60 * 1000).unref();
}
