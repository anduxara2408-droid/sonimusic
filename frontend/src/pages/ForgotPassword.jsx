import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('https://sonimusic-1.onrender.com/api/auth/forgot-password', {
        email
      });

      if (response.data.success) {
        setSent(true);
        setMessage('Un email de réinitialisation vous a été envoyé 📧');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="bg-gray-900/50 rounded-2xl p-8 max-w-md w-full border border-gray-800/50">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">🔑 Mot de passe oublié</h1>
          <p className="text-gray-400 text-sm mt-2">
            {sent 
              ? 'Vérifiez votre boîte mail 📧' 
              : 'Entrez votre email pour recevoir un lien de réinitialisation'
            }
          </p>
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

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
                placeholder="exemple@email.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-400 text-sm">
              Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
            </p>
            <Link 
              to="/login" 
              className="block w-full py-3 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all"
            >
              Retour à la connexion
            </Link>
          </div>
        )}

        <div className="text-center mt-4">
          <Link to="/login" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
