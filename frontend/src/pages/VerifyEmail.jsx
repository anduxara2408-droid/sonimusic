import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '/logo.jpeg';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (token && email) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('🔗 Lien de vérification invalide');
    }
  }, []);

  const verifyEmail = async () => {
    try {
      const response = await axios.post(
        'https://sonimusic-api.anduxara2408.workers.dev/api/auth/verify',
        { email, token }
      );
      
      if (response.data.verified) {
        setStatus('success');
        setMessage('✅ Votre email a été vérifié avec succès !');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || '❌ Erreur lors de la vérification');
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 text-center">
        <div className="mb-6">
          <img src={logo} alt="SONIMUSIC" className="w-20 h-20 mx-auto object-contain" />
        </div>

        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-white mt-4">Vérification en cours...</h2>
            <p className="text-gray-400 mt-2 text-sm">Nous vérifions votre email, veuillez patienter.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400">Email vérifié !</h2>
            <p className="text-gray-300 mt-2 text-sm">{message}</p>
            <p className="text-gray-400 text-sm mt-4">Vous allez être redirigé vers la page de connexion...</p>
            <Link to="/login" className="inline-block mt-6 text-[#d4af37] hover:underline">
              Se connecter maintenant
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-400">Vérification échouée</h2>
            <p className="text-gray-300 mt-2 text-sm">{message}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/register" className="text-[#d4af37] hover:underline">
                ← Retour à l'inscription
              </Link>
              <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
                Aller à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
