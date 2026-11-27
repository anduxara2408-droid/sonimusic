import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLikes } from '../context/LikesContext';

// Bouton J'aime : l'état et le nombre viennent du serveur.
export const LikeButton = ({ songId, initialCount = null, size = 'md', onChange }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { liked: likedSet, setLiked: setLikedGlobal } = useLikes();
  const liked = likedSet.has(songId);
  const setLiked = (value) => setLikedGlobal(songId, value);
  const [count, setCount] = useState(initialCount);
  useEffect(() => { setCount(initialCount); }, [initialCount]);
  const [busy, setBusy] = useState(false);
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const click = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) return navigate('/login');
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post('/api/favorites/toggle', { songId });
      setLiked(data.liked);
      if (count !== null) setCount((c) => Math.max(0, (c || 0) + (data.liked ? 1 : -1)));
      onChange?.(data.liked);
    } catch { /* ignoré */ }
    setBusy(false);
  };

  return (
    <button onClick={click} className={`flex items-center gap-1.5 transition-colors ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-white'}`} aria-pressed={liked} aria-label="J'aime" title="J'aime">
      <Heart className={icon} fill={liked ? 'currentColor' : 'none'} />
      {count !== null && <span className="text-xs tabular-nums">{count}</span>}
    </button>
  );
};

// Partage : menu natif du téléphone si disponible, sinon WhatsApp / Facebook / copie du lien.
export const ShareButton = ({ song, size = 'md' }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const url = `${window.location.origin}/song/${song.id}`;
  const text = `Écoute « ${song.title} » sur SONIMUSIC`;
  const record = (channel) => api.post(`/api/songs/${song.id}/share`, { channel }).catch(() => {});

  const click = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({ title: song.title, text, url });
        record('native');
      } catch { /* annulé */ }
      return;
    }
    setOpen((o) => !o);
  };

  const links = [
    { channel: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { channel: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { channel: 'x', label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { channel: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  ];

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={click} className="text-gray-400 hover:text-white" aria-label="Partager" title="Partager">
        <Share2 className={icon} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] shadow-xl">
          {links.map((l) => (
            <a key={l.channel} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => { record(l.channel); setOpen(false); }} className="block px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10">
              {l.label}
            </a>
          ))}
          <button
            onClick={async () => {
              try { await navigator.clipboard.writeText(url); setCopied(true); record('copy'); setTimeout(() => { setCopied(false); setOpen(false); }, 1200); } catch { /* ignoré */ }
            }}
            className="block w-full px-4 py-2.5 text-left text-sm text-gray-200 hover:bg-white/10"
          >
            {copied ? 'Lien copié ✓' : 'Copier le lien'}
          </button>
        </div>
      )}
    </div>
  );
};
