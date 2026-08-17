import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import logo from '/logo.jpeg';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      if (result.error?.includes('vérifier votre email')) {
        setError('Veuillez vérifier votre email avant de vous connecter.');
      } else {
        setError(result.error || 'Email ou mot de passe incorrect');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50">
        <div className="text-center mb-8">
          <img src={logo} alt="SONIMUSIC" className="w-20 h-20 mx-auto object-contain" />
          <h1 className="text-3xl font-bold text-[#d4af37] mt-4">Connexion</h1>
          <p className="text-gray-400 mt-2">Retrouvez votre espace SONIMUSIC</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#d4af37] outline-none transition-all"
              required
            />
            {/* Lien Mot de passe oublié */}
            <div className="text-right mt-2">
              <Link 
                to="/forgot-password" 
                className="text-sm text-[#d4af37] hover:underline hover:text-[#c9a25c] transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400">
          Pas encore de compte ? <Link to="/register" className="text-[#d4af37] hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
