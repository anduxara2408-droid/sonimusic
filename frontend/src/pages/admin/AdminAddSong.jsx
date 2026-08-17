import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminAddSong = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [artists, setArtists] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    artistId: '',
    genre: '',
    description: '',
    credits: '',
    album: ''
  });
  
  const [files, setFiles] = useState({
    audio: null,
    cover: null
  });

  // Charger les artistes
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/artists');
        setArtists(response.data || []);
      } catch (error) {
        console.error('Erreur chargement artistes:', error);
      }
    };
    fetchArtists();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.artistId || !files.audio || !files.cover) {
      setError('Tous les champs sont requis');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('artistId', formData.artistId);
      formDataToSend.append('genre', formData.genre);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('credits', formData.credits);
      formDataToSend.append('album', formData.album);
      formDataToSend.append('audio', files.audio);
      formDataToSend.append('cover', files.cover);

      await axios.post('https://sonimusic-api.anduxara2408.workers.dev/api/admin/songs/add', formDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('✅ Musique ajoutée avec succès !');
      setTimeout(() => {
        setFormData({ title: '', artistId: '', genre: '', description: '', credits: '', album: '' });
        setFiles({ audio: null, cover: null });
        setSuccess('');
        navigate('/admin/songs');
      }, 2000);
    } catch (error) {
      setError('❌ Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">🎵 Ajouter une musique</h1>
      <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Titre *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              placeholder="Nom du morceau"
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
              <option value="">Sélectionner un artiste</option>
              {artists.map((artist) => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Genre</label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({...formData, genre: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              placeholder="Afrobeat, Jazz, Soninké, etc."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              rows="3"
              placeholder="Description du morceau..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Crédits</label>
            <input
              type="text"
              value={formData.credits}
              onChange={(e) => setFormData({...formData, credits: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              placeholder="Auteur, producteur, compositeur..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Album</label>
            <input
              type="text"
              value={formData.album}
              onChange={(e) => setFormData({...formData, album: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              placeholder="Nom de l'album (optionnel)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fichier audio *</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFiles({...files, audio: e.target.files[0]})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pochette *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFiles({...files, cover: e.target.files[0]})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
                required
              />
            </div>
          </div>

          {error && <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded-lg">{error}</div>}
          {success && <div className="text-green-400 text-sm bg-green-500/20 p-3 rounded-lg">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50"
          >
            {loading ? '⏳ Ajout en cours...' : '🎵 Ajouter la musique'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAddSong;
