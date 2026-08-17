import React from 'react';
import { Link } from 'react-router-dom';
import logo from '/images/logo-sonimusic.png';

function About() {
  return (
    <div className="min-h-screen bg-[#0c0b0a] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête */}
        <div className="text-center mb-12">
          <img src={logo} alt="SONIMUSIC" className="w-24 h-24 mx-auto object-contain" />
          <h1 className="text-4xl font-bold text-white mt-4">À propos de SONIMUSIC</h1>
          <p className="text-gray-400 mt-2">La plateforme qui valorise les artistes africains</p>
        </div>

        {/* Mission */}
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 mb-8">
          <h2 className="text-2xl font-bold text-[#c9a25c] mb-4">🎯 Notre mission</h2>
          <p className="text-gray-300 leading-relaxed">
            SONIMUSIC est une plateforme musicale dédiée à la valorisation des artistes africains. 
            Notre mission est de donner une visibilité mondiale aux talents du continent africain, 
            en particulier ceux des communautés soninké et mandingue.
          </p>
        </div>

        {/* Vision */}
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 mb-8">
          <h2 className="text-2xl font-bold text-[#c9a25c] mb-4">🌟 Notre vision</h2>
          <p className="text-gray-300 leading-relaxed">
            Créer un écosystème musical où les artistes africains peuvent :
          </p>
          <ul className="mt-4 space-y-2 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-[#c9a25c]">✓</span>
              <span>Publier et distribuer leur musique facilement</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#c9a25c]">✓</span>
              <span>Gagner en visibilité et toucher un public mondial</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#c9a25c]">✓</span>
              <span>Monétiser leur art et vivre de leur passion</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-[#c9a25c]">✓</span>
              <span>Créer une communauté autour de la musique africaine</span>
            </li>
          </ul>
        </div>

        {/* Équipe */}
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 mb-8">
          <h2 className="text-2xl font-bold text-[#c9a25c] mb-4">👥 L'équipe</h2>
          <p className="text-gray-300 leading-relaxed">
            SONIMUSIC est porté par une équipe passionnée de musique et de technologie, 
            animée par la volonté de faire rayonner la culture africaine à travers le monde.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50">
          <h2 className="text-2xl font-bold text-[#c9a25c] mb-4">📬 Contact</h2>
          <div className="space-y-3 text-gray-300">
            <p>📧 Email : <a href="mailto:contact@sonimusic.com" className="text-[#c9a25c] hover:underline">contact@sonimusic.com</a></p>
            <p>📱 WhatsApp : <a href="#" className="text-[#c9a25c] hover:underline">+222 44 01 39 65</a></p>
            <p>📍 Adresse : Nouakchott, Mauritanie</p>
          </div>
          <div className="mt-6 flex gap-4">
            <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">📸</a>
            <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">🐦</a>
            <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">📘</a>
            <a href="#" className="text-gray-400 hover:text-[#c9a25c] transition-colors text-2xl">🎵</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
