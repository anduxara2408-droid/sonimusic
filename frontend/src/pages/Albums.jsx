import React from 'react';
import { Link } from 'react-router-dom';
import { Disc3 } from 'lucide-react';

// Albums, EP et mixtapes : la boutique arrive avec l'espace artiste.
const Albums = () => (
  <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
    <h1 className="text-3xl font-black text-white">Albums, EP & mixtapes</h1>
    <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <Disc3 className="mx-auto h-12 w-12 text-amber-400" />
      <p className="mt-4 text-lg font-bold text-white">Les premiers projets arrivent bientôt</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">Les artistes et labels pourront publier et vendre leurs albums, EP et mixtapes directement sur SONIMUSIC.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/discover" className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black">Écouter les titres</Link>
        <Link to="/artistes-labels" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">Je suis artiste ou label</Link>
      </div>
    </div>
  </div>
);

export default Albums;
