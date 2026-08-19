import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import { 
  MusicIcon, 
  UsersIcon, 
  AlbumIcon, 
  BarChart3Icon,
  PlusCircleIcon,
  EditIcon,
  Trash2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from 'lucide-react';

const AdminDashboard = () => {
  const { user, isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalArtists: 0,
    totalAlbums: 0,
    totalUsers: 0,
    pendingSongs: 0
  });
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirection si pas admin
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/" />;
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Récupérer les musiques
      const songsRes = await axios.get('https://sonimusic-1.onrender.com/api/songs');
      setSongs(songsRes.data || []);
      
      // Récupérer les artistes
      const artistsRes = await axios.get('https://sonimusic-1.onrender.com/api/artists');
      setArtists(artistsRes.data || []);
      
      // Compter les stats
      const pending = (songsRes.data || []).filter(s => s.status === 'PENDING').length;
      setStats({
        totalSongs: (songsRes.data || []).length,
        totalArtists: (artistsRes.data || []).length,
        totalAlbums: 0,
        totalUsers: 10,
        pendingSongs: pending
      });
    } catch (error) {
      console.error('Erreur chargement:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Approuver une musique
  const approveSong = async (songId) => {
    try {
      await axios.post(`https://sonimusic-1.onrender.com/api/admin/songs/${songId}/approve`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('Musique approuvée avec succès !');
      fetchAllData();
    } catch (error) {
      setError('Erreur lors de l\'approbation');
    }
  };

  // Refuser une musique
  const rejectSong = async (songId) => {
    try {
      await axios.post(`https://sonimusic-1.onrender.com/api/admin/songs/${songId}/reject`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('Musique refusée');
      fetchAllData();
    } catch (error) {
      setError('Erreur lors du refus');
    }
  };

  // Supprimer une musique
  const deleteSong = async (songId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette musique ?')) return;
    try {
      await axios.delete(`https://sonimusic-1.onrender.com/api/admin/songs/${songId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('Musique supprimée');
      fetchAllData();
    } catch (error) {
      setError('Erreur lors de la suppression');
    }
  };

  // Supprimer un artiste
  const deleteArtist = async (artistId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet artiste ?')) return;
    try {
      await axios.delete(`https://sonimusic-1.onrender.com/api/admin/artists/${artistId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('Artiste supprimé');
      fetchAllData();
    } catch (error) {
      setError('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            Administration SONIMUSIC
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              Connecté en tant que <span className="text-orange-500 font-semibold">{user?.name}</span>
            </span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4 text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-4 text-green-400">
            {success}
          </div>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Total musiques</p>
            <p className="text-2xl font-bold text-orange-500">{stats.totalSongs}</p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Artistes</p>
            <p className="text-2xl font-bold text-blue-500">{stats.totalArtists}</p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Albums</p>
            <p className="text-2xl font-bold text-green-500">{stats.totalAlbums}</p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">Utilisateurs</p>
            <p className="text-2xl font-bold text-purple-500">{stats.totalUsers}</p>
          </div>
          <div className="bg-[#1e1e1e] p-6 rounded-lg">
            <p className="text-gray-400 text-sm">En attente</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.pendingSongs}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-orange-500 text-black' 
                : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3Icon className="w-4 h-4 inline mr-2" />
            Tableau de bord
          </button>
          <button
            onClick={() => setActiveTab('songs')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'songs' 
                ? 'bg-orange-500 text-black' 
                : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
            }`}
          >
            <MusicIcon className="w-4 h-4 inline mr-2" />
            Musiques
          </button>
          <button
            onClick={() => setActiveTab('artists')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'artists' 
                ? 'bg-orange-500 text-black' 
                : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
            }`}
          >
            <UsersIcon className="w-4 h-4 inline mr-2" />
            Artistes
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === 'pending' 
                ? 'bg-orange-500 text-black' 
                : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
            }`}
          >
            <ClockIcon className="w-4 h-4 inline mr-2" />
            En attente ({stats.pendingSongs})
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="bg-[#1e1e1e] rounded-lg p-6">
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Bienvenue dans l'administration</h2>
              <p className="text-gray-400">
                Gérez tous les contenus de SONIMUSIC depuis cette interface.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Link to="/admin/add-song" className="bg-[#2a2a2a] p-6 rounded-lg hover:bg-[#333] transition-all">
                  <PlusCircleIcon className="w-8 h-8 text-orange-500 mb-2" />
                  <h3 className="font-semibold">Ajouter une musique</h3>
                  <p className="text-sm text-gray-400">Publier un nouveau morceau</p>
                </Link>
                <Link to="/admin/add-artist" className="bg-[#2a2a2a] p-6 rounded-lg hover:bg-[#333] transition-all">
                  <UsersIcon className="w-8 h-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold">Ajouter un artiste</h3>
                  <p className="text-sm text-gray-400">Créer un nouveau profil artiste</p>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'songs' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Liste des musiques</h2>
                <Link to="/admin/add-song" className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                  <PlusCircleIcon className="w-4 h-4 inline mr-2" />
                  Ajouter
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="py-3 px-4">Titre</th>
                      <th className="py-3 px-4">Artiste</th>
                      <th className="py-3 px-4">Genre</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song) => (
                      <tr key={song.id} className="border-b border-gray-800 hover:bg-[#2a2a2a]">
                        <td className="py-3 px-4">{song.title}</td>
                        <td className="py-3 px-4">{song.artist?.name || 'Inconnu'}</td>
                        <td className="py-3 px-4">{song.genre || '-'}</td>
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
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {song.status === 'PENDING' && (
                              <>
                                <button 
                                  onClick={() => approveSong(song.id)}
                                  className="text-green-400 hover:text-green-300"
                                >
                                  <CheckCircleIcon className="w-5 h-5" />
                                </button>
                                <button 
                                  onClick={() => rejectSong(song.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <XCircleIcon className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => deleteSong(song.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2Icon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'artists' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Liste des artistes</h2>
                <Link to="/admin/add-artist" className="bg-orange-500 text-black px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/25 transition-all">
                  <PlusCircleIcon className="w-4 h-4 inline mr-2" />
                  Ajouter
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {artists.map((artist) => (
                  <div key={artist.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {artist.profilePic && (
                        <img src={artist.profilePic} alt={artist.name} className="w-12 h-12 rounded-full object-cover" />
                      )}
                      <div>
                        <h3 className="font-semibold">{artist.name}</h3>
                        <p className="text-sm text-gray-400">{artist.country || 'Pays inconnu'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteArtist(artist.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2Icon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Musiques en attente</h2>
              {songs.filter(s => s.status === 'PENDING').length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune musique en attente</p>
              ) : (
                <div className="grid gap-4">
                  {songs.filter(s => s.status === 'PENDING').map((song) => (
                    <div key={song.id} className="bg-[#2a2a2a] rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{song.title}</h3>
                        <p className="text-sm text-gray-400">Par {song.artist?.name || 'Inconnu'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => approveSong(song.id)}
                          className="bg-green-500 text-black px-4 py-2 rounded-lg hover:bg-green-400 transition-all"
                        >
                          Approuver
                        </button>
                        <button 
                          onClick={() => rejectSong(song.id)}
                          className="bg-red-500 text-black px-4 py-2 rounded-lg hover:bg-red-400 transition-all"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
