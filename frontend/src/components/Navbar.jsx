import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Charger l'utilisateur depuis localStorage
  const loadUser = () => {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setIsAuthenticated(true);
        console.log('✅ Navbar: Utilisateur chargé', parsed.name);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error('❌ Erreur chargement user:', e);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadUser();
    
    // Écouter les changements dans localStorage (pour les autres onglets)
    const handleStorageChange = () => {
      loadUser();
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

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
              placeholder="Rechercher..."
              className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-orange-500 outline-none w-48 lg:w-64"
            />
            <button type="submit" className="text-gray-400 hover:text-white">
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Auth Section */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link to={`/user/${user.id}`} className="flex items-center gap-2 hover:opacity-80 transition-all">
                <img
                  src={getProfilePic(user)}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border-2 border-orange-500/30 hover:border-orange-500 transition-colors"
                  onError={(e) => { e.target.src = '/images/artists/default.jpg'; }}
                />
                <span className="hidden md:block text-white text-sm font-medium">
                  {user?.name || 'Utilisateur'}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="text-gray-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-all">
                Connexion
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black px-4 py-1.5 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                Inscription
              </Link>
            </div>
          )}

          {/* Menu mobile */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden px-4 pb-4 border-t border-gray-800">
          <div className="flex flex-col gap-2 pt-4">
            <Link to="/" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Accueil</Link>
            <Link to="/artists" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Artistes</Link>
            <Link to="/discover" className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Découvrir</Link>
            {isAuthenticated && user && (
              <>
                <Link to={`/user/${user.id}`} className="text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(false)}>Mon profil</Link>
                <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="text-red-400 hover:text-red-300 text-left">Déconnexion</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
