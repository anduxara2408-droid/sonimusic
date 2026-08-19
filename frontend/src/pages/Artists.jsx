import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Artists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await axios.get('https://sonimusic-1.onrender.com/api/artists');
        setArtists(response.data || []);
        setLoading(false);
      } catch (error) {
        console.error('❌ Erreur:', error);
        setError('Impossible de charger les artistes');
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#c9a25c] mb-6">🎤 Artistes</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {artists.map((artist) => (
            <Link 
              key={artist.id} 
              to={`/artist/${artist.id}`}  // ← Utilise l'ID, pas le nom
              className="bg-gray-900/50 rounded-xl p-4 hover:bg-gray-800/50 transition-all text-center border border-gray-800/50 hover:border-[#c9a25c]/30 hover:scale-105 duration-300"
            >
              <img 
                src={artist.profilePic || '/images/logo-sonimusic.png'} 
                alt={artist.name}
                className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-2 border-[#c9a25c]"
                onError={(e) => { e.target.src = '/images/logo-sonimusic.png'; }}
              />
              <p className="text-white font-medium">{artist.artistName || artist.name}</p>
              <p className="text-gray-400 text-sm">{artist.genre || 'Artiste Soninké'}</p>
              {artist.country && (
                <p className="text-gray-500 text-xs mt-1">📍 {artist.country}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Artists;
