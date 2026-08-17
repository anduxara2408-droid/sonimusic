const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Récupérer les informations d'un artiste avec ses musiques
const getArtistProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const artist = await prisma.user.findUnique({
      where: { 
        id: parseInt(id),
        role: 'ARTIST'
      },
      select: {
        id: true,
        name: true,
        artistName: true,
        bio: true,
        country: true,
        profilePic: true,
        socials: true,
        email: true,
        createdAt: true,
        songs: {
          where: { status: 'ACCEPTED' },
          orderBy: { createdAt: 'desc' },
          include: {
            favorites: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    if (!artist) {
      return res.status(404).json({ error: 'Artiste non trouvé' });
    }

    // Ajouter le compteur de favoris pour chaque musique
    const artistWithCount = {
      ...artist,
      songs: artist.songs.map(song => ({
        ...song,
        _count: {
          favorites: song.favorites.length
        }
      }))
    };

    res.json(artistWithCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
};

// Récupérer tous les artistes (pour la page de découverte)
const getAllArtists = async (req, res) => {
  try {
    const artists = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      select: {
        id: true,
        name: true,
        artistName: true,
        bio: true,
        country: true,
        profilePic: true,
        songs: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            songs: {
              where: { status: 'ACCEPTED' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(artists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des artistes' });
  }
};

module.exports = { getArtistProfile, getAllArtists };
