import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save } from 'lucide-react';

const API_URL = 'https://sonimusic-1.onrender.com';

const EditProfile = () => {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    country: '',
    profilePic: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        country: user.country || '',
        profilePic: user.profilePic || ''
      });
    }
  }, [user, isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.put(
        `${API_URL}/api/users/profile-pic`,
        { profilePic: formData.profilePic },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const response = await axios.put(
        `${API_URL}/api/users/profile`,
        {
          name: formData.name,
          bio: formData.bio,
          country: formData.country
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess('Profil mis à jour avec succès !');
        setTimeout(() => navigate(`/user/${user.id}`), 1500);
      }
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      setError('Erreur lors de la mise à jour du profil');
    } finally {
      setLoading(false);
    }
  };

  const defaultAvatars = [];

  const getProfilePic = (url) => url || '/images/artists/default.jpg';

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Modifier mon profil</h1>

          {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg mb-4">{error}</div>}
          {success && <div className="bg-green-500/10 text-green-400 p-3 rounded-lg mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Photo de profil</label>
              <div className="flex items-center gap-4">
                <img
                  src={getProfilePic(formData.profilePic)}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-orange-500"
                  onError={(e) => { e.target.src = '/images/artists/default.jpg'; }}
                />
                <div className="flex-1">
                  <input
                    type="text"
                    name="profilePic"
                    value={formData.profilePic}
                    onChange={handleChange}
                    placeholder="URL de votre photo"
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap items-center">
                <span className="text-gray-500 text-xs mr-2">Avatars :</span>
                {defaultAvatars.map((avatar, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, profilePic: avatar }))}
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-colors ${
                      formData.profilePic === avatar ? 'border-orange-500' : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Nom complet</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="3"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1">Pays</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 text-black px-6 py-2 rounded-lg font-medium hover:bg-orange-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? '...' : <><Save className="w-4 h-4" /> Enregistrer</>}
              </button>
              <Link
                to={`/user/${user?.id}`}
                className="px-6 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Annuler
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
