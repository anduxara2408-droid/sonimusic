// src/serverless.js - Adaptateur pour Cloudflare Workers
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes.js';
import songRoutes from './routes/songRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import artistRoutes from './routes/artistRoutes.js';

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: 'https://sonimusic.online',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/artists', artistRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'SONIMUSIC API is running' });
});

export async function handleRequest(request, env) {
  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const req = Object.assign(request, { socket: { remoteAddress: '' } });
      const res = {
        writeHead: (status, headers) => {
          Object.assign(res, { statusCode: status, headers });
        },
        end: (body) => {
          resolve(new Response(body, {
            status: res.statusCode || 200,
            headers: new Headers(res.headers || {})
          }));
          server.close();
        }
      };
      app(req, res);
    });
  });
}
