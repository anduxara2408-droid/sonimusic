import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';
import { Search, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  // Fonction pour la photo de profil
  const getProfilePic = (u) => {
    if (!u) return '/images/artists/default.jpg';
    if (u.profilePic) return u.profilePic;
    const emailMap = {
      'contact@sonimusic.online': '/images/artists/demba-tandia.jpg',
      'demba.tandia@sonimusic.online': '/images/artists/demba-tandia.jpg',
      'jkeria@sonimusic.online': '/images/artists/jkeria.jpg',
      'david.soni@sonimusic.online': '/images/artists/david-soni.jpg',
      'lass.ko@sonimusic.online': '/images/artists/lass-ko.jpg',
      'mister.gang@sonimusic.online': '/images/artists/mister-gang.jpg',
      'pispa@sonimusic.online': '/images/artists/pispa-le-roi.jpg',
    };
    if (u.email && emailMap[u.email]) return emailMap[u.email];
    return '/images/artists/default.jpg';
  };

  return (
    <nav className="bg-[#0a0a0a] border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          SONIMUSIC
        </Link>

        <div className="flex items-center gap-4">
          {/* Recherche */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un artiste, une musique..."
              className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-orange-500 outline-none w-48 lg:w-64"
            />
            <button type="submit" className="text-gray-400 hover:text-white">
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* Profil / Connexion */}
          {isAuthenticated ? (
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 hover:opacity-80 transition-all">
                <img
                  src={getProfilePic(user)}
                  alt={user?.name || 'Utilisateur'}
                  className="w-8 h-8 rounded-full object-cover border-2 border-orange-500/30 hover:border-orange-500 transition-colors"
                  onError={(e) => { e.target.src = '/images/artists/default.jpg'; }}
                />
                <span className="hidden md:block text-white text-sm">{user?.name}</span>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#1e1e1e] border border-gray-800 rounded-lg shadow-2xl z-50">
                  <Link to="/dashboard" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a] rounded-t-lg">📊 Dashboard</Link>
                  <Link to={`/user/${user?.id}`} className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a]">👤 Mon profil</Link>
                  <Link to="/favorites" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a]">❤️ Favoris</Link>
                  <Link to="/playlists" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a]">📋 Playlists</Link>
                  {user?.role === 'ARTIST' && (
                    <Link to="/artist-dashboard" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a]">🎤 Dashboard Artiste</Link>
                  )}
                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a]">⚙️ Administration</Link>
                  )}
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-[#2a2a2a] rounded-b-lg">🚪 Déconnexion</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-all">Connexion</Link>
              <Link to="/register" className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black px-4 py-1.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all">Inscription</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
