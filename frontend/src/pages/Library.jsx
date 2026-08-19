import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Library() {
  const { token, user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('playlists');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [playlistsRes, favoritesRes] = await Promise.all([
        axios.get('https://sonimusic-1.onrender.com/api/playlists/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get('https://sonimusic-1.onrender.com/api/favorites/my-favorites', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      setPlaylists(playlistsRes.data);
      setFavorites(favoritesRes.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-white mb-4">📚 Bibliothèque</h1>
        <p className="text-gray-400 text-center mb-6">
          Connectez-vous pour accéder à votre bibliothèque
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
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* En-tête */}
        <h1 className="text-3xl font-bold text-white mb-6">📚 Bibliothèque</h1>

        {/* Onglets */}
        <div className="flex gap-6 border-b border-gray-800 mb-6">
          <button
            onClick={() => setActiveTab('playlists')}
            className={`pb-3 px-4 text-sm font-medium transition-all ${
              activeTab === 'playlists' 
                ? 'text-[#d4af37] border-b-2 border-[#d4af37]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`pb-3 px-4 text-sm font-medium transition-all ${
              activeTab === 'favorites' 
                ? 'text-[#d4af37] border-b-2 border-[#d4af37]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ❤️ Favoris ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`pb-3 px-4 text-sm font-medium transition-all ${
              activeTab === 'albums' 
                ? 'text-[#d4af37] border-b-2 border-[#d4af37]' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏆 Albums
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'playlists' && (
          <div>
            {playlists.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-2xl mb-4">🎵</p>
                <p>Vous n'avez pas encore de playlists.</p>
                <Link to="/playlists" className="text-[#d4af37] hover:underline mt-2 inline-block">
                  Créer votre première playlist
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <Link key={playlist.id} to={`/playlist/${playlist.id}`}>
                    <div className="bg-gray-900/50 rounded-xl p-4 hover:bg-gray-800 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          🎵
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{playlist.name}</h3>
                          <p className="text-gray-400 text-xs">
                            {playlist.songs?.length || 0} titres
                            {playlist.isPublic && ' • Public'}
                          </p>
                        </div>
                      </div>
                      {playlist.description && (
                        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{playlist.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            {favorites.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p className="text-2xl mb-4">❤️</p>
                <p>Vous n'avez pas encore de titres likés.</p>
                <Link to="/discover" className="text-[#d4af37] hover:underline mt-2 inline-block">
                  Découvrir des musiques
                </Link>
              </div>
            ) : (
              <div className="bg-gray-900/30 rounded-xl overflow-hidden">
                {favorites.map((fav, index) => (
                  <div 
                    key={fav.id} 
                    className={`flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 transition-all ${index !== favorites.length - 1 ? 'border-b border-gray-800/30' : ''}`}
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
                    <span className="text-gray-500 text-xs hidden sm:block">{fav.song?.genre || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'albums' && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-2xl mb-4">🏆</p>
            <p>Fonctionnalité à venir : Albums enregistrés</p>
            <p className="text-sm mt-2">Bientôt disponible !</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Library;
