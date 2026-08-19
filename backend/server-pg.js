import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

// Connexion directe à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Configuration email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-fr.securemail.pro',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'noreply@sonimusic.online',
    pass: process.env.EMAIL_PASS || 'Nore@SOniMUSIC.online'
  }
});

app.use(cors({
  origin: ['https://sonimusic.online', 'http://localhost:5173', 'https://sonimusic-1.onrender.com'],
  credentials: true
}));
app.use(express.json());

// ============================================================
// ROUTE DE SANTÉ
// ============================================================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({
      status: 'OK',
      message: 'SONIMUSIC API is running',
      database: 'connected'
    });
  } catch (error) {
    res.json({
      status: 'OK',
      message: 'SONIMUSIC API is running',
      database: 'error',
      error: error.message
    });
  }
});

// ============================================================
// ROUTE D'ACCUEIL
// ============================================================
app.get('/', (req, res) => {
  res.json({
    message: 'SONIMUSIC API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login',
      register: '/api/auth/register',
      me: '/api/auth/me',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
      favorites: '/api/favorites/my-favorites',
      playlists: '/api/playlists/my',
      notifications: '/api/notifications',
      comments: '/api/comments'
    }
  });
});

// ============================================================
// ROUTES D'AUTHENTIFICATION
// ============================================================

// Inscription
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, role, artistName, bio, country } = req.body;

    const existing = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO "User" (email, password, name, role, "artistName", bio, country, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, email, name, role`,
      [email, hashedPassword, name, role || 'LISTENER', artistName || null, bio || null, country || null, true]
    );

    res.status(201).json({
      success: true,
      message: 'Inscription réussie !',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Tentative de connexion:', email);

    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      console.log('❌ Utilisateur non trouvé:', email);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.log('❌ Mot de passe incorrect pour:', email);
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789',
      { expiresIn: '7d' }
    );

    console.log('✅ Connexion réussie:', email);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Récupérer l'utilisateur connecté
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');

    const result = await pool.query(
      `SELECT id, email, name, role, "artistName", bio, country, "profilePic", "emailVerified", "createdAt"
       FROM "User" WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Erreur /me:', error);
    res.status(401).json({ error: 'Token invalide' });
  }
});

// ============================================================
// MOT DE PASSE OUBLIÉ
// ============================================================

// 1. Demander la réinitialisation
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifier si l'utilisateur existe
    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe
      return res.json({ 
        success: true, 
        message: 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.' 
      });
    }

    const user = userResult.rows[0];

    // Générer un token de réinitialisation
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure

    // Sauvegarder le token dans la base de données
    await pool.query(
      `UPDATE "User" 
       SET "resetToken" = $1, "resetTokenExpiry" = $2 
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, user.id]
    );

    // Construire le lien de réinitialisation
    const resetUrl = `${process.env.FRONTEND_URL || 'https://sonimusic.online'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Envoyer l'email
    await transporter.sendMail({
      from: `"SONIMUSIC" <${process.env.EMAIL_USER || 'noreply@sonimusic.online'}>`,
      to: email,
      subject: '🔑 Réinitialisation de votre mot de passe SONIMUSIC',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0c0b0a; color: white;">
          <h1 style="color: #d4af37;">🔑 SONIMUSIC</h1>
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous :</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 30px;background:#d4af37;color:black;text-decoration:none;border-radius:5px;margin:20px 0;">
            🔐 Réinitialiser mon mot de passe
          </a>
          <p style="color:#666;font-size:12px;">⏳ Ce lien expire dans 1 heure.</p>
          <p style="color:#666;font-size:12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: 'Un email de réinitialisation vous a été envoyé.' 
    });

  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// 2. Réinitialiser le mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    // Vérifier le token
    const userResult = await pool.query(
      `SELECT * FROM "User" 
       WHERE email = $1 
         AND "resetToken" = $2 
         AND "resetTokenExpiry" > NOW()`,
      [email, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    const user = userResult.rows[0];

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et supprimer le token
    await pool.query(
      `UPDATE "User" 
       SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès !' 
    });

  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// ============================================================
// ROUTES FAVORIS
// ============================================================
app.get('/api/favorites/my-favorites', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');

    const result = await pool.query(
      `SELECT f.*, s.* FROM "Favorite" f
       JOIN "Song" s ON f."songId" = s.id
       WHERE f."userId" = $1
       ORDER BY f."createdAt" DESC`,
      [decoded.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur favoris:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
});

// Ajouter/Retirer un favori
app.post('/api/favorites/toggle', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const { songId } = req.body;

    const existing = await pool.query(
      'SELECT * FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2',
      [decoded.id, songId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM "Favorite" WHERE "userId" = $1 AND "songId" = $2',
        [decoded.id, songId]
      );
      res.json({ liked: false, message: 'Retiré des favoris' });
    } else {
      await pool.query(
        'INSERT INTO "Favorite" ("userId", "songId", "createdAt") VALUES ($1, $2, NOW())',
        [decoded.id, songId]
      );
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
app.get('/api/playlists/my', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');

    const result = await pool.query(
      `SELECT * FROM "Playlist"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [decoded.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur playlists:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des playlists' });
  }
});

// Créer une playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const { name, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nom requis' });
    }

    const result = await pool.query(
      `INSERT INTO "Playlist" (name, description, "isPublic", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, description || '', isPublic !== false, decoded.id]
    );

    res.json({ success: true, playlist: result.rows[0] });
  } catch (error) {
    console.error('Erreur création playlist:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la playlist' });
  }
});

// Ajouter une musique à une playlist
app.post('/api/playlists/:id/add-song', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const playlistId = parseInt(req.params.id);
    const { songId } = req.body;

    const playlistCheck = await pool.query(
      'SELECT * FROM "Playlist" WHERE id = $1 AND "userId" = $2',
      [playlistId, decoded.id]
    );

    if (playlistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist non trouvée' });
    }

    const existing = await pool.query(
      'SELECT * FROM "PlaylistSong" WHERE "playlistId" = $1 AND "songId" = $2',
      [playlistId, songId]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        'INSERT INTO "PlaylistSong" ("playlistId", "songId", "addedAt") VALUES ($1, $2, NOW())',
        [playlistId, songId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur ajout à playlist:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout à la playlist' });
  }
});

// Supprimer une playlist
app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const playlistId = parseInt(req.params.id);

    await pool.query(
      'DELETE FROM "Playlist" WHERE id = $1 AND "userId" = $2',
      [playlistId, decoded.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression playlist:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la playlist' });
  }
});

// ============================================================
// ROUTES NOTIFICATIONS
// ============================================================
app.get('/api/notifications', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');

    const result = await pool.query(
      `SELECT * FROM "Notification"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 20`,
      [decoded.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

// Marquer une notification comme lue
app.post('/api/notifications/read', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const { notificationId } = req.body;

    await pool.query(
      `UPDATE "Notification" SET read = true
       WHERE id = $1 AND "userId" = $2`,
      [notificationId, decoded.id]
    );

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
    const { songId } = req.query;
    if (!songId) {
      return res.status(400).json({ error: 'SongId requis' });
    }

    const result = await pool.query(
      `SELECT c.*, u.name, u.email FROM "Comment" c
       JOIN "User" u ON c."userId" = u.id
       WHERE c."songId" = $1
       ORDER BY c."createdAt" DESC`,
      [parseInt(songId)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur commentaires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const { songId, content, parentId } = req.body;

    if (!songId || !content) {
      return res.status(400).json({ error: 'SongId et contenu requis' });
    }

    const result = await pool.query(
      `INSERT INTO "Comment" (content, "userId", "songId", "parentId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [content, decoded.id, parseInt(songId), parentId || null]
    );

    const userResult = await pool.query(
      'SELECT name, email FROM "User" WHERE id = $1',
      [decoded.id]
    );

    res.json({
      success: true,
      comment: {
        ...result.rows[0],
        user: userResult.rows[0] || { name: 'Utilisateur' }
      }
    });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: /api/health`);
  console.log(`🔐 Login: /api/auth/login`);
});

