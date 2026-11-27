import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api, { mediaUrl } from '../lib/api';

const PlayerContext = createContext(null);

// Une écoute est comptée après 30 secondes réellement écoutées (règle des grandes plateformes).
const PLAY_THRESHOLD_SECONDS = 30;

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const listenedRef = useRef({ songId: null, seconds: 0, lastTime: 0, counted: false });

  const current = index >= 0 ? queue[index] : null;

  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'metadata';
  }

  const countPlay = useCallback((songId) => {
    api.post(`/api/songs/${songId}/play`).catch(() => {});
  }, []);

  // Changement de morceau
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = mediaUrl(current.audioFile || current.audioUrl);
    audio.load();
    listenedRef.current = { songId: current.id, seconds: 0, lastTime: 0, counted: false };
    setProgress(0);
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => {
      setProgress(audio.currentTime);
      const l = listenedRef.current;
      const delta = audio.currentTime - l.lastTime;
      // On ne compte que l'écoute continue (pas les sauts dans la barre de progression).
      if (delta > 0 && delta < 2) l.seconds += delta;
      l.lastTime = audio.currentTime;
      if (!l.counted && l.songId && l.seconds >= PLAY_THRESHOLD_SECONDS) {
        l.counted = true;
        countPlay(l.songId);
      }
    };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIndex((i) => {
        if (i + 1 < queue.length) return i + 1;
        setIsPlaying(false);
        return i;
      });
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [queue.length, countPlay]);

  const playSong = useCallback((song, list) => {
    const newQueue = Array.isArray(list) && list.length ? list : [song];
    const i = Math.max(0, newQueue.findIndex((s) => s.id === song.id));
    if (current && current.id === song.id) {
      const audio = audioRef.current;
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }
    setQueue(newQueue);
    setIndex(i);
  }, [current]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [current]);

  const next = useCallback(() => setIndex((i) => (i + 1 < queue.length ? i + 1 : i)), [queue.length]);
  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) {
      audio.currentTime = seconds;
      listenedRef.current.lastTime = seconds;
    }
  }, []);

  const setVolume = useCallback((v) => {
    const value = Math.min(1, Math.max(0, v));
    if (audioRef.current) audioRef.current.volume = value;
    setVolumeState(value);
  }, []);

  // La radio met le lecteur en pause pour éviter deux sons à la fois.
  const pause = useCallback(() => audioRef.current?.pause(), []);

  return (
    <PlayerContext.Provider value={{ current, queue, isPlaying, progress, duration, volume, playSong, toggle, next, prev, seek, setVolume, pause }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans PlayerProvider');
  return ctx;
};
