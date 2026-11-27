import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { artistNameOf, formatDuration } from '../lib/api';
import { Cover } from './SongItems';
import { LikeButton, ShareButton } from './SongActions';

// Lecteur fixe en bas de l'écran (au-dessus des onglets sur téléphone).
const PlayerBar = () => {
  const { current, isPlaying, progress, duration, volume, toggle, next, prev, seek, setVolume } = usePlayer();
  if (!current) return null;
  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-[60px] z-40 border-t border-white/10 bg-[#111]/95 backdrop-blur md:bottom-0">
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.5}
        value={progress}
        onChange={(e) => seek(Number(e.target.value))}
        className="player-range absolute -top-1.5 left-0 right-0 w-full"
        style={{ '--pct': `${pct}%` }}
        aria-label="Progression"
      />
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-3 py-2 md:px-6">
        <Link to={`/song/${current.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Cover src={current.coverArt || current.artist?.profilePic} alt={current.title} className="h-11 w-11 flex-shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{current.title}</p>
            <p className="truncate text-xs text-gray-400">{artistNameOf(current)}</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={prev} className="hidden text-gray-300 hover:text-white sm:block" aria-label="Précédent"><SkipBack className="h-5 w-5" fill="currentColor" /></button>
          <button onClick={toggle} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:scale-105" aria-label={isPlaying ? 'Pause' : 'Lecture'}>
            {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
          </button>
          <button onClick={next} className="text-gray-300 hover:text-white" aria-label="Suivant"><SkipForward className="h-5 w-5" fill="currentColor" /></button>
        </div>

        <div className="hidden flex-1 items-center justify-end gap-4 md:flex">
          <span className="text-xs tabular-nums text-gray-500">{formatDuration(progress)} / {formatDuration(duration)}</span>
          <LikeButton songId={current.id} />
          <ShareButton song={current} />
          <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="text-gray-400 hover:text-white" aria-label="Volume">
            {volume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-24 accent-amber-500" aria-label="Volume" />
        </div>
        <div className="md:hidden"><LikeButton songId={current.id} /></div>
      </div>
    </div>
  );
};

export default PlayerBar;
