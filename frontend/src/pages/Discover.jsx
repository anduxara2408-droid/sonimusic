import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Discover() {
  const { token, user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Tous');
  const [sortBy, setSortBy] = useState('recent');
  const [showLibrary, setShowLibrary] = useState(false);
  const [onlineSongs, setOnlineSongs] = useState([]);
  const audioRef = useRef(null);

  const genres = ['Tous', 'Afrobeat', 'Jazz', 'Pop', 'RnB', 'Hip-Hop', 'Soul', 'Reggae', 'Folk', 'Soninké'];

  // ===== BIBLIOTHÈQUE SONINKÉ =====
  const onlineLibrary = [
    // === DEMBA TANDIA ===
    { 
      id: 'ol1', 
      title: 'Remme', 
      artist: 'Demba Tandia', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '4:30',
      description: 'Chanson emblématique de Demba Tandia'
    },
    { 
      id: 'ol2', 
      title: 'Goudia', 
      artist: 'Demba Tandia', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '4:15',
      description: 'Titre célèbre de Demba Tandia'
    },
    { 
      id: 'ol3', 
      title: 'Bambado', 
      artist: 'Demba Tandia', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:45',
      description: 'Chanson populaire de Demba Tandia'
    },
    { 
      id: 'ol4', 
      title: 'Mouniou', 
      artist: 'Demba Tandia', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '4:00',
      description: 'Chanson spirituelle de Demba Tandia'
    },

    // === LASSANA HAWA ===
    { 
      id: 'ol5', 
      title: 'Djomba', 
      artist: 'Lassana Hawa', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:55',
      description: 'Chanson traditionnelle Soninké'
    },
    { 
      id: 'ol6', 
      title: 'Sondé', 
      artist: 'Lassana Hawa', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '4:20',
      description: 'Duo avec Demba Tandia'
    },
    { 
      id: 'ol7', 
      title: 'Magnon', 
      artist: 'Lassana Hawa', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:30',
      description: 'Chanson populaire de Lassana Hawa'
    },

    // === RIME SONINKE ===
    { 
      id: 'ol8', 
      title: 'Dignité', 
      artist: 'Rime Soninke', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:40',
      description: 'Premier morceau de Rime Soninke'
    },

    // === DAVIS SONI ===
    { 
      id: 'ol9', 
      title: 'Davis Soni Mix', 
      artist: 'Davis Soni', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:20',
      description: 'Mix des meilleurs titres de Davis Soni'
    },

    // === MISTER GANG ===
    { 
      id: 'ol10', 
      title: 'Mister Gang Mix', 
      artist: 'Mister Gang', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:35',
      description: 'Mix des meilleurs titres de Mister Gang'
    },

    // === AUTRES ARTISTES ===
    { 
      id: 'ol11', 
      title: 'Bakha Tokha', 
      artist: 'Bakha Tokha', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '4:10',
      description: 'Artiste Soninké'
    },
    { 
      id: 'ol12', 
      title: 'Jkeria', 
      artist: 'Jkeria', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '3:50',
      description: 'Artiste Soninké'
    },
    { 
      id: 'ol13', 
      title: 'Diaguily Tandia', 
      artist: 'Diaguily Tandia', 
      genre: 'Soninké',
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      cover: '/images/logo-sonimusic.png',
      duration: '4:05',
      description: 'Artiste Soninké'
    }
  ];

  useEffect(() => {
    fetchSongs();
    if (token) {
      fetchFavorites();
    }
    setOnlineSongs(onlineLibrary);
  }, [token]);

  useEffect(() => {
    filterAndSortSongs();
  }, [songs, searchTerm, selectedGenre, sortBy]);

  // ===== FETCH SONGS - Temporairement désactivé pour éviter CORS =====
  const fetchSongs = async () => {
    try {
      // Désactivé temporairement - le backend n'est pas en ligne
      setSongs([]);
      setLoading(false);
      // TODO: Réactiver quand le backend sera déployé
      // const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      // const response = await axios.get('https://sonimusic-1.onrender.com/api/songs', { headers });
      // setSongs(response.data);
      // setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('https://sonimusic-1.onrender.com/api/favorites/my-favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFavorites(response.data.map(f => f.songId));
    } catch (error) {
      console.error(error);
    }
  };

  const filterAndSortSongs = () => {
    let result = [...songs];
    if (searchTerm) {
      result = result.filter(song =>
        song.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist?.artistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artist?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedGenre !== 'Tous') {
      result = result.filter(song =>
        song.genre?.toLowerCase() === selectedGenre.toLowerCase()
      );
    }
    switch (sortBy) {
      case 'recent': result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'popular': result.sort((a, b) => (b._count?.favorites || 0) - (a._count?.favorites || 0)); break;
      case 'title': result.sort((a, b) => a.title?.localeCompare(b.title) || 0); break;
      default: break;
    }
    setFilteredSongs(result);
  };

  const toggleFavorite = async (songId) => {
    if (!user) {
      alert('Connectez-vous pour ajouter des favoris');
      return;
    }
    try {
      const response = await axios.post(
        `https://sonimusic-1.onrender.com/api/favorites/songs/${songId}/toggle`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.data.isFavorite) {
        setFavorites([...favorites, songId]);
      } else {
        setFavorites(favorites.filter(id => id !== songId));
      }
      setSongs(songs.map(song => {
        if (song.id === songId) {
          const currentCount = song._count?.favorites || 0;
          return {
            ...song,
            _count: { favorites: response.data.isFavorite ? currentCount + 1 : currentCount - 1 }
          };
        }
        return song;
      }));
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'ajout du favori');
    }
  };

  const playSong = (song) => {
    if (currentSong?.id === song.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentSong(song);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    }
  };

  const [filteredSongs, setFilteredSongs] = useState([]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  const acceptedSongs = filteredSongs.filter(song => song.status === 'ACCEPTED');

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 pb-32">
      <div className="max-w-7xl mx-auto">
        
        {/* ===== EN-TÊTE ===== */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">🎵 Découvrir</h1>
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                showLibrary ? 'bg-[#d4af37] text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              📚 Bibliothèque Soninké
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="🔍 Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-white focus:border-[#d4af37] outline-none text-sm"
              />
            </div>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-white text-sm focus:border-[#d4af37] outline-none"
            >
              {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-white text-sm focus:border-[#d4af37] outline-none"
            >
              <option value="recent">Plus récents</option>
              <option value="popular">Plus populaires</option>
              <option value="title">Par titre</option>
            </select>
          </div>
        </div>

        {/* ===== BIBLIOTHÈQUE SONINKÉ ===== */}
        {showLibrary && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-[#d4af37]">🎵 Musiques Soninké</h2>
              <span className="text-xs text-gray-400">{onlineSongs.length} titres</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {onlineSongs.map((song) => (
                <div key={song.id} className="bg-gray-800/50 rounded-xl p-3 hover:bg-gray-800 transition-all cursor-pointer group">
                  <div className="relative">
                    <img 
                      src={song.cover} 
                      alt={song.title}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <button
                      onClick={() => playSong(song)}
                      className="absolute bottom-2 right-2 bg-[#d4af37] text-black w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-sm"
                    >
                      {currentSong?.id === song.id && isPlaying ? '⏸' : '▶'}
                    </button>
                  </div>
                  <p className="text-white font-semibold text-sm truncate mt-1.5">{song.title}</p>
                  <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                  <p className="text-[#d4af37] text-xs">{song.genre}</p>
                  {song.description && (
                    <p className="text-gray-500 text-xs truncate">{song.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== TOP ALBUMS ===== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">🏆 Top Albums</h2>
            <span className="text-xs text-gray-400">{acceptedSongs.length} albums</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {acceptedSongs.slice(0, 6).map((song) => (
              <div key={song.id} className="bg-gray-900/50 rounded-xl p-3 hover:bg-gray-800 transition-all cursor-pointer group">
                <div className="relative">
                  <img 
                    src={song.coverArt ? `https://sonimusic-1.onrender.com/${song.coverArt}` : '/images/logo-sonimusic.png'} 
                    alt={song.title}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    onClick={() => playSong(song)}
                    className="absolute bottom-2 right-2 bg-[#d4af37] text-black w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 text-sm"
                  >
                    {currentSong?.id === song.id && isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
                <p className="text-white font-semibold text-sm truncate mt-1.5">{song.title}</p>
                <p className="text-gray-400 text-xs truncate">
                  {song.artist?.artistName || song.artist?.name || 'Artiste'}
                </p>
                <p className="text-[#d4af37] text-xs">❤️ {song._count?.favorites || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== TOUTES LES MUSIQUES ===== */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white">🎶 Toutes les musiques</h2>
            <span className="text-xs text-gray-400">{acceptedSongs.length} titres</span>
          </div>
          <div className="bg-gray-900/30 rounded-xl overflow-hidden">
            {acceptedSongs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>Aucune musique trouvée</p>
              </div>
            ) : (
              acceptedSongs.map((song, index) => (
                <div 
                  key={song.id} 
                  className={`flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 transition-all cursor-pointer ${index !== acceptedSongs.length - 1 ? 'border-b border-gray-800/30' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="text-gray-500 text-xs w-6 text-center">{index + 1}</span>
                    <img 
                      src={song.coverArt ? `https://sonimusic-1.onrender.com/${song.coverArt}` : '/images/logo-sonimusic.png'} 
                      alt={song.title}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{song.title}</p>
                      <p className="text-gray-400 text-xs truncate">
                        {song.artist?.artistName || song.artist?.name || 'Artiste'} • {song.genre || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-gray-500 text-xs hidden sm:block">❤️ {song._count?.favorites || 0}</span>
                    <button 
                      onClick={() => toggleFavorite(song.id)}
                      className="text-sm hover:scale-110 transition-all"
                    >
                      {favorites.includes(song.id) ? '❤️' : '🤍'}
                    </button>
                    <button
                      onClick={() => playSong(song)}
                      className="text-white hover:text-[#d4af37] transition-all text-sm"
                    >
                      {currentSong?.id === song.id && isPlaying ? '⏸' : '▶'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ===== LECTEUR AUDIO ===== */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 px-4 py-3 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img 
                src={currentSong.cover || (currentSong.coverArt ? `https://sonimusic-1.onrender.com/${currentSong.coverArt}` : '/images/logo-sonimusic.png')} 
                alt={currentSong.title}
                className="w-10 h-10 object-cover rounded"
              />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{currentSong.title}</p>
                <p className="text-gray-400 text-xs truncate">
                  {currentSong.artist || currentSong.artist?.artistName || currentSong.artist?.name || 'Artiste'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <button
                onClick={() => playSong(currentSong)}
                className="bg-[#d4af37] text-black w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all text-sm"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={currentSong.audioFile ? `https://sonimusic-1.onrender.com/${currentSong.audioFile}` : currentSong.audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

export default Discover;
