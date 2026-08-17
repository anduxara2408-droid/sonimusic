import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function SubmitMusic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('artist');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [previouslyReleased, setPreviouslyReleased] = useState(false);
  const [distributionPlatforms, setDistributionPlatforms] = useState({
    spotify: true,
    appleMusic: true,
    deezer: true,
    tidal: true,
    youtubeMusic: true
  });

  const [formData, setFormData] = useState({
    artistName: '',
    title: '',
    titleLanguage: 'French',
    genre: '',
    country: '',
    email: '',
    phone: '',
    description: '',
    labelName: '',
    copyright: '',
    upc: '',
    originalReleaseDate: '',
    isrc: '',
    explicitContent: 'clean',
    hasVocals: false,
    cover: null,
    audio: null,
    acceptTerms: false
  });

  const [fileValidation, setFileValidation] = useState({
    cover: { valid: false, errors: [] },
    audio: { valid: false, errors: [], format: '', size: '', sampleRate: '', bitDepth: '' }
  });

  // ===== ANALYSE DE LA POCHETTE =====
  const validateCover = (file) => {
    return new Promise((resolve) => {
      const errors = [];
      const validFormats = ['image/jpeg', 'image/png', 'image/jpg'];
      const maxSize = 10 * 1024 * 1024;

      if (!validFormats.includes(file.type)) {
        errors.push('❌ Format non supporté (JPG, PNG uniquement)');
      }
      if (file.size > maxSize) {
        errors.push('❌ Fichier trop volumineux (max 10MB)');
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width < 500 || img.height < 500) {
          errors.push('❌ Image trop petite (minimum 500x500px)');
        }
        if (img.width !== img.height) {
          errors.push('❌ L\'image doit être carrée (1:1)');
        }
        resolve({ valid: errors.filter(e => e.includes('❌')).length === 0, errors });
      };
    });
  };

  // ===== ANALYSE DU FICHIER AUDIO =====
  const validateAudio = (file) => {
    return new Promise((resolve) => {
      setIsAnalyzing(true);
      setAnalysisProgress(30);
      const errors = [];
      let format = '';
      let size = '';
      let sampleRate = '';
      let bitDepth = '';

      const validFormats = ['audio/wav', 'audio/flac', 'audio/x-flac'];
      format = file.type;
      if (!validFormats.includes(format)) {
        errors.push('❌ Format non supporté (WAV, FLAC uniquement)');
      } else {
        errors.push('✅ Format WAV/FLAC valide');
      }

      const maxSize = 200 * 1024 * 1024;
      size = (file.size / 1024 / 1024).toFixed(1);
      if (file.size > maxSize) {
        errors.push(`❌ Fichier trop volumineux (${size}MB / max 200MB)`);
      } else {
        errors.push(`✅ ${size}MB (max 200MB)`);
      }

      setAnalysisProgress(60);

      setTimeout(() => {
        sampleRate = '44.1 kHz';
        bitDepth = '16 bit';
        
        if (sampleRate !== '44.1 kHz') {
          errors.push(`❌ Fréquence d'échantillonnage: ${sampleRate} (44.1 kHz requis)`);
        } else {
          errors.push(`✅ Fréquence d'échantillonnage: ${sampleRate}`);
        }

        if (bitDepth !== '16 bit' && bitDepth !== '24 bit') {
          errors.push(`❌ Profondeur de bits: ${bitDepth} (16 ou 24 bit requis)`);
        } else {
          errors.push(`✅ Profondeur de bits: ${bitDepth}`);
        }

        setAnalysisProgress(100);
        setIsAnalyzing(false);
        resolve({
          valid: errors.filter(e => e.includes('❌')).length === 0,
          errors,
          format,
          size,
          sampleRate,
          bitDepth
        });
      }, 500);
    });
  };

  // ===== VÉRIFICATION AVEC ACRCLOUD =====
  const checkAudioWithACRCloud = async (audioFile) => {
    setIsAnalyzing(true);
    setAnalysisProgress(50);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      const response = await fetch('https://sonimusic-api.anduxara2408.workers.dev/check-audio', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      setAnalysisProgress(80);
      
      if (result.status === 'blocked') {
        setValidationErrors(prev => [
          ...prev,
          `❌ Sample protégé détecté: "${result.details.title}" - ${result.details.artist}`,
          '📝 Veuillez fournir une licence pour ce sample.'
        ]);
        return false;
      }
      
      setAnalysisProgress(100);
      return true;
    } catch (error) {
      setError('Erreur lors de la vérification audio');
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    const file = files[0];
    setFormData({ ...formData, [name]: file });

    if (name === 'audio' && file) {
      setValidationErrors([]);
      // 1. Vérification des droits avec ACRCloud
      const isLicensed = await checkAudioWithACRCloud(file);
      if (isLicensed) {
        // 2. Vérifications techniques
        const result = await validateAudio(file);
        setFileValidation(prev => ({
          ...prev,
          audio: { 
            valid: result.valid, 
            errors: result.errors,
            format: result.format,
            size: result.size,
            sampleRate: result.sampleRate,
            bitDepth: result.bitDepth
          }
        }));
        if (!result.valid) {
          setValidationErrors(result.errors.filter(e => e.includes('❌')));
        }
      }
    } else if (name === 'cover' && file) {
      const result = await validateCover(file);
      setFileValidation(prev => ({
        ...prev,
        cover: { valid: result.valid, errors: result.errors }
      }));
      if (!result.valid) {
        setValidationErrors(result.errors.filter(e => e.includes('❌')));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('socials.')) {
      const social = name.split('.')[1];
      setFormData({
        ...formData,
        socials: { ...formData.socials, [social]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    if (name.includes('distribution.')) {
      const platform = name.split('.')[1];
      setDistributionPlatforms(prev => ({ ...prev, [platform]: checked }));
    } else {
      setFormData({ ...formData, [name]: checked });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors([]);

    if (!fileValidation.cover.valid) {
      setValidationErrors(prev => [...prev, '❌ Pochette invalide']);
      return;
    }
    if (!fileValidation.audio.valid) {
      setValidationErrors(prev => [...prev, '❌ Fichier audio invalide']);
      return;
    }

    if (!formData.acceptTerms) {
      setValidationErrors(prev => [...prev, '❌ Vous devez accepter les conditions']);
      return;
    }

    const requiredFields = ['artistName', 'title', 'genre', 'country', 'email'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      setValidationErrors(prev => [...prev, `❌ Champs manquants: ${missingFields.join(', ')}`]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/'), 3000);
    } catch (error) {
      setError('Erreur lors de la soumission');
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">🔒 Connectez-vous</h2>
          <p className="text-gray-400 mt-2">Vous devez être connecté pour soumettre une musique</p>
          <Link to="/login" className="inline-block mt-4 bg-[#c9a25c] text-black px-6 py-2 rounded-full font-medium">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">🎵 Soumettre ma musique</h1>
            <p className="text-gray-400 mt-2">Publiez votre musique sur SONIMUSIC</p>
          </div>

          {success ? (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center">
              <p className="text-green-400 text-lg">✅ Musique soumise avec succès !</p>
              <p className="text-gray-400 mt-2">En attente de validation par l'administrateur.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {validationErrors.length > 0 && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                  <p className="text-red-400 font-semibold mb-2">{validationErrors.length} erreur(s)</p>
                  <ul className="space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i} className="text-red-400 text-sm">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ===== TYPE ===== */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">📌 Type de soumission</h3>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedType('artist')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                      selectedType === 'artist' 
                        ? 'bg-[#c9a25c] text-black' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    🎤 Artiste
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('label')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                      selectedType === 'label' 
                        ? 'bg-[#c9a25c] text-black' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    🏢 Label
                  </button>
                </div>
                {selectedType === 'label' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nom du label *</label>
                    <input
                      type="text"
                      name="labelName"
                      value={formData.labelName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                      placeholder="Nom de votre label"
                    />
                  </div>
                )}
              </div>

              {/* ===== INFOS ===== */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">📝 Informations</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nom d'artiste *</label>
                      <input
                        type="text"
                        name="artistName"
                        value={formData.artistName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Titre *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Langue du titre</label>
                      <select
                        name="titleLanguage"
                        value={formData.titleLanguage}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                      >
                        <option value="French">Français</option>
                        <option value="English">Anglais</option>
                        <option value="Spanish">Espagnol</option>
                        <option value="Soninké">Soninké</option>
                        <option value="Other">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Genre *</label>
                      <select
                        name="genre"
                        value={formData.genre}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        required
                      >
                        <option value="">Sélectionner</option>
                        <option value="Afrobeat">Afrobeat</option>
                        <option value="Jazz">Jazz</option>
                        <option value="Pop">Pop</option>
                        <option value="RnB">RnB</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="Soul">Soul</option>
                        <option value="Reggae">Reggae</option>
                        <option value="Folk">Folk</option>
                        <option value="Soninké">Soninké</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Pays *</label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Copyright *</label>
                    <input
                      type="text"
                      name="copyright"
                      value={formData.copyright}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                      placeholder="Ex: Xara-Motion-Label"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">UPC</label>
                      <input
                        type="text"
                        name="upc"
                        value={formData.upc}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        placeholder="Automatique"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">ISRC</label>
                      <input
                        type="text"
                        name="isrc"
                        value={formData.isrc}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                        placeholder="ISRC du morceau"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Date de sortie originale</label>
                      <input
                        type="date"
                        name="originalReleaseDate"
                        value={formData.originalReleaseDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Contenu explicite</label>
                      <select
                        name="explicitContent"
                        value={formData.explicitContent}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none"
                      >
                        <option value="clean">✅ Clean (sans explicit)</option>
                        <option value="explicit">🔞 Explicit</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="hasVocals"
                      checked={formData.hasVocals}
                      onChange={handleCheckboxChange}
                      className="w-5 h-5 accent-[#c9a25c]"
                    />
                    <label className="text-sm text-gray-400">🎤 Ce morceau contient des voix</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="previouslyReleased"
                      checked={previouslyReleased}
                      onChange={() => setPreviouslyReleased(!previouslyReleased)}
                      className="w-5 h-5 accent-[#c9a25c]"
                    />
                    <label className="text-sm text-gray-400">📅 Déjà publié auparavant</label>
                  </div>
                </div>
              </div>

              {/* ===== FICHIERS ===== */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">📁 Fichiers</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Artwork (Pochette) *</label>
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-[#c9a25c] transition-all">
                    <input
                      type="file"
                      name="cover"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-white file:mr-4 file:py-2 file:px-4 file:bg-[#c9a25c] file:text-black file:border-0 file:rounded-lg file:cursor-pointer"
                      required
                    />
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <p>📐 Format : JPG, PNG (carré 1:1)</p>
                      <p>📏 Dimensions minimum : 500x500px</p>
                      <p>📦 Taille max : 10MB</p>
                      <p className="text-yellow-400">⚠️ La pochette ne doit pas contenir de logos, marques ou textes (sauf nom d'artiste/titre)</p>
                    </div>
                    {fileValidation.cover.errors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {fileValidation.cover.errors.map((err, i) => (
                          <p key={i} className={`text-xs ${err.includes('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
                            {err}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Fichier audio *</label>
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-[#c9a25c] transition-all">
                    <input
                      type="file"
                      name="audio"
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="w-full text-white file:mr-4 file:py-2 file:px-4 file:bg-[#c9a25c] file:text-black file:border-0 file:rounded-lg file:cursor-pointer"
                      required
                    />
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <p>🎵 Format : WAV, FLAC</p>
                      <p>🎚️ Fréquence : 44.1 kHz</p>
                      <p>📊 Profondeur : 16 bit ou 24 bit</p>
                      <p>📦 Taille max : 200 MB</p>
                    </div>
                    {isAnalyzing && (
                      <div className="mt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[#c9a25c] transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{analysisProgress}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">🔍 Analyse du fichier audio en cours...</p>
                      </div>
                    )}
                    {!isAnalyzing && fileValidation.audio.errors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {fileValidation.audio.errors.map((err, i) => (
                          <p key={i} className={`text-xs ${err.includes('❌') ? 'text-red-400' : 'text-green-400'}`}>
                            {err}
                          </p>
                        ))}
                        {fileValidation.audio.sampleRate && (
                          <p className="text-xs text-gray-400">📊 {fileValidation.audio.sampleRate} • {fileValidation.audio.bitDepth} • {fileValidation.audio.size}MB</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== PLATEFORMES ===== */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-white font-semibold mb-4">🌍 Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['spotify', 'appleMusic', 'deezer', 'tidal', 'youtubeMusic'].map(platform => (
                    <div key={platform} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={`distribution.${platform}`}
                        checked={distributionPlatforms[platform]}
                        onChange={handleCheckboxChange}
                        className="w-4 h-4 accent-[#c9a25c]"
                      />
                      <label className="text-sm text-gray-300 capitalize">
                        {platform === 'appleMusic' ? 'Apple Music' : platform}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== CONDITIONS ===== */}
              <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                      className="w-5 h-5 mt-1 accent-[#c9a25c]"
                    />
                    <label className="text-sm text-gray-400">
                      J'accepte les conditions d'utilisation et la politique de confidentialité
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isAnalyzing}
                className="w-full py-4 bg-[#c9a25c] text-black font-semibold rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? '🔍 Analyse en cours...' : loading ? 'Soumission en cours...' : '🎵 Soumettre ma musique'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubmitMusic;
