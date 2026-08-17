import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Playlists() {
  const { token, user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '', isPublic: true });

  useEffect(() => {
    if (token) {
      fetchPlaylists();
    }
  }, [token]);

  const fetchPlaylists = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/playlists/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlaylists(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur fetch:', error);
      setLoading(false);
    }
  };

  const createPlaylist = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'https://sonimusic-api.anduxara2408.workers.dev/api/playlists',
        newPlaylist,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setPlaylists([response.data, ...playlists]);
      setShowCreate(false);
      setNewPlaylist({ name: '', description: '', isPublic: true });
    } catch (error) {
      console.error('Erreur création:', error);
      alert('Erreur lors de la création');
    }
  };

  const deletePlaylist = async (id) => {
    if (!confirm('Supprimer cette playlist ?')) return;
    try {
      await axios.delete(`https://sonimusic-api.anduxara2408.workers.dev/api/playlists/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPlaylists(playlists.filter(p => p.id !== id));
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-white mb-4">📋 Playlists</h1>
        <p className="text-gray-400 text-center mb-6">
          Connectez-vous pour créer et gérer vos playlists
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">📋 Mes playlists</h1>
            <p className="text-gray-400">{playlists.length} playlist(s)</p>
          </div>
          <button
            onClick={() => {
              console.log('Bouton cliqué !');
              setShowCreate(true);
            }}
            className="bg-[#d4af37] text-black px-6 py-2 rounded-full font-medium hover:bg-opacity-80 transition-all"
          >
            + Créer une playlist
          </button>
        </div>

        {/* Formulaire création */}
        {showCreate && (
          <div className="bg-gray-900/50 rounded-xl p-6 mb-6 border border-[#d4af37]/20">
            <h2 className="text-xl font-bold text-white mb-4">Nouvelle playlist</h2>
            <form onSubmit={createPlaylist} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom *</label>
                <input
                  type="text"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none"
                  rows="2"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newPlaylist.isPublic}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, isPublic: e.target.checked })}
                  className="w-4 h-4 accent-[#d4af37]"
                />
                <label className="text-sm text-gray-400">Playlist publique</label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-[#d4af37] text-black px-6 py-2 rounded-full font-medium hover:bg-opacity-80 transition-all"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="border border-gray-600 text-gray-400 px-6 py-2 rounded-full font-medium hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des playlists */}
        {playlists.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-2xl mb-4">🎵</p>
            <p>Vous n'avez pas encore de playlists.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[#d4af37] hover:underline mt-2"
            >
              Créer votre première playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="bg-gray-900/50 rounded-xl p-4 hover:bg-gray-800 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                        🎵
                      </div>
                      <div>
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
                  <button
                    onClick={() => deletePlaylist(playlist.id)}
                    className="text-gray-500 hover:text-red-400 transition-all text-sm opacity-0 group-hover:opacity-100"
                  >
                    🗑️
                  </button>
                </div>
                <Link
                  to={`/playlist/${playlist.id}`}
                  className="mt-3 inline-block text-[#d4af37] text-sm hover:underline"
                >
                  Voir la playlist →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Playlists;
