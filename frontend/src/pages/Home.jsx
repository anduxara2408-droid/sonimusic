import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Crown, Flame, Play, Radio as RadioIcon, Sparkles, Upload } from 'lucide-react';
import api, { mediaUrl } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../context/AuthContext';
import { ArtistCard, Cover, SectionTitle, SongCard, SongRow } from '../components/SongItems';

const slides = [
  { title: 'Les prochaines tendances sont d\'abord sur SONIMUSIC', text: 'Découvre les nouveaux sons d\'Afrique de l\'Ouest avant tout le monde.', cta: { to: '/discover', label: 'Voir tous les titres' } },
  { title: 'Artistes, faites-vous entendre', text: 'Publiez vos titres, suivez vos statistiques et vendez vos albums, EP et mixtapes.', cta: { to: '/artistes-labels', label: 'Espace artistes & labels' } },
  { title: 'La radio SONIMUSIC, 24h/24', text: 'Une radio gratuite en continu, sans inscription.', cta: { to: '/radio', label: 'Écouter la radio' } },
];

const Skeleton = ({ className }) => <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />;

const Highlight = ({ label, artist, icon: Icon }) => (
  <Link to={artist ? `/artist/${artist.id}` : '/artists'} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-4 transition hover:border-amber-500/50">
    <Cover src={artist?.profilePic} alt={artist?.artistName || ''} className="h-16 w-16 flex-shrink-0 rounded-full" />
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className="mt-1 truncate text-base font-bold text-white">{artist ? artist.artistName || artist.name : 'Bientôt désigné'}</p>
      <p className="truncate text-xs text-gray-400">{artist ? `${artist.plays} écoutes · ${artist.likes} j'aime` : 'Calculé automatiquement selon les écoutes'}</p>
    </div>
  </Link>
);

const Home = () => {
  const { playSong } = usePlayer();
  const { isAuthenticated, user } = useAuth();
  const [slide, setSlide] = useState(0);
  const [top, setTop] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [artists, setArtists] = useState(null);
  const [highlights, setHighlights] = useState({});

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.get('/api/charts/top-songs', { params: { period: 'week', limit: 10 } }).then(({ data }) => setTop(data.songs || [])).catch(() => setTop([]));
    api.get('/api/charts/new').then(({ data }) => setFresh(data || [])).catch(() => setFresh([]));
    api.get('/api/artists').then(({ data }) => setArtists(data || [])).catch(() => setArtists([]));
    api.get('/api/charts/highlights').then(({ data }) => setHighlights(data || {})).catch(() => {});
  }, []);

  const heroImages = (artists || []).filter((a) => a.profilePic).slice(0, 8);
  const marquee = heroImages.length ? [...heroImages, ...heroImages] : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {/* Bannière */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-600/30 via-orange-700/10 to-fuchsia-800/30">
        <div className="relative z-10 flex min-h-[300px] flex-col justify-center px-6 py-10 sm:min-h-[340px] sm:px-10 md:w-3/5">
          {slides.map((s, i) => (
            <div key={i} className={`transition-all duration-700 ${i === slide ? 'relative opacity-100' : 'pointer-events-none absolute inset-x-6 opacity-0 sm:inset-x-10'}`}>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{s.title}</h1>
              <p className="mt-3 max-w-md text-sm text-gray-200 sm:text-base">{s.text}</p>
              <Link to={s.cta.to} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black hover:bg-amber-400">
                {s.cta.label} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
          <div className="mt-8 flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-8 bg-white' : 'w-3 bg-white/40'}`} aria-label={`Diapositive ${i + 1}`} />
            ))}
          </div>
        </div>
        {heroImages.length > 0 && (
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 overflow-hidden md:block">
            <div className="hero-columns flex h-full gap-3 p-3 opacity-80">
              {[0, 1].map((col) => (
                <div key={col} className={`flex flex-1 flex-col gap-3 ${col ? 'animate-scroll-down' : 'animate-scroll-up'}`}>
                  {[...heroImages, ...heroImages].filter((_, i) => i % 2 === col).map((a, i) => (
                    <img key={`${a.id}-${i}`} src={mediaUrl(a.profilePic)} alt="" className="aspect-[3/4] w-full rounded-2xl object-cover" />
                  ))}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1208] via-transparent to-transparent" />
          </div>
        )}
      </section>

      {/* Défilé d'artistes */}
      {marquee.length > 0 && (
        <div className="marquee mt-6 overflow-hidden">
          <div className="marquee-track flex w-max gap-6">
            {marquee.map((a, i) => (
              <Link key={`${a.id}-${i}`} to={`/artist/${a.id}`} className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-4 hover:bg-white/10">
                <img src={mediaUrl(a.profilePic)} alt="" className="h-8 w-8 rounded-full object-cover" />
                <span className="whitespace-nowrap text-sm font-medium text-gray-200">{a.artistName || a.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Artistes du moment */}
      <section className="mt-10">
        <SectionTitle title="Artistes du moment" subtitle="Désignés automatiquement selon les écoutes, j'aime, partages et abonnés" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Highlight label="Artiste du jour" artist={highlights.day} icon={Flame} />
          <Highlight label="Artiste de la semaine" artist={highlights.week} icon={Sparkles} />
          <Highlight label="Artiste du mois" artist={highlights.month} icon={Crown} />
        </div>
      </section>

      {/* Top de la semaine */}
      <section className="mt-10">
        <SectionTitle
          title="Les plus écoutés"
          subtitle="Cette semaine sur SONIMUSIC"
          action={<Link to="/top" className="flex-shrink-0 text-sm font-semibold text-gray-400 hover:text-white">Classements</Link>}
        />
        {top === null ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : top.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun titre pour l'instant.</p>
        ) : (
          <>
            <div className="grid gap-x-6 md:grid-cols-2">
              {top.map((s, i) => <SongRow key={s.id} song={s} list={top} rank={i + 1} />)}
            </div>
            <button onClick={() => playSong(top[0], top)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400">
              <Play className="h-4 w-4" fill="currentColor" /> Tout écouter
            </button>
          </>
        )}
      </section>

      {/* Nouveautés */}
      <section className="mt-10">
        <SectionTitle
          title="Nouveautés"
          subtitle="Les derniers titres publiés"
          action={<Link to="/discover" className="flex-shrink-0 text-sm font-semibold text-gray-400 hover:text-white">Voir tous les titres</Link>}
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {fresh === null
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
            : fresh.slice(0, 10).map((s) => <SongCard key={s.id} song={s} list={fresh} />)}
        </div>
      </section>

      {/* Artistes */}
      <section className="mt-10">
        <SectionTitle title="Artistes" action={<Link to="/artists" className="flex-shrink-0 text-sm font-semibold text-gray-400 hover:text-white">Tous les artistes</Link>} />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {artists === null
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-full" />)
            : artists.slice(0, 12).map((a) => <ArtistCard key={a.id} artist={a} />)}
        </div>
      </section>

      {/* Appels à l'action */}
      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Link to="/radio" className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-amber-500/50">
          <RadioIcon className="h-10 w-10 flex-shrink-0 text-amber-400" />
          <div><p className="font-bold text-white">Radio SONIMUSIC 24h/24</p><p className="text-sm text-gray-400">Gratuite, en continu, sans inscription.</p></div>
        </Link>
        <Link to={isAuthenticated ? (user?.role === 'ARTIST' ? '/add-song' : '/artistes-labels') : '/register'} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-amber-500/50">
          <Upload className="h-10 w-10 flex-shrink-0 text-amber-400" />
          <div><p className="font-bold text-white">Tu es artiste ou label ?</p><p className="text-sm text-gray-400">Publie ta musique et vends tes projets sur SONIMUSIC.</p></div>
        </Link>
      </section>
    </div>
  );
};

export default Home;
