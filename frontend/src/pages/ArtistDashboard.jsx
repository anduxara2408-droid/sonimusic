import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';

const ArtistDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirection si non connecté ou pas artiste
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/artist-dashboard' }} />;
  }

  if (user?.role !== 'ARTIST' && user?.role !== 'ADMIN') {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/stats/artist/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-xl">Chargement des statistiques...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-xl text-red-400">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-xl">Aucune donnée disponible</div>
      </div>
    );
  }

  const maxPlays = stats.songs.length > 0 
    ? Math.max(...stats.songs.map(s => s.plays))
    : 1;

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Dashboard Artiste
          </h1>
          <Link
            to="/add-song"
            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-black px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all"
          >
            + Ajouter une musique
          </Link>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Total écoutes</p>
            <p className="text-2xl font-bold text-orange-500">
              {stats.stats.totalPlays}
            </p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Favoris</p>
            <p className="text-2xl font-bold text-yellow-500">
              {stats.stats.totalFavorites}
            </p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Commentaires</p>
            <p className="text-2xl font-bold text-blue-500">
              {stats.stats.totalComments}
            </p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Musiques</p>
            <p className="text-2xl font-bold text-green-500">
              {stats.stats.totalSongs}
            </p>
          </div>
        </div>

        {/* Graphique des écoutes par jour */}
        {stats.playsByDay && stats.playsByDay.length > 0 && (
          <div className="bg-[#1e1e1e] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Écoutes par jour (30 derniers jours)</h2>
            <div className="flex items-end space-x-1 h-48">
              {stats.playsByDay.slice(-30).map((day, index) => {
                const height = stats.playsByDay.length > 0
                  ? (day.count / Math.max(...stats.playsByDay.map(d => d.count))) * 100
                  : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-orange-500 to-yellow-500 rounded-t"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                        minHeight: '4px',
                        transition: 'height 0.3s ease'
                      }}
                    />
                    <span className="text-xs text-gray-400 mt-1">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Liste des musiques */}
        <div className="bg-[#1e1e1e] rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Vos musiques</h2>
          {stats.songs.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Vous n'avez pas encore de musiques publiées.
              <br />
              <Link to="/add-song" className="text-orange-500 hover:underline">
                Ajoutez votre première musique !
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Titre</th>
                    <th className="py-3 px-4">Écoutes</th>
                    <th className="py-3 px-4">Favoris</th>
                    <th className="py-3 px-4">Commentaires</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.songs.map((song) => (
                    <tr key={song.id} className="border-b border-gray-800 hover:bg-[#2a2a2a] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {song.coverArt && (
                            <img 
                              src={song.coverArt} 
                              alt={song.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <span>{song.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${(song.plays / maxPlays) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{song.plays}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{song.favorites}</td>
                      <td className="py-3 px-4">{song.comments}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          song.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                          song.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {song.status === 'ACCEPTED' ? '✅ Publiée' :
                           song.status === 'PENDING' ? '⏳ En attente' :
                           '❌ Refusée'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistDashboard;
