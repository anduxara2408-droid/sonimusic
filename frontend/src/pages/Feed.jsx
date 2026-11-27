import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rss } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArtistCard, SectionTitle, SongRow } from '../components/SongItems';

// Fil d'actualités : les nouveaux titres des artistes suivis.
const Feed = () => {
  const { isAuthenticated } = useAuth();
  const [songs, setSongs] = useState(null);
  const [suggest, setSuggest] = useState([]);

  useEffect(() => {
    api.get('/api/artists').then(({ data }) => setSuggest((data || []).slice(0, 6))).catch(() => {});
    if (!isAuthenticated) { setSongs([]); return; }
    api.get('/api/feed').then(({ data }) => setSongs(data || [])).catch(() => setSongs([]));
  }, [isAuthenticated]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Rss className="h-7 w-7 text-amber-400" />
        <h1 className="text-3xl font-black text-white">Fil d'actualités</h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">Les nouveautés des artistes que tu suis.</p>

      {!isAuthenticated ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-gray-200">Connecte-toi pour suivre tes artistes préférés et voir leurs nouveautés ici.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link to="/login" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold">Connexion</Link>
            <Link to="/register" className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black">Créer un compte</Link>
          </div>
        </div>
      ) : songs === null ? (
        <div className="mt-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
      ) : songs.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white/5 p-6 text-center text-gray-300">Tu ne suis encore aucun artiste. Abonne-toi à quelques artistes ci-dessous.</p>
      ) : (
        <div className="mt-6">{songs.map((s) => <SongRow key={s.id} song={s} list={songs} />)}</div>
      )}

      {suggest.length > 0 && (
        <section className="mt-10">
          <SectionTitle title="Artistes à suivre" />
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">{suggest.map((a) => <ArtistCard key={a.id} artist={a} />)}</div>
        </section>
      )}
    </div>
  );
};

export default Feed;
