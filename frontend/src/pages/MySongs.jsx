import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';

function MySongs() {
  const { token, isAuthenticated } = useAuth();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirection si non connecté
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/my-songs' }} />;
  }

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await axios.get('https://sonimusic-1.onrender.com/api/songs/my-songs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setSongs(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur détaillée:', error);
        setError('Erreur lors du chargement des musiques');
        setLoading(false);
      }
    };

    fetchSongs();
  }, [token]);

  const getStatusBadge = (song) => {
    if (song.status === 'PENDING') {
      return {
        label: '⏳ En attente de vérification',
        className: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
      };
    } else if (song.status === 'ACCEPTED' && song.isVerified) {
      return {
        label: '✅ Publié',
        className: 'bg-green-500/20 text-green-500 border border-green-500/30'
      };
    } else if (song.status === 'REJECTED') {
      return {
        label: '❌ Refusé',
        className: 'bg-red-500/20 text-red-500 border border-red-500/30'
      };
    } else if (song.status === 'ACCEPTED' && !song.isVerified) {
      return {
        label: '⏳ En attente de vérification',
        className: 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
      };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-[#d4af37] text-center mb-8">Mes musiques</h1>
          
          {error && (
            <div className="text-red-500 text-center mb-4">{error}</div>
          )}

          {songs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Aucune musique ajoutée pour le moment.</p>
              <Link to="/add-song" className="text-[#d4af37] hover:underline">
                Ajouter votre première musique
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {songs.map((song) => {
                const badge = getStatusBadge(song);
                return (
                  <div key={song.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {song.coverArt && (
                        <img 
                          src={`https://sonimusic-1.onrender.com/${song.coverArt}`} 
                          alt={song.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="text-white font-semibold">{song.title}</h3>
                        <p className="text-gray-400 text-sm">{song.genre || 'Genre non spécifié'}</p>
                        {song.rejectionReason && (
                          <p className="text-red-400 text-xs mt-1">
                            Raison : {song.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {badge && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MySongs;
