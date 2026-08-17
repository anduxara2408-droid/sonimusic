import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  Upload, 
  Music, 
  Image, 
  CheckCircle, 
  AlertCircle,
  Home,
  Users,
  Album,
  Disc3,
  Library
} from 'lucide-react';

function AdminUpload() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
    author: '',
    producer: '',
    composer: '',
    destination: 'home',
    artistId: ''
  });
  const [files, setFiles] = useState({ audio: null, cover: null });
  const [fileErrors, setFileErrors] = useState({ audio: null, cover: null });
  const [artists, setArtists] = useState([]);

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const destinations = [
    { id: 'home', label: '🏠 Accueil', desc: 'Apparaît dans les nouveautés' },
    { id: 'albums', label: '💿 Albums', desc: 'Apparaît dans la section Albums' },
    { id: 'ep', label: '📀 EP', desc: 'Apparaît dans la section EP' },
    { id: 'library', label: '📚 Bibliothèque', desc: 'Apparaît dans la bibliothèque' },
    { id: 'artist', label: '🎤 Artiste', desc: 'Apparaît dans le profil d\'un artiste' },
  ];

  const validateAudioFile = (file) => {
    const allowedExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg'];
    const maxSize = 50 * 1024 * 1024;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return { valid: false, message: 'Format audio non supporté' };
    }
    if (file.size > maxSize) {
      return { valid: false, message: 'Le fichier audio dépasse 50 Mo' };
    }
    return { valid: true, message: '✅ Fichier audio valide' };
  };

  const validateCoverFile = (file) => {
    const allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    if (!allowedFormats.includes(file.type)) {
      return { valid: false, message: 'Format d\'image non supporté' };
    }
    if (file.size > maxSize) {
      return { valid: false, message: 'L\'image dépasse 5 Mo' };
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
      } else {
        setFiles({ ...files, audio: null });
        setFileErrors({ ...fileErrors, audio: validation.message });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.audio || !files.cover || !formData.title) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('genre', formData.genre);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('author', formData.author);
      formDataToSend.append('producer', formData.producer);
      formDataToSend.append('composer', formData.composer);
      formDataToSend.append('destination', formData.destination);
      formDataToSend.append('audio', files.audio);
      formDataToSend.append('cover', files.cover);

      await axios.post(
        'https://sonimusic-api.anduxara2408.workers.dev/api/admin/upload',
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSuccess('✅ Musique ajoutée avec succès !');
      setFormData({ title: '', genre: '', description: '', author: '', producer: '', composer: '', destination: 'home', artistId: '' });
      setFiles({ audio: null, cover: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800/50">
      <h1 className="text-2xl font-bold text-white mb-2">🎵 Ajouter une musique</h1>
      <p className="text-gray-400 mb-6">Upload et choisissez où la musique apparaîtra sur le site</p>

      {error && <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">{error}</div>}
      {success && <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Titre *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
            <input
              type="text"
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
              placeholder="Afrobeat, Jazz, Pop..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Destination *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {destinations.map((dest) => (
              <label
                key={dest.id}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.destination === dest.id
                    ? 'border-[#c9a25c] bg-[#c9a25c]/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <input
                  type="radio"
                  name="destination"
                  value={dest.id}
                  checked={formData.destination === dest.id}
                  onChange={handleChange}
                  className="hidden"
                />
                <div>
                  <p className="text-white text-sm font-medium">{dest.label}</p>
                  <p className="text-gray-400 text-xs">{dest.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Auteur</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Producteur</label>
            <input
              type="text"
              name="producer"
              value={formData.producer}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Compositeur</label>
            <input
              type="text"
              name="composer"
              value={formData.composer}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Fichier audio * (MP3, WAV, AAC, FLAC, OGG - Max 50MB)</label>
          <div className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
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
            <div className="flex flex-col items-center gap-1">
              {files.audio ? (
                <>
                  <Music className="w-6 h-6 text-green-400" />
                  <p className="text-white text-sm">{files.audio.name}</p>
                  <p className="text-gray-400 text-xs">{(files.audio.size / (1024 * 1024)).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-gray-400 text-sm">Cliquez ou glissez votre fichier audio</p>
                </>
              )}
            </div>
          </div>
          {fileErrors.audio && <p className="text-red-400 text-sm mt-1">{fileErrors.audio}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Pochette * (JPG, PNG, GIF, WEBP - Max 5MB)</label>
          <div className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all ${
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
            <div className="flex flex-col items-center gap-1">
              {files.cover ? (
                <>
                  <Image className="w-6 h-6 text-green-400" />
                  <p className="text-white text-sm">{files.cover.name}</p>
                  <p className="text-gray-400 text-xs">{(files.cover.size / (1024 * 1024)).toFixed(1)} MB</p>
                </>
              ) : (
                <>
                  <Image className="w-6 h-6 text-gray-400" />
                  <p className="text-gray-400 text-sm">Cliquez ou glissez votre pochette</p>
                </>
              )}
            </div>
          </div>
          {fileErrors.cover && <p className="text-red-400 text-sm mt-1">{fileErrors.cover}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#c9a25c] text-black font-semibold rounded-lg hover:bg-[#d4af37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Upload en cours...
            </>
          ) : (
            'Publier la musique'
          )}
        </button>
      </form>
    </div>
  );
}

export default AdminUpload;
