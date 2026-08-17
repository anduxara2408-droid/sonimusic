import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://sonimusic.online', 'http://localhost:5173', 'https://sonimusic-api.onrender.com'],
  credentials: true
}));
app.use(express.json());

// ============================================================
// ROUTE DE SANTÉ
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'SONIMUSIC API is running',
    timestamp: new Date().toISOString()
  });
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
      auth: '/api/auth'
    }
  });
});

// ============================================================
// ROUTES D'AUTHENTIFICATION (IMPORTER PLUS TARD)
// ============================================================
// app.use('/api/auth', authRoutes);

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
