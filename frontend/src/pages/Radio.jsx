import React, { useState, useEffect, useRef } from 'react';

function Radio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [listeners, setListeners] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [error, setError] = useState(null);

  // ✅ URL du stream Zeno.FM
  const streamUrl = 'https://stream.zeno.fm/oto5puqgld7tv';

  // Playlist réelle de Zeno.FM
  const playlist = [
    { title: 'SIMOW FA LENME RAP', artist: 'SIMOW THE PROF', duration: '4:18' },
    { title: 'Nouakchott do Na', artist: 'Niguer Sia', duration: '3:21' },
    { title: 'LA GUÈRE', artist: 'MISTER GANG', duration: '2:47' },
    { title: 'HIP HOP', artist: 'MISTER GANG feat. DAVID SONI', duration: '3:39' },
    { title: 'XONNAAXU', artist: 'KENZO WOURO feat. Big Banga', duration: '3:21' },
    { title: 'O Dimma', artist: 'Kenzo Wouro', duration: '2:25' },
    { title: 'Omi papa N\'djay Wori', artist: 'Corry Gang', duration: '3:15' }
  ];

  const audioRef = useRef(null);

  // Simuler des auditeurs en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setListeners(Math.floor(Math.random() * 50) + 10);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Changer de titre toutes les 30 secondes (simulation)
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLive, playlist.length]);

  // Gérer le volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Démarrer automatiquement au chargement
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setIsLive(true);
          setIsPlaying(true);
          setError(null);
        })
        .catch(err => {
          console.warn('⚠️ Lecture automatique bloquée:', err);
          setError('Cliquez sur play pour écouter la radio');
        });
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsLive(true);
          setIsPlaying(true);
          setError(null);
        })
        .catch(err => {
          console.error('❌ Erreur lecture:', err);
          setError('Erreur de lecture: ' + err.message);
          setIsLive(false);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
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

  const currentTrack = playlist[currentTrackIndex];
  const nextTracks = playlist.slice(currentTrackIndex + 1);
  const historyTracks = playlist.slice(0, currentTrackIndex).reverse();

  const programs = [
    { time: '08:00', title: 'Morning Vibes', host: 'DJ Kofi' },
    { time: '10:00', title: 'Afrobeat Hour', host: 'DJ Ama' },
    { time: '12:00', title: 'Lunch Break', host: 'DJ Malik' },
    { time: '15:00', title: 'Afternoon Groove', host: 'DJ Zara' },
    { time: '18:00', title: 'Prime Time', host: 'DJ Sekou' },
    { time: '20:00', title: 'Night Sessions', host: 'DJ Fatima' }
  ];

  const tabs = [
    { id: 'queue', label: 'À suivre', isActive: showQueue },
    { id: 'schedule', label: 'Programmes', isActive: showSchedule },
    { id: 'history', label: 'Déjà passés', isActive: showHistory }
  ];

  const setActiveTab = (tabId) => {
    setShowQueue(tabId === 'queue');
    setShowSchedule(tabId === 'schedule');
    setShowHistory(tabId === 'history');
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* En-tête */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#c9a25c]">📻 SONIMUSIC Live Radio</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className={`flex items-center gap-2 text-sm ${isLive ? 'text-[#4fa39c]' : 'text-gray-500'}`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                <span className="font-medium">{isLive ? 'En direct' : 'Hors ligne'}</span>
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
          <div className="flex flex-col items-center">

            {/* Logo animé */}
            <div className="relative mb-6">
              <div className={`w-48 h-48 md:w-56 md:h-56 rounded-full border-4 border-[#c9a25c] overflow-hidden shadow-2xl shadow-[#c9a25c]/10 ${isPlaying && isLive ? 'animate-spin-slow' : ''}`}>
                <img
                  src="/images/logo-sonimusic.png"
                  alt="SONIMUSIC"
                  className="w-full h-full object-contain p-8 bg-[#0c0b0a]"
                />
              </div>
              <div className={`absolute inset-0 rounded-full border-4 ${isLive ? 'border-[#4fa39c]/30 animate-pulse' : 'border-gray-600/30'}`}></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#c9a25c]/5 to-transparent"></div>
            </div>

            {/* Infos du morceau en cours */}
            <div className="text-center mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {isLive ? currentTrack?.title || 'En attente...' : 'Radio en pause'}
              </h2>
              <p className="text-[#c9a25c] text-md">
                {isLive ? currentTrack?.artist || 'SONIMUSIC' : 'Connectez-vous pour écouter'}
              </p>
            </div>

            {/* Erreur */}
            {error && (
              <div className="text-yellow-400 text-sm mb-4 text-center bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 w-full max-w-md">
                ⚠️ {error}
              </div>
            )}

            {/* Barre de progression */}
            <div className="w-full max-w-md mb-4">
              <div
                className="w-full h-1.5 bg-gray-700 rounded-full cursor-pointer group"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-[#c9a25c] rounded-full transition-all group-hover:bg-[#e8c84a] group-hover:h-2"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                  }
                }}
                className="text-gray-400 hover:text-white text-xl transition-all"
                disabled={!isLive}
              >
                ⏪
              </button>
              <button
                onClick={togglePlay}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl hover:scale-105 transition-all shadow-lg ${
                  isLive || !error
                    ? 'bg-[#c9a25c] text-black shadow-[#c9a25c]/25 hover:bg-[#d4af37]'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!!error && !isLive}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
                  }
                }}
                className="text-gray-400 hover:text-white text-xl transition-all"
                disabled={!isLive}
              >
                ⏩
              </button>
              <div className="flex items-center gap-2 ml-4">
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
                  className="w-16 h-1 bg-gray-700 rounded-full accent-[#c9a25c]"
                />
              </div>
            </div>
          </div>

          <audio
            ref={audioRef}
            src={streamUrl}
            crossOrigin="anonymous"
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleTimeUpdate}
            onPlay={() => {
              setIsLive(true);
              setIsPlaying(true);
              setError(null);
            }}
            onError={(e) => {
              console.error('❌ Erreur audio:', e);
              setIsLive(false);
              setIsPlaying(false);
              setError('Le stream est inaccessible. Vérifie que l\'Auto DJ est activé sur Zeno.FM.');
            }}
            className="hidden"
            autoPlay
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
                  tab.isActive
                    ? 'text-[#c9a25c] border-b-2 border-[#c9a25c] bg-gray-800/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu : À suivre */}
          <div className={`p-4 ${showQueue ? 'block' : 'hidden'}`}>
            {nextTracks.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucun titre à venir</p>
            ) : (
              <ul className="space-y-2">
                {nextTracks.slice(0, 5).map((item, index) => (
                  <li key={index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800/30 transition-all">
                    <span className="text-gray-500 text-sm font-mono w-8 text-right">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <img
                      src="/images/logo-sonimusic.png"
                      alt={item.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <p className="text-gray-400 text-xs truncate">{item.artist}</p>
                    </div>
                    <span className="text-gray-500 text-xs font-mono">{item.duration}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contenu : Programmes */}
          <div className={`p-4 ${showSchedule ? 'block' : 'hidden'}`}>
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

          {/* Contenu : Déjà passés */}
          <div className={`p-4 ${showHistory ? 'block' : 'hidden'}`}>
            {historyTracks.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucun titre passé</p>
            ) : (
              <ul className="space-y-2">
                {historyTracks.slice(0, 5).map((item, index) => (
                  <li key={index} className="flex items-center gap-4 p-2 rounded-lg hover:bg-gray-800/30 transition-all">
                    <img
                      src="/images/logo-sonimusic.png"
                      alt={item.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.title}</p>
                      <p className="text-gray-400 text-xs truncate">{item.artist}</p>
                    </div>
                    <span className="text-gray-500 text-xs">{item.duration}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Info de connexion */}
        {!isLive && error && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-4 text-center">
            <p className="text-yellow-500 text-sm">
              ⚠️ {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Radio;
