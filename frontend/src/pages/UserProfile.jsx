import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = 'https://sonimusic-1.onrender.com';

const UserProfile = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getProfilePic = (u) => {
    if (!u) return '/images/artists/default.jpg';
    if (u.profilePic) return u.profilePic;
    const emailMap = {
      'contact@sonimusic.online': '/images/artists/demba-tandia.jpg',
      'demba.tandia@sonimusic.online': '/images/artists/demba-tandia.jpg',
      'jkeria@sonimusic.online': '/images/artists/jkeria.jpg',
      'david.soni@sonimusic.online': '/images/artists/david-soni.jpg',
      'lass.ko@sonimusic.online': '/images/artists/lass-ko.jpg',
      'mister.gang@sonimusic.online': '/images/artists/mister-gang.jpg',
      'pispa@sonimusic.online': '/images/artists/pispa-le-roi.jpg',
    };
    if (u.email && emailMap[u.email]) return emailMap[u.email];
    return '/images/artists/default.jpg';
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/users/${id}`);
        setProfileUser(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        setError('Utilisateur non trouvé');
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-500"></div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error || 'Utilisateur non trouvé'}</p>
          <Link to="/" className="text-orange-400 hover:text-orange-300 mt-4 inline-block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profileUser.id;

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-6">
            <img
              src={getProfilePic(profileUser)}
              alt={profileUser.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-orange-500/30"
              onError={(e) => { e.target.src = '/images/artists/default.jpg'; }}
            />
            <div>
              <h1 className="text-2xl font-bold text-white">{profileUser.name}</h1>
              {profileUser.artistName && (
                <p className="text-orange-400 text-sm">{profileUser.artistName}</p>
              )}
              <p className="text-gray-400 text-sm mt-1">
                {profileUser.role === 'ADMIN' ? 'Administrateur' : 
                 profileUser.role === 'ARTIST' ? 'Artiste' : 'Auditeur'}
              </p>
              {isOwnProfile && (
                <span className="inline-block mt-2 text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
                  C'est vous !
                </span>
              )}
            </div>
          </div>

          {profileUser.bio && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-gray-300 text-sm">{profileUser.bio}</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {profileUser.country && (
              <div>
                <span className="text-gray-500">Pays :</span>
                <span className="text-gray-300 ml-2">{profileUser.country}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Membre depuis :</span>
              <span className="text-gray-300 ml-2">
                {new Date(profileUser.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
