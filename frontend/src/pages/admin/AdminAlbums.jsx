import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminAlbums = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: '',
    year: new Date().getFullYear(),
    description: '',
    songs: []
  });
  
  const [cover, setCover] = useState(null);

  // Charger les données
  useEffect(() => {
    fetchAlbums();
    fetchArtists();
    fetchSongs();
  }, []);

  const fetchAlbums = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/albums');
      setAlbums(response.data || []);
    } catch (error) {
      console.error('Erreur chargement albums:', error);
    }
  };

  const fetchArtists = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/artists');
      setArtists(response.data || []);
    } catch (error) {
      console.error('Erreur chargement artistes:', error);
    }
  };

  const fetchSongs = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/songs');
      setSongs(response.data || []);
    } catch (error) {
      console.error('Erreur chargement musiques:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.artistId) {
      setError('Titre et artiste requis');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('artistId', formData.artistId);
      formDataToSend.append('year', formData.year);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('songs', JSON.stringify(formData.songs));
      if (cover) {
        formDataToSend.append('cover', cover);
      }

      await axios.post('https://sonimusic-api.anduxara2408.workers.dev/api/admin/albums/add', formDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('✅ Album ajouté avec succès !');
      setTimeout(() => {
        setFormData({ title: '', artistId: '', year: new Date().getFullYear(), description: '', songs: [] });
        setCover(null);
        setShowForm(false);
        setSuccess('');
        fetchAlbums();
      }, 2000);
    } catch (error) {
      setError('❌ Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const handleSongToggle = (songId) => {
    const index = formData.songs.indexOf(songId);
    if (index > -1) {
      setFormData({...formData, songs: formData.songs.filter(id => id !== songId)});
    } else {
      setFormData({...formData, songs: [...formData.songs, songId]});
    }
  };

  const deleteAlbum = async (albumId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet album ?')) return;
    try {
      await axios.delete(`https://sonimusic-api.anduxara2408.workers.dev/api/admin/albums/${albumId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('✅ Album supprimé');
      fetchAlbums();
    } catch (error) {
      setError('❌ Erreur lors de la suppression');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">💿 Gestion des albums</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all"
        >
          {showForm ? '✖ Fermer' : '➕ Ajouter un album'}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Nouvel album</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Artiste *</label>
                <select
                  value={formData.artistId}
                  onChange={(e) => setFormData({...formData, artistId: e.target.value})}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                  required
                >
                  <option value="">Sélectionner</option>
                  {artists.map((artist) => (
                    <option key={artist.id} value={artist.id}>{artist.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Année</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pochette</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCover(e.target.files[0])}
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                rows="2"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Musiques dans l'album</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {songs.filter(s => s.status === 'ACCEPTED').map((song) => (
                  <label key={song.id} className="flex items-center gap-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.songs.includes(song.id)}
                      onChange={() => handleSongToggle(song.id)}
                      className="accent-orange-500"
                    />
                    {song.title}
                  </label>
                ))}
              </div>
            </div>

            {error && <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded-lg">{error}</div>}
            {success && <div className="text-green-400 text-sm bg-green-500/20 p-3 rounded-lg">{success}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-black py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50"
            >
              {loading ? '⏳ Ajout en cours...' : '💿 Créer l\'album'}
            </button>
          </form>
        </div>
      )}

      {/* Liste des albums */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map((album) => (
          <div key={album.id} className="bg-[#1e1e1e] rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {album.coverArt && (
                  <img src={album.coverArt} alt={album.title} className="w-16 h-16 rounded object-cover" />
                )}
                <div>
                  <h3 className="font-semibold text-white">{album.title}</h3>
                  <p className="text-sm text-gray-400">{album.artist?.name || 'Artiste inconnu'}</p>
                  <p className="text-xs text-gray-500">{album.year}</p>
                </div>
              </div>
              <button
                onClick={() => deleteAlbum(album.id)}
                className="text-red-400 hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              {album.songs?.length || 0} musique(s)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAlbums;
