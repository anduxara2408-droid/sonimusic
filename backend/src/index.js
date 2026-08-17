// src/index.js - avec logs de debug
console.log('🚀 Démarrage du Worker...');

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import songRoutes from './routes/songRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import artistRoutes from './routes/artistRoutes.js';

console.log('✅ Imports réussis');

const app = express();
const prisma = new PrismaClient();

console.log('✅ Prisma Client initialisé');

// Middlewares
app.use(cors({
  origin: 'https://sonimusic.online',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/artists', artistRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SONIMUSIC API is running' });
});

// Export pour Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    console.log('📥 Requête reçue:', request.url);
    try {
      const { handleRequest } = await import('./serverless.js');
      console.log('✅ handleRequest importé');
      return handleRequest(request, env);
    } catch (error) {
      console.error('❌ Erreur:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
