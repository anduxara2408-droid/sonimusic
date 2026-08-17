const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Créer une playlist
const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        isPublic: isPublic !== undefined ? isPublic : true,
        userId
      }
    });

    res.status(201).json(playlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création de la playlist' });
  }
};

// Récupérer les playlists de l'utilisateur
const getMyPlaylists = async (req, res) => {
  try {
    const userId = req.user.id;

    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        songs: {
          include: {
            song: {
              include: {
                artist: {
                  select: {
                    name: true,
                    artistName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(playlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des playlists' });
  }
};

// Récupérer les playlists publiques
const getPublicPlaylists = async (req, res) => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: {
            name: true,
            artistName: true
          }
        },
        songs: {
          include: {
            song: {
              include: {
                artist: {
                  select: {
                    name: true,
                    artistName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(playlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des playlists' });
  }
};

// Récupérer une playlist par ID (avec vérification des droits)
const getPlaylistById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findFirst({
      where: {
        id: parseInt(id),
        OR: [
          { userId: userId },
          { isPublic: true }
        ]
      },
      include: {
        songs: {
          include: {
            song: {
              include: {
                artist: {
                  select: {
                    name: true,
                    artistName: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            artistName: true
          }
        }
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trouvée' });
    }

    res.json(playlist);
  } catch (error) {
    console.error('Erreur getPlaylistById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la playlist' });
  }
};

// Ajouter une chanson à une playlist
const addSongToPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;

    // Vérifier que la playlist appartient à l'utilisateur
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: parseInt(playlistId),
        userId
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trouvée' });
    }

    // Vérifier que la chanson existe
    const song = await prisma.song.findUnique({
      where: { id: parseInt(songId) }
    });

    if (!song) {
      return res.status(404).json({ error: 'Chanson non trouvée' });
    }

    // Ajouter la chanson à la playlist
    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId: parseInt(playlistId),
        songId: parseInt(songId)
      }
    });

    res.status(201).json(playlistSong);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la chanson' });
  }
};

// Supprimer une chanson d'une playlist
const removeSongFromPlaylist = async (req, res) => {
  try {
    const { playlistId, songId } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findFirst({
      where: {
        id: parseInt(playlistId),
        userId
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trouvée' });
    }

    await prisma.playlistSong.deleteMany({
      where: {
        playlistId: parseInt(playlistId),
        songId: parseInt(songId)
      }
    });

    res.json({ message: 'Chanson retirée de la playlist' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// Supprimer une playlist
const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await prisma.playlist.findFirst({
      where: {
        id: parseInt(id),
        userId
      }
    });

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist non trouvée' });
    }

    await prisma.playlist.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Playlist supprimée' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  createPlaylist,
  getMyPlaylists,
  getPublicPlaylists,
  getPlaylistById,
  addSongToPlaylist,
  removeSongFromPlaylist,
  deletePlaylist
};
