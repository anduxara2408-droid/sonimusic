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
      comments: '/api/comments',
      songs: '/api/songs',
      artists: '/api/artists',
      albums: '/api/albums'
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
    console.log('🔑 Demande de réinitialisation pour:', email);

    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Si un compte existe avec cet email, un lien de réinitialisation vous a été envoyé.' 
      });
    }

    const user = userResult.rows[0];

    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await pool.query(
      `UPDATE "User" 
       SET "resetToken" = $1, "resetTokenExpiry" = $2 
       WHERE id = $3`,
      [resetToken, resetTokenExpiry, user.id]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'https://sonimusic.online'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from: `"SONIMUSIC" <${process.env.EMAIL_USER || 'noreply@sonimusic.online'}>`,
      to: email,
      subject: '🔑 Réinitialisation de votre mot de passe SONIMUSIC',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0c0b0a; color: white;">
          <h1 style="color: #d4af37;">🔑 SONIMUSIC</h1>
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 30px;background:#d4af37;color:black;text-decoration:none;border-radius:5px;margin:20px 0;">
            🔐 Réinitialiser mon mot de passe
          </a>
          <p style="color:#666;font-size:12px;">⏳ Ce lien expire dans 1 heure.</p>
        </div>
      `
    });

    console.log('✅ Email envoyé à:', email);

    res.json({ 
      success: true, 
      message: 'Un email de réinitialisation vous a été envoyé.' 
    });

  } catch (error) {
    console.error('❌ Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// 2. Réinitialiser le mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

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
    const hashedPassword = await bcrypt.hash(newPassword, 10);

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
// ROUTES SONGS (MUSIQUES)
// ============================================================

// Récupérer toutes les musiques
app.get('/api/songs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as "artistName", u.id as "artistId"
      FROM "Song" s
      LEFT JOIN "User" u ON s."artistId" = u.id
      WHERE s.status = 'ACCEPTED'
      ORDER BY s."createdAt" DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération musiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
});

// Récupérer une musique par ID
app.get('/api/songs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT s.*, u.name as "artistName", u.id as "artistId"
      FROM "Song" s
      LEFT JOIN "User" u ON s."artistId" = u.id
      WHERE s.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Musique non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur récupération musique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la musique' });
  }
});

// ============================================================
// ROUTES ARTISTES
// ============================================================

// Récupérer tous les artistes
app.get('/api/artists', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, "artistName", bio, country, "profilePic"
      FROM "User"
      WHERE role = 'ARTIST'
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur récupération artistes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des artistes' });
  }
});

// Récupérer un artiste par ID avec ses musiques
app.get('/api/artists/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const artistResult = await pool.query(`
      SELECT id, name, "artistName", bio, country, "profilePic"
      FROM "User"
      WHERE id = $1 AND role = 'ARTIST'
    `, [id]);
    
    if (artistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artiste non trouvé' });
    }
    
    const songsResult = await pool.query(`
      SELECT * FROM "Song"
      WHERE "artistId" = $1 AND status = 'ACCEPTED'
      ORDER BY "createdAt" DESC
    `, [id]);
    
    const artist = artistResult.rows[0];
    artist.songs = songsResult.rows;
    artist.stats = {
      totalSongs: songsResult.rows.length,
      totalPlays: 0,
      totalFavorites: 0
    };
    
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
    const albums = [
      {
        id: 1,
        title: "Fii Siire",
        artistId: 1,
        artist: { id: 1, name: "Demba Tandia" },
        year: 2022,
        coverArt: "/images/albums/fii-siire.jpg",
        description: "Album Fii Siire de Demba Tandia",
        songs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "Bataaxe",
        artistId: 1,
        artist: { id: 1, name: "Demba Tandia" },
        year: 2023,
        coverArt: "/images/albums/bataaxe.jpg",
        description: "Album Bataaxe de Demba Tandia",
        songs: [11, 12, 13, 14, 15, 16, 17, 18],
        createdAt: new Date().toISOString()
      }
    ];
    res.json(albums);
  } catch (error) {
    console.error('Erreur récupération albums:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des albums' });
  }
});

// ============================================================
// ROUTE UTILISATEUR PAR ID
// ============================================================
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const result = await pool.query(`
      SELECT id, name, email, role, "artistName", bio, country, "profilePic", "createdAt"
      FROM "User"
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
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

    const result = await pool.query(`
      SELECT f.*, s.* FROM "Favorite" f
      JOIN "Song" s ON f."songId" = s.id
      WHERE f."userId" = $1
      ORDER BY f."createdAt" DESC
    `, [decoded.id]);

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

    const result = await pool.query(`
      SELECT * FROM "Playlist"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
    `, [decoded.id]);

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

    const result = await pool.query(`
      INSERT INTO "Playlist" (name, description, "isPublic", "userId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [name, description || '', isPublic !== false, decoded.id]);

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

    const result = await pool.query(`
      SELECT * FROM "Notification"
      WHERE "userId" = $1
      ORDER BY "createdAt" DESC
      LIMIT 20
    `, [decoded.id]);

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
      'UPDATE "Notification" SET read = true WHERE id = $1 AND "userId" = $2',
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

// Récupérer les commentaires avec infos utilisateur
app.get('/api/comments', async (req, res) => {
  try {
    const { songId } = req.query;
    if (!songId) {
      return res.status(400).json({ error: 'SongId requis' });
    }

    const result = await pool.query(`
      SELECT 
        c.*,
        u.name as "userName",
        u.email as "userEmail",
        u."profilePic" as "userProfilePic"
      FROM "Comment" c
      JOIN "User" u ON c."userId" = u.id
      WHERE c."songId" = $1
      ORDER BY c."createdAt" DESC
    `, [parseInt(songId)]);

    // Construire l'arborescence des commentaires
    const commentMap = {};
    const rootComments = [];

    result.rows.forEach(c => {
      commentMap[c.id] = { ...c, replies: [] };
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

// Ajouter un commentaire
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

    // Récupérer les infos de l'utilisateur
    const userResult = await pool.query(
      'SELECT id, name, email, "profilePic" FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const user = userResult.rows[0];

    const result = await pool.query(
      `INSERT INTO "Comment" (content, "userId", "songId", "parentId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [content, decoded.id, parseInt(songId), parentId || null]
    );

    const newComment = {
      ...result.rows[0],
      userName: user.name,
      userEmail: user.email,
      userProfilePic: user.profilePic,
      replies: [],
      likes: 0,
      likedBy: []
    };

    res.json({
      success: true,
      comment: newComment
    });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
});

// Liker un commentaire
app.post('/api/comments/:id/like', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const commentId = parseInt(req.params.id);

    // Récupérer le commentaire
    const commentResult = await pool.query(
      'SELECT * FROM "Comment" WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    const comment = commentResult.rows[0];
    let likedBy = comment.likedBy || [];

    // Vérifier si l'utilisateur a déjà liké
    const index = likedBy.indexOf(decoded.id);
    let liked = false;

    if (index > -1) {
      likedBy.splice(index, 1);
      liked = false;
    } else {
      likedBy.push(decoded.id);
      liked = true;
    }

    await pool.query(
      'UPDATE "Comment" SET likes = $1, "likedBy" = $2 WHERE id = $3',
      [likedBy.length, JSON.stringify(likedBy), commentId]
    );

    res.json({
      success: true,
      likes: likedBy.length,
      liked: liked
    });
  } catch (error) {
    console.error('Erreur like commentaire:', error);
    res.status(500).json({ error: 'Erreur lors du like du commentaire' });
  }
});

// Supprimer un commentaire
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const commentId = parseInt(req.params.id);

    // Vérifier que l'utilisateur est le propriétaire ou admin
    const commentResult = await pool.query(
      'SELECT * FROM "Comment" WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    const comment = commentResult.rows[0];

    // Vérifier si l'utilisateur est le propriétaire ou admin
    const userResult = await pool.query(
      'SELECT role FROM "User" WHERE id = $1',
      [decoded.id]
    );

    const userRole = userResult.rows[0]?.role;

    if (comment.userId !== decoded.id && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await pool.query(
      'DELETE FROM "Comment" WHERE id = $1',
      [commentId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire' });
  }
});

// ============================================================
// ADMIN - ROUTES SPÉCIFIQUES
// ============================================================

// Récupérer les musiques en attente (admin)
app.get('/api/admin/songs/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.name as "artistName", u.id as "artistId"
      FROM "Song" s
      LEFT JOIN "User" u ON s."artistId" = u.id
      WHERE s.status = 'PENDING'
      ORDER BY s."createdAt" DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération musiques en attente:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques en attente' });
  }
});

// Approuver une musique (admin)
app.post('/api/admin/songs/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query(
      'UPDATE "Song" SET status = \'ACCEPTED\', "isVerified" = true WHERE id = $1',
      [id]
    );
    res.json({ success: true, message: 'Musique approuvée' });
  } catch (error) {
    console.error('Erreur approbation musique:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation' });
  }
});

// Refuser une musique (admin)
app.post('/api/admin/songs/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query(
      'UPDATE "Song" SET status = \'REJECTED\' WHERE id = $1',
      [id]
    );
    res.json({ success: true, message: 'Musique refusée' });
  } catch (error) {
    console.error('Erreur refus musique:', error);
    res.status(500).json({ error: 'Erreur lors du refus' });
  }
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: /api/health`);
  console.log(`🔐 Login: /api/auth/login`);
  console.log(`🎵 Songs: /api/songs`);
  console.log(`🎤 Artists: /api/artists`);
  console.log(`💬 Comments: /api/comments`);
});

// ============================================================
// ROUTES USERS (Profil public)
// ============================================================
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT id, email, name, role, "artistName", bio, country, "profilePic", "createdAt"
       FROM "User" WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});
