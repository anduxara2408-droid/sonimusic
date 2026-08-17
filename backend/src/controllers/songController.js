const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ajouter une musique (seulement pour les artistes)
const createSong = async (req, res) => {
  try {
    const { title, genre, description, credits, certification } = req.body;
    const artistId = req.user.id;

    // Vérifier que l'utilisateur est un artiste
    if (req.user.role !== 'ARTIST') {
      return res.status(403).json({ error: 'Seuls les artistes peuvent ajouter des musiques' });
    }

    // Vérifier la certification des droits
    if (certification !== 'true') {
      return res.status(400).json({ error: 'Vous devez certifier détenir les droits sur cette œuvre' });
    }

    // Vérifier les fichiers
    if (!req.files || !req.files.audio || !req.files.cover) {
      return res.status(400).json({ error: 'Fichier audio et pochette requis' });
    }

    const audioFile = req.files.audio[0];
    const coverFile = req.files.cover[0];

    // Vérifier le format audio (MP3 ou WAV)
    const audioExt = audioFile.originalname.split('.').pop().toLowerCase();
    if (!['mp3', 'wav'].includes(audioExt)) {
      return res.status(400).json({ error: 'Format audio non supporté. Utilisez MP3 ou WAV.' });
    }

    // Vérifier la taille du fichier audio (max 20MB)
    if (audioFile.size > 20 * 1024 * 1024) {
      return res.status(400).json({ error: 'Fichier audio trop volumineux (max 20MB)' });
    }

    // Vérifier le format de l'image (carré)
    // Note: pour une vérification complète, il faudrait utiliser sharp ou jimp

    const song = await prisma.song.create({
      data: {
        title,
        genre,
        description,
        credits: credits ? JSON.parse(credits) : null,
        audioFile: audioFile.path,
        coverArt: coverFile.path,
        artistId,
        status: 'PENDING',
        isVerified: false,
        rejectionReason: null
      }
    });

    res.status(201).json({
      message: 'Musique ajoutée avec succès ! En attente de vérification.',
      song
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la musique' });
  }
};

// Récupérer les musiques de l'artiste connecté
const getMySongs = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (userRole !== 'ARTIST') {
      return res.json([]);
    }
    
    const songs = await prisma.song.findMany({
      where: { artistId: userId },
      include: { 
        artist: { 
          select: { 
            name: true, 
            artistName: true 
          } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(songs);
  } catch (error) {
    console.error('Erreur getMySongs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
};

// Récupérer toutes les musiques (pour les auditeurs)
const getAllSongs = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      where: { 
        status: 'ACCEPTED',
        isVerified: true
      },
      include: { 
        artist: { 
          select: { 
            name: true, 
            artistName: true,
            bio: true,
            country: true
          } 
        },
        favorites: {
          select: {
            id: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const songsWithCount = songs.map(song => ({
      ...song,
      _count: {
        favorites: song.favorites.length
      }
    }));

    res.json(songsWithCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
};

// Récupérer une musique par ID
const getSongById = async (req, res) => {
  try {
    const { id } = req.params;
    const songId = parseInt(id);
    
    if (isNaN(songId)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: { 
        artist: { 
          select: { 
            name: true, 
            artistName: true, 
            bio: true, 
            country: true 
          } 
        },
        favorites: {
          select: {
            id: true
          }
        }
      }
    });

    if (!song) {
      return res.status(404).json({ error: 'Musique non trouvée' });
    }

    const songWithCount = {
      ...song,
      _count: {
        favorites: song.favorites.length
      }
    };

    res.json(songWithCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la musique' });
  }
};

module.exports = { createSong, getMySongs, getAllSongs, getSongById };
