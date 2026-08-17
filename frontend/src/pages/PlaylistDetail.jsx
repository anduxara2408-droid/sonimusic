import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function PlaylistDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetchPlaylist();
    }
  }, [id, token]);

  const fetchPlaylist = async () => {
    try {
      const response = await axios.get(`https://sonimusic-api.anduxara2408.workers.dev/api/playlists/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlaylist(response.data);
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

  const removeSong = async (songId) => {
    if (!confirm('Retirer cette chanson de la playlist ?')) return;
    try {
      await axios.delete(`https://sonimusic-api.anduxara2408.workers.dev/api/playlists/${id}/songs/${songId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlaylist({
        ...playlist,
        songs: playlist.songs.filter(s => s.songId !== songId)
      });
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression');
    }
  };

  const deletePlaylist = async () => {
    if (!confirm('Supprimer cette playlist ?')) return;
    try {
      await axios.delete(`https://sonimusic-api.anduxara2408.workers.dev/api/playlists/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate('/playlists');
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-white mb-4">Playlist non trouvée</h1>
        <Link to="/playlists" className="text-[#d4af37] hover:underline">Retour aux playlists</Link>
      </div>
    );
  }

  const songList = playlist.songs || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 pb-28">
      <div className="max-w-7xl mx-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/playlists" className="text-[#d4af37] hover:underline text-sm">
            ← Retour aux playlists
          </Link>
          <button
            onClick={deletePlaylist}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            🗑️ Supprimer la playlist
          </button>
        </div>

        {/* Info playlist */}
        <div className="bg-gray-900/50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0">
              🎵
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-gray-400 mt-1">{playlist.description}</p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                {songList.length} titres • {playlist.isPublic ? 'Publique' : 'Privée'}
              </p>
            </div>
          </div>
        </div>

        {/* Liste des musiques */}
        <div className="bg-gray-900/30 rounded-xl overflow-hidden">
          {songList.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-2xl mb-4">🎵</p>
              <p>Aucune musique dans cette playlist.</p>
              <Link to="/discover" className="text-[#d4af37] hover:underline mt-2 inline-block">
                Ajouter des musiques
              </Link>
            </div>
          ) : (
            songList.map((item, index) => (
              <div 
                key={item.id} 
                className={`flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 transition-all cursor-pointer ${index !== songList.length - 1 ? 'border-b border-gray-800/30' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-gray-500 text-xs w-6 text-center">{index + 1}</span>
                  <img 
                    src={item.song?.coverArt ? `https://sonimusic-api.anduxara2408.workers.dev/${item.song.coverArt}` : '/images/logo-sonimusic.png'} 
                    alt={item.song?.title}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{item.song?.title || 'Titre inconnu'}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {item.song?.artist?.artistName || item.song?.artist?.name || 'Artiste inconnu'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <button
                    onClick={() => playSong(item.song)}
                    className="text-white hover:text-[#d4af37] transition-all text-sm"
                  >
                    {currentSong?.id === item.song?.id && isPlaying ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => removeSong(item.songId)}
                    className="text-gray-500 hover:text-red-400 transition-all text-sm"
                    title="Retirer de la playlist"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lecteur audio */}
      {currentSong && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 px-4 py-3 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img 
                src={currentSong.coverArt ? `https://sonimusic-api.anduxara2408.workers.dev/${currentSong.coverArt}` : '/images/logo-sonimusic.png'} 
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
            src={currentSong.audioFile ? `https://sonimusic-api.anduxara2408.workers.dev/${currentSong.audioFile}` : ''}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

export default PlaylistDetail;
