import React, { useState, useRef, useEffect } from 'react';

function AudioPlayer({ currentSong, isPlaying, onPlayPause, onNext, onPrevious }) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
      setDuration(total);
    }
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (audioRef.current && duration) {
      audioRef.current.currentTime = percentage * duration;
      setProgress(percentage * 100);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleLoop = () => setIsLooping(!isLooping);
  const toggleShuffle = () => setIsShuffling(!isShuffling);

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 px-4 py-3 z-50">
      <div className="max-w-7xl mx-auto">
        
        {/* Barre de progression */}
        <div 
          className="w-full h-1 bg-gray-700 rounded-full mb-3 cursor-pointer group"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-[#d4af37] rounded-full transition-all group-hover:bg-[#e8c84a]"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex items-center justify-between">
          {/* Info chanson */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img 
              src={currentSong.coverArt ? `https://sonimusic-1.onrender.com/${currentSong.coverArt}` : '/images/logo-sonimusic.png'} 
              alt={currentSong.title}
              className="w-10 h-10 object-cover rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-gray-400 text-xs truncate">
                {currentSong.artist?.artistName || currentSong.artist?.name || 'Artiste'}
              </p>
            </div>
          </div>

          {/* Contrôles centraux */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Temps */}
            <span className="text-gray-400 text-xs hidden sm:block">
              {formatTime(audioRef.current?.currentTime)} / {formatTime(duration)}
            </span>

            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`text-sm transition-all ${isShuffling ? 'text-[#d4af37]' : 'text-gray-400 hover:text-white'}`}
            >
              🔀
            </button>

            {/* Précédent */}
            <button
              onClick={onPrevious}
              className="text-gray-400 hover:text-white text-sm"
            >
              ⏮
            </button>

            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              className="bg-[#d4af37] text-black w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all text-sm"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Suivant */}
            <button
              onClick={onNext}
              className="text-gray-400 hover:text-white text-sm"
            >
              ⏭
            </button>

            {/* Répéter */}
            <button
              onClick={toggleLoop}
              className={`text-sm transition-all ${isLooping ? 'text-[#d4af37]' : 'text-gray-400 hover:text-white'}`}
            >
              🔁
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-20 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-[#d4af37] hidden sm:block"
            />
          </div>
        </div>

        {/* Élément audio caché */}
        <audio
          ref={audioRef}
          src={currentSong.audioFile ? `https://sonimusic-1.onrender.com/${currentSong.audioFile}` : ''}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onEnded={() => {
            if (isLooping) {
              audioRef.current?.play();
            } else {
              onNext();
            }
          }}
          loop={isLooping}
          className="hidden"
        />
      </div>
    </div>
  );
}

export default AudioPlayer;
