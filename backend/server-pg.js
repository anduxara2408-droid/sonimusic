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

// ============================================================
// MIDDLEWARE AUTH
// ============================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
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
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

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
    res.json({ status: 'OK', message: 'SONIMUSIC API is running', database: 'connected' });
  } catch (error) {
    res.json({ status: 'OK', message: 'SONIMUSIC API is running', database: 'error', error: error.message });
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
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email, role: result.rows[0].role },
      process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789',
      { expiresIn: '7d' }
    );
    res.status(201).json({ success: true, message: 'Inscription réussie !', token, user: result.rows[0] });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789',
      { expiresIn: '7d' }
    );
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
// MOT DE PASSE OUBLIÉ
// ============================================================

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: 'Si un compte existe, un lien de réinitialisation vous a été envoyé.' });
    }
    const user = userResult.rows[0];
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 3600000);
    await pool.query(`UPDATE "User" SET "resetToken" = $1, "resetTokenExpiry" = $2 WHERE id = $3`, [resetToken, resetTokenExpiry, user.id]);
    const resetUrl = `${process.env.FRONTEND_URL || 'https://sonimusic.online'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    await transporter.sendMail({
      from: `"SONIMUSIC" <${process.env.EMAIL_USER || 'noreply@sonimusic.online'}>`,
      to: email,
      subject: '🔑 Réinitialisation de votre mot de passe SONIMUSIC',
      html: `<div style="max-width:600px;padding:20px;font-family:Arial;background-color:#0c0b0a;color:white;"><h1 style="color:#d4af37;">🔑 SONIMUSIC</h1><p>Cliquez sur le lien pour réinitialiser votre mot de passe :</p><a href="${resetUrl}" style="display:inline-block;padding:12px 30px;background:#d4af37;color:black;text-decoration:none;border-radius:5px;">🔐 Réinitialiser</a></div>`
    });
    res.json({ success: true, message: 'Un email de réinitialisation vous a été envoyé.' });
  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const userResult = await pool.query(
      `SELECT * FROM "User" WHERE email = $1 AND "resetToken" = $2 AND "resetTokenExpiry" > NOW()`,
      [email, token]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }
    const user = userResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`UPDATE "User" SET password = $1, "resetToken" = NULL, "resetTokenExpiry" = NULL WHERE id = $2`, [hashedPassword, user.id]);
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
    const result = await pool.query(`
      SELECT s.*, u.name as "artistName", u.id as "artistId"
      FROM "Song" s LEFT JOIN "User" u ON s."artistId" = u.id
      WHERE s.status = 'ACCEPTED' ORDER BY s."createdAt" DESC LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération musiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
});

app.get('/api/songs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT s.*, u.name as "artistName", u.id as "artistId"
      FROM "Song" s LEFT JOIN "User" u ON s."artistId" = u.id WHERE s.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Musique non trouvée' });
    res.json(result.rows[0]);
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
    const id = parseInt(req.params.id);
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
    const albums = [
      { id: 1, title: "Fii Siire", artistId: 1, artist: { id: 1, name: "Demba Tandia" }, year: 2022, coverArt: "/images/albums/fii-siire.jpg", description: "Album Fii Siire de Demba Tandia", songs: [1,2,3,4,5,6,7,8,9,10] },
      { id: 2, title: "Bataaxe", artistId: 1, artist: { id: 1, name: "Demba Tandia" }, year: 2023, coverArt: "/images/albums/bataaxe.jpg", description: "Album Bataaxe de Demba Tandia", songs: [11,12,13,14,15,16,17,18] }
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

app.get('/api/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT id, email, name, role, "artistName", bio, country, "profilePic", "createdAt" FROM "User" WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(result.rows[0]);
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
    const { profilePic } = req.body;
    if (!profilePic) return res.status(400).json({ error: 'URL de la photo requise' });
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
    const { name, bio, country } = req.body;
    const result = await pool.query(
      `UPDATE "User" SET name = COALESCE($1, name), bio = COALESCE($2, bio), country = COALESCE($3, country), "updatedAt" = NOW()
       WHERE id = $4 RETURNING id, email, name, role, "artistName", bio, country, "profilePic"`,
      [name, bio, country, req.user.id]
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
    const { songId } = req.body;
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
    const { name, description, isPublic } = req.body;
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
    const { songId } = req.body;
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
    const { notificationId } = req.body;
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
    const { songId } = req.query;
    if (!songId) return res.status(400).json({ error: 'SongId requis' });
    const result = await pool.query(`
      SELECT c.*, u.name as "userName", u.email as "userEmail", u."profilePic" as "userProfilePic"
      FROM "Comment" c JOIN "User" u ON c."userId" = u.id
      WHERE c."songId" = $1 ORDER BY c."createdAt" DESC
    `, [parseInt(songId)]);
    const commentMap = {};
    const rootComments = [];
    result.rows.forEach(c => { commentMap[c.id] = { ...c, replies: [] }; });
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
    const { songId, content, parentId } = req.body;
    if (!songId || !content) return res.status(400).json({ error: 'SongId et contenu requis' });
    const userResult = await pool.query('SELECT id, name, email, "profilePic" FROM "User" WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    const result = await pool.query(
      `INSERT INTO "Comment" (content, "userId", "songId", "parentId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [content, req.user.id, parseInt(songId), parentId || null]
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
    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Erreur ajout commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
});

app.post('/api/comments/:id/like', authenticateToken, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    const commentResult = await pool.query('SELECT * FROM "Comment" WHERE id = $1', [commentId]);
    if (commentResult.rows.length === 0) return res.status(404).json({ error: 'Commentaire non trouvé' });
    const comment = commentResult.rows[0];
    let likedBy = comment.likedBy || [];
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
    const commentId = parseInt(req.params.id);
    const commentResult = await pool.query('SELECT * FROM "Comment" WHERE id = $1', [commentId]);
    if (commentResult.rows.length === 0) return res.status(404).json({ error: 'Commentaire non trouvé' });
    const comment = commentResult.rows[0];
    const userResult = await pool.query('SELECT role FROM "User" WHERE id = $1', [req.user.id]);
    const userRole = userResult.rows[0]?.role;
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
    const result = await pool.query(`
      SELECT s.*, u.name as "artistName", u.id as "artistId"
      FROM "Song" s LEFT JOIN "User" u ON s."artistId" = u.id
      WHERE s.status = 'PENDING' ORDER BY s."createdAt" DESC
    `);
    res.json(result.rows);
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
// DÉMARRAGE DU SERVEUR
// ============================================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🎵 SONIMUSIC API - Version 2.0');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: /api/health`);
  console.log(`🔐 Login: /api/auth/login`);
  console.log(`🎵 Songs: /api/songs`);
  console.log(`🎤 Artists: /api/artists`);
  console.log(`💬 Comments: /api/comments`);
  console.log(`📸 Profile: /api/users/profile`);
  console.log('='.repeat(60));
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});
