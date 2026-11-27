import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Headphones, Heart, MessageCircle, Pause, Play, Share2, Users } from 'lucide-react';
import api, { artistNameOf, formatCount, formatDuration } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { Cover, SectionTitle, SongRow } from '../components/SongItems';
import { LikeButton, ShareButton } from '../components/SongActions';
import Comments from '../components/Comments';

const SongPage = () => {
  const { id } = useParams();
  const { current, isPlaying, playSong, toggle } = usePlayer();
  const [song, setSong] = useState(null);
  const [stats, setStats] = useState(null);
  const [more, setMore] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setSong(null); setError('');
    api.get(`/api/songs/${id}`).then(({ data }) => {
      setSong(data);
      if (data.artist?.id) {
        api.get(`/api/artists/${data.artist.id}/profile`).then(({ data: a }) => setMore((a.songs || []).filter((s) => s.id !== data.id).slice(0, 5))).catch(() => {});
      }
    }).catch(() => setError('Titre introuvable.'));
    api.get(`/api/songs/${id}/stats`).then(({ data }) => setStats(data)).catch(() => {});
  }, [id]);

  if (error) return <div className="px-4 py-20 text-center text-gray-400">{error} <Link to="/discover" className="text-amber-400">Voir tous les titres</Link></div>;
  if (!song) return <div className="mx-auto max-w-5xl px-4 py-10"><div className="h-56 animate-pulse rounded-3xl bg-white/5" /></div>;

  const active = current?.id === song.id;
  const onPlay = () => (active ? toggle() : playSong(song, [song, ...more]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <section className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-amber-600/20 via-transparent to-fuchsia-800/20 p-6 text-center sm:flex-row sm:items-end sm:p-8 sm:text-left">
        <Cover src={song.coverArt || song.artist?.profilePic} alt={song.title} className="aspect-square w-48 flex-shrink-0 rounded-2xl shadow-2xl sm:w-56" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Titre{song.genre ? ` · ${song.genre}` : ''}</p>
          <h1 className="mt-1 break-words text-3xl font-black text-white sm:text-4xl">{song.title}</h1>
          <Link to={song.artist?.id ? `/artist/${song.artist.id}` : '#'} className="mt-2 inline-block text-base font-semibold text-gray-200 hover:underline">{artistNameOf(song)}</Link>
          {song.duration ? <span className="ml-2 text-sm text-gray-500">· {formatDuration(song.duration)}</span> : null}
          <div className="mt-5 flex items-center justify-center gap-5 sm:justify-start">
            <button onClick={onPlay} className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-black shadow-xl hover:scale-105" aria-label="Lecture">
              {active && isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="ml-1 h-6 w-6" fill="currentColor" />}
            </button>
            <LikeButton songId={song.id} initialCount={stats?.likes ?? null} onChange={() => api.get(`/api/songs/${id}/stats`).then(({ data }) => setStats(data)).catch(() => {})} />
            <ShareButton song={song} />
          </div>
        </div>
      </section>

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { icon: Headphones, v: stats.plays, l: 'Écoutes' },
            { icon: Users, v: stats.listeners, l: 'Auditeurs' },
            { icon: Heart, v: stats.likes, l: "J'aime" },
            { icon: Share2, v: stats.shares, l: 'Partages' },
            { icon: MessageCircle, v: stats.comments, l: 'Commentaires' },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl bg-white/5 px-3 py-3 text-center">
              <s.icon className="mx-auto h-4 w-4 text-amber-400" />
              <p className="mt-1 text-lg font-extrabold text-white">{formatCount(s.v)}</p>
              <p className="text-[11px] text-gray-400">{s.l}</p>
            </div>
          ))}
        </div>
      )}

      {song.description && <p className="mt-6 whitespace-pre-line text-sm text-gray-300">{song.description}</p>}

      <section className="mt-8">
        <Comments songId={song.id} />
      </section>

      {more.length > 0 && (
        <section className="mt-10">
          <SectionTitle title={`Plus de ${artistNameOf(song)}`} />
          {more.map((s) => <SongRow key={s.id} song={s} list={more} />)}
        </section>
      )}
    </div>
  );
};

export default SongPage;
