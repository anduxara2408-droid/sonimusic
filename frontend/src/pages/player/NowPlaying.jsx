import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function NowPlaying() {
  const location = useLocation();
  const song = location.state?.song || null;
  const allSongs = location.state?.allSongs || [];
  const [currentSong, setCurrentSong] = useState(song);
  const [currentIndex, setCurrentIndex] = useState(location.state?.index || 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [ambientMode, setAmbientMode] = useState('default');
  const [showLyrics, setShowLyrics] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  const ambientModes = [
    { id: 'default', label: 'Classic', bg: 'from-[#0c0b0a] to-[#1a1a1a]', glow: 'shadow-[#c9a25c]/20', text: 'text-[#c9a25c]' },
    { id: 'neon', label: 'Neon', bg: 'from-[#0a0a1a] to-[#1a0a2e]', glow: 'shadow-[#7b2fbe]/20', text: 'text-[#7b2fbe]' },
    { id: 'sunset', label: 'Sunset', bg: 'from-[#1a0a0a] to-[#2d1515]', glow: 'shadow-[#e85d04]/20', text: 'text-[#e85d04]' },
    { id: 'ocean', label: 'Ocean', bg: 'from-[#0a1628] to-[#0a2a3a]', glow: 'shadow-[#00b4d8]/20', text: 'text-[#00b4d8]' }
  ];

  // ===== VOLUME =====
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, currentSong]);

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
      if (newVolume === 0) {
        setIsMuted(true);
      } else {
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume / 100;
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const playSong = (song, index) => {
    setCurrentSong(song);
    setCurrentIndex(index);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.volume = isMuted ? 0 : volume / 100;
      }
    }, 100);
  };

  const playPrevious = () => {
    if (currentIndex > 0) {
      const prevSong = allSongs[currentIndex - 1];
      playSong(prevSong, currentIndex - 1);
    }
  };

  const playNext = () => {
    if (isShuffling) {
      const randomIndex = Math.floor(Math.random() * allSongs.length);
      playSong(allSongs[randomIndex], randomIndex);
    } else if (currentIndex < allSongs.length - 1) {
      const nextSong = allSongs[currentIndex + 1];
      playSong(nextSong, currentIndex + 1);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
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
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
    const newTime = percentage * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = (e) => {
    setIsDragging(false);
    handleSeek(e);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentAmbient = ambientModes.find(m => m.id === ambientMode) || ambientModes[0];

  if (!currentSong) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-white">Aucune musique en cours</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${currentAmbient.bg} transition-all duration-700 flex flex-col p-4 md:p-8`}>
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        
        {/* ===== HEADER ===== */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 md:mb-6">
          <Link to="/artist/demba-tandia" className="text-gray-400 hover:text-white text-sm md:text-base transition-colors">
            ← Retour
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 text-xs hidden sm:inline">Ambiance:</span>
            <div className="flex flex-wrap gap-1.5">
              {ambientModes.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setAmbientMode(mode.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs transition-all ${
                    ambientMode === mode.id
                      ? 'bg-[#c9a25c] text-black font-medium'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs transition-all ${
                showLyrics
                  ? 'bg-[#c9a25c] text-black font-medium'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              {showLyrics ? 'Lyrics' : 'Lyrics'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 md:gap-8">
          
          {/* ===== PARTIE GAUCHE ===== */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <div className={`w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-2xl shadow-2xl ${currentAmbient.glow} overflow-hidden transition-all duration-500`}>
                <img 
                  src={currentSong.cover || '/images/demba-tandia.jpg'} 
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {isPlaying && (
                <div className="absolute -inset-4 flex items-center justify-center pointer-events-none">
                  <div className="absolute w-full h-full border border-[#c9a25c]/20 rounded-3xl animate-ping"></div>
                  <div className="absolute w-[105%] h-[105%] border border-[#c9a25c]/10 rounded-3xl animate-ping delay-300"></div>
                </div>
              )}
            </div>

            <div className="text-center mt-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{currentSong.title}</h1>
              <p className="text-[#c9a25c] text-base md:text-lg mt-1">Demba Tandia</p>
              <p className="text-gray-400 text-xs md:text-sm mt-1">{currentSong.album}</p>
            </div>

            {/* ===== BARRE DE PROGRESSION ===== */}
            <div className="w-full max-w-md mt-6">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10">{formatTime(currentTime)}</span>
                <div
                  ref={progressRef}
                  className="flex-1 h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                  onClick={handleSeek}
                  onMouseDown={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchStart={handleSeekStart}
                  onTouchEnd={handleSeekEnd}
                >
                  <div 
                    className="h-full bg-[#c9a25c] rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#c9a25c] rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-10 text-right">{formatTime(duration)}</span>
              </div>
            </div>

            {/* ===== CONTROLES ===== */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mt-6">
              <button
                onClick={() => setIsShuffling(!isShuffling)}
                className={`text-sm md:text-base transition-all ${isShuffling ? 'text-[#c9a25c]' : 'text-gray-400 hover:text-white'}`}
              >
                Shuffle
              </button>
              
              <button
                onClick={playPrevious}
                disabled={currentIndex <= 0}
                className={`text-xl md:text-2xl ${currentIndex <= 0 ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
              >
                ⏮
              </button>
              
              <button
                onClick={togglePlay}
                className="bg-[#c9a25c] text-black w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-3xl hover:scale-105 transition-all shadow-lg shadow-[#c9a25c]/25"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              
              <button
                onClick={playNext}
                disabled={!isShuffling && currentIndex >= allSongs.length - 1}
                className={`text-xl md:text-2xl ${(!isShuffling && currentIndex >= allSongs.length - 1) ? 'text-gray-600' : 'text-gray-400 hover:text-white'}`}
              >
                ⏭
              </button>
              
              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`text-sm md:text-base transition-all ${isLooping ? 'text-[#c9a25c]' : 'text-gray-400 hover:text-white'}`}
              >
                Loop
              </button>
            </div>

            {/* ===== VOLUME ===== */}
            <div className="flex items-center justify-center gap-3 mt-4 w-full max-w-[200px]">
              <button
                onClick={toggleMute}
                className="text-gray-400 hover:text-white text-sm"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="flex-1 h-1 bg-gray-700 rounded-full accent-[#c9a25c]"
              />
              <span className="text-gray-400 text-xs w-8 text-right">{isMuted ? '0' : volume}%</span>
            </div>
          </div>

          {/* ===== PARTIE DROITE : LYRICS ===== */}
          <div className="flex-1 min-h-[200px]">
            {showLyrics ? (
              <div className="bg-black/30 rounded-2xl p-4 md:p-6 border border-gray-800/50 h-full max-h-[400px] overflow-y-auto">
                <h3 className="text-sm font-semibold text-[#c9a25c] mb-3">🎤 Paroles</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-[#c9a25c]/10 rounded-lg border border-[#c9a25c]/20">
                    <p className="text-xs text-gray-400 text-center">
                      ✍️ Les paroles seront bientôt disponibles
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/30 rounded-2xl border border-gray-800/50 h-full flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-gray-400 text-sm md:text-base">📝 Paroles</p>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">
                    Cliquez sur "Lyrics" pour afficher
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={currentSong.file}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => {
          if (isLooping) {
            audioRef.current?.play();
          } else {
            playNext();
          }
        }}
        className="hidden"
      />
    </div>
  );
}

export default NowPlaying;
