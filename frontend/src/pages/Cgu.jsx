import React from 'react';
import { Link } from 'react-router-dom';

function Cgu() {
  return (
    <div className="min-h-screen bg-[#0c0b0a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#c9a25c] mb-6">Conditions Générales d'Utilisation</h1>
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800/50 space-y-4">
          <p className="text-gray-300">Dernière mise à jour : 13 août 2026</p>
          <h2 className="text-xl font-semibold text-white mt-6">1. Acceptation des conditions</h2>
          <p className="text-gray-400">En utilisant la plateforme SONIMUSIC, vous acceptez les présentes conditions générales d'utilisation.</p>
          <h2 className="text-xl font-semibold text-white mt-6">2. Compte utilisateur</h2>
          <p className="text-gray-400">Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe.</p>
          <h2 className="text-xl font-semibold text-white mt-6">3. Contenu</h2>
          <p className="text-gray-400">Les artistes sont responsables du contenu qu'ils publient sur la plateforme.</p>
          <h2 className="text-xl font-semibold text-white mt-6">4. Propriété intellectuelle</h2>
          <p className="text-gray-400">Tous les droits sont réservés. Le contenu publié reste la propriété de ses auteurs.</p>
        </div>
      </div>
    </div>
  );
}

export default Cgu;
