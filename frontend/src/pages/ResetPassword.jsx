import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Lien invalide ou expiré');
    } else {
      setValid(true);
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('https://sonimusic-api.anduxara2408.workers.dev/api/auth/reset-password', {
        email,
        token,
        newPassword: password
      });

      if (response.data.success) {
        setMessage('✅ Mot de passe réinitialisé avec succès !');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (!valid) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="bg-gray-900/50 rounded-2xl p-8 max-w-md w-full border border-gray-800/50 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">❌ Lien invalide</h1>
          <p className="text-gray-400 text-sm mb-6">
            Le lien de réinitialisation est invalide ou a expiré.
          </p>
          <Link 
            to="/forgot-password" 
            className="inline-block py-2 px-6 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all"
          >
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-gray-900/50 rounded-2xl p-8 max-w-md w-full border border-gray-800/50">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">🔐 Nouveau mot de passe</h1>
          <p className="text-gray-400 text-sm mt-2">Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm text-center mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              placeholder="Minimum 8 caractères"
              required
              minLength="8"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              placeholder="Confirmer le mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
