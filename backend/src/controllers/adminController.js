const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Récupérer toutes les musiques en attente
const getPendingSongs = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      where: { status: 'PENDING' },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            artistName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques en attente' });
  }
};

// Récupérer toutes les musiques (pour l'admin)
const getAllSongsAdmin = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            artistName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
};

// Récupérer les musiques en attente de vérification
const getPendingVerification = async (req, res) => {
  try {
    const songs = await prisma.song.findMany({
      where: { status: 'PENDING' },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            artistName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
};

// Approuver une musique
const approveSong = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const song = await prisma.song.update({
      where: { id: parseInt(id) },
      data: {
        status: 'ACCEPTED',
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId
      }
    });

    res.json({ message: '✅ Musique approuvée avec succès', song });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation' });
  }
};

// Rejeter une musique avec raison
const rejectSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Une raison est requise pour le rejet' });
    }

    const song = await prisma.song.update({
      where: { id: parseInt(id) },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        isVerified: false
      }
    });

    res.json({ message: '❌ Musique rejetée', song });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
};

// Accepter une musique (ancienne méthode - gardée pour compatibilité)
const acceptSong = async (req, res) => {
  try {
    const { id } = req.params;

    const song = await prisma.song.update({
      where: { id: parseInt(id) },
      data: { status: 'ACCEPTED' }
    });

    res.json({ message: 'Musique acceptée avec succès !', song });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation de la musique' });
  }
};

// Supprimer une musique
const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.song.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Musique supprimée avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// Récupérer tous les artistes
const getAllArtists = async (req, res) => {
  try {
    const artists = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      include: {
        songs: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    });

    res.json(artists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des artistes' });
  }
};

module.exports = {
  getPendingSongs,
  getAllSongsAdmin,
  getPendingVerification,
  approveSong,
  rejectSong,
  acceptSong,
  deleteSong,
  getAllArtists
};
