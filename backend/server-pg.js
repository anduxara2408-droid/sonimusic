const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// CONNEXION BASE DE DONNÉES
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur de connexion à PostgreSQL:', err.stack);
  } else {
    console.log('✅ PostgreSQL connecté avec succès');
    release();
  }
});

// ============================================================
// CONFIGURATION EMAIL
// ============================================================
let transporter = null;
let emailConfigured = false;

try {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-fr.securemail.pro',
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || 'noreply@sonimusic.online',
      pass: process.env.EMAIL_PASS || 'Nore@SOniMUSIC.online'
    },
    tls: { rejectUnauthorized: false }
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('⚠️ SMTP error:', error.message);
      emailConfigured = false;
    } else {
      console.log('✅ SMTP configuré');
      emailConfigured = true;
    }
  });
} catch (error) {
  console.error('⚠️ Erreur SMTP:', error.message);
  emailConfigured = false;
}

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
  origin: ['https://sonimusic.online', 'http://localhost:5173', 'https://sonimusic-1.onrender.com'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non authentifié' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
};

// ============================================================
// ROUTES
// ============================================================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'OK', message: 'SONIMUSIC API is running', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'SONIMUSIC API is running', database: 'error', error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: '🎵 SONIMUSIC API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: { login: '/api/auth/login', register: '/api/auth/register', me: '/api/auth/me', forgotPassword: '/api/auth/forgot-password', resetPassword: '/api/auth/reset-password' },
      favorites: '/api/favorites/my-favorites',
      playlists: '/api/playlists',
      notifications: '/api/notifications',
      comments: '/api/comments',
      songs: '/api/songs',
      artists: '/api/artists',
      admin: '/api/admin/stats'
    }
  });
});

// ============================================================
// AUTH
// ============================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, role, artistName, bio, country } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });

    const existing = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "User" (email, password, name, role, "artistName", bio, country, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, email, name, role, "artistName", bio, country`,
      [email, hashedPassword, name || 'Utilisateur', role || 'LISTENER', artistName || null, bio || null, country || null, true]
    );

    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role },
      process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789',
      { expiresIn: '7d' }
    );

    res.status(201).json({ success: true, message: 'Inscription réussie !', token, user: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, artistName: user.artistName, bio: user.bio, country: user.country }
    });
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
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
    console.error('❌ Erreur /me:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// ============================================================
// MOT DE PASSE OUBLIÉ
// ============================================================

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: 'Si un compte existe, un lien de réinitialisation vous a été envoyé.' });
    }

    const user = userResult.rows[0];
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    try {
      await pool.query(`UPDATE "User" SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3`, [resetToken, resetTokenExpiry, user.id]);
    } catch (dbError) {
      await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT`);
      await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP`);
      await pool.query(`UPDATE "User" SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3`, [resetToken, resetTokenExpiry, user.id]);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://sonimusic.online';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    if (transporter && emailConfigured) {
      try {
        await transporter.sendMail({
          from: `"SONIMUSIC" <${process.env.EMAIL_USER || 'noreply@sonimusic.online'}>`,
          to: email,
          subject: '🔑 Réinitialisation de votre mot de passe SONIMUSIC',
          html: `
            <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif;background-color:#0c0b0a;color:white;border-radius:10px;">
              <div style="text-align:center;padding:20px 0;border-bottom:2px solid #d4af37;">
                <h1 style="color:#d4af37;margin:0;">🎵 SONIMUSIC</h1>
              </div>
              <div style="padding:30px 20px;">
                <h2 style="color:#d4af37;">🔐 Réinitialisation de mot de passe</h2>
                <p style="color:#ddd;">Bonjour <strong style="color:#d4af37;">${user.name || 'utilisateur'}</strong>,</p>
                <p style="color:#ddd;">Cliquez sur le bouton ci-dessous :</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#d4af37,#f5d76e);color:#0c0b0a;text-decoration:none;border-radius:50px;font-weight:bold;font-size:16px;">
                    🔐 Réinitialiser
                  </a>
                </div>
                <p style="color:#888;font-size:14px;">⏳ Ce lien expire dans 1 heure.</p>
                <hr style="border:none;border-top:1px solid #333;margin:30px 0;">
                <p style="color:#666;font-size:12px;text-align:center;">© 2026 SONIMUSIC</p>
              </div>
            </div>
          `
        });
        console.log('✅ Email envoyé');
      } catch (error) {
        console.error('❌ Erreur envoi email:', error.message);
      }
    } else {
      console.log('🔑 [DEBUG] Token:', resetToken);
      console.log('🔗 [DEBUG] Lien:', resetUrl);
    }

    res.json({ success: true, message: 'Si un compte existe, un lien de réinitialisation vous a été envoyé.' });
  } catch (error) {
    console.error('💥 Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) return res.status(400).json({ error: 'Email, token et nouveau mot de passe requis' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });

    const userResult = await pool.query(
      `SELECT * FROM "User" WHERE email = $1 AND "resetToken" = $2 AND "resetTokenExpiry" > NOW()`,
      [email, token]
    );
    if (userResult.rows.length === 0) return res.status(400).json({ error: 'Token invalide ou expiré' });

    const user = userResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE "User" SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $2`, [hashedPassword, user.id]);

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès !' });
  } catch (error) {
    console.error('💥 Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// ============================================================
// FAVORIS
// ============================================================
app.get('/api/favorites/my-favorites', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, s.* FROM "Favorite" f JOIN "Song" s ON f."songId" = s.id WHERE f."userId" = $1 ORDER BY f."createdAt" DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur favoris:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
});

app.post('/api/favorites/toggle', authenticateToken, async (req, res) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ error: 'SongId requis' });

    const existing = await pool.query('SELECT * FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2', [req.user.id, songId]);
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2', [req.user.id, songId]);
      res.json({ liked: false, message: 'Retiré des favoris' });
    } else {
      await pool.query('INSERT INTO "Favorite" ("userId", "songId", "createdAt") VALUES ($1, $2, NOW())', [req.user.id, songId]);
      res.json({ liked: true, message: 'Ajouté aux favoris' });
    }
  } catch (error) {
    console.error('❌ Erreur toggle favori:', error);
    res.status(500).json({ error: 'Erreur lors du toggle du favori' });
  }
});

// ============================================================
// PLAYLISTS
// ============================================================
app.get('/api/playlists/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Playlist" WHERE "userId" = $1 ORDER BY "createdAt" DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur playlists:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des playlists' });
  }
});

app.post('/api/playlists', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });

    const result = await pool.query(
      `INSERT INTO "Playlist" (name, description, "isPublic", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [name, description || '', isPublic !== false, req.user.id]
    );
    res.json({ success: true, playlist: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur création playlist:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la playlist' });
  }
});

app.post('/api/playlists/:id/add-song', authenticateToken, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    const { songId } = req.body;

    const playlistCheck = await pool.query('SELECT * FROM "Playlist" WHERE id = $1 AND "userId" = $2', [playlistId, req.user.id]);
    if (playlistCheck.rows.length === 0) return res.status(404).json({ error: 'Playlist non trouvée' });

    const existing = await pool.query('SELECT * FROM "PlaylistSong" WHERE "playlistId" = $1 AND "songId" = $2', [playlistId, songId]);
    if (existing.rows.length === 0) {
      await pool.query('INSERT INTO "PlaylistSong" ("playlistId", "songId", "addedAt") VALUES ($1, $2, NOW())', [playlistId, songId]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur ajout à playlist:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout à la playlist' });
  }
});

app.delete('/api/playlists/:id', authenticateToken, async (req, res) => {
  try {
    const playlistId = parseInt(req.params.id);
    await pool.query('DELETE FROM "Playlist" WHERE id = $1 AND "userId" = $2', [playlistId, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur suppression playlist:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la playlist' });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Notification" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 20', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

app.post('/api/notifications/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.body;
    await pool.query('UPDATE "Notification" SET read = true WHERE id = $1 AND "userId" = $2', [notificationId, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lecture notification:', error);
    res.status(500).json({ error: 'Erreur lors du marquage de la notification' });
  }
});

// ============================================================
// COMMENTAIRES
// ============================================================
app.get('/api/comments', async (req, res) => {
  try {
    const { songId } = req.query;
    if (!songId) return res.status(400).json({ error: 'SongId requis' });

    const result = await pool.query(
      `SELECT c.*, u.name, u.email FROM "Comment" c JOIN "User" u ON c."userId" = u.id WHERE c."songId" = $1 ORDER BY c."createdAt" DESC`,
      [parseInt(songId)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur commentaires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
  try {
    const { songId, content, parentId } = req.body;
    if (!songId || !content) return res.status(400).json({ error: 'SongId et contenu requis' });

    const result = await pool.query(
      `INSERT INTO "Comment" (content, "userId", "songId", "parentId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [content, req.user.id, parseInt(songId), parentId || null]
    );

    const userResult = await pool.query('SELECT name, email FROM "User" WHERE id = $1', [req.user.id]);
    res.json({ success: true, comment: { ...result.rows[0], user: userResult.rows[0] || { name: 'Utilisateur' } } });
  } catch (error) {
    console.error('❌ Erreur ajout commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
});

// ============================================================
// SONGS (CRUD)
// ============================================================

app.get('/api/songs', async (req, res) => {
  try {
    const { artistId, status, search, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT s.*, a.name as "artistName", a."profilePic" as "artistProfilePic"
      FROM "Song" s LEFT JOIN "User" a ON s."artistId" = a.id WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (artistId) { query += ` AND s."artistId" = $${paramIndex}`; params.push(parseInt(artistId)); paramIndex++; }
    if (status) { query += ` AND s.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (search) { query += ` AND (s.title ILIKE $${paramIndex} OR s.genre ILIKE $${paramIndex})`; params.push(`%${search}%`); paramIndex++; }

    query += ` ORDER BY s."createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM "Song" WHERE 1=1';
    const countParams = [];
    let countIndex = 1;
    if (artistId) { countQuery += ` AND "artistId" = $${countIndex}`; countParams.push(parseInt(artistId)); countIndex++; }
    if (status) { countQuery += ` AND status = $${countIndex}`; countParams.push(status); countIndex++; }
    if (search) { countQuery += ` AND (title ILIKE $${countIndex} OR genre ILIKE $${countIndex})`; countParams.push(`%${search}%`); countIndex++; }
    const countResult = await pool.query(countQuery, countParams);

    res.json({ songs: result.rows, total: parseInt(countResult.rows[0].count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('❌ Erreur récupération chansons:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des chansons' });
  }
});

app.get('/api/songs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT s.*, a.name as "artistName", a."profilePic" as "artistProfilePic"
       FROM "Song" s LEFT JOIN "User" a ON s."artistId" = a.id WHERE s.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chanson non trouvée' });
    await pool.query(`UPDATE "Song" SET "playCount" = "playCount" + 1 WHERE id = $1`, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur récupération chanson:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la chanson' });
  }
});

app.post('/api/songs', authenticateToken, async (req, res) => {
  try {
    const { title, audioFile, coverArt, artistId, genre, duration, lyrics, status } = req.body;
    if (req.user.role !== 'ADMIN' && req.user.id !== artistId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à créer cette chanson' });
    }
    if (!title || !audioFile || !artistId) {
      return res.status(400).json({ error: 'Titre, fichier audio et artiste requis' });
    }

    const result = await pool.query(
      `INSERT INTO "Song" (title, "audioFile", "coverArt", "artistId", genre, duration, lyrics, status, "playCount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW(), NOW()) RETURNING *`,
      [title, audioFile, coverArt || '', parseInt(artistId), genre || '', duration || 0, lyrics || '', status || 'PENDING']
    );
    res.status(201).json({ success: true, song: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur création chanson:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la chanson' });
  }
});

app.put('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, audioFile, coverArt, genre, duration, lyrics, status } = req.body;

    const songCheck = await pool.query('SELECT * FROM "Song" WHERE id = $1', [id]);
    if (songCheck.rows.length === 0) return res.status(404).json({ error: 'Chanson non trouvée' });
    if (req.user.role !== 'ADMIN' && req.user.id !== songCheck.rows[0].artistId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette chanson' });
    }

    const result = await pool.query(
      `UPDATE "Song" SET title = COALESCE($1, title), "audioFile" = COALESCE($2, "audioFile"),
       "coverArt" = COALESCE($3, "coverArt"), genre = COALESCE($4, genre),
       duration = COALESCE($5, duration), lyrics = COALESCE($6, lyrics),
       status = COALESCE($7, status), "updatedAt" = NOW()
       WHERE id = $8 RETURNING *`,
      [title, audioFile, coverArt, genre, duration, lyrics, status, id]
    );
    res.json({ success: true, song: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur mise à jour chanson:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la chanson' });
  }
});

app.delete('/api/songs/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const songCheck = await pool.query('SELECT * FROM "Song" WHERE id = $1', [id]);
    if (songCheck.rows.length === 0) return res.status(404).json({ error: 'Chanson non trouvée' });
    if (req.user.role !== 'ADMIN' && req.user.id !== songCheck.rows[0].artistId) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer cette chanson' });
    }
    await pool.query('DELETE FROM "Song" WHERE id = $1', [id]);
    res.json({ success: true, message: 'Chanson supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression chanson:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la chanson' });
  }
});

// ============================================================
// ARTISTS (CRUD)
// ============================================================

app.get('/api/artists', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let query = `SELECT id, email, name, "artistName", bio, country, "profilePic", "createdAt" FROM "User" WHERE role = 'ARTIST' OR role = 'ADMIN'`;
    const params = [];
    let paramIndex = 1;

    if (search) { query += ` AND (name ILIKE $${paramIndex} OR "artistName" ILIKE $${paramIndex})`; params.push(`%${search}%`); paramIndex++; }
    query += ` ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) FROM "User" WHERE role = 'ARTIST' OR role = 'ADMIN'`;
    const countParams = [];
    let countIndex = 1;
    if (search) { countQuery += ` AND (name ILIKE $${countIndex} OR "artistName" ILIKE $${countIndex})`; countParams.push(`%${search}%`); countIndex++; }
    const countResult = await pool.query(countQuery, countParams);

    res.json({ artists: result.rows, total: parseInt(countResult.rows[0].count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('❌ Erreur récupération artistes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des artistes' });
  }
});

app.get('/api/artists/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const artistResult = await pool.query(
      `SELECT id, email, name, "artistName", bio, country, "profilePic", "createdAt" FROM "User" WHERE id = $1 AND (role = 'ARTIST' OR role = 'ADMIN')`,
      [id]
    );
    if (artistResult.rows.length === 0) return res.status(404).json({ error: 'Artiste non trouvé' });

    const songsResult = await pool.query('SELECT * FROM "Song" WHERE "artistId" = $1 AND status = $2 ORDER BY "createdAt" DESC', [id, 'APPROVED']);
    res.json({ ...artistResult.rows[0], songs: songsResult.rows });
  } catch (error) {
    console.error('❌ Erreur récupération artiste:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'artiste' });
  }
});

app.post('/api/artists', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, name, password, artistName, bio, country } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const existing = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "User" (email, password, name, role, "artistName", bio, country, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'ARTIST', $4, $5, $6, true, NOW(), NOW())
       RETURNING id, email, name, "artistName", bio, country, role`,
      [email, hashedPassword, name || 'Artiste', artistName || name || 'Artiste', bio || '', country || '']
    );
    res.status(201).json({ success: true, artist: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur création artiste:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'artiste' });
  }
});

app.put('/api/artists/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, artistName, bio, country, profilePic } = req.body;

    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier ce profil' });
    }

    const result = await pool.query(
      `UPDATE "User" SET name = COALESCE($1, name), "artistName" = COALESCE($2, "artistName"),
       bio = COALESCE($3, bio), country = COALESCE($4, country), "profilePic" = COALESCE($5, "profilePic"), "updatedAt" = NOW()
       WHERE id = $6 RETURNING id, email, name, "artistName", bio, country, "profilePic", role`,
      [name, artistName, bio, country, profilePic, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Artiste non trouvé' });
    res.json({ success: true, artist: result.rows[0] });
  } catch (error) {
    console.error('❌ Erreur mise à jour artiste:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'artiste' });
  }
});

app.delete('/api/artists/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const checkResult = await pool.query('SELECT role FROM "User" WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (checkResult.rows[0].role !== 'ARTIST') return res.status(400).json({ error: 'Cet utilisateur n\'est pas un artiste' });

    await pool.query('DELETE FROM "Song" WHERE "artistId" = $1', [id]);
    await pool.query('DELETE FROM "User" WHERE id = $1', [id]);
    res.json({ success: true, message: 'Artiste et ses chansons supprimés avec succès' });
  } catch (error) {
    console.error('❌ Erreur suppression artiste:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'artiste' });
  }
});

// ============================================================
// ADMIN STATS
// ============================================================
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = {};
    const usersResult = await pool.query('SELECT COUNT(*) FROM "User"');
    stats.totalUsers = parseInt(usersResult.rows[0].count);

    const songsResult = await pool.query('SELECT COUNT(*) FROM "Song"');
    stats.totalSongs = parseInt(songsResult.rows[0].count);

    const artistsResult = await pool.query('SELECT COUNT(*) FROM "User" WHERE role = $1', ['ARTIST']);
    stats.totalArtists = parseInt(artistsResult.rows[0].count);

    const favsResult = await pool.query('SELECT COUNT(*) FROM "Favorite"');
    stats.totalFavorites = parseInt(favsResult.rows[0].count);

    const commentsResult = await pool.query('SELECT COUNT(*) FROM "Comment"');
    stats.totalComments = parseInt(commentsResult.rows[0].count);

    const playlistsResult = await pool.query('SELECT COUNT(*) FROM "Playlist"');
    stats.totalPlaylists = parseInt(playlistsResult.rows[0].count);

    const playsResult = await pool.query('SELECT SUM("playCount") FROM "Song"');
    stats.totalPlays = parseInt(playsResult.rows[0].sum) || 0;

    const topSongs = await pool.query(
      `SELECT s.id, s.title, s."audioFile", s."coverArt", s."playCount", u.name as "artistName"
       FROM "Song" s LEFT JOIN "User" u ON s."artistId" = u.id
       WHERE s.status = 'APPROVED' ORDER BY s."playCount" DESC LIMIT 5`
    );
    stats.topSongs = topSongs.rows;

    const topArtists = await pool.query(
      `SELECT u.id, u.name, u."artistName", u."profilePic", COUNT(s.id) as "songCount"
       FROM "User" u LEFT JOIN "Song" s ON u.id = s."artistId"
       WHERE u.role = 'ARTIST' OR u.role = 'ADMIN'
       GROUP BY u.id ORDER BY "songCount" DESC LIMIT 5`
    );
    stats.topArtists = topArtists.rows;

    const statusResult = await pool.query(`SELECT status, COUNT(*) FROM "Song" GROUP BY status`);
    stats.songsByStatus = statusResult.rows;

    const roleResult = await pool.query(`SELECT role, COUNT(*) FROM "User" GROUP BY role`);
    stats.usersByRole = roleResult.rows;

    const recentComments = await pool.query(
      `SELECT c.*, u.name, u.email FROM "Comment" c JOIN "User" u ON c."userId" = u.id ORDER BY c."createdAt" DESC LIMIT 10`
    );
    stats.recentComments = recentComments.rows;

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// ============================================================
// DÉMARRAGE
// ============================================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎵 SONIMUSIC API - Version 2.0');
  console.log('='.repeat(60));
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/api/health`);
  console.log(`📧 Email: ${emailConfigured ? '✅ Configuré' : '⚠️ Mode debug'}`);
  console.log('='.repeat(60));
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});
