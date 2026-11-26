import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import pkg from 'pg';
import { ensureSchema } from './db-init.js';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

// Render (et la plupart des hébergeurs) placent l'app derrière un proxy :
// nécessaire pour que req.ip soit la vraie IP du client (limiteur de tentatives).
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ============================================================
// CONFIGURATION
// ============================================================

// Connexion directe à PostgreSQL.
// rejectUnauthorized n'est activé que si DB_SSL_STRICT=true, pour ne pas casser
// la connexion actuelle (certificat non vérifiable côté hébergeur).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DB_SSL_STRICT === 'true' }
});

// Resend : client créé seulement si la clé API est définie.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const EMAIL_FROM = `SONIMUSIC <noreply@${process.env.EMAIL_DOMAIN || 'sonimusic.online'}>`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sonimusic.online';

// Secret JWT : jamais de valeur par défaut dans le code.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('='.repeat(60));
  console.warn('⚠️  JWT_SECRET absent ou trop court (moins de 16 caractères).');
  console.warn('⚠️  Un secret aléatoire TEMPORAIRE a été généré : toutes les sessions');
  console.warn('⚠️  seront invalidées à chaque redémarrage du serveur.');
  console.warn('⚠️  Définissez JWT_SECRET dans les variables d\'environnement.');
  console.warn('='.repeat(60));
}
const JWT_OPTIONS = { algorithm: 'HS256', expiresIn: '7d' };

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, JWT_OPTIONS);

const verifyToken = (token) => jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

// ============================================================
// UTILITAIRES DE VALIDATION
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ['LISTENER', 'ARTIST'];

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const isValidEmail = (email) =>
  typeof email === 'string' && email.length <= 254 && EMAIL_REGEX.test(email);

const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= 8 && password.length <= 72;

const isValidName = (name) =>
  typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;

const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const optionalString = (value, max) => {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== 'string' || value.length > max) return { ok: false };
  return { ok: true, value };
};

const isValidProfilePicUrl = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 500) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true; // chemin relatif
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Le frontend lit song.artist.artistName / song.artist.name : on ajoute cet objet.
const SONG_SELECT = `
  SELECT s.*, u.name as "artistName", u.id as "artistId",
         u."artistName" as "artistDisplayName", u."profilePic" as "artistProfilePic"
  FROM "Song" s LEFT JOIN "User" u ON s."artistId" = u.id`;

const withArtist = (row) => {
  const { artistDisplayName, artistProfilePic, ...song } = row;
  song.artist = song.artistId
    ? { id: song.artistId, name: song.artistName, artistName: artistDisplayName || song.artistName, profilePic: artistProfilePic || null }
    : null;
  return song;
};

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseLikedBy = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn('📧 RESEND_API_KEY non configurée : email non envoyé.');
    return false;
  }
  const { error } = await resend.emails.send({ from: EMAIL_FROM, to: [to], subject, html });
  if (error) {
    console.error('❌ Erreur Resend:', error.message || error.name || 'inconnue');
    return false;
  }
  return true;
};

// ============================================================
// LIMITEUR DE TENTATIVES (en mémoire, par IP)
// ============================================================

const rateLimitStore = new Map();

const rateLimit = ({ name, windowMs, max }) => (req, res, next) => {
  const key = `${name}:${req.ip}`;
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Trop de tentatives. Veuillez réessayer plus tard.' });
  }
  next();
};

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const loginLimiter = rateLimit({ name: 'login', windowMs: FIFTEEN_MIN, max: 20 });
const registerLimiter = rateLimit({ name: 'register', windowMs: ONE_HOUR, max: 10 });
const forgotLimiter = rateLimit({ name: 'forgot', windowMs: ONE_HOUR, max: 5 });
const resetLimiter = rateLimit({ name: 'reset', windowMs: FIFTEEN_MIN, max: 10 });

// ============================================================
// MIDDLEWARE AUTH
// ============================================================

const extractBearer = (req) => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
};

const authenticateToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const token = extractBearer(req);
  try {
    if (!token) throw new Error('missing');
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

// Authentification optionnelle : renseigne req.user si un token valide est fourni.
const optionalAuth = (req, res, next) => {
  const token = extractBearer(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
};

const getDbRole = async (userId) => {
  const id = toPositiveInt(userId);
  if (!id) return null;
  const result = await pool.query('SELECT role FROM "User" WHERE id = $1', [id]);
  return result.rows[0]?.role || null;
};

// Le rôle est vérifié en base, pas seulement dans le token.
const isAdmin = async (req, res, next) => {
  try {
    const role = await getDbRole(req.user?.id);
    if (role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    next();
  } catch (error) {
    console.error('Erreur vérification admin:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// MIDDLEWARES GLOBAUX
// ============================================================

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});

app.use(cors({
  origin: ['https://sonimusic.online', 'http://localhost:5173', 'https://sonimusic-1.onrender.com'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// ============================================================
// ROUTE DE SANTÉ
// ============================================================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'OK', message: 'SONIMUSIC API is running', database: 'connected' });
  } catch (error) {
    console.error('Erreur health check DB:', error.message);
    res.json({ status: 'OK', message: 'SONIMUSIC API is running', database: 'error' });
  }
});

// ============================================================
// ROUTE D'ACCUEIL
// ============================================================
app.get('/', (req, res) => {
  res.json({
    message: 'SONIMUSIC API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login',
      register: '/api/auth/register',
      me: '/api/auth/me',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
      favorites: '/api/favorites/my-favorites',
      playlists: '/api/playlists',
      notifications: '/api/notifications',
      comments: '/api/comments',
      songs: '/api/songs',
      artists: '/api/artists',
      albums: '/api/albums',
      users: '/api/users/:id',
      profile: '/api/users/profile',
      profilePic: '/api/users/profile-pic'
    }
  });
});

// ============================================================
// ROUTES D'AUTHENTIFICATION
// ============================================================

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { name, password, role, artistName, bio, country } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Adresse email invalide' });
    }
    if (!isValidName(name)) {
      return res.status(400).json({ error: 'Le nom doit contenir entre 2 et 100 caractères' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 72 caractères' });
    }
    const artistNameCheck = optionalString(artistName, 100);
    const bioCheck = optionalString(bio, 1000);
    const countryCheck = optionalString(country, 100);
    if (!artistNameCheck.ok || !bioCheck.ok || !countryCheck.ok) {
      return res.status(400).json({ error: 'Champs de profil invalides ou trop longs' });
    }

    // Seuls LISTENER et ARTIST sont acceptés (jamais ADMIN).
    const safeRole = ALLOWED_ROLES.includes(role) ? role : 'LISTENER';
    const cleanName = name.trim();

    const existing = await pool.query('SELECT id FROM "User" WHERE LOWER(email) = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Sans service d'email configuré, impossible de vérifier : le compte est validé directement.
    const needsVerification = Boolean(resend);
    const result = await pool.query(
      `INSERT INTO "User" (email, password, name, role, "artistName", bio, country, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, email, name, role`,
      [email, hashedPassword, cleanName, safeRole, artistNameCheck.value || null, bioCheck.value || null, countryCheck.value || null, !needsVerification]
    );
    const newUser = result.rows[0];

    if (needsVerification) {
      sendVerificationEmail({ ...newUser, name: cleanName }).catch((emailError) => {
        console.error('⚠️ Erreur envoi email de vérification:', emailError.message);
      });
      return res.status(201).json({
        success: true,
        requiresVerification: true,
        message: 'Inscription réussie ! Vérifiez votre boîte mail pour activer votre compte.',
        user: newUser
      });
    }

    const token = signToken(newUser);
    res.status(201).json({ success: true, message: 'Inscription réussie !', token, user: newUser });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// ============================================================
// VÉRIFICATION DE L'ADRESSE EMAIL
// ============================================================

const VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;

// Crée un nouveau lien de vérification (seul le hash est stocké) et l'envoie.
async function sendVerificationEmail(user) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `UPDATE "User" SET "verificationToken" = $1, "verificationTokenExpiry" = $2 WHERE id = $3`,
    [hashResetToken(rawToken), new Date(Date.now() + VERIFICATION_TTL_MS), user.id]
  );
  const verifyUrl = `${FRONTEND_URL}/verify?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
  return sendEmail({
    to: user.email,
    subject: '🎵 Confirmez votre adresse email - SONIMUSIC',
    html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenue sur SONIMUSIC</title>
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #0c0b0a; color: #ffffff; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
              <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                <h1 style="color: #d4af37; font-size: 28px; margin: 0;">🎵 SONIMUSIC</h1>
                <p style="color: #888; margin: 5px 0 0;">La musique Soninké à portée de clic</p>
              </div>
              <div style="padding: 30px 0;">
                <p style="font-size: 16px; line-height: 1.6;">Bonjour <strong style="color: #d4af37;">${escapeHtml(user.name || 'utilisateur')}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #ccc;">Bienvenue sur <strong style="color: #d4af37;">SONIMUSIC</strong> !</p>
                <p style="font-size: 16px; line-height: 1.6; color: #ccc;">Pour activer votre compte, confirmez votre adresse email en cliquant sur le bouton ci-dessous :</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${escapeHtml(verifyUrl)}" style="display: inline-block; padding: 14px 40px; background: #d4af37; color: #000000; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                    ✅ Confirmer mon email
                  </a>
                </div>
                <p style="color: #888; font-size: 14px;">⏳ Ce lien est valable pendant <strong style="color: #d4af37;">48 heures</strong>.</p>
                <p style="color: #888; font-size: 14px;">🔒 Si vous n'avez pas créé de compte, ignorez simplement cet email.</p>
              </div>
              <div style="border-top: 1px solid #333; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2026 SONIMUSIC - Tous droits réservés</p>
              </div>
            </div>
          </body>
          </html>
        `
  });
}

app.post('/api/auth/verify', resetLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { token } = req.body || {};
    if (!email || typeof token !== 'string' || token.length === 0 || token.length > 200) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré' });
    }
    const result = await pool.query(
      `UPDATE "User" SET "emailVerified" = true, "verificationToken" = NULL, "verificationTokenExpiry" = NULL, "updatedAt" = NOW()
       WHERE LOWER(email) = $1 AND "verificationToken" = $2
         AND ("verificationTokenExpiry" IS NULL OR "verificationTokenExpiry" > NOW())
       RETURNING id`,
      [email, hashResetToken(token)]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré. Connectez-vous pour recevoir un nouveau lien.' });
    }
    res.json({ success: true, verified: true, message: 'Email vérifié avec succès !' });
  } catch (error) {
    console.error('Erreur vérification email:', error.message);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    if (!email || typeof password !== 'string' || password.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const result = await pool.query('SELECT * FROM "User" WHERE LOWER(email) = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    if (user.emailVerified === false) {
      // Mot de passe correct mais email non confirmé : on renvoie un nouveau lien.
      if (resend) {
        sendVerificationEmail(user).catch((emailError) => {
          console.error('⚠️ Erreur renvoi email de vérification:', emailError.message);
        });
      }
      return res.status(403).json({
        error: 'Veuillez vérifier votre email avant de vous connecter. Un nouveau lien vient de vous être envoyé.',
        requiresVerification: true
      });
    }
    const token = signToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profilePic: user.profilePic || null
      }
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, "artistName", bio, country, "profilePic", "emailVerified", "createdAt"
       FROM "User" WHERE id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur /me:', error);
    res.status(401).json({ error: 'Token invalide' });
  }
});

// ============================================================
// MOT DE PASSE OUBLIÉ AVEC RESEND
// ============================================================

const FORGOT_PASSWORD_RESPONSE = {
  success: true,
  message: 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.'
};

const processForgotPassword = async (email) => {
  const userResult = await pool.query('SELECT id, email, name FROM "User" WHERE LOWER(email) = $1', [email]);
  if (userResult.rows.length === 0) return;

  const user = userResult.rows[0];
  const rawToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + ONE_HOUR);

  // Seul le hash SHA-256 du token est stocké en base.
  await pool.query(
    `UPDATE "User" SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3`,
    [hashResetToken(rawToken), resetTokenExpiry, user.id]
  );

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

  await sendEmail({
    to: user.email,
    subject: '🔑 Réinitialisation de votre mot de passe SONIMUSIC',
    html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Réinitialisation de mot de passe</title>
          </head>
          <body style="font-family: Arial, sans-serif; background-color: #0c0b0a; color: #ffffff; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
              <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                <h1 style="color: #d4af37; font-size: 28px; margin: 0;">🎵 SONIMUSIC</h1>
                <p style="color: #888; margin: 5px 0 0;">La musique Soninké à portée de clic</p>
              </div>
              <div style="padding: 30px 0;">
                <p style="font-size: 16px; line-height: 1.6;">Bonjour <strong style="color: #d4af37;">${escapeHtml(user.name || 'utilisateur')}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #ccc;">Vous avez demandé à réinitialiser votre mot de passe pour votre compte SONIMUSIC.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #ccc;">Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${escapeHtml(resetUrl)}" style="display: inline-block; padding: 14px 40px; background: #d4af37; color: #000000; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px;">
                    🔐 Réinitialiser mon mot de passe
                  </a>
                </div>
                <p style="color: #888; font-size: 14px;">⏳ Ce lien est valable pendant <strong style="color: #d4af37;">1 heure</strong>.</p>
                <p style="color: #888; font-size: 14px;">🔒 Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.</p>
              </div>
              <div style="border-top: 1px solid #333; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
                <p>© 2026 SONIMUSIC - Tous droits réservés</p>
                <p>Cet email a été envoyé à ${escapeHtml(user.email)}</p>
              </div>
            </div>
          </body>
          </html>
        `
  });
};

app.post('/api/auth/forgot-password', forgotLimiter, (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }

  // Réponse identique que le compte existe ou non, envoyée sans attendre l'email.
  res.json(FORGOT_PASSWORD_RESPONSE);

  processForgotPassword(email).catch((error) => {
    console.error('❌ Erreur forgot-password:', error.message);
  });
});

// ============================================================
// RÉINITIALISATION DU MOT DE PASSE
// ============================================================

app.post('/api/auth/reset-password', resetLimiter, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { token, newPassword } = req.body || {};
    if (!email || typeof token !== 'string' || token.length === 0 || token.length > 200) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir entre 8 et 72 caractères' });
    }
    const userResult = await pool.query(
      `SELECT id FROM "User" WHERE LOWER(email) = $1 AND "resetToken" = $2 AND "resetTokenExpiry" > NOW()`,
      [email, hashResetToken(token)]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }
    const user = userResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE "User" SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL, "emailVerified" = true, "updatedAt" = NOW() WHERE id = $2`,
      [hashedPassword, user.id]
    );
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès !' });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// ============================================================
// ROUTES SONGS
// ============================================================

app.get('/api/songs', async (req, res) => {
  try {
    const result = await pool.query(`${SONG_SELECT}
      WHERE s.status = 'ACCEPTED' ORDER BY s."createdAt" DESC, s.id ASC LIMIT 50
    `);
    res.json(result.rows.map(withArtist));
  } catch (error) {
    console.error('Erreur récupération musiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
});

app.get('/api/songs/:id', optionalAuth, async (req, res) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) return res.status(404).json({ error: 'Musique non trouvée' });
    const result = await pool.query(`${SONG_SELECT} WHERE s.id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Musique non trouvée' });
    const song = withArtist(result.rows[0]);

    // Un morceau non validé n'est visible que par son artiste ou un admin.
    if (song.status !== 'ACCEPTED') {
      const requesterId = toPositiveInt(req.user?.id);
      const isOwner = requesterId !== null && requesterId === Number(song.artistId);
      const isAdminUser = !isOwner && requesterId !== null && (await getDbRole(requesterId)) === 'ADMIN';
      if (!isOwner && !isAdminUser) {
        return res.status(404).json({ error: 'Musique non trouvée' });
      }
    }
    res.json(song);
  } catch (error) {
    console.error('Erreur récupération musique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la musique' });
  }
});

// ============================================================
// ROUTES ARTISTES
// ============================================================

app.get('/api/artists', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, "artistName", bio, country, "profilePic"
      FROM "User" WHERE role = 'ARTIST' ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération artistes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des artistes' });
  }
});

app.get('/api/artists/:id', async (req, res) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) return res.status(404).json({ error: 'Artiste non trouvé' });
    const artistResult = await pool.query(`
      SELECT id, name, "artistName", bio, country, "profilePic"
      FROM "User" WHERE id = $1 AND role = 'ARTIST'
    `, [id]);
    if (artistResult.rows.length === 0) return res.status(404).json({ error: 'Artiste non trouvé' });
    const songsResult = await pool.query(`
      SELECT * FROM "Song" WHERE "artistId" = $1 AND status = 'ACCEPTED' ORDER BY "createdAt" DESC
    `, [id]);
    const artist = artistResult.rows[0];
    artist.songs = songsResult.rows;
    artist.stats = { totalSongs: songsResult.rows.length, totalPlays: 0, totalFavorites: 0 };
    res.json(artist);
  } catch (error) {
    console.error('Erreur récupération artiste:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'artiste' });
  }
});

// ============================================================
// ROUTES ALBUMS
// ============================================================

app.get('/api/albums', async (req, res) => {
  try {
    // Les albums restent écrits en dur ; l'identifiant de l'artiste est lu en base.
    const dembaResult = await pool.query(
      `SELECT id FROM "User" WHERE role = 'ARTIST' AND "artistName" = 'Demba Tandia' ORDER BY id LIMIT 1`
    );
    const dembaId = dembaResult.rows[0]?.id ?? 1;
    const albums = [
      { id: 1, title: "Fii Siire", artistId: dembaId, artist: { id: dembaId, name: "Demba Tandia" }, year: 2022, coverArt: "/images/albums/fii-siire.jpg", description: "Album Fii Siire de Demba Tandia", songs: [1,2,3,4,5,6,7,8,9,10] },
      { id: 2, title: "Bataaxe", artistId: dembaId, artist: { id: dembaId, name: "Demba Tandia" }, year: 2023, coverArt: "/images/albums/bataaxe.jpg", description: "Album Bataaxe de Demba Tandia", songs: [11,12,13,14,15,16,17,18] }
    ];
    res.json(albums);
  } catch (error) {
    console.error('Erreur récupération albums:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des albums' });
  }
});

// ============================================================
// ROUTES USERS
// ============================================================

app.get('/api/users/:id', optionalAuth, async (req, res) => {
  try {
    const id = toPositiveInt(req.params.id);
    if (!id) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const result = await pool.query(
      `SELECT id, email, name, role, "artistName", bio, country, "profilePic", "createdAt" FROM "User" WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const user = result.rows[0];

    // L'email n'est visible que par l'utilisateur lui-même ou un admin.
    const requesterId = toPositiveInt(req.user?.id);
    const isSelf = requesterId !== null && requesterId === id;
    const canSeeEmail = isSelf || (requesterId !== null && (await getDbRole(requesterId)) === 'ADMIN');
    if (!canSeeEmail) delete user.email;

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// ============================================================
// ROUTES GESTION DE PROFIL
// ============================================================

app.put('/api/users/profile-pic', authenticateToken, async (req, res) => {
  try {
    const { profilePic } = req.body || {};
    if (!profilePic) return res.status(400).json({ error: 'URL de la photo requise' });
    if (!isValidProfilePicUrl(profilePic)) {
      return res.status(400).json({ error: 'URL de la photo invalide (http, https ou chemin relatif, 500 caractères max)' });
    }
    const result = await pool.query(
      `UPDATE "User" SET "profilePic" = $1, "updatedAt" = NOW() WHERE id = $2
       RETURNING id, email, name, "profilePic", role`,
      [profilePic, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ success: true, message: 'Photo de profil mise à jour', user: result.rows[0] });
  } catch (error) {
    console.error('Erreur mise à jour photo:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la photo' });
  }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { name, bio, country } = req.body || {};

    let cleanName = null;
    if (name !== undefined && name !== null && name !== '') {
      if (!isValidName(name)) {
        return res.status(400).json({ error: 'Le nom doit contenir entre 2 et 100 caractères' });
      }
      cleanName = name.trim();
    }
    const bioCheck = optionalString(bio, 1000);
    const countryCheck = optionalString(country, 100);
    if (!bioCheck.ok) return res.status(400).json({ error: 'La bio ne doit pas dépasser 1000 caractères' });
    if (!countryCheck.ok) return res.status(400).json({ error: 'Le pays ne doit pas dépasser 100 caractères' });

    const result = await pool.query(
      `UPDATE "User" SET name = COALESCE($1, name), bio = COALESCE($2, bio), country = COALESCE($3, country), "updatedAt" = NOW()
       WHERE id = $4 RETURNING id, email, name, role, "artistName", bio, country, "profilePic"`,
      [cleanName, bioCheck.value, countryCheck.value, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ success: true, message: 'Profil mis à jour', user: result.rows[0] });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

// ============================================================
// ROUTES FAVORIS
// ============================================================

app.get('/api/favorites/my-favorites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, s.* FROM "Favorite" f JOIN "Song" s ON f."songId" = s.id
      WHERE f."userId" = $1 ORDER BY f."createdAt" DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur favoris:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
});

app.post('/api/favorites/toggle', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.body || {};
    const existing = await pool.query('SELECT * FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2', [req.user.id, songId]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2', [req.user.id, songId]);
      res.json({ liked: false, message: 'Retiré des favoris' });
    } else {
      await pool.query('INSERT INTO "Favorite" ("userId", "songId", "createdAt") VALUES ($1, $2, NOW())', [req.user.id, songId]);
      res.json({ liked: true, message: 'Ajouté aux favoris' });
    }
  } catch (error) {
    console.error('Erreur toggle favori:', error);
    res.status(500).json({ error: 'Erreur lors du toggle du favori' });
  }
});

// ============================================================
// ROUTES PLAYLISTS
// ============================================================

app.get('/api/playlists/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "Playlist" WHERE "userId" = $1 ORDER BY "createdAt" DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur playlists:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des playlists' });
  }
});

app.post('/api/playlists', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    const result = await pool.query(
      `INSERT INTO "Playlist" (name, description, "isPublic", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [name, description || '', isPublic !== false, req.user.id]
    );
    res.json({ success: true, playlist: result.rows[0] });
  } catch (error) {
    console.error('Erreur création playlist:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la playlist' });
  }
});

app.post('/api/playlists/:id/add-song', authenticateToken, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const { songId } = req.body || {};
    const playlistCheck = await pool.query('SELECT * FROM "Playlist" WHERE id = $1 AND "userId" = $2', [playlistId, req.user.id]);
    if (playlistCheck.rows.length === 0) return res.status(404).json({ error: 'Playlist non trouvée' });
    const existing = await pool.query('SELECT * FROM "PlaylistSong" WHERE "playlistId" = $1 AND "songId" = $2', [playlistId, songId]);
    if (existing.rows.length === 0) {
      await pool.query('INSERT INTO "PlaylistSong" ("playlistId", "songId", "addedAt") VALUES ($1, $2, NOW())', [playlistId, songId]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur ajout à playlist:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout à la playlist' });
  }
});

app.delete('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    await pool.query('DELETE FROM "Playlist" WHERE id = $1 AND "userId" = $2', [playlistId, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression playlist:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la playlist' });
  }
});

// ============================================================
// ROUTES NOTIFICATIONS
// ============================================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 20`, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.body || {};
    await pool.query('UPDATE "Notification" SET read = true WHERE id = $1 AND "userId" = $2', [notificationId, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lecture notification:', error);
    res.status(500).json({ error: 'Erreur lors du marquage de la notification' });
  }
});

// ============================================================
// ROUTES COMMENTAIRES
// ============================================================

app.get('/api/comments', async (req, res) => {
  try {
    const songId = toPositiveInt(req.query.songId);
    if (!songId) return res.status(400).json({ error: 'SongId requis' });
    const result = await pool.query(`
      SELECT c.*, u.name as "userName", u."profilePic" as "userProfilePic"
      FROM "Comment" c JOIN "User" u ON c."userId" = u.id
      WHERE c."songId" = $1 ORDER BY c."createdAt" DESC
    `, [songId]);
    const commentMap = {};
    const rootComments = [];
    result.rows.forEach(c => {
      commentMap[c.id] = { ...c, name: c.userName, profilePic: c.userProfilePic, replies: [] };
    });
    result.rows.forEach(c => {
      if (c.parentId && commentMap[c.parentId]) {
        commentMap[c.parentId].replies.push(commentMap[c.id]);
      } else {
        rootComments.push(commentMap[c.id]);
      }
    });
    res.json(rootComments);
  } catch (error) {
    console.error('Erreur commentaires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body || {};
    const songId = toPositiveInt(req.body?.songId);
    if (!songId || !content) return res.status(400).json({ error: 'SongId et contenu requis' });

    let parentId = null;
    if (req.body.parentId !== undefined && req.body.parentId !== null && req.body.parentId !== '') {
      parentId = toPositiveInt(req.body.parentId);
      if (!parentId) return res.status(400).json({ error: 'parentId invalide' });
    }
    if (typeof content !== 'string' || content.trim().length < 1 || content.length > 1000) {
      return res.status(400).json({ error: 'Le commentaire doit contenir entre 1 et 1000 caractères' });
    }

    const userResult = await pool.query('SELECT id, name, "profilePic" FROM "User" WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Token invalide' });

    const result = await pool.query(
      `INSERT INTO "Comment" (content, "userId", "songId", "parentId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [content, req.user.id, songId, parentId]
    );
    const newComment = {
      ...result.rows[0],
      userName: user.name,
      name: user.name,
      userProfilePic: user.profilePic,
      profilePic: user.profilePic,
      replies: [],
      likes: 0,
      likedBy: []
    };
    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
});

app.post('/api/comments/:id/like', authenticateToken, async (req, res) => {
  try {
    const commentId = toPositiveInt(req.params.id);
    if (!commentId) return res.status(404).json({ error: 'Commentaire non trouvé' });
    const commentResult = await pool.query('SELECT * FROM "Comment" WHERE id = $1', [commentId]);
    if (commentResult.rows.length === 0) return res.status(404).json({ error: 'Commentaire non trouvé' });
    const comment = commentResult.rows[0];
    const likedBy = parseLikedBy(comment.likedBy);
    const index = likedBy.indexOf(req.user.id);
    let liked = false;
    if (index > -1) { likedBy.splice(index, 1); liked = false; }
    else { likedBy.push(req.user.id); liked = true; }
    await pool.query('UPDATE "Comment" SET likes = $1, "likedBy" = $2 WHERE id = $3', [likedBy.length, JSON.stringify(likedBy), commentId]);
    res.json({ success: true, likes: likedBy.length, liked: liked });
  } catch (error) {
    console.error('Erreur like commentaire:', error);
    res.status(500).json({ error: 'Erreur lors du like du commentaire' });
  }
});

app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const commentId = toPositiveInt(req.params.id);
    if (!commentId) return res.status(404).json({ error: 'Commentaire non trouvé' });
    const commentResult = await pool.query('SELECT * FROM "Comment" WHERE id = $1', [commentId]);
    if (commentResult.rows.length === 0) return res.status(404).json({ error: 'Commentaire non trouvé' });
    const comment = commentResult.rows[0];
    const userRole = await getDbRole(req.user.id);
    if (comment.userId !== req.user.id && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorisé' });
    }
    await pool.query('DELETE FROM "Comment" WHERE id = $1', [commentId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire' });
  }
});

// ============================================================
// ADMIN - ROUTES
// ============================================================

app.get('/api/admin/songs/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`${SONG_SELECT}
      WHERE s.status = 'PENDING' ORDER BY s."createdAt" DESC
    `);
    res.json(result.rows.map(withArtist));
  } catch (error) {
    console.error('Erreur récupération musiques en attente:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques en attente' });
  }
});

app.post('/api/admin/songs/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('UPDATE "Song" SET status = \'ACCEPTED\', "isVerified" = true WHERE id = $1', [id]);
    res.json({ success: true, message: 'Musique approuvée' });
  } catch (error) {
    console.error('Erreur approbation musique:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation' });
  }
});

app.post('/api/admin/songs/:id/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query('UPDATE "Song" SET status = \'REJECTED\' WHERE id = $1', [id]);
    res.json({ success: true, message: 'Musique refusée' });
  } catch (error) {
    console.error('Erreur refus musique:', error);
    res.status(500).json({ error: 'Erreur lors du refus' });
  }
});

// ============================================================
// GESTIONNAIRE D'ERREURS FINAL (JSON)
// ============================================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requête trop volumineuse' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalide' });
  }
  console.error('Erreur non gérée:', err?.message || err);
  if (res.headersSent) return next(err);
  res.status(err?.status && err.status >= 400 && err.status < 500 ? err.status : 500)
    .json({ error: 'Erreur serveur' });
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎵 SONIMUSIC API - Version 2.0 (avec Resend)');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: /api/health`);
  console.log(`🔐 Login: /api/auth/login`);
  console.log(`🎵 Songs: /api/songs`);
  console.log(`🎤 Artists: /api/artists`);
  console.log(`💬 Comments: /api/comments`);
  console.log(`📸 Profile: /api/users/profile`);
  console.log(`📧 Email: Resend (${resend ? '✅ Configuré' : '❌ Non configuré'})`);
  console.log('='.repeat(60));

  // Vérification de la connexion à la base au démarrage (sans afficher l'URL).
  if (!process.env.DATABASE_URL) {
    console.error('🗄️ Base de données : ❌ DATABASE_URL non définie');
  } else {
    pool.query('SELECT 1')
      .then(() => {
        console.log('🗄️ Base de données : ✅ connectée');
        return ensureSchema(pool)
          .then(() => console.log('🗄️ Schéma : ✅ tables vérifiées'))
          .catch((err) => console.error('🗄️ Schéma : ❌ échec de l\'initialisation -', err.code || err.message));
      })
      .catch((err) => console.error('🗄️ Base de données : ❌ connexion impossible -', err.code || 'erreur inconnue'));
  }
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});
