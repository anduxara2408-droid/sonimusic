import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, List, Play } from 'lucide-react';
import api from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { SongCard, SongRow } from '../components/SongItems';

// Tous les titres publiés.
const Discover = () => {
  const { playSong } = usePlayer();
  const [songs, setSongs] = useState(null);
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    api.get('/api/songs').then(({ data }) => setSongs(data || [])).catch(() => setSongs([]));
  }, []);

  const sorted = useMemo(() => {
    if (!songs) return [];
    const list = [...songs];
    if (sort === 'plays') list.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    return list;
  }, [songs, sort]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-black text-white">Tous les titres</h1>
      <p className="mt-1 text-sm text-gray-400">{songs ? `${songs.length} titres` : 'Chargement…'}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {sorted.length > 0 && (
          <button onClick={() => playSong(sorted[0], sorted)} className="flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400">
            <Play className="h-4 w-4" fill="currentColor" /> Tout écouter
          </button>
        )}
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none">
          <option value="recent" className="bg-[#111]">Plus récents</option>
          <option value="plays" className="bg-[#111]">Plus écoutés</option>
          <option value="title" className="bg-[#111]">Titre (A-Z)</option>
        </select>
        <div className="ml-auto flex rounded-full bg-white/5 p-1">
          <button onClick={() => setView('grid')} className={`rounded-full p-2 ${view === 'grid' ? 'bg-white/15 text-white' : 'text-gray-400'}`} aria-label="Grille"><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setView('list')} className={`rounded-full p-2 ${view === 'list' ? 'bg-white/15 text-white' : 'text-gray-400'}`} aria-label="Liste"><List className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-6">
        {songs === null ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : sorted.length === 0 ? (
          <p className="text-gray-500">Aucun titre publié pour l'instant.</p>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{sorted.map((s) => <SongCard key={s.id} song={s} list={sorted} />)}</div>
        ) : (
          <div>{sorted.map((s) => <SongRow key={s.id} song={s} list={sorted} />)}</div>
        )}
      </div>
    </div>
  );
};

export default Discover;
