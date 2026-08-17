const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { createSong, getMySongs, getAllSongs, getSongById } = require('../controllers/songController');
const upload = require('../middleware/upload');

const router = express.Router();

// Routes publiques
router.get('/', getAllSongs);

// ⚠️ IMPORTANT: /my-songs DOIT être AVANT /:id
router.get('/my-songs', authenticate, authorize(['ARTIST', 'ADMIN']), getMySongs);
router.get('/:id', getSongById);

// Routes protégées (authentification requise)
router.use(authenticate);

// Routes pour les artistes
router.post('/add', 
  authorize(['ARTIST', 'ADMIN']),
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  createSong
);

module.exports = router;
