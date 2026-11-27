import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Smartphone } from 'lucide-react';
import { openCookieSettings } from './CookieConsent';
import { isDesktopMode, setDesktopMode } from '../lib/desktopMode';

const columns = [
  {
    title: 'Découvrir',
    links: [
      { to: '/top', label: 'Classements' },
      { to: '/discover', label: 'Tous les titres' },
      { to: '/artists', label: 'Artistes' },
      { to: '/radio', label: 'Radio 24h/24' },
    ],
  },
  {
    title: 'SONIMUSIC',
    links: [
      { to: '/about', label: 'À propos' },
      { to: '/artistes-labels', label: 'Artistes & labels' },
      { to: '/contact', label: 'Service client & réclamations' },
    ],
  },
  {
    title: 'Informations légales',
    links: [
      { to: '/cgu', label: "Conditions d'utilisation" },
      { to: '/mentions', label: 'Mentions légales' },
      { to: '/confidentialite', label: 'Confidentialité' },
      { to: '/cookies', label: 'Politique cookies' },
    ],
  },
];

const Footer = () => {
  const [desktop, setDesktop] = useState(isDesktopMode());
  const toggleDesktop = () => {
    setDesktopMode(!desktop);
    setDesktop(!desktop);
  };

  return (
    <footer className="mt-16 border-t border-white/10 px-4 pb-8 pt-10 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Link to="/" className="text-xl font-black tracking-tight text-white">SONI<span className="text-amber-400">MUSIC</span></Link>
          <p className="mt-3 text-sm text-gray-400">Les prochaines tendances de la musique africaine sont d'abord sur SONIMUSIC.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.to}><Link to={l.to} className="text-sm text-gray-300 hover:text-white">{l.label}</Link></li>
              ))}
              {col.title === 'Informations légales' && (
                <li><button onClick={openCookieSettings} className="text-left text-sm text-gray-300 hover:text-white">Gestionnaire de cookies</button></li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row">
        <p>© {new Date().getFullYear()} SONIMUSIC · Langue : Français</p>
        <button onClick={toggleDesktop} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-gray-300 hover:bg-white/10">
          {desktop ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          {desktop ? 'Revenir à la version mobile' : 'Version ordinateur'}
        </button>
      </div>
    </footer>
  );
};

export default Footer;
