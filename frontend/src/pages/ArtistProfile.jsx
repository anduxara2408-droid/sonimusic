import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Comments from '../components/Comments';
import PlaylistModal from '../components/PlaylistModal';
import { useAuth } from '../context/AuthContext';

function ArtistProfile() {
  const { id } = useParams();
  const { user, token, isAuthenticated } = useAuth();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        // Convertir l'ID en nombre
        const artistId = parseInt(id);
        if (isNaN(artistId)) {
          setError('ID d\'artiste invalide');
          setLoading(false);
          return;
        }
        const response = await axios.get(`https://sonimusic-api.anduxara2408.workers.dev/api/artists/${artistId}`);
        setArtist(response.data);
        setLoading(false);
      } catch (error) {
        console.error('❌ Erreur:', error);
        setError('Artiste non trouvé');
        setLoading(false);
      }
    };

    if (id) {
      fetchArtist();
    }
  }, [id]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/favorites/my-favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFavorites(response.data || []);
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
    }
  };

  const toggleFavorite = async (songId) => {
    if (!isAuthenticated) {
      alert('Veuillez vous connecter pour ajouter aux favoris');
      return;
    }

    try {
      await axios.post('https://sonimusic-api.anduxara2408.workers.dev/api/favorites/toggle',
        { songId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      fetchFavorites();
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  const openPlaylistModal = (songId) => {
    if (!isAuthenticated) {
      alert('Veuillez vous connecter pour ajouter à une playlist');
      return;
    }
    setSelectedSongId(songId);
    setShowPlaylistModal(true);
  };

  const isSongFavorite = (songId) => {
    return favorites.includes(songId);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = (song) => {
    if (!song || !song.audioFile) {
      return;
    }

    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play().catch(err => console.error('Erreur lecture:', err));
        setIsPlaying(true);
      }
    } else {
      setCurrentSong(song);
      setProgress(0);
      setDuration(0);
      setIsFullscreen(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(err => console.error('Erreur lecture:', err));
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
        <div className="text-white">Chargement du profil...</div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-red-400">{error || 'Artiste non trouvé'}</div>
      </div>
    );
  }

  const getProfilePic = () => {
    if (artist.profilePic) return artist.profilePic;
    const nameMap = {
      'Demba Tandia': '/images/artists/demba-tandia.jpg',
      'JKERIA': '/images/artists/jkeria.jpg',
      'David Soni': '/images/artists/david-soni.jpg',
      'Lass Ko': '/images/artists/lass-ko.jpg',
      'Mister Gang': '/images/artists/mister-gang.jpg',
      'Pispa le roi': '/images/artists/pispa-le-roi.jpg'
    };
    return nameMap[artist.name] || '/images/artists/default.jpg';
  };

  const currentSongData = currentSong || (artist.songs && artist.songs.length > 0 ? artist.songs[0] : null);

  if (isFullscreen && currentSongData) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0c0b0a] to-[#1a1a1a] z-50 flex flex-col items-center justify-center p-8">
        <button onClick={toggleFullscreen} className="absolute top-6 right-6 text-gray-400 hover:text-white text-2xl">✕</button>
        <div className="text-center mb-8">
          <img src={getProfilePic()} alt={artist.name} className="w-24 h-24 rounded-full object-cover border-2 border-[#c9a25c] mx-auto mb-4" onError={(e) => e.target.src = '/images/logo-sonimusic.png'} />
          <p className="text-gray-400 text-sm">{artist.artistName || artist.name}</p>
        </div>
        <div className="relative mb-10">
          <div className={`w-64 h-64 rounded-full border-4 border-[#c9a25c]/20 overflow-hidden shadow-2xl ${isPlaying ? 'animate-spin-slow' : ''}`}>
            <img src={currentSongData.coverArt || '/images/logo-sonimusic.png'} alt={currentSongData.title} className="w-full h-full object-cover" onError={(e) => e.target.src = '/images/logo-sonimusic.png'} />
          </div>
          {isPlaying && <div className="absolute inset-0 rounded-full border-2 border-[#c9a25c]/30 animate-pulse"></div>}
        </div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">{currentSongData.title}</h2>
          <p className="text-gray-400">{artist.artistName || artist.name}</p>
        </div>
        <div className="w-full max-w-md mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-10 font-mono">{formatTime((progress / 100) * duration)}</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer group relative transition-all hover:h-2" onClick={handleSeek}>
              <div className="h-full bg-[#c9a25c] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#c9a25c] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg" style={{ left: `calc(${progress}% - 6px)` }} />
            </div>
            <span className="text-xs text-gray-400 w-10 font-mono">{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-8 mb-6">
          <button onClick={skipBackward} className="text-gray-400 hover:text-white text-2xl">⏪</button>
          <button onClick={() => togglePlay(currentSongData)} className="bg-[#c9a25c] text-black w-16 h-16 rounded-full flex items-center justify-center text-3xl hover:scale-110 transition-all shadow-lg shadow-[#c9a25c]/25">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={skipForward} className="text-gray-400 hover:text-white text-2xl">⏩</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white text-sm">{isMuted ? '🔇' : volume > 50 ? '🔊' : '🔉'}</button>
          <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-32 h-1 bg-gray-700 rounded-full accent-[#c9a25c] cursor-pointer" />
        </div>
        <audio ref={audioRef} src={currentSongData.audioFile ? `https://sonimusic.online${currentSongData.audioFile}` : ''} onTimeUpdate={handleTimeUpdate} onEnded={() => { setIsPlaying(false); setProgress(0); }} className="hidden" preload="metadata" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-4 md:p-8 pb-40">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900/50 rounded-2xl p-6 md:p-8 border border-gray-800/50">
          <Link to="/artists" className="text-[#c9a25c] hover:underline mb-4 inline-block">← Retour aux artistes</Link>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
            <div className="relative">
              <img src={getProfilePic()} alt={artist.name} className="w-32 h-32 rounded-full object-cover border-4 border-[#c9a25c]" onError={(e) => e.target.src = '/images/logo-sonimusic.png'} />
              {isPlaying && <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0c0b0a] flex items-center justify-center"><span className="text-white text-xs">▶</span></div>}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-white">{artist.artistName || artist.name}</h1>
              <p className="text-gray-400 text-lg">{artist.name}</p>
              {artist.country && <p className="text-gray-500">📍 {artist.country}</p>}
              {artist.bio && <p className="text-gray-300 mt-2 max-w-lg">{artist.bio}</p>}
            </div>
          </div>

          {/* Musiques */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">🎵 Musiques</h2>
            {artist.songs && artist.songs.length > 0 ? (
              <div className="space-y-2">
                {artist.songs.map((song) => (
                  <div key={song.id} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${currentSong?.id === song.id ? 'bg-[#c9a25c]/20 border border-[#c9a25c]/30' : 'hover:bg-gray-700/30'}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => togglePlay(song)}>
                      <img src={song.coverArt || '/images/logo-sonimusic.png'} alt={song.title} className="w-10 h-10 rounded object-cover flex-shrink-0" onError={(e) => e.target.src = '/images/logo-sonimusic.png'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{song.title}</p>
                        <p className="text-gray-400 text-sm truncate">{song.genre || 'Soninké'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button onClick={() => toggleFavorite(song.id)} className="text-gray-400 hover:text-white transition-all">
                        <span className={`text-sm ${isSongFavorite(song.id) ? 'text-orange-500' : ''}`}>
                          {isSongFavorite(song.id) ? '❤️' : '🤍'}
                        </span>
                      </button>
                      <button onClick={() => openPlaylistModal(song.id)} className="text-gray-400 hover:text-white text-sm">
                        📋
                      </button>
                      <span className="text-[#c9a25c] text-sm">
                        {currentSong?.id === song.id ? (isPlaying ? '⏸' : '▶') : '▶'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>Aucune musique disponible pour cet artiste.</p>
              </div>
            )}
          </div>

          {/* Commentaires */}
          {artist.songs && artist.songs.length > 0 && (
            <div className="mt-8 border-t border-gray-800 pt-6">
              <Comments songId={artist.songs[0]?.id} />
            </div>
          )}
        </div>
      </div>

      <PlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        songId={selectedSongId}
        onAdded={() => setShowPlaylistModal(false)}
      />
    </div>
  );
}

export default ArtistProfile;
