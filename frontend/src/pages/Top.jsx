import React, { useEffect, useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import api from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { ArtistCard, SectionTitle, SongRow } from '../components/SongItems';

const periods = [
  { id: 'day', label: "Aujourd'hui" },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'all', label: 'Depuis toujours' },
];

const Top = () => {
  const { playSong } = usePlayer();
  const [period, setPeriod] = useState('week');
  const [songs, setSongs] = useState(null);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    setSongs(null);
    api.get('/api/charts/top-songs', { params: { period, limit: 50 } }).then(({ data }) => setSongs(data.songs || [])).catch(() => setSongs([]));
    api.get('/api/charts/artists', { params: { period: period === 'all' ? 'month' : period, limit: 12 } }).then(({ data }) => setArtists(data.artists || [])).catch(() => setArtists([]));
  }, [period]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-amber-400" />
        <h1 className="text-3xl font-black text-white">Classements</h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">Calculés automatiquement à partir des vraies écoutes (une écoute compte après 30 secondes).</p>

      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {periods.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${period === p.id ? 'bg-white text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {artists.length > 0 && (
        <section className="mt-8">
          <SectionTitle title="Top artistes" />
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {artists.map((a, i) => <ArtistCard key={a.id} artist={a} badge={`#${i + 1} · ${a.plays} écoutes`} />)}
          </div>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle
          title="Top titres"
          action={songs?.length ? (
            <button onClick={() => playSong(songs[0], songs)} className="flex flex-shrink-0 items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400">
              <Play className="h-4 w-4" fill="currentColor" /> Tout écouter
            </button>
          ) : null}
        />
        {songs === null ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : songs.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun titre pour cette période.</p>
        ) : (
          <div>{songs.map((s, i) => <SongRow key={s.id} song={s} list={songs} rank={i + 1} />)}</div>
        )}
      </section>
    </div>
  );
};

export default Top;
