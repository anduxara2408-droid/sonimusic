import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('https://sonimusic-api.anduxara2408.workers.dev/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUsers(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors du chargement des utilisateurs');
      setLoading(false);
    }
  };

  const changeRole = async (userId, newRole) => {
    try {
      await axios.patch(`https://sonimusic-api.anduxara2408.workers.dev/api/admin/users/${userId}/role`, 
        { role: newRole },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSuccess(`✅ Rôle changé en ${newRole}`);
      fetchUsers();
    } catch (error) {
      setError('❌ Erreur lors du changement de rôle');
    }
  };

  const toggleBlock = async (userId, currentStatus) => {
    const action = currentStatus === 'blocked' ? 'unblock' : 'block';
    try {
      await axios.patch(`https://sonimusic-api.anduxara2408.workers.dev/api/admin/users/${userId}/${action}`,
        {},
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setSuccess(`✅ Utilisateur ${action === 'block' ? 'bloqué' : 'débloqué'}`);
      fetchUsers();
    } catch (error) {
      setError('❌ Erreur lors de l\'action');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await axios.delete(`https://sonimusic-api.anduxara2408.workers.dev/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSuccess('✅ Utilisateur supprimé');
      fetchUsers();
    } catch (error) {
      setError('❌ Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Chargement...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">👥 Gestion des utilisateurs</h1>
      
      {error && <div className="text-red-400 text-sm bg-red-500/20 p-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="text-green-400 text-sm bg-green-500/20 p-3 rounded-lg mb-4">{success}</div>}

      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#2a2a2a] text-gray-400">
            <tr>
              <th className="py-3 px-4">Utilisateur</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Rôle</th>
              <th className="py-3 px-4">Statut</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-800 hover:bg-[#2a2a2a]">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="text-white">{user.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-300">{user.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="bg-[#2a2a2a] border border-gray-700 rounded-lg px-3 py-1 text-white text-sm focus:border-orange-500 outline-none"
                  >
                    <option value="LISTENER">🎧 Auditeur</option>
                    <option value="ARTIST">🎤 Artiste</option>
                    <option value="ADMIN">👑 Admin</option>
                    <option value="PREMIUM">⭐ Premium</option>
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.status === 'blocked' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {user.status === 'blocked' ? '🔒 Bloqué' : '✅ Actif'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleBlock(user.id, user.status)}
                      className={`px-3 py-1 rounded-lg text-xs ${
                        user.status === 'blocked'
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {user.status === 'blocked' ? '🔓 Débloquer' : '🔒 Bloquer'}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="bg-red-500/20 text-red-400 px-3 py-1 rounded-lg text-xs hover:bg-red-500/30"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
