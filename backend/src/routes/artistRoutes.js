const express = require('express');
const { getArtistProfile, getAllArtists } = require('../controllers/artistController');

const router = express.Router();

// Routes publiques
router.get('/', getAllArtists);
router.get('/:id', getArtistProfile);

module.exports = router;
