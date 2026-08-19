import React, { useState } from 'react';
import axios from 'axios';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'https://sonimusic-1.onrender.com/api/contact',
        formData
      );
      if (response.data.success) {
        setSubmitted(true);
        setFormData({ name: '', email: '', category: 'general', message: '' });
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] text-white p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-gray-900/50 rounded-2xl p-8 border border-gray-800/50 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400">Message envoyé !</h2>
          <p className="text-gray-400 mt-2">Nous vous répondrons dans les plus brefs délais.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 px-6 py-2 bg-[#c9a25c] text-black rounded-lg hover:bg-[#d4af37] transition-all"
          >
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-[#c9a25c] mb-6">Contactez-nous</h1>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800/50">
          <p className="text-gray-400 text-sm mb-6">
            Une question ? Une collaboration ? Un projet ? N'hésitez pas à nous contacter.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Nom complet *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Catégorie</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
              >
                <option value="general">Général</option>
                <option value="artist">Devenir artiste</option>
                <option value="support">Support technique</option>
                <option value="collaboration">Collaboration</option>
                <option value="financial">Soutien financier</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">Message *</label>
              <textarea
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:border-[#c9a25c] outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#c9a25c] text-black font-semibold rounded-lg hover:bg-[#d4af37] transition-all disabled:opacity-50"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400">📧 <a href="mailto:contact@sonimusic.online" className="hover:text-[#c9a25c] transition-all">contact@sonimusic.online</a></p>
          <p className="text-gray-400">🇸🇳 <a href="tel:+221781234567" className="hover:text-[#c9a25c] transition-all">+221 78 123 45 67</a></p>
          <p className="text-gray-400">🇲🇷 <a href="tel:+22245123456" className="hover:text-[#c9a25c] transition-all">+222 45 12 34 56</a></p>
        </div>
      </div>
    </div>
  );
}

export default Contact;
