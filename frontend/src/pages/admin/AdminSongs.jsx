import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Music, CheckCircle, XCircle, Clock, Trash2, Eye } from 'lucide-react';

function AdminSongs() {
  const { token } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await axios.get('https://sonimusic-1.onrender.com/api/songs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSongs(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (songId) => {
    if (!confirm('Supprimer cette musique définitivement ?')) return;
    try {
      await axios.delete(`https://sonimusic-1.onrender.com/api/admin/songs/${songId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchSongs();
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  if (loading) {
    return <div className="text-white">Chargement...</div>;
  }

  return (
    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50">
      <h1 className="text-2xl font-bold text-white mb-4">🎵 Gestion des musiques</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Titre</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Artiste</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Genre</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Statut</th>
              <th className="py-3 px-2 text-xs font-semibold text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.id} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-all">
                <td className="py-3 px-2 text-white">{song.title}</td>
                <td className="py-3 px-2 text-gray-400">{song.artist?.artistName || song.artist?.name || 'Inconnu'}</td>
                <td className="py-3 px-2 text-gray-400">{song.genre || 'Non spécifié'}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    song.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                    song.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {song.status || 'PENDING'}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <button
                    onClick={() => handleDelete(song.id)}
                    className="text-gray-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {songs.length === 0 && (
          <p className="text-gray-400 text-center py-4">Aucune musique</p>
        )}
      </div>
    </div>
  );
}

export default AdminSongs;
