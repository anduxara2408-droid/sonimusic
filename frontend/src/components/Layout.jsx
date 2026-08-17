import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
  UserPlusIcon,
  MenuIcon,
  XIcon
} from 'lucide-react';
import Player from './Player';
import NotificationsDropdown from './NotificationsDropdown';

const Layout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  // Navigation publique (visible par tous)
  const publicNavItems = [
    { to: '/', icon: HomeIcon, label: 'Accueil' },
    { to: '/discover', icon: CompassIcon, label: 'Découvrir' },
    { to: '/radio', icon: RadioIcon, label: 'Radio' },
    { to: '/artists', icon: UsersIcon, label: 'Artistes' },
    { to: '/albums', icon: LibraryIcon, label: 'Albums' },
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
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Navbar principale */}
      <nav className="bg-[#0a0a0a] border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
            SONIMUSIC
          </Link>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            {isAuthenticated && <NotificationsDropdown />}

            {/* Menu mobile - 3 barres */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar + Contenu - Toujours visible sur desktop */}
      <div className="flex flex-1">
        {/* Sidebar - Toujours visible sur desktop */}
        <aside className="hidden md:flex w-64 bg-[#0a0a0a] border-r border-gray-800 h-screen sticky top-0 overflow-y-auto flex-col flex-shrink-0">
          <div className="flex-1 px-4 py-6 space-y-6">
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

            {/* Navigation privée */}
            {isAuthenticated && (
              <div>
                <p className="text-xs uppercase text-gray-600 font-semibold px-4 mb-2">Bibliothèque</p>
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

            {/* Navigation Artiste */}
            {isAuthenticated && (user?.role === 'ARTIST' || user?.role === 'ADMIN') && (
              <div>
                <p className="text-xs uppercase text-gray-600 font-semibold px-4 mb-2">Artiste</p>
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

            {/* Navigation Admin */}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <div>
                <p className="text-xs uppercase text-gray-600 font-semibold px-4 mb-2">Administration</p>
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
          </div>

          {/* Profil - Toujours en bas */}
          <div className="border-t border-gray-800 p-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center text-black font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-red-400 hover:text-red-300 hover:bg-[#1a1a1a] transition-all text-sm">
                  <LogOutIcon className="w-4 h-4" />
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link to="/login" className="block w-full text-center px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all text-sm">
                  Se connecter
                </Link>
                <Link to="/register" className="block w-full text-center px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#1a1a1a] transition-all text-sm">
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 pb-32">
          {children}
        </main>
      </div>

      {/* Menu mobile déroulant */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-[#0a0a0a] z-40 px-4 py-4 overflow-y-auto">
          <div className="space-y-1">
            {publicNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
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

          {isAuthenticated && (
            <div>
              <p className="text-xs uppercase text-gray-600 font-semibold px-4 mt-4 mb-2">Bibliothèque</p>
              <div className="space-y-1">
                {privateNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
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

          {isAuthenticated && (user?.role === 'ARTIST' || user?.role === 'ADMIN') && (
            <div>
              <p className="text-xs uppercase text-gray-600 font-semibold px-4 mt-4 mb-2">Artiste</p>
              <div className="space-y-1">
                {artistNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
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

          {isAuthenticated && user?.role === 'ADMIN' && (
            <div>
              <p className="text-xs uppercase text-gray-600 font-semibold px-4 mt-4 mb-2">Administration</p>
              <div className="space-y-1">
                {adminNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
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

          <div className="border-t border-gray-800 pt-4 mt-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center text-black font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user?.name}</p>
                    <p className="text-gray-500 text-xs">{user?.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:text-red-300 hover:bg-[#1a1a1a] transition-all">
                  <LogOutIcon className="w-5 h-5" />
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                  <LogInIcon className="w-5 h-5" />
                  Se connecter
                </Link>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-gray-700 text-gray-300 hover:bg-[#1a1a1a] transition-all mt-2">
                  <UserPlusIcon className="w-5 h-5" />
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lecteur audio */}
      <Player />
    </div>
  );
};

export default Layout;
