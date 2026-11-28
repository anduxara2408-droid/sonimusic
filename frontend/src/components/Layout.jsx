import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Rss, Search, Library, Radio, Trophy, Users, Disc3, Heart, ListMusic, Upload,
  LayoutDashboard, Shield, LogOut, LogIn, UserPlus, Menu, X, Headset, User, Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlayerBar from './PlayerBar';
import Footer from './Footer';
import CookieConsent from './CookieConsent';
import NotificationsDropdown from './NotificationsDropdown';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
  }`;

const Section = ({ title, items, onNavigate }) => (
  <div>
    {title && <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-600">{title}</p>}
    <div className="space-y-0.5">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass} onClick={onNavigate}>
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </NavLink>
      ))}
    </div>
  </div>
);

const Layout = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [location.pathname]);

  const role = user?.role;
  const main = [
    { to: '/', icon: Home, label: 'Accueil' },
    { to: '/feed', icon: Rss, label: "Fil d'actualités" },
    { to: '/search', icon: Search, label: 'Rechercher' },
    { to: '/top', icon: Trophy, label: 'Classements' },
    { to: '/radio', icon: Radio, label: 'Radio 24h/24' },
    { to: '/artists', icon: Users, label: 'Artistes' },
    { to: '/albums', icon: Disc3, label: 'Albums & projets' },
  ];
  const library = [
    { to: '/library', icon: Library, label: 'Bibliothèque' },
    { to: '/favorites', icon: Heart, label: "Titres aimés" },
    { to: '/playlists', icon: ListMusic, label: 'Playlists' },
  ];
  const artist = [
    { to: '/artist-dashboard', icon: LayoutDashboard, label: 'Espace artiste' },
    { to: '/studio/publish', icon: Upload, label: 'Publier un titre' },
  ];
  const label = [{ to: '/label-dashboard', icon: Building2, label: 'Espace label' }];
  const admin = [{ to: '/admin', icon: Shield, label: 'Administration' }];
  const help = [{ to: '/contact', icon: Headset, label: 'Service client' }];

  const navSections = (onNavigate) => (
    <>
      <Section items={main} onNavigate={onNavigate} />
      {isAuthenticated && <Section title="Ma musique" items={library} onNavigate={onNavigate} />}
      {(role === 'ARTIST' || role === 'ADMIN') && <Section title="Artiste" items={artist} onNavigate={onNavigate} />}
      {(role === 'LABEL' || role === 'ADMIN') && <Section title="Label" items={label} onNavigate={onNavigate} />}
      {role === 'ADMIN' && <Section title="Administration" items={admin} onNavigate={onNavigate} />}
      <Section title="Aide" items={help} onNavigate={onNavigate} />
    </>
  );

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const tabs = [
    { to: '/', icon: Home, label: 'Accueil' },
    { to: '/feed', icon: Rss, label: 'Fil' },
    { to: '/search', icon: Search, label: 'Rechercher' },
    { to: '/library', icon: Library, label: 'Bibliothèque' },
    { to: isAuthenticated ? '/dashboard' : '/login', icon: User, label: isAuthenticated ? 'Profil' : 'Connexion' },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0b0b0b] text-white">
      {/* Barre du haut */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0b]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 md:h-16 md:px-6">
          <button onClick={() => setMenuOpen(true)} className="text-gray-300 md:hidden" aria-label="Menu"><Menu className="h-6 w-6" /></button>
          <Link to="/" className="flex-shrink-0 text-lg font-black tracking-tight md:w-56 md:text-xl">SONI<span className="text-amber-400">MUSIC</span></Link>
          <form onSubmit={submitSearch} className="hidden max-w-xl flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un titre, un artiste…" className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/60" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <NotificationsDropdown />
                <Link to="/dashboard" className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3 hover:bg-white/10">
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-bold text-black">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                  <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">{user?.name}</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-gray-200 hover:text-white">Connexion</Link>
                <Link to="/register" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">Créer un compte</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-screen-2xl">
        {/* Menu latéral (ordinateur) */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 flex-shrink-0 flex-col justify-between overflow-y-auto border-r border-white/10 px-3 py-5 md:flex">
          <nav className="space-y-6">{navSections()}</nav>
          {isAuthenticated && (
            <button onClick={handleLogout} className="mt-6 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:bg-white/5 hover:text-red-400">
              <LogOut className="h-5 w-5" /> Déconnexion
            </button>
          )}
        </aside>

        <main className="min-w-0 flex-1 pb-40 md:pb-28">
          {children}
          <Footer />
        </main>
      </div>

      {/* Menu plein écran (téléphone) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col overflow-y-auto bg-[#111] px-3 py-4">
            <div className="mb-4 flex items-center justify-between px-2">
              <span className="text-lg font-black">SONI<span className="text-amber-400">MUSIC</span></span>
              <button onClick={() => setMenuOpen(false)} aria-label="Fermer"><X className="h-6 w-6 text-gray-300" /></button>
            </div>
            <nav className="space-y-6">{navSections(() => setMenuOpen(false))}</nav>
            <div className="mt-6 border-t border-white/10 pt-4">
              {isAuthenticated ? (
                <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-white/5">
                  <LogOut className="h-5 w-5" /> Déconnexion
                </button>
              ) : (
                <div className="space-y-2 px-1">
                  <Link to="/login" className="flex items-center justify-center gap-2 rounded-full border border-white/15 py-2.5 text-sm font-semibold"><LogIn className="h-4 w-4" /> Connexion</Link>
                  <Link to="/register" className="flex items-center justify-center gap-2 rounded-full bg-amber-500 py-2.5 text-sm font-bold text-black"><UserPlus className="h-4 w-4" /> Créer un compte</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PlayerBar />

      {/* Onglets du bas (téléphone) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-stretch border-t border-white/10 bg-[#0b0b0b]/95 backdrop-blur md:hidden">
        {tabs.map((t) => (
          <NavLink key={t.label} to={t.to} end={t.to === '/'} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
            <t.icon className="h-5 w-5" />
            {t.label}
          </NavLink>
        ))}
      </nav>

      <CookieConsent />
    </div>
  );
};

export default Layout;
