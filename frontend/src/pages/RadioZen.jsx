import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

function RadioZen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [listeners, setListeners] = useState(42);
  const [isLive, setIsLive] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  
  const audioRef = useRef(null);
  
  // URL du stream Zeno.FM
  const streamUrl = 'https://stream.zeno.fm/oto5puqgld7tv';

  // Playlist des morceaux
  const playlist = [
    { title: 'SIMOW FA LENME RAP', artist: 'SIMOW THE PROF', duration: '4:18' },
    { title: 'Nouakchott do Na', artist: 'Niguer Sia', duration: '3:21' },
    { title: 'LA GUÈRE', artist: 'MISTER GANG', duration: '2:47' },
    { title: 'HIP HOP', artist: 'MISTER GANG feat. DAVID SONI', duration: '3:39' },
    { title: 'XONNAAXU', artist: 'KENZO WOURO feat. Big Banga', duration: '3:21' },
    { title: 'O Dimma', artist: 'Kenzo Wouro', duration: '2:25' },
    { title: 'Omi papa N\'djay Wori', artist: 'Corry Gang', duration: '3:15' }
  ];

  // Programmes
  const programs = [
    { time: '08:00', title: 'Morning Vibes', host: 'DJ Kofi' },
    { time: '10:00', title: 'Afrobeat Hour', host: 'DJ Ama' },
    { time: '12:00', title: 'Lunch Break', host: 'DJ Malik' },
    { time: '15:00', title: 'Afternoon Groove', host: 'DJ Zara' },
    { time: '18:00', title: 'Prime Time', host: 'DJ Sekou' },
    { time: '20:00', title: 'Night Sessions', host: 'DJ Fatima' }
  ];

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const currentTrack = playlist[currentTrackIndex];
  const nextTracks = playlist.slice(currentTrackIndex + 1);
  const historyTracks = playlist.slice(0, currentTrackIndex).reverse();

  // Simuler des auditeurs
  useEffect(() => {
    const interval = setInterval(() => {
      setListeners(Math.floor(Math.random() * 50) + 10);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Changer de titre automatiquement
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, playlist.length]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = percentage * duration;
      setCurrentTime(percentage * duration);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const tabs = [
    { id: 'queue', label: 'À suivre' },
    { id: 'schedule', label: 'Programmes' },
    { id: 'history', label: 'Déjà passés' },
    { id: 'playlists', label: 'Playlists' }
  ];

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* ===== EN-TÊTE ===== */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#c9a25c]">📻 SONIMUSIC Live Radio</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-2 text-[#4fa39c] text-sm">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="font-medium">En direct</span>
              </span>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <span className="text-[#c9a25c]">👥</span> {listeners} à l'écoute
              </span>
            </div>
          </div>
          <div className="mt-2 md:mt-0 text-xs text-gray-500 font-mono">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>

        {/* ===== LECTEUR PRINCIPAL ===== */}
        <div className="bg-gray-900/50 rounded-2xl p-6 md:p-8 mb-8 border border-gray-800/50">
          <div className="flex flex-col md:flex-row items-center gap-8">
            
            {/* VINYLE ANIMÉ */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-[#c9a25c] overflow-hidden shadow-xl shadow-[#c9a25c]/10">
                  <div className={`w-full h-full bg-[#1a1a1a] flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
                    <img 
                      src="/images/logo-sonimusic.png" 
                      alt="SONIMUSIC"
                      className="w-full h-full object-contain p-6 rounded-full"
                    />
                  </div>
                  {/* Cercle central */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-[#c9a25c]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* INFOS ET CONTRÔLES */}
            <div className="flex-1 w-full">
              <div className="text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  {currentTrack?.title || 'Titre en cours'}
                </h2>
                <p className="text-[#c9a25c] text-lg">
                  {currentTrack?.artist || 'Artiste'}
                </p>
              </div>

              {/* Barre de progression */}
              <div className="w-full mt-4 mb-3">
                <div
                  className="w-full h-1.5 bg-gray-700 rounded-full cursor-pointer group"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-[#c9a25c] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Contrôles */}
              <div className="flex items-center justify-center md:justify-start gap-6">
                <button className="text-gray-400 hover:text-white text-xl transition-all">⏮</button>
                <button
                  onClick={togglePlay}
                  className="bg-[#c9a25c] text-black w-12 h-12 rounded-full flex items-center justify-center text-2xl hover:scale-105 transition-all shadow-lg shadow-[#c9a25c]/25"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button className="text-gray-400 hover:text-white text-xl transition-all">⏭</button>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseInt(e.target.value))}
                    className="w-20 h-1 bg-gray-700 rounded-full accent-[#c9a25c]"
                  />
                </div>
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={streamUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            className="hidden"
          />
        </div>

        {/* ===== ONGLETS ===== */}
        <div className="bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800/30">
          <div className="flex border-b border-gray-800/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-[#c9a25c] border-b-2 border-[#c9a25c] bg-gray-800/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===== À SUIVRE ===== */}
          <div className={`p-4 ${activeTab === 'queue' ? 'block' : 'hidden'}`}>
            <ul className="space-y-2">
              {nextTracks.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Aucun titre à venir</p>
              ) : (
                nextTracks.map((item, index) => (
                  <li key={index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800/30 transition-all">
                    <span className="text-gray-500 text-sm font-mono w-8 text-center">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center text-lg">
                      🎵
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <p className="text-gray-400 text-xs truncate">{item.artist}</p>
                    </div>
                    <span className="text-gray-500 text-xs font-mono">{item.duration}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* ===== PROGRAMMES ===== */}
          <div className={`p-4 ${activeTab === 'schedule' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {programs.map((prog, i) => (
                <div key={i} className="bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-all">
                  <span className="text-[#4fa39c] font-mono text-xs">{prog.time}</span>
                  <h4 className="text-white font-semibold text-sm">{prog.title}</h4>
                  <p className="text-gray-400 text-xs">avec {prog.host}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ===== DÉJÀ PASSÉS ===== */}
          <div className={`p-4 ${activeTab === 'history' ? 'block' : 'hidden'}`}>
            <ul className="space-y-2">
              {historyTracks.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Aucun titre passé</p>
              ) : (
                historyTracks.map((item, index) => (
                  <li key={index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800/30 transition-all">
                    <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center text-lg">
                      🎵
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <p className="text-gray-400 text-xs truncate">{item.artist}</p>
                    </div>
                    <span className="text-gray-500 text-xs">{item.duration}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* ===== PLAYLISTS ===== */}
          <div className={`p-4 ${activeTab === 'playlists' ? 'block' : 'hidden'}`}>
            <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#c9a25c]/20 to-[#c9a25c]/5 flex items-center justify-center text-3xl">
                  🎵
                </div>
                <div>
                  <h4 className="text-white font-semibold">SONIMUSIC Playlist</h4>
                  <p className="text-gray-400 text-sm">{playlist.length} titres · 23:06</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RadioZen;
