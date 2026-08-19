import React, { useState, useEffect } from 'react';
import { X, Upload, User, Check, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function ProfileModal({ isOpen, onClose }) {
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailCheckMessage, setEmailCheckMessage] = useState('');
  const [usernameCheckMessage, setUsernameCheckMessage] = useState('');

  // Vérifier l'email en temps réel
  useEffect(() => {
    const checkEmail = async () => {
      if (email && email !== user?.email) {
        setIsChecking(true);
        try {
          const response = await axios.post(
            'https://sonimusic-1.onrender.com/api/auth/check-email',
            { email }
          );
          setEmailAvailable(response.data.available);
          setEmailCheckMessage(response.data.message);
        } catch (error) {
          setEmailAvailable(false);
          setEmailCheckMessage('Erreur de vérification');
        } finally {
          setIsChecking(false);
        }
      } else {
        setEmailAvailable(null);
        setEmailCheckMessage('');
      }
    };
    
    const timeout = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeout);
  }, [email, user?.email]);

  // Vérifier le nom en temps réel
  useEffect(() => {
    const checkUsername = async () => {
      if (name && name !== user?.name) {
        setIsChecking(true);
        try {
          const response = await axios.post(
            'https://sonimusic-1.onrender.com/api/auth/check-username',
            { username: name }
          );
          setUsernameAvailable(response.data.available);
          setUsernameCheckMessage(response.data.message);
        } catch (error) {
          setUsernameAvailable(false);
          setUsernameCheckMessage('Erreur de vérification');
        } finally {
          setIsChecking(false);
        }
      } else {
        setUsernameAvailable(null);
        setUsernameCheckMessage('');
      }
    };
    
    const timeout = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeout);
  }, [name, user?.name]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si l'email a changé
    if (email !== user?.email) {
      if (!emailAvailable) {
        setMessage('❌ Cet email est déjà utilisé');
        return;
      }
      
      setLoading(true);
      setMessage('');

      try {
        const response = await axios.post(
          'https://sonimusic-1.onrender.com/api/auth/change-email',
          {
            currentEmail: user.email,
            newEmail: email
          },
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        setMessage('📧 Un email de confirmation a été envoyé à la nouvelle adresse.');
        setLoading(false);
        
        setTimeout(() => {
          onClose();
        }, 3000);
      } catch (error) {
        setMessage('❌ ' + (error.response?.data?.error || 'Erreur lors de la demande'));
        setLoading(false);
      }
      return;
    }

    // Si seul le nom change
    if (name !== user?.name) {
      if (!usernameAvailable) {
        setMessage('❌ Ce nom est déjà utilisé');
        return;
      }
      
      setLoading(true);
      setMessage('');

      try {
        const updatedUser = { ...user, name };
        updateUser(updatedUser);
        setMessage('✅ Nom mis à jour avec succès !');
        setLoading(false);
        setTimeout(() => onClose(), 1500);
      } catch (error) {
        setMessage('❌ Erreur lors de la mise à jour');
        setLoading(false);
      }
    }
  };

  const EmailStatus = () => {
    if (email === user?.email) return null;
    if (isChecking) return <Loader className="w-4 h-4 text-gray-400 animate-spin" />;
    if (emailAvailable === true) return <Check className="w-4 h-4 text-green-400" />;
    if (emailAvailable === false) return <AlertCircle className="w-4 h-4 text-red-400" />;
    return null;
  };

  const UsernameStatus = () => {
    if (name === user?.name) return null;
    if (isChecking) return <Loader className="w-4 h-4 text-gray-400 animate-spin" />;
    if (usernameAvailable === true) return <Check className="w-4 h-4 text-green-400" />;
    if (usernameAvailable === false) return <AlertCircle className="w-4 h-4 text-red-400" />;
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 border border-gray-800/50 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Modifier mon profil</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo de profil */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full bg-gray-800/50 overflow-hidden border-2 border-[#d4af37]">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-[#d4af37] rounded-full p-1 cursor-pointer hover:bg-[#c49a2a] transition-colors">
                <Upload className="w-4 h-4 text-black" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-gray-400 text-xs mt-2">Cliquez sur l'icône pour changer</p>
          </div>

          {/* Nom */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-gray-300 text-sm font-medium mb-1">Nom complet</label>
              <UsernameStatus />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-2 bg-gray-800/50 border ${
                usernameAvailable === false ? 'border-red-500' :
                usernameAvailable === true ? 'border-green-500' : 'border-gray-700'
              } rounded-lg text-white focus:border-[#d4af37] outline-none transition-all`}
            />
            {usernameCheckMessage && usernameAvailable === false && (
              <p className="text-red-400 text-xs mt-1">{usernameCheckMessage}</p>
            )}
            {usernameCheckMessage && usernameAvailable === true && (
              <p className="text-green-400 text-xs mt-1">{usernameCheckMessage}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-gray-300 text-sm font-medium mb-1">Email</label>
              <EmailStatus />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 bg-gray-800/50 border ${
                emailAvailable === false ? 'border-red-500' :
                emailAvailable === true ? 'border-green-500' : 'border-gray-700'
              } rounded-lg text-white focus:border-[#d4af37] outline-none transition-all`}
            />
            {emailCheckMessage && emailAvailable === false && (
              <p className="text-red-400 text-xs mt-1">{emailCheckMessage}</p>
            )}
            {emailCheckMessage && emailAvailable === true && (
              <p className="text-green-400 text-xs mt-1">{emailCheckMessage}</p>
            )}
            {email !== user?.email && emailAvailable === null && email && (
              <p className="text-gray-400 text-xs mt-1">Vérification en cours...</p>
            )}
          </div>

          {message && (
            <div className={`text-sm text-center ${
              message.includes('✅') ? 'text-green-400' : 
              message.includes('📧') ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isChecking}
            className="w-full py-3 bg-[#d4af37] text-black font-semibold rounded-lg hover:bg-[#c49a2a] transition-all disabled:opacity-50"
          >
            {loading ? 'Envoi en cours...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;
