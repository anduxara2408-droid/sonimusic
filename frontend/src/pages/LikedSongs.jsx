import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

function LikedSongs() {
  const { token, user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchFavorites();
    }
  }, [token]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('https://sonimusic-1.onrender.com/api/favorites/my-favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFavorites(response.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const playSong = (song) => {
    if (!song) return;
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

  const removeFavorite = async (songId) => {
    try {
      await axios.post(
        `https://sonimusic-1.onrender.com/api/favorites/songs/${songId}/toggle`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setFavorites(favorites.filter(f => f.songId !== songId));
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-white mb-4">❤️ Titres likés</h1>
        <p className="text-gray-400 text-center mb-6">
          Connectez-vous pour voir vos titres favoris
        </p>
        <Link to="/login" className="bg-[#d4af37] text-black px-6 py-2 rounded-full font-medium hover:bg-opacity-80 transition-all">
          Se connecter
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 pb-28">
      <div className="max-w-7xl mx-auto">
        
        {/* En-tête */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 rounded-2xl flex items-center justify-center text-4xl">
            ❤️
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Titres likés</h1>
            <p className="text-gray-400">{favorites.length} titres</p>
          </div>
        </div>

        {/* Liste des titres likés */}
        {favorites.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-2xl mb-4">🎵</p>
            <p>Aucun titre liké pour le moment.</p>
            <p className="text-sm mt-2">
              Parcourez la <Link to="/discover" className="text-[#d4af37] hover:underline">page de découverte</Link> pour en ajouter !
            </p>
          </div>
        ) : (
          <div className="bg-gray-900/30 rounded-xl overflow-hidden">
            {favorites.map((fav, index) => (
              <div 
                key={fav.id} 
                className={`flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 transition-all cursor-pointer ${index !== favorites.length - 1 ? 'border-b border-gray-800/30' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-gray-500 text-xs w-6 text-center">{index + 1}</span>
                  <img 
                    src={fav.song?.coverArt ? `https://sonimusic-1.onrender.com/${fav.song.coverArt}` : '/images/logo-sonimusic.png'} 
                    alt={fav.song?.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{fav.song?.title || 'Titre inconnu'}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {fav.song?.artist?.artistName || fav.song?.artist?.name || 'Artiste inconnu'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-gray-500 text-xs hidden sm:block">{fav.song?.genre || '—'}</span>
                  <button
                    onClick={() => playSong(fav.song)}
                    className="text-white hover:text-[#d4af37] transition-all text-sm"
                  >
                    {currentSong?.id === fav.song?.id && isPlaying ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.songId)}
                    className="text-red-500 hover:text-red-400 transition-all text-sm"
                    title="Retirer des favoris"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lecteur audio */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 px-4 py-3 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
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
            src={currentSong.audioFile ? `https://sonimusic-1.onrender.com/${currentSong.audioFile}` : ''}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

export default LikedSongs;
