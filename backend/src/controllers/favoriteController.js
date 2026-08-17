const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ajouter/Retirer un favori (toggle)
const toggleFavorite = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;

    // Vérifier si la musique existe
    const song = await prisma.song.findUnique({
      where: { id: parseInt(songId) }
    });

    if (!song) {
      return res.status(404).json({ error: 'Musique non trouvée' });
    }

    // Vérifier si le favori existe déjà
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_songId: {
          userId,
          songId: parseInt(songId)
        }
      }
    });

    if (existingFavorite) {
      // Supprimer le favori
      await prisma.favorite.delete({
        where: {
          userId_songId: {
            userId,
            songId: parseInt(songId)
          }
        }
      });
      return res.json({ message: 'Favori retiré', isFavorite: false });
    } else {
      // Ajouter le favori
      await prisma.favorite.create({
        data: {
          userId,
          songId: parseInt(songId)
        }
      });
      return res.json({ message: 'Favori ajouté', isFavorite: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la gestion du favori' });
  }
};

// Récupérer les favoris de l'utilisateur
const getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
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
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(favorites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
};

// Vérifier si une musique est dans les favoris
const checkFavorite = async (req, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_songId: {
          userId,
          songId: parseInt(songId)
        }
      }
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la vérification du favori' });
  }
};

// Récupérer le nombre de favoris pour une musique
const getFavoriteCount = async (req, res) => {
  try {
    const { songId } = req.params;

    const count = await prisma.favorite.count({
      where: { songId: parseInt(songId) }
    });

    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du comptage des favoris' });
  }
};

module.exports = {
  toggleFavorite,
  getMyFavorites,
  checkFavorite,
  getFavoriteCount
};
