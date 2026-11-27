import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Radio as RadioIcon, Volume2, VolumeX } from 'lucide-react';
import api, { artistNameOf, mediaUrl } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { Cover } from '../components/SongItems';

// Radio SONIMUSIC : le serveur indique le titre en cours et la seconde exacte,
// tout le monde entend donc la même chose au même moment.
const Radio = () => {
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const onRef = useRef(false);
  const { pause: pausePlayer } = usePlayer();
  const [state, setState] = useState(null);
  const [on, setOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const sync = useCallback(async (play) => {
    try {
      const { data } = await api.get('/api/radio/now');
      setState(data);
      setError('');
      if (!data.live) return;
      const audio = audioRef.current;
      if (play && onRef.current && audio) {
        const src = mediaUrl(data.current.audioFile);
        if (!audio.src.endsWith(src)) audio.src = src;
        const startAt = data.position;
        const seekAndPlay = () => {
          try { audio.currentTime = startAt; } catch { /* ignoré */ }
          audio.play().catch(() => { onRef.current = false; setOn(false); });
        };
        if (audio.readyState >= 1) seekAndPlay();
        else audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
      }
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => sync(onRef.current), Math.max(1000, data.remaining * 1000 + 300));
    } catch {
      setError('La radio est momentanément indisponible. Nouvel essai…');
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => sync(onRef.current), 8000);
    }
  }, []);

  useEffect(() => {
    sync(false);
    const audio = audioRef.current;
    return () => { clearTimeout(timerRef.current); audio?.pause(); };
  }, [sync]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => setElapsed(audio.currentTime);
    const onEnd = () => sync(onRef.current);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
  }, [sync]);

  const toggle = () => {
    if (on) {
      onRef.current = false;
      audioRef.current?.pause();
      setOn(false);
      return;
    }
    pausePlayer?.();
    onRef.current = true;
    setOn(true);
    // Lancer la lecture tout de suite (exigé par les téléphones), puis se recaler sur le direct.
    const audio = audioRef.current;
    if (audio && state?.current) {
      const src = mediaUrl(state.current.audioFile);
      if (!audio.src.endsWith(src)) audio.src = src;
      audio.play().catch(() => {});
    }
    sync(true);
  };

  const current = state?.current;
  const pct = current?.duration ? Math.min(100, ((on ? elapsed : state.position) / current.duration) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <audio ref={audioRef} preload="none" muted={muted} />
      <div className="flex items-center gap-3">
        <RadioIcon className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-3xl font-black text-white">Radio SONIMUSIC</h1>
          <p className="text-sm text-gray-400">Gratuite, en continu 24h/24, sans inscription.</p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-600/25 via-[#141414] to-fuchsia-800/25 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 ${on ? 'animate-ping' : ''}`} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-red-400">En direct</span>
        </div>

        {!state ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />
        ) : !state.live ? (
          <p className="mt-6 text-gray-300">La radio démarre dès que des titres sont publiés.</p>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <Cover src={current.coverArt || current.artist?.profilePic} alt={current.title} className={`h-48 w-48 flex-shrink-0 rounded-2xl shadow-2xl ${on ? 'ring-4 ring-amber-500/40' : ''}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-400">En ce moment</p>
              <h2 className="mt-1 break-words text-2xl font-black text-white sm:text-3xl">{current.title}</h2>
              <Link to={current.artist?.id ? `/artist/${current.artist.id}` : '#'} className="mt-1 inline-block font-semibold text-gray-200 hover:underline">{artistNameOf(current)}</Link>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="mt-5 flex items-center justify-center gap-4 sm:justify-start">
                <button onClick={toggle} className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-black shadow-xl hover:scale-105" aria-label={on ? 'Arrêter la radio' : 'Écouter la radio'}>
                  {on ? <Pause className="h-7 w-7" fill="currentColor" /> : <Play className="ml-1 h-7 w-7" fill="currentColor" />}
                </button>
                <button onClick={() => setMuted((m) => !m)} className="text-gray-300 hover:text-white" aria-label="Son">
                  {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
                </button>
                <span className="text-sm text-gray-400">{on ? 'Tu écoutes la radio' : 'Appuie pour écouter'}</span>
              </div>
            </div>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
      </section>

      {state?.next?.length > 0 && (
        <section className="mt-8">
          <h3 className="text-lg font-bold text-white">Ensuite</h3>
          <div className="mt-3 space-y-2">
            {state.next.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                <Cover src={s.coverArt || s.artist?.profilePic} alt={s.title} className="h-11 w-11 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{s.title}</p>
                  <p className="truncate text-xs text-gray-400">{artistNameOf(s)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Radio;
