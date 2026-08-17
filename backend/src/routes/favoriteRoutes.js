const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  toggleFavorite,
  getMyFavorites,
  checkFavorite,
  getFavoriteCount
} = require('../controllers/favoriteController');

const router = express.Router();

// Routes protégées (authentification requise)
router.use(authenticate);

router.post('/songs/:songId/toggle', toggleFavorite);
router.get('/my-favorites', getMyFavorites);
router.get('/songs/:songId/check', checkFavorite);
router.get('/songs/:songId/count', getFavoriteCount);

module.exports = router;
