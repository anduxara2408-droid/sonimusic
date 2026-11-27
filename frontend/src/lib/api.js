import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'https://sonimusic-1.onrender.com';

// Client HTTP commun : ajoute automatiquement le token de connexion.
const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* stockage indisponible */
  }
  return config;
});

export default api;

// Adresse d'un fichier média : les chemins relatifs sont servis par le site lui-même.
export const mediaUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

export const artistNameOf = (song) =>
  song?.artist?.artistName || song?.artist?.name || song?.artistName || 'Artiste';

export const formatCount = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1).replace('.', ',')} k`;
  return String(v);
};

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
