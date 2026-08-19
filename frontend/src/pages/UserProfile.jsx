import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Récupérer les infos de l'utilisateur
        const response = await axios.get(`https://sonimusic-1.onrender.com/api/users/${id}`);
        setProfileUser(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        setError('Utilisateur non trouvé');
        setLoading(false);
      }
    };

    if (id) {
      fetchUser();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-white">Chargement du profil...</div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-red-400">{error || 'Utilisateur non trouvé'}</div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profileUser.id;

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-900/50 rounded-2xl p-6 md:p-8 border border-gray-800/50">
          <Link to="/" className="text-[#c9a25c] hover:underline mb-4 inline-block">← Retour</Link>

          <div className="flex flex-col items-center text-center">
            <img
              src={profileUser.profilePic || '/images/artists/default.jpg'}
              alt={profileUser.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-[#c9a25c]"
              onError={(e) => e.target.src = '/images/artists/default.jpg'}
            />
            <h1 className="text-2xl font-bold text-white mt-4">{profileUser.name}</h1>
            <p className="text-gray-400">{profileUser.email}</p>
            {profileUser.bio && (
              <p className="text-gray-300 mt-2 max-w-lg">{profileUser.bio}</p>
            )}
            {isOwnProfile && (
              <Link
                to="/profile/edit"
                className="mt-4 bg-orange-500 text-black px-6 py-2 rounded-lg font-semibold hover:bg-orange-400 transition-all"
              >
                Modifier mon profil
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
