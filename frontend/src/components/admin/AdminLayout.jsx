import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboardIcon,
  MusicIcon,
  UsersIcon,
  AlbumIcon,
  UserIcon,
  LogOutIcon,
  PlusCircleIcon
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboardIcon, label: 'Tableau de bord' },
    { to: '/admin/add-song', icon: PlusCircleIcon, label: 'Ajouter une musique' },
    { to: '/admin/songs', icon: MusicIcon, label: 'Musiques' },
    { to: '/admin/artists', icon: UsersIcon, label: 'Artistes' },
    { to: '/admin/albums', icon: AlbumIcon, label: 'Albums' },
    { to: '/admin/users', icon: UserIcon, label: 'Utilisateurs' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar admin */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-gray-800 h-screen sticky top-0 overflow-y-auto flex flex-col">
        <div className="p-6">
          <Link to="/admin">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              SONIMUSIC
            </h1>
            <p className="text-xs text-gray-500 mt-1">Administration</p>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  window.location.pathname === item.to
                    ? 'bg-orange-500/10 text-orange-500'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center text-black font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'Administrateur'}
              </p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-all duration-200 mt-2"
          >
            <LogOutIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto bg-[#121212]">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
