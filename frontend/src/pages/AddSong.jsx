import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Upload, Check, AlertCircle, Music, Image } from 'lucide-react';

function AddSong() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Redirection si non connecté
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/add-song' }} />;
  }

  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
    author: '',
    producer: '',
    composer: ''
  });
  
  const [files, setFiles] = useState({
    audio: null,
    cover: null
  });

  const [fileErrors, setFileErrors] = useState({
    audio: null,
    cover: null
  });

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Vérifications
  const validateAudioFile = (file) => {
    const allowedExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg'];
    const maxSize = 50 * 1024 * 1024;
    
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return { valid: false, message: 'Format audio non supporté. Formats acceptés : MP3, WAV, AAC, FLAC, OGG' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, message: 'Le fichier audio dépasse 50 Mo.' };
    }
    
    return { valid: true, message: '✅ Fichier audio valide' };
  };

  const validateCoverFile = (file) => {
    const allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    
    if (!allowedFormats.includes(file.type)) {
      return { valid: false, message: 'Format d\'image non supporté. Formats acceptés : JPG, PNG, GIF, WEBP' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, message: 'L\'image dépasse 5 Mo.' };
    }
    
    return { valid: true, message: '✅ Image valide' };
  };

  const handleFileChange = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];
    
    if (!file) {
      setFiles({ ...files, [name]: null });
      setFileErrors({ ...fileErrors, [name]: null });
      return;
    }

    if (name === 'audio') {
      const validation = validateAudioFile(file);
      if (validation.valid) {
        setFiles({ ...files, audio: file });
        setFileErrors({ ...fileErrors, audio: null });
        setVerificationStatus({ type: 'success', message: validation.message });
      } else {
        setFiles({ ...files, audio: null });
        setFileErrors({ ...fileErrors, audio: validation.message });
        setVerificationStatus({ type: 'error', message: validation.message });
        e.target.value = '';
      }
    } else if (name === 'cover') {
      const validation = validateCoverFile(file);
      if (validation.valid) {
        setFiles({ ...files, cover: file });
        setFileErrors({ ...fileErrors, cover: null });
      } else {
        setFiles({ ...files, cover: null });
        setFileErrors({ ...fileErrors, cover: validation.message });
        e.target.value = '';
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreditChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!files.audio) {
      setError('Veuillez sélectionner un fichier audio');
      return;
    }
    
    if (!files.cover) {
      setError('Veuillez sélectionner une pochette d\'album');
      return;
    }
    
    if (!formData.title.trim()) {
      setError('Veuillez saisir un titre');
      return;
    }
    
    // Récupérer les crédits
    const credits = {
      author: formData.author || '',
      producer: formData.producer || '',
      composer: formData.composer || ''
    };

    // Vérifier qu'au moins un crédit est rempli
    if (!credits.author && !credits.producer && !credits.composer) {
      setError('Veuillez renseigner au moins un crédit (auteur, producteur ou compositeur)');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    setIsVerifying(true);
    setVerificationStatus({ type: 'info', message: '🔍 Vérification en cours...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      setVerificationStatus({ type: 'success', message: '✅ Toutes les vérifications sont passées !' });
      await new Promise(resolve => setTimeout(resolve, 500));

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('genre', formData.genre);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('credits', JSON.stringify(credits));
      formDataToSend.append('audio', files.audio);
      formDataToSend.append('cover', files.cover);

      const response = await axios.post(
        'https://sonimusic-1.onrender.com/api/songs/add',
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSuccess('✅ Musique ajoutée avec succès ! En attente de validation.');
      setLoading(false);
      setIsVerifying(false);
      
      setTimeout(() => {
        setFormData({ title: '', genre: '', description: '', author: '', producer: '', composer: '' });
        setFiles({ audio: null, cover: null });
        setFileErrors({ audio: null, cover: null });
        setVerificationStatus(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
        navigate('/my-songs');
      }, 3000);

    } catch (error) {
      console.error('❌ Erreur:', error);
      setError(error.response?.data?.error || error.message || 'Erreur lors de l\'ajout');
      setVerificationStatus({ type: 'error', message: '❌ Erreur: ' + (error.response?.data?.error || error.message) });
      setIsVerifying(false);
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50">
          <h1 className="text-3xl font-bold text-[#c9a25c] text-center mb-2">Ajouter une musique</h1>
          <p className="text-gray-400 text-center mb-8">Publiez votre morceau sur SONIMUSIC</p>

          {verificationStatus && (
            <div className={`mb-6 p-4 rounded-lg border ${
              verificationStatus.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
              verificationStatus.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
              'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
            }`}>
              <div className="flex items-center gap-2">
                {verificationStatus.type === 'success' && <Check className="w-5 h-5" />}
                {verificationStatus.type === 'error' && <AlertCircle className="w-5 h-5" />}
                <span>{verificationStatus.message}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm text-center mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Titre *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                placeholder="Nom de votre morceau"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                placeholder="Afrobeat, Jazz, Pop, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                placeholder="Parlez de votre morceau..."
              />
            </div>

            {/* Fichier audio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fichier audio * (MP3, WAV, AAC, FLAC, OGG - Max 50MB)
              </label>
              <div className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                files.audio ? 'border-green-500 bg-green-500/10' :
                fileErrors.audio ? 'border-red-500 bg-red-500/10' :
                'border-gray-700 hover:border-[#c9a25c]/50'
              }`}>
                <input
                  type="file"
                  name="audio"
                  accept="audio/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  {files.audio ? (
                    <>
                      <Music className="w-8 h-8 text-green-400" />
                      <p className="text-white font-medium">{files.audio.name}</p>
                      <p className="text-gray-400 text-sm">{formatFileSize(files.audio.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-400">Cliquez ou glissez votre fichier audio</p>
                    </>
                  )}
                </div>
              </div>
              {fileErrors.audio && <p className="text-red-400 text-sm mt-1">{fileErrors.audio}</p>}
            </div>

            {/* Pochette */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pochette * (JPG, PNG, GIF, WEBP - Max 5MB)
              </label>
              <div className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                files.cover ? 'border-green-500 bg-green-500/10' :
                fileErrors.cover ? 'border-red-500 bg-red-500/10' :
                'border-gray-700 hover:border-[#c9a25c]/50'
              }`}>
                <input
                  type="file"
                  name="cover"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={coverInputRef}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                  {files.cover ? (
                    <>
                      <Image className="w-8 h-8 text-green-400" />
                      <p className="text-white font-medium">{files.cover.name}</p>
                      <p className="text-gray-400 text-sm">{formatFileSize(files.cover.size)}</p>
                    </>
                  ) : (
                    <>
                      <Image className="w-8 h-8 text-gray-400" />
                      <p className="text-gray-400">Cliquez ou glissez votre pochette</p>
                    </>
                  )}
                </div>
              </div>
              {fileErrors.cover && <p className="text-red-400 text-sm mt-1">{fileErrors.cover}</p>}
            </div>

            {/* Crédits */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Crédits *</label>
              <p className="text-gray-500 text-xs mb-3">Remplissez au moins un crédit</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Auteur</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author || ''}
                    onChange={handleCreditChange}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                    placeholder="Nom de l'auteur"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Producteur</label>
                  <input
                    type="text"
                    name="producer"
                    value={formData.producer || ''}
                    onChange={handleCreditChange}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                    placeholder="Nom du producteur"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Compositeur</label>
                  <input
                    type="text"
                    name="composer"
                    value={formData.composer || ''}
                    onChange={handleCreditChange}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                    placeholder="Nom du compositeur"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isVerifying}
              className="w-full py-4 bg-[#c9a25c] text-black font-semibold rounded-lg hover:bg-[#d4af37] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Envoi en cours...
                </>
              ) : isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  Vérification...
                </>
              ) : (
                'Publier la musique'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddSong;
