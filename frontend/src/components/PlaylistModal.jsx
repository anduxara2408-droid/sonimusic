import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PlaylistModal = ({ isOpen, onClose, songId, onAdded }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchPlaylists();
    }
  }, [isOpen, isAuthenticated]);

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/playlists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlaylists(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement playlists:', error);
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) {
      setError('Nom requis');
      return;
    }

    try {
      const response = await axios.post('https://sonimusic-api.anduxara2408.workers.dev/api/playlists',
        { name: newPlaylistName, isPublic: true },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPlaylists([response.data.playlist, ...playlists]);
      setNewPlaylistName('');
      setError('');
      onAdded();
    } catch (error) {
      setError('Erreur lors de la création');
    }
  };

  const addToPlaylist = async (playlistId) => {
    try {
      await axios.post(`https://sonimusic-api.anduxara2408.workers.dev/api/playlists/${playlistId}/add-song`,
        { songId: parseInt(songId) },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      alert('✅ Musique ajoutée à la playlist !');
      onAdded();
      onClose();
    } catch (error) {
      console.error('Erreur ajout:', error);
      alert('❌ Erreur lors de l\'ajout');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">📋 Ajouter à une playlist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {!isAuthenticated ? (
          <p className="text-gray-400 text-center py-4">Connecte-toi pour créer des playlists</p>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="Nouvelle playlist..."
                  className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-orange-500 outline-none"
                />
                <button
                  onClick={createPlaylist}
                  className="bg-orange-500 text-black px-4 py-2 rounded-lg font-semibold text-sm hover:bg-orange-400 transition-all"
                >
                  Créer
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            {loading ? (
              <p className="text-gray-400 text-center">Chargement...</p>
            ) : playlists.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Aucune playlist</p>
            ) : (
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => addToPlaylist(playlist.id)}
                    className="w-full text-left px-4 py-3 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition-all flex items-center justify-between"
                  >
                    <span className="text-white">{playlist.name}</span>
                    <span className="text-gray-400 text-sm">{playlist.songs?.length || 0} titres</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlaylistModal;
