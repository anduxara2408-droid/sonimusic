import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminAddArtist = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    artistName: '',
    bio: '',
    country: '',
    genre: '',
    socials: '',
    instagram: '',
    twitter: '',
    facebook: ''
  });
  
  const [profilePic, setProfilePic] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Le nom est requis');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('artistName', formData.artistName || formData.name);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('genre', formData.genre);
      formDataToSend.append('socials', JSON.stringify({
        instagram: formData.instagram,
        twitter: formData.twitter,
        facebook: formData.facebook
      }));
      if (profilePic) {
        formDataToSend.append('profilePic', profilePic);
      }

      await axios.post('https://sonimusic-1.onrender.com/api/admin/artists/add', formDataToSend, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('✅ Artiste ajouté avec succès !');
      setTimeout(() => {
        setFormData({ name: '', artistName: '', bio: '', country: '', genre: '', socials: '', instagram: '', twitter: '', facebook: '' });
        setProfilePic(null);
        setSuccess('');
        navigate('/admin/artists');
      }, 2000);
    } catch (error) {
      setError('❌ Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">👨‍🎤 Ajouter un artiste</h1>
      <div className="bg-[#1e1e1e] rounded-lg p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="Nom complet"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom d'artiste</label>
              <input
                type="text"
                value={formData.artistName}
                onChange={(e) => setFormData({...formData, artistName: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="Nom de scène"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Biographie</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
              rows="4"
              placeholder="Biographie de l'artiste..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pays</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="Pays d'origine"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Genre musical</label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => setFormData({...formData, genre: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="Soninké, Afrobeat, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Réseaux sociaux</label>
            <div className="space-y-2">
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="📸 Instagram (URL)"
              />
              <input
                type="text"
                value={formData.twitter}
                onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="🐦 Twitter (URL)"
              />
              <input
                type="text"
                value={formData.facebook}
                onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none"
                placeholder="📘 Facebook (URL)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Photo de profil</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePic(e.target.files[0])}
              className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white"
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded-lg">{error}</div>}
          {success && <div className="text-green-400 text-sm bg-green-500/20 p-3 rounded-lg">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-black py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50"
          >
            {loading ? '⏳ Ajout en cours...' : '👨‍🎤 Ajouter l\'artiste'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAddArtist;
