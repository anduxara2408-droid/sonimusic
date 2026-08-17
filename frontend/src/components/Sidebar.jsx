import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon, 
  CompassIcon, 
  RadioIcon, 
  HeartIcon, 
  LibraryIcon,
  PlusCircleIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MusicIcon,
  UsersIcon,
  LogInIcon,
  UserPlusIcon
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation publique (visible par tous)
  const publicNavItems = [
    { to: '/', icon: HomeIcon, label: 'Accueil' },
    { to: '/discover', icon: CompassIcon, label: 'Découvrir' },
    { to: '/radio', icon: RadioIcon, label: 'Radio' },
  ];

  // Navigation privée (uniquement connecté)
  const privateNavItems = [
    { to: '/favorites', icon: HeartIcon, label: 'Favoris' },
    { to: '/playlists', icon: LibraryIcon, label: 'Playlists' },
  ];

  // Navigation Artiste (uniquement ARTIST ou ADMIN)
  const artistNavItems = [
    { to: '/add-song', icon: PlusCircleIcon, label: 'Ajouter musique' },
    { to: '/my-songs', icon: MusicIcon, label: 'Mes musiques' },
    { to: '/artist-dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
  ];

  // Navigation Admin (uniquement ADMIN)
  const adminNavItems = [
    { to: '/admin', icon: LayoutDashboardIcon, label: 'Admin Dashboard' },
    { to: '/admin/songs', icon: MusicIcon, label: 'Gérer musiques' },
    { to: '/admin/artists', icon: UsersIcon, label: 'Gérer artistes' },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-gray-800 h-screen sticky top-0 overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          SONIMUSIC
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-6">
        {/* Navigation publique */}
        <div className="space-y-1">
          {publicNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Navigation privée (uniquement si connecté) */}
        {isAuthenticated && (
          <div>
            <p className="text-xs uppercase text-gray-600 font-semibold px-4 mb-2">
              Bibliothèque
            </p>
            <div className="space-y-1">
              {privateNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Artiste (ARTIST ou ADMIN) */}
        {isAuthenticated && (user?.role === 'ARTIST' || user?.role === 'ADMIN') && (
          <div>
            <p className="text-xs uppercase text-gray-600 font-semibold px-4 mb-2">
              Artiste
            </p>
            <div className="space-y-1">
              {artistNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Admin (uniquement ADMIN) */}
        {isAuthenticated && user?.role === 'ADMIN' && (
          <div>
            <p className="text-xs uppercase text-gray-600 font-semibold px-4 mb-2">
              Administration
            </p>
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-orange-500/10 text-orange-500'
                        : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer avec profil ou connexion */}
      <div className="border-t border-gray-800 p-4 space-y-3">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center text-black font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'Utilisateur'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role || 'LISTENER'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-all duration-200"
            >
              <LogOutIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Déconnexion</span>
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <NavLink
              to="/login"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <LogInIcon className="w-4 h-4" />
              Se connecter
            </NavLink>
            <NavLink
              to="/register"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#1a1a1a] transition-all"
            >
              <UserPlusIcon className="w-4 h-4" />
              S'inscrire
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
