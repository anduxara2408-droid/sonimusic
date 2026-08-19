import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Music, 
  Heart, 
  ListMusic, 
  LogOut,
  PlayCircle,
  Settings,
  Plus,
  Edit,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import ProfileModal from '../components/ProfileModal';

function Dashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userStats, setUserStats] = useState({
    totalSongs: 0,
    totalFavorites: 0,
    totalPlaylists: 0,
    totalPlays: 0
  });

  useEffect(() => {
    if (user && token) {
      fetchUserData();
    }
  }, [user, token]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Récupérer les favoris
      try {
        const favResponse = await axios.get('https://sonimusic-1.onrender.com/api/favorites/my-favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUserStats(prev => ({ ...prev, totalFavorites: favResponse.data?.length || 0 }));
      } catch (error) {
        console.log('⚠️ Pas de favoris trouvés');
        setUserStats(prev => ({ ...prev, totalFavorites: 0 }));
      }

      // Récupérer les playlists
      try {
        const playResponse = await axios.get('https://sonimusic-1.onrender.com/api/playlists/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUserStats(prev => ({ ...prev, totalPlaylists: playResponse.data?.length || 0 }));
      } catch (error) {
        console.log('⚠️ Pas de playlists trouvées');
        setUserStats(prev => ({ ...prev, totalPlaylists: 0 }));
      }

    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const statItems = [
    { 
      label: 'Favoris', 
      value: userStats.totalFavorites, 
      icon: Heart, 
      color: 'text-red-400' 
    },
    { 
      label: 'Playlists', 
      value: userStats.totalPlaylists, 
      icon: ListMusic, 
      color: 'text-green-400' 
    },
    { 
      label: 'Musiques', 
      value: userStats.totalSongs, 
      icon: Music, 
      color: 'text-blue-400' 
    },
    { 
      label: 'Écoutes', 
      value: userStats.totalPlays, 
      icon: PlayCircle, 
      color: 'text-purple-400' 
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-4 md:p-8">
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
            <p className="text-gray-400">Bienvenue sur SONIMUSIC</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>

        {/* Profil utilisateur */}
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#c9a25c]/20 flex items-center justify-center border-2 border-[#c9a25c]/30">
              <User className="w-8 h-8 text-[#c9a25c]" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{user?.name || 'Utilisateur'}</h2>
              <p className="text-gray-400">{user?.email}</p>
              <span className="px-2 py-1 bg-[#c9a25c]/20 text-[#c9a25c] text-xs rounded-full">
                {user?.role === 'ADMIN' ? 'Administrateur' : user?.role === 'ARTIST' ? 'Artiste' : 'Auditeur'}
              </span>
            </div>
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="px-4 py-2 bg-[#c9a25c] text-black rounded-lg font-medium hover:bg-[#d4af37] transition-all flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statItems.map((stat, index) => (
            <div key={index} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800/50">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions selon le rôle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {(user?.role === 'ARTIST' || user?.role === 'ADMIN') && (
            <button
              onClick={() => navigate('/add-song')}
              className="bg-[#c9a25c]/10 hover:bg-[#c9a25c]/20 border border-[#c9a25c]/30 rounded-xl p-4 text-center transition-all"
            >
              <Plus className="w-8 h-8 text-[#c9a25c] mx-auto mb-2" />
              <h3 className="text-white font-medium">Ajouter une musique</h3>
              <p className="text-gray-400 text-sm">Publiez un nouveau morceau</p>
            </button>
          )}
          <button
            onClick={() => navigate('/discover')}
            className="bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center transition-all"
          >
            <Music className="w-8 h-8 text-white mx-auto mb-2" />
            <h3 className="text-white font-medium">Découvrir</h3>
            <p className="text-gray-400 text-sm">Explorez les nouvelles musiques</p>
          </button>
          <button
            onClick={() => navigate('/favorites')}
            className="bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center transition-all"
          >
            <Heart className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h3 className="text-white font-medium">Mes favoris</h3>
            <p className="text-gray-400 text-sm">Vos titres likés</p>
          </button>
        </div>

        {/* Section découverte */}
        <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50">
          <h3 className="text-lg font-semibold text-white mb-4">🔥 Découvrir</h3>
          <p className="text-gray-400 text-center py-4">
            Explorez les artistes et les musiques de la communauté Soninké
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/discover')}
              className="px-6 py-2 bg-[#c9a25c] text-black rounded-lg font-medium hover:bg-[#d4af37] transition-all"
            >
              Voir les musiques
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
