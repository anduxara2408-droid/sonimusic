const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getPendingSongs,
  getAllSongsAdmin,
  acceptSong,
  rejectSong,
  deleteSong,
  getAllArtists,
  getPendingVerification,
  approveSong
} = require('../controllers/adminController');

const router = express.Router();

// Toutes les routes admin nécessitent authentification + rôle ADMIN
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Gestion des musiques
router.get('/songs/pending', getPendingSongs);
router.get('/songs/pending-verification', getPendingVerification);
router.get('/songs/all', getAllSongsAdmin);
router.put('/songs/:id/accept', acceptSong);
router.put('/songs/:id/reject', rejectSong);
router.put('/songs/:id/approve', approveSong);
router.delete('/songs/:id', deleteSong);

// Gestion des artistes
router.get('/artists', getAllArtists);

module.exports = router;
