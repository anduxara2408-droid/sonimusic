import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '/logo.jpeg';

function ConfirmEmailChange() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  const email = searchParams.get('email');
  const token = searchParams.get('token');

  useEffect(() => {
    if (email && token) {
      confirmChange();
    } else {
      setStatus('error');
      setMessage('🔗 Lien invalide');
    }
  }, []);

  const confirmChange = async () => {
    try {
      const response = await axios.post(
        'https://sonimusic-api.anduxara2408.workers.dev/api/auth/confirm-email-change',
        { email, token }
      );
      
      if (response.data.success) {
        setStatus('success');
        setMessage('✅ Email changé avec succès !');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || '❌ Erreur lors de la confirmation');
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 text-center">
        <img src={logo} alt="SONIMUSIC" className="w-20 h-20 mx-auto object-contain mb-6" />
        
        {status === 'verifying' && (
          <>
            <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-bold text-white mt-4">Confirmation en cours...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-400">Email changé !</h2>
            <p className="text-gray-300 mt-2">{message}</p>
            <p className="text-gray-400 text-sm mt-4">Vous allez être redirigé vers la page de connexion...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-400">Confirmation échouée</h2>
            <p className="text-gray-300 mt-2">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default ConfirmEmailChange;
