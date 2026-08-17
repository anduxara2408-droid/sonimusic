import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://sonimusic.online', 'http://localhost:5173', 'https://sonimusic-api.onrender.com'],
  credentials: true
}));
app.use(express.json());

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'SONIMUSIC API is running',
    timestamp: new Date().toISOString()
  });
});

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'SONIMUSIC API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health'
    }
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: /api/health`);
});
