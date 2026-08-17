const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  createPlaylist,
  getMyPlaylists,
  getPublicPlaylists,
  getPlaylistById,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist
} = require('../controllers/playlistController');

const router = express.Router();

// Routes publiques
router.get('/public', getPublicPlaylists);

// Routes protégées (authentification requise)
router.use(authenticate);

// Créer une playlist
router.post('/', createPlaylist);

// Récupérer les playlists de l'utilisateur
router.get('/my', getMyPlaylists);

// Récupérer une playlist par ID (avec vérification des droits)
router.get('/:id', getPlaylistById);

// Ajouter/Supprimer une chanson d'une playlist
router.post('/:playlistId/songs/:songId', addSongToPlaylist);
router.delete('/:playlistId/songs/:songId', removeSongFromPlaylist);

// Supprimer une playlist
router.delete('/:id', deletePlaylist);

module.exports = router;
