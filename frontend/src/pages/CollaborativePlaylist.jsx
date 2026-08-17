import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function CollaborativePlaylist() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([
    {
      id: 1,
      name: 'Afrobeat Vibes',
      creator: 'Demba Tandia',
      collaborators: ['Artiste 1', 'Artiste 2'],
      songs: ['Kankan', 'Fii Sire', 'Fakoly'],
      isCollaborative: true,
      cover: '/images/albums/fii-siire.jpg',
    },
    {
      id: 2,
      name: 'Soninké Classics',
      creator: 'Artiste 1',
      collaborators: ['Demba Tandia', 'Artiste 3'],
      songs: ['Remme', 'Goudia', 'Bambado'],
      isCollaborative: true,
      cover: '/images/albums/bataaxe.jpg',
    },
  ]);

  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    isCollaborative: true,
  });

  const handleCreate = (e) => {
    e.preventDefault();
    const playlist = {
      id: Date.now(),
      name: newPlaylist.name,
      creator: user?.name || 'Anonyme',
      collaborators: [],
      songs: [],
      isCollaborative: newPlaylist.isCollaborative,
      cover: '/images/logo-sonimusic.png',
    };
    setPlaylists([playlist, ...playlists]);
    setShowCreate(false);
    setNewPlaylist({ name: '', isCollaborative: true });
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🤝 Playlists collaboratives</h1>
            <p className="text-gray-400 mt-1">Créez et partagez des playlists avec d'autres artistes</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-[#c9a25c] text-black rounded-full font-medium hover:bg-opacity-80 transition-all"
          >
            + Créer une playlist
          </button>
        </div>

        {/* Formulaire de création */}
        {showCreate && (
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Nouvelle playlist collaborative</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom de la playlist *</label>
                <input
                  type="text"
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={newPlaylist.isCollaborative}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, isCollaborative: e.target.checked })}
                  className="w-5 h-5 accent-[#c9a25c]"
                />
                <label className="text-sm text-gray-400">Playlist collaborative (partageable)</label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#c9a25c] text-black rounded-lg font-medium hover:bg-opacity-80 transition-all"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-2 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-800 transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des playlists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playlists.map((playlist) => (
            <div key={playlist.id} className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50 hover:border-[#c9a25c]/30 transition-all">
              <div className="flex items-start gap-4">
                <img 
                  src={playlist.cover} 
                  alt={playlist.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{playlist.name}</h3>
                  <p className="text-gray-400 text-sm">Créé par {playlist.creator}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {playlist.collaborators.map((collab, i) => (
                      <span key={i} className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-300">
                        {collab}
                      </span>
                    ))}
                    {playlist.isCollaborative && (
                      <span className="text-xs bg-[#c9a25c]/20 text-[#c9a25c] px-2 py-0.5 rounded-full">
                        🔗 Collaborative
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-gray-400 text-sm">{playlist.songs.length} titres</p>
                <button className="text-[#c9a25c] text-sm hover:underline">
                  Voir la playlist →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CollaborativePlaylist;
