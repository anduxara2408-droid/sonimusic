import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [songsRes, artistsRes] = await Promise.all([
        axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/songs'),
        axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/artists')
      ]);
      setSongs(songsRes.data || []);
      setArtists(artistsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = (song) => {
    if (!song.audioFile) return;

    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(err => console.error('❌ Erreur lecture:', err));
        setIsPlaying(true);
      }
    } else {
      setCurrentSong(song);
      setProgress(0);
      setDuration(0);
      setIsFullscreen(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(err => console.error('❌ Erreur lecture:', err));
          setIsPlaying(true);
        }
      }, 100);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const totalDuration = audioRef.current.duration || 0;
      setProgress((currentTime / totalDuration) * 100);
      setDuration(totalDuration);
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
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    if (audioRef.current && duration) {
      audioRef.current.currentTime = percentage * duration;
      setProgress(percentage * 100);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + 10, duration);
      audioRef.current.currentTime = newTime;
      setProgress((newTime / duration) * 100);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - 10, 0);
      audioRef.current.currentTime = newTime;
      setProgress((newTime / duration) * 100);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  const currentSongData = currentSong || (songs.length > 0 ? songs[0] : null);

  // Lecteur plein écran
  if (isFullscreen && currentSongData) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0b0a] to-[#1a1a1a] z-50 flex flex-col items-center justify-center p-8 animate-fadeIn">
        <button 
          onClick={toggleFullscreen}
          className="absolute top-6 right-6 text-gray-400 hover:text-white text-2xl transition-all hover:scale-110"
        >
          ✕
        </button>

        <div className="text-center mb-8">
          <img 
            src={currentSongData.coverArt || '/images/logo-sonimusic.png'} 
            alt="Artiste"
            className="w-24 h-24 rounded-full object-cover border-2 border-[#c9a25c] mx-auto mb-4"
            onError={(e) => { e.target.src = '/images/logo-sonimusic.png'; }}
          />
          <p className="text-gray-400 text-sm">{currentSongData.artist?.artistName || currentSongData.artist?.name || 'Artiste'}</p>
        </div>

        <div className="relative mb-10">
          <div className={`w-64 h-64 rounded-full border-4 border-[#c9a25c]/20 overflow-hidden shadow-2xl shadow-[#c9a25c]/10 ${isPlaying ? 'animate-spin-slow' : ''}`}>
            <img 
              src={currentSongData.coverArt || '/images/logo-sonimusic.png'} 
              alt={currentSongData.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.src = '/images/logo-sonimusic.png'; }}
            />
          </div>
          <div className="absolute inset-0 rounded-full border-4 border-[#c9a25c]/10"></div>
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border-2 border-[#c9a25c]/30 animate-pulse"></div>
          )}
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">{currentSongData.title}</h2>
          <p className="text-gray-400">{currentSongData.artist?.artistName || currentSongData.artist?.name || 'Artiste'}</p>
        </div>

        <div className="w-full max-w-md mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-10 font-mono">{formatTime((progress / 100) * duration)}</span>
            <div 
              className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer group relative transition-all hover:h-2"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-[#c9a25c] rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-8 mb-6">
          <button onClick={skipBackward} className="text-gray-400 hover:text-white text-2xl transition-all hover:scale-110">⏪</button>
          <button
            onClick={() => togglePlay(currentSongData)}
            className="bg-[#c9a25c] text-black w-16 h-16 rounded-full flex items-center justify-center text-3xl hover:scale-110 transition-all shadow-lg shadow-[#c9a25c]/25"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={skipForward} className="text-gray-400 hover:text-white text-2xl transition-all hover:scale-110">⏩</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white text-sm transition-all">
            {isMuted ? '🔇' : volume > 50 ? '🔊' : '🔉'}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-32 h-1 bg-gray-700 rounded-full accent-[#c9a25c] cursor-pointer"
          />
        </div>

        <audio
          ref={audioRef}
          src={currentSongData.audioFile ? `https://sonimusic.online${currentSongData.audioFile}` : ''}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { setIsPlaying(false); setProgress(0); }}
          onError={(e) => { console.error('❌ Erreur audio:', e); setIsPlaying(false); }}
          className="hidden"
          preload="metadata"
        />

        <style jsx>{`
          @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          @keyframes pulse { 0% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.05); opacity: 0.6; } 100% { transform: scale(1); opacity: 0.3; } }
          .animate-spin-slow { animation: spin-slow 8s linear infinite; }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
          .animate-pulse { animation: pulse 2s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // ========== PAGE D'ACCUEIL ==========
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* ===== HERO ===== */}
      <div className="relative h-[55vh] flex items-end justify-center bg-gradient-to-b from-[#1a1a1a] to-[#121212]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#c9a25c]/10 via-transparent to-transparent"></div>
        <div className="relative z-10 text-center px-4 pb-12 max-w-3xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/images/logo-sonimusic.png" alt="SONIMUSIC" className="h-12 w-12 object-contain" />
            <span className="text-4xl font-bold text-white tracking-tight">SONIMUSIC</span>
          </div>
          <p className="text-2xl text-[#c9a25c] font-light">La musique Soninké, ailleurs.</p>
          <p className="text-gray-400 text-base max-w-xl mx-auto mt-3 leading-relaxed">
            La première plateforme dédiée à la musique Soninké. Écoutez, découvrez 
            et soutenez les artistes de la communauté.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            <Link
              to="/discover"
              className="bg-[#c9a25c] text-black px-10 py-3 rounded-full font-semibold hover:bg-[#d4af37] transition-all shadow-lg shadow-[#c9a25c]/20"
            >
              Découvrir
            </Link>
            <Link
              to="/register"
              className="border border-white/20 text-white px-10 py-3 rounded-full font-medium hover:bg-white/5 transition-all"
            >
              Devenir artiste
            </Link>
          </div>
        </div>
      </div>

      {/* ===== CONTENU ===== */}
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ===== ARTISTES FONDATEURS ===== */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Artistes fondateurs</h2>
            <Link to="/artists" className="text-sm text-gray-400 hover:text-white transition-all">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {artists.map((artist) => (
              <Link key={artist.id} to={`/artist/${artist.id}`} className="group">
                <div className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-all">
                  <img 
                    src={artist.profilePic || '/images/logo-sonimusic.png'} 
                    alt={artist.name}
                    className="w-full aspect-square object-cover rounded-full shadow-lg group-hover:shadow-[#c9a25c]/10 transition-all"
                    onError={(e) => { e.target.src = '/images/logo-sonimusic.png'; }}
                  />
                  <p className="text-white font-medium mt-3 text-center">{artist.artistName || artist.name}</p>
                  <p className="text-gray-400 text-xs text-center">{artist.genre || 'Artiste Soninké'}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== TITRES TENDANCE ===== */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Titres tendance</h2>
            <Link to="/discover" className="text-sm text-gray-400 hover:text-white transition-all">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {songs.slice(0, 10).map((song, index) => (
              <div 
                key={song.id}
                className="bg-gray-800/30 rounded-lg p-3 hover:bg-gray-800/50 transition-all cursor-pointer group"
                onClick={() => togglePlay(song)}
              >
                <div className="relative">
                  <img 
                    src={song.coverArt || '/images/logo-sonimusic.png'} 
                    alt={song.title}
                    className="w-full aspect-square object-cover rounded-lg shadow-lg group-hover:shadow-[#c9a25c]/10 transition-all"
                    onError={(e) => { e.target.src = '/images/logo-sonimusic.png'; }}
                  />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                    <div className="bg-[#c9a25c] text-black w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                      {currentSong?.id === song.id && isPlaying ? '⏸' : '▶'}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                </div>
                <p className="text-white text-sm font-medium truncate mt-2">{song.title}</p>
                <p className="text-gray-400 text-xs truncate">{song.artist?.artistName || 'Artiste'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== ALBUMS POPULAIRES ===== */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Albums populaires</h2>
            <Link to="/albums" className="text-sm text-gray-400 hover:text-white transition-all">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link to="/artist/1" className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-all">
              <img src="/images/albums/fii-siire.jpg" alt="Fii Siire" className="w-full aspect-square object-cover rounded-lg shadow-lg mb-3" />
              <p className="text-white font-medium">Fii Siire</p>
              <p className="text-gray-400 text-sm">Demba Tandia</p>
            </Link>
            <Link to="/artist/1" className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-all">
              <img src="/images/albums/bataaxe.jpg" alt="Bataaxe" className="w-full aspect-square object-cover rounded-lg shadow-lg mb-3" />
              <p className="text-white font-medium">Bataaxe</p>
              <p className="text-gray-400 text-sm">Demba Tandia</p>
            </Link>
          </div>
        </div>

        {/* ===== GENRES ===== */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Genres</h2>
            <Link to="/discover" className="text-sm text-gray-400 hover:text-white transition-all">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['Afrobeat', 'Jazz', 'Pop', 'RnB', 'Hip-Hop', 'Soul', 'Reggae', 'Folk'].map((genre) => (
              <Link key={genre} to={`/discover?genre=${genre.toLowerCase()}`} className="bg-gray-800/30 rounded-lg p-4 hover:bg-gray-800/50 transition-all text-center">
                <p className="text-white font-medium">{genre}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== CONTACT ===== */}
        <div className="py-6 mt-8 border-t border-gray-800/50 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm">📧 Email</p>
              <a href="mailto:contact@sonimusic.online" className="text-white hover:text-[#c9a25c] transition-all">
                contact@sonimusic.online
              </a>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-gray-400 text-sm">🇸🇳 Sénégal</p>
                <a href="tel:+221781234567" className="text-white hover:text-[#c9a25c] transition-all">
                  +221 78 123 45 67
                </a>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">🇲🇷 Mauritanie</p>
                <a href="tel:+22245123456" className="text-white hover:text-[#c9a25c] transition-all">
                  +222 45 12 34 56
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;
