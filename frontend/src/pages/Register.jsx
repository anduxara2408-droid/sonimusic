import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '/logo.jpeg';

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LISTENER',
    artistName: '',
    bio: '',
    country: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'https://sonimusic-api.anduxara2408.workers.dev/api/auth/register',
        formData
      );

      if (response.data.requiresVerification) {
        setRegisteredEmail(formData.email);
        setShowVerification(true);
      } else if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  // Écran "On y est presque !"
  if (showVerification) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 text-center">
          <div className="mb-6">
            <img src={logo} alt="SONIMUSIC" className="w-20 h-20 mx-auto object-contain" />
          </div>
          
          <div className="text-6xl mb-4">📧</div>
          
          <h2 className="text-2xl font-bold text-white mb-3">On y est presque !</h2>
          
          <p className="text-gray-300 text-sm leading-relaxed">
            Avant de pouvoir vous connecter, vous devez confirmer votre adresse e-mail via l'email que nous venons de vous envoyer à :
          </p>
          
          <p className="text-[#d4af37] font-medium mt-2 text-sm">
            {registeredEmail}
          </p>
          
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <p className="text-gray-400 text-xs">
              ✉️ Un email de confirmation a été envoyé à votre adresse.
              <br />
              🔗 Cliquez sur le lien dans l'email pour activer votre compte.
            </p>
          </div>
          
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulaire d'inscription
  return (
    <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50">
        <div className="text-center mb-8">
          <img src={logo} alt="SONIMUSIC" className="w-20 h-20 mx-auto object-contain" />
          <h1 className="text-3xl font-bold text-[#d4af37] mt-4">Inscription</h1>
          <p className="text-gray-400 mt-2 text-sm">Rejoignez la communauté SONIMUSIC</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom complet *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              required
              minLength={6}
            />
            <p className="text-gray-500 text-xs mt-1">Minimum 6 caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type de compte</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
            >
              <option value="LISTENER">🎧 Auditeur</option>
              <option value="ARTIST">🎤 Artiste</option>
            </select>
          </div>

          {formData.role === 'ARTIST' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom d'artiste</label>
                <input
                  type="text"
                  name="artistName"
                  value={formData.artistName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Biographie</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
                  placeholder="Parlez de votre parcours musical..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Pays</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400 text-sm">
          Déjà un compte ? <Link to="/login" className="text-[#d4af37] hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
