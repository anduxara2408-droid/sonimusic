import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function AdminArtists() {
  const { token } = useAuth();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/admin/artists', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setArtists(response.data);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    fetchArtists();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-soni-black flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soni-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-soni-gold text-center mb-8">👥 Tous les artistes</h1>

          {artists.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p>Aucun artiste inscrit pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {artists.map((artist) => (
                <div key={artist.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{artist.artistName || artist.name}</h3>
                    <p className="text-gray-400 text-sm">{artist.email}</p>
                    {artist.bio && <p className="text-gray-500 text-sm">{artist.bio}</p>}
                    {artist.country && <p className="text-gray-500 text-sm">📍 {artist.country}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-sm">
                      {artist.songs?.length || 0} musique(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminArtists;
