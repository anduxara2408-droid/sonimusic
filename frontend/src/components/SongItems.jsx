import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, Music2, Headphones } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { mediaUrl, artistNameOf, formatCount, formatDuration } from '../lib/api';
import { LikeButton, ShareButton } from './SongActions';

export const Cover = ({ src, alt, className = '' }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-amber-500/30 via-orange-600/20 to-fuchsia-700/30 ${className}`}>
    {src ? (
      <img src={mediaUrl(src)} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
    ) : null}
    {!src && <Music2 className="absolute inset-0 m-auto h-1/3 w-1/3 text-white/40" />}
  </div>
);

// Carte carrée (accueil, carrousels).
export const SongCard = ({ song, list }) => {
  const { current, isPlaying, playSong } = usePlayer();
  const active = current?.id === song.id;
  return (
    <div className="group w-full min-w-0">
      <div className="relative">
        <Cover src={song.coverArt || song.artist?.profilePic} alt={song.title} className="aspect-square w-full rounded-xl shadow-lg" />
        <button
          onClick={() => playSong(song, list)}
          className={`absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500 text-black shadow-xl transition-all ${active ? 'opacity-100' : 'opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100'}`}
          aria-label={active && isPlaying ? 'Pause' : 'Lecture'}
        >
          {active && isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
        </button>
      </div>
      <p className={`mt-2 truncate text-sm font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{song.title}</p>
      <Link to={song.artist?.id ? `/artist/${song.artist.id}` : '#'} className="block truncate text-xs text-gray-400 hover:text-white">{artistNameOf(song)}</Link>
    </div>
  );
};

// Ligne de classement / liste.
export const SongRow = ({ song, list, rank, showStats = true }) => {
  const { current, isPlaying, playSong } = usePlayer();
  const active = current?.id === song.id;
  return (
    <div
      onClick={() => playSong(song, list)}
      className={`group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/5 ${active ? 'bg-white/5' : ''}`}
    >
      {rank != null && <span className={`w-6 flex-shrink-0 text-center text-sm font-bold tabular-nums ${rank <= 3 ? 'text-amber-400' : 'text-gray-500'}`}>{rank}</span>}
      <div className="relative flex-shrink-0">
        <Cover src={song.coverArt || song.artist?.profilePic} alt={song.title} className="h-12 w-12 rounded-lg" />
        <div className={`absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {active && isPlaying ? <Pause className="h-5 w-5 text-white" fill="currentColor" /> : <Play className="h-5 w-5 text-white" fill="currentColor" />}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${active ? 'text-amber-400' : 'text-white'}`}>{song.title}</p>
        <Link to={song.artist?.id ? `/artist/${song.artist.id}` : '#'} onClick={(e) => e.stopPropagation()} className="truncate text-xs text-gray-400 hover:text-white">
          {artistNameOf(song)}
        </Link>
      </div>
      {showStats && (
        <span className="hidden items-center gap-1 text-xs text-gray-500 sm:flex" title="Écoutes">
          <Headphones className="h-3.5 w-3.5" /> {formatCount(song.periodPlays ?? song.plays)}
        </span>
      )}
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <LikeButton songId={song.id} size="sm" />
        <ShareButton song={song} size="sm" />
      </div>
      {song.duration ? <span className="hidden w-10 text-right text-xs tabular-nums text-gray-500 md:block">{formatDuration(song.duration)}</span> : null}
    </div>
  );
};

export const ArtistCard = ({ artist, badge }) => (
  <Link to={`/artist/${artist.id}`} className="group block w-full min-w-0 text-center">
    <Cover src={artist.profilePic} alt={artist.artistName || artist.name} className="mx-auto aspect-square w-full rounded-full shadow-lg ring-2 ring-transparent transition group-hover:ring-amber-500" />
    <p className="mt-2 truncate text-sm font-semibold text-white">{artist.artistName || artist.name}</p>
    {badge && <p className="truncate text-xs text-amber-400">{badge}</p>}
  </Link>
);

export const SectionTitle = ({ title, subtitle, action }) => (
  <div className="mb-4 flex items-end justify-between gap-4">
    <div className="min-w-0">
      <h2 className="truncate text-xl font-extrabold text-white sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>}
    </div>
    {action}
  </div>
);
