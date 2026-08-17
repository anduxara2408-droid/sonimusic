import express from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'superSecretKeyChangeThisInProduction123456789');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// 1. Enregistrer une écoute
router.post('/track-play', authenticateToken, async (req, res) => {
  try {
    const { songId, duration } = req.body;
    const userId = req.user.id;

    if (!songId) {
      return res.status(400).json({ error: 'Song ID requis' });
    }

    // Vérifier que la musique existe
    const song = await prisma.song.findUnique({
      where: { id: parseInt(songId) }
    });

    if (!song) {
      return res.status(404).json({ error: 'Musique non trouvée' });
    }

    // Enregistrer l'écoute
    const playHistory = await prisma.playHistory.create({
      data: {
        userId: userId,
        songId: parseInt(songId),
        duration: duration || 30,
        listenedAt: new Date(),
        ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      }
    });

    res.json({ 
      success: true, 
      message: 'Écoute enregistrée',
      data: playHistory
    });
  } catch (error) {
    console.error('Erreur enregistrement écoute:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

// 2. Statistiques pour un artiste
router.get('/artist/:artistId', authenticateToken, async (req, res) => {
  try {
    const artistId = parseInt(req.params.artistId);
    const userId = req.user.id;

    // Vérifier que c'est bien l'artiste ou un admin
    const artist = await prisma.user.findUnique({
      where: { id: artistId }
    });

    if (!artist) {
      return res.status(404).json({ error: 'Artiste non trouvé' });
    }

    if (artist.id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Récupérer toutes les musiques de l'artiste
    const songs = await prisma.song.findMany({
      where: { artistId: artistId },
      include: {
        playHistory: true,
        favorites: true,
        comments: true
      }
    });

    // Calculer les statistiques
    const totalPlays = songs.reduce((sum, song) => sum + song.playHistory.length, 0);
    const totalFavorites = songs.reduce((sum, song) => sum + song.favorites.length, 0);
    const totalComments = songs.reduce((sum, song) => sum + song.comments.length, 0);

    // Statistiques par musique
    const songStats = songs.map(song => ({
      id: song.id,
      title: song.title,
      plays: song.playHistory.length,
      favorites: song.favorites.length,
      comments: song.comments.length,
      status: song.status,
      createdAt: song.createdAt,
      coverArt: song.coverArt
    }));

    // Écoutes par jour (dernier mois)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const playsByDay = await prisma.playHistory.groupBy({
      by: ['listenedAt'],
      where: {
        songId: {
          in: songs.map(s => s.id)
        },
        listenedAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        listenedAt: 'asc'
      }
    });

    res.json({
      artist: {
        id: artist.id,
        name: artist.name || artist.artistName,
        profilePic: artist.profilePic
      },
      stats: {
        totalPlays,
        totalFavorites,
        totalComments,
        totalSongs: songs.length
      },
      songs: songStats,
      playsByDay: playsByDay.map(day => ({
        date: day.listenedAt,
        count: day._count.id
      }))
    });
  } catch (error) {
    console.error('Erreur statistiques artiste:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// 3. Statistiques pour une musique spécifique
router.get('/song/:songId', authenticateToken, async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);

    const song = await prisma.song.findUnique({
      where: { id: songId },
      include: {
        artist: true,
        playHistory: true,
        favorites: true,
        comments: {
          include: {
            user: true
          }
        }
      }
    });

    if (!song) {
      return res.status(404).json({ error: 'Musique non trouvée' });
    }

    // Statistiques détaillées
    const stats = {
      totalPlays: song.playHistory.length,
      totalFavorites: song.favorites.length,
      totalComments: song.comments.length,
      avgDuration: song.playHistory.length > 0 
        ? Math.round(song.playHistory.reduce((sum, ph) => sum + ph.duration, 0) / song.playHistory.length)
        : 0,
      lastPlays: song.playHistory
        .sort((a, b) => b.listenedAt - a.listenedAt)
        .slice(0, 10)
        .map(ph => ({
          date: ph.listenedAt,
          duration: ph.duration
        })),
      comments: song.comments.map(c => ({
        id: c.id,
        content: c.content,
        user: c.user.name || c.user.email,
        createdAt: c.createdAt
      }))
    };

    res.json({
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist.name || song.artist.artistName
      },
      stats
    });
  } catch (error) {
    console.error('Erreur statistiques musique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// 4. Dashboard global pour l'admin
router.get('/admin/overview', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }

    // Statistiques globales
    const totalUsers = await prisma.user.count();
    const totalSongs = await prisma.song.count();
    const totalPlays = await prisma.playHistory.count();
    const pendingSongs = await prisma.song.count({
      where: { status: 'PENDING' }
    });

    // Musiques les plus écoutées
    const topSongs = await prisma.song.findMany({
      take: 10,
      orderBy: {
        playHistory: {
          _count: 'desc'
        }
      },
      include: {
        artist: true,
        _count: {
          select: {
            playHistory: true,
            favorites: true
          }
        }
      }
    });

    // Utilisateurs actifs
    const activeUsers = await prisma.playHistory.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    const userDetails = await prisma.user.findMany({
      where: {
        id: {
          in: activeUsers.map(u => u.userId).filter(id => id !== null)
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    // Écoutes par jour (dernier mois)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyPlays = await prisma.playHistory.groupBy({
      by: ['listenedAt'],
      where: {
        listenedAt: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        listenedAt: 'asc'
      }
    });

    res.json({
      overview: {
        totalUsers,
        totalSongs,
        totalPlays,
        pendingSongs
      },
      topSongs: topSongs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist.name || s.artist.artistName,
        plays: s._count.playHistory,
        favorites: s._count.favorites
      })),
      activeUsers: activeUsers.map(u => {
        const user = userDetails.find(ud => ud.id === u.userId);
        return {
          id: u.userId,
          name: user?.name || user?.email || 'Inconnu',
          plays: u._count.id
        };
      }),
      dailyPlays: dailyPlays.map(day => ({
        date: day.listenedAt,
        count: day._count.id
      }))
    });
  } catch (error) {
    console.error('Erreur dashboard admin:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des données' });
  }
});

export default router;
