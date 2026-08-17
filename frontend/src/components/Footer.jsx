import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-gray-800/50 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-[#c9a25c] mb-3">SONIMUSIC</h3>
            <p className="text-gray-400 text-sm">
              La plateforme qui valorise les artistes africains.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              © 2026 SONIMUSIC. Tous droits réservés.
            </p>
          </div>

          {/* Explorer */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Explorer</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/discover" className="text-gray-400 hover:text-[#c9a25c] transition-colors">Découvrir</Link></li>
              <li><Link to="/artists" className="text-gray-400 hover:text-[#c9a25c] transition-colors">Artistes</Link></li>
              <li><Link to="/albums" className="text-gray-400 hover:text-[#c9a25c] transition-colors">Albums</Link></li>
              <li><Link to="/radio" className="text-gray-400 hover:text-[#c9a25c] transition-colors">Radio</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Légal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/cgu" className="text-gray-400 hover:text-[#c9a25c] transition-colors">CGU</Link></li>
              <li><Link to="/mentions" className="text-gray-400 hover:text-[#c9a25c] transition-colors">Mentions légales</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-[#c9a25c] transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Suivez-nous</h4>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">📸</a>
              <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">🐦</a>
              <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">📘</a>
              <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">🎵</a>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              contact@sonimusic.online
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
