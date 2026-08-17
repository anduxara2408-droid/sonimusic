import React from 'react';
import { Link } from 'react-router-dom';

function Mentions() {
  return (
    <div className="min-h-screen bg-[#0c0b0a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#c9a25c] mb-6">Mentions Légales</h1>
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800/50 space-y-4">
          <h2 className="text-xl font-semibold text-white">Éditeur</h2>
          <p className="text-gray-400">SONIMUSIC est une plateforme dédiée à la musique Soninké.</p>
          <h2 className="text-xl font-semibold text-white mt-4">Hébergement</h2>
          <p className="text-gray-400">Cloudflare Inc.</p>
          <h2 className="text-xl font-semibold text-white mt-4">Contact</h2>
          <p className="text-gray-400">Email : contact@sonimusic.online</p>
        </div>
      </div>
    </div>
  );
}

export default Mentions;
