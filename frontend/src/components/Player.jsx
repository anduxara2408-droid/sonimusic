import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2,
  Heart,
  Repeat,
  Shuffle
} from 'lucide-react';

const Player = ({ 
  currentSong, 
  isPlaying, 
  setIsPlaying, 
  onNext, 
  onPrev,
  isFavorite = false,
  onToggleFavorite = () => {}
}) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRepeated, setIsRepeated] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Fonction pour enregistrer les écoutes
  const trackPlay = async (songId, duration) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      await fetch(`${apiUrl}/api/stats/track-play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          songId: parseInt(songId),
          duration: Math.floor(duration || 0)
        })
      });
    } catch (error) {
      console.debug('Erreur tracking:', error);
    }
  };

  // Gestion de la lecture
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => console.log('Erreur lecture:', err));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Mettre à jour la source audio
  useEffect(() => {
    if (currentSong && audioRef.current) {
      const audioSrc = currentSong.audioFile || currentSong.audioUrl || '';
      audioRef.current.src = audioSrc.startsWith('http') ? audioSrc : `https://sonimusic.online${audioSrc}`;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(err => console.log('Erreur lecture:', err));
      }
    }
  }, [currentSong]);

  // Tracking des écoutes pendant la lecture
  useEffect(() => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }

    if (isPlaying && currentSong?.id) {
      const interval = setInterval(() => {
        const currentTime = audioRef.current?.currentTime || 0;
        trackPlay(currentSong.id, currentTime);
      }, 30000);

      setTrackingInterval(interval);

      setTimeout(() => {
        trackPlay(currentSong.id, 0);
      }, 1000);
    }

    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
        setTrackingInterval(null);
      }
    };
  }, [isPlaying, currentSong?.id]);

  // Enregistrer l'écoute complète à la fin
  useEffect(() => {
    const handleEnded = () => {
      if (currentSong?.id) {
        const duration = audioRef.current?.duration || 0;
        trackPlay(currentSong.id, duration);
        if (isRepeated) {
          audioRef.current?.play().catch(err => console.log('Erreur replay:', err));
        } else {
          setIsPlaying(false);
          setProgress(0);
        }
      }
    };

    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [currentSong?.id, isRepeated]);

  // Mise à jour de la progression
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', () => setDuration(audio.duration));
    };
  }, []);

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Formatage du temps
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Contrôles
  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const newTime = x * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(x * 100);
    }
  };

  const handleForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const handleBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const toggleFullscreen = () => {
    const player = document.getElementById('player-container');
    if (!document.fullscreenElement) {
      player?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleRepeat = () => setIsRepeated(!isRepeated);
  const toggleShuffle = () => setIsShuffled(!isShuffled);

  if (!currentSong) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800 p-4 text-center text-gray-500">
        <p>Sélectionnez une musique pour commencer</p>
      </div>
    );
  }

  return (
    <div 
      id="player-container"
      className={`fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-gray-800 z-50 ${
        isFullscreen ? 'h-screen flex items-center justify-center' : ''
      }`}
    >
      <audio ref={audioRef} />

      <div className={`max-w-7xl mx-auto px-4 w-full ${isFullscreen ? 'flex flex-col items-center justify-center gap-8' : 'py-3'}`}>
        {isFullscreen && (
          <button 
            onClick={toggleFullscreen} 
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}

        <div className={`flex items-center gap-4 ${isFullscreen ? 'flex-col' : 'flex-wrap'}`}>
          {/* Infos musique */}
          <div className={`flex items-center gap-3 ${isFullscreen ? 'flex-col text-center' : 'min-w-[180px]'}`}>
            <img 
              src={currentSong.coverArt || '/images/logo-sonimusic.png'} 
              alt={currentSong.title}
              className={`rounded object-cover ${isFullscreen ? 'w-48 h-48' : 'w-12 h-12'}`}
              onError={(e) => e.target.src = '/images/logo-sonimusic.png'}
            />
            <div>
              <p className={`font-medium text-white ${isFullscreen ? 'text-2xl' : 'text-sm'}`}>
                {currentSong.title}
              </p>
              <p className={`text-gray-400 ${isFullscreen ? 'text-lg' : 'text-xs'}`}>
                {currentSong.artist?.name || 'Artiste inconnu'}
              </p>
            </div>
          </div>

          {/* Contrôles */}
          <div className={`flex-1 flex flex-col items-center ${isFullscreen ? 'w-full max-w-lg' : ''}`}>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleShuffle}
                className={`text-sm transition-all ${isShuffled ? 'text-orange-500' : 'text-gray-400 hover:text-white'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button 
                onClick={onPrev}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button 
                onClick={handleBackward}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black" />
                ) : (
                  <Play className="w-5 h-5 text-black ml-0.5" />
                )}
              </button>

              <button 
                onClick={handleForward}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button 
                onClick={onNext}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button 
                onClick={toggleRepeat}
                className={`text-sm transition-all ${isRepeated ? 'text-orange-500' : 'text-gray-400 hover:text-white'}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Barre de progression */}
            <div className="w-full flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400 min-w-[40px]">
                {formatTime(audioRef.current?.currentTime)}
              </span>
              <div 
                ref={progressRef}
                className="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer hover:h-1.5 transition-all"
                onClick={handleSeek}
              >
                <div 
                  className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-xs text-gray-400 min-w-[40px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-3 ${isFullscreen ? 'w-full justify-center' : ''}`}>
            <button 
              onClick={onToggleFavorite}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isFavorite ? (
                <Heart className="w-5 h-5 fill-orange-500 text-orange-500" />
              ) : (
                <Heart className="w-5 h-5" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-orange-500"
              />
            </div>

            <button 
              onClick={toggleFullscreen}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
