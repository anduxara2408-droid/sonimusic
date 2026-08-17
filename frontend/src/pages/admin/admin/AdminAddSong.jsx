import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminAddSong = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
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

      setSuccess('Musique ajoutée avec succès !');
      setTimeout(() => navigate('/admin'), 2000);
    } catch (error) {
      setError('Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Ajouter une musique</h1>
      <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <input
              type="text"
              value={formData.artistId}
              onChange={(e) => setFormData({...formData, artistId: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              placeholder="Nom de l'artiste"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Genre</label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({...formData, genre: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              placeholder="Afrobeat, Jazz, etc."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Fichier audio *</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFiles({...files, audio: e.target.files[0]})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Pochette *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFiles({...files, cover: e.target.files[0]})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white"
              required
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {success && <div className="text-green-400 text-sm">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-black py-3 rounded-lg font-semibold hover:bg-orange-400 transition-all disabled:opacity-50"
          >
            {loading ? 'Ajout en cours...' : 'Ajouter la musique'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAddSong;
