import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

// Connexion directe à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
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
      register: '/api/auth/register'
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

    // Vérifier si l'utilisateur existe déjà
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

// Mot de passe oublié
app.post('/api/auth/forgot-password', async (req, res) => {
  res.json({ success: true, message: 'Fonctionnalité à venir' });
});

// Réinitialiser le mot de passe
app.post('/api/auth/reset-password', async (req, res) => {
  res.json({ success: true, message: 'Fonctionnalité à venir' });
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: /api/health`);
  console.log(`🔐 Login: /api/auth/login`);
});
