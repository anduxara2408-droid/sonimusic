import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Headphones, Heart, MapPin, Play, UserCheck, UserPlus, Users } from 'lucide-react';
import api, { formatCount } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { Cover, SectionTitle, SongCard, SongRow } from '../components/SongItems';

const Stat = ({ icon: Icon, value, label }) => (
  <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
    <Icon className="mx-auto h-4 w-4 text-amber-400" />
    <p className="mt-1 text-lg font-extrabold text-white">{formatCount(value)}</p>
    <p className="text-[11px] text-gray-400">{label}</p>
  </div>
);

const ArtistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { playSong } = usePlayer();
  const [artist, setArtist] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setArtist(null);
    setError('');
    api.get(`/api/artists/${id}/profile`)
      .then(({ data }) => setArtist(data))
      .catch((e) => setError(e.response?.status === 404 ? 'Artiste introuvable.' : 'Impossible de charger cet artiste.'));
  }, [id]);

  const follow = async () => {
    if (!isAuthenticated) return navigate('/login');
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/api/artists/${id}/follow`);
      setArtist((a) => ({ ...a, following: data.following, stats: { ...a.stats, followers: data.followers } }));
    } catch { /* ignoré */ }
    setBusy(false);
  };

  if (error) return <div className="px-4 py-20 text-center text-gray-400">{error} <Link to="/artists" className="text-amber-400">Voir les artistes</Link></div>;
  if (!artist) return <div className="mx-auto max-w-5xl px-4 py-10"><div className="h-56 animate-pulse rounded-3xl bg-white/5" /></div>;

  const name = artist.artistName || artist.name;
  const songs = artist.songs || [];
  const popular = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5);
  const isMe = user?.id === artist.id;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-600/25 via-transparent to-fuchsia-800/25 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
          <Cover src={artist.profilePic} alt={name} className="h-36 w-36 flex-shrink-0 rounded-full shadow-2xl ring-4 ring-black/40 sm:h-44 sm:w-44" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 sm:justify-start">
              <BadgeCheck className="h-4 w-4" /> {artist.role === 'LABEL' ? 'Label' : 'Artiste'}
            </p>
            <h1 className="mt-1 break-words text-3xl font-black text-white sm:text-5xl">{name}</h1>
            {artist.country && <p className="mt-2 flex items-center justify-center gap-1 text-sm text-gray-300 sm:justify-start"><MapPin className="h-4 w-4" /> {artist.country}</p>}
            <p className="mt-1 text-sm text-gray-400">{formatCount(artist.stats?.monthlyListeners)} auditeurs ce mois-ci</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {songs.length > 0 && (
            <button onClick={() => playSong(songs[0], songs)} className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-black hover:bg-amber-400">
              <Play className="h-4 w-4" fill="currentColor" /> Écouter
            </button>
          )}
          {!isMe && (
            <button onClick={follow} disabled={busy} className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold ${artist.following ? 'border border-white/30 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
              {artist.following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {artist.following ? 'Abonné' : "S'abonner"}
            </button>
          )}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} value={artist.stats?.followers} label="Abonnés" />
        <Stat icon={Headphones} value={artist.stats?.plays} label="Écoutes" />
        <Stat icon={Heart} value={artist.stats?.likes} label="J'aime" />
        <Stat icon={Play} value={artist.stats?.totalSongs ?? songs.length} label="Titres" />
      </div>

      {artist.bio && (
        <section className="mt-8">
          <SectionTitle title="À propos" />
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{artist.bio}</p>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle title="Populaires" />
        {popular.length === 0 ? <p className="text-sm text-gray-500">Aucun titre publié pour l'instant.</p> : popular.map((s, i) => <SongRow key={s.id} song={s} list={popular} rank={i + 1} />)}
      </section>

      {songs.length > 0 && (
        <section className="mt-8">
          <SectionTitle title="Tous les titres" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{songs.map((s) => <SongCard key={s.id} song={s} list={songs} />)}</div>
        </section>
      )}
    </div>
  );
};

export default ArtistProfile;
