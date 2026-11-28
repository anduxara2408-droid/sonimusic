import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Clock, Headphones, Heart, MessageCircle, Music2, Plus, RefreshCw, Share2, Users, CheckCircle2, XCircle,
} from 'lucide-react';
import api, { formatCount } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Cover } from '../components/SongItems';

const statusLabel = {
  ACCEPTED: { text: 'En ligne', cls: 'bg-emerald-500/15 text-emerald-400', icon: CheckCircle2 },
  PENDING: { text: 'En vérification', cls: 'bg-amber-500/15 text-amber-400', icon: Clock },
  REJECTED: { text: 'Refusé', cls: 'bg-red-500/15 text-red-400', icon: XCircle },
};

const releaseStatus = {
  PUBLISHED: ['En ligne', 'bg-emerald-500/15 text-emerald-400'],
  PENDING_REVIEW: ['En vérification', 'bg-amber-500/15 text-amber-400'],
  REJECTED: ['Refusée', 'bg-red-500/15 text-red-400'],
  TAKEN_DOWN: ['Retirée', 'bg-red-500/15 text-red-400'],
};

const MyReleases = () => {
  const [d, setD] = useState(null);
  useEffect(() => { api.get('/api/releases/mine').then(({ data }) => setD(data)).catch(() => setD({ releases: [], strikes: [] })); }, []);
  if (!d) return null;
  return (
    <>
      {d.strikes.length > 0 && (
        <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <h2 className="font-bold text-red-200">Avertissements : {d.strikes.length}/{d.maxStrikes}</h2>
          <p className="mt-1 text-sm text-red-100/80">Chaque avertissement expire après 90 jours. À {d.maxStrikes}, la publication est suspendue.</p>
          <ul className="mt-3 space-y-1 text-sm text-red-100">
            {d.strikes.map((s) => <li key={s.createdAt}>{new Date(s.createdAt).toLocaleDateString('fr-FR')} : {s.reason} (expire le {new Date(s.expiresAt).toLocaleDateString('fr-FR')})</li>)}
          </ul>
        </section>
      )}
      {d.releases.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-white">Mes sorties</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {d.releases.map((r) => {
              const [text, cls] = releaseStatus[r.status] || releaseStatus.PENDING_REVIEW;
              return (
                <div key={r.id} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <Cover src={r.coverUrl} alt={r.title} className="h-16 w-16 flex-shrink-0 rounded-xl" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.kind === 'SINGLE' ? 'Single' : r.kind === 'EP' ? 'EP' : 'Album'} · {r.tracks} titre{r.tracks > 1 ? 's' : ''} · {r.mode === 'SALE' ? `${Number(r.price).toLocaleString('fr-FR')} FCFA` : 'Gratuit'} · {r.ref}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{text}</span>
                    {r.rejectionReason && <p className="mt-1 text-xs text-red-300">Motif : {r.rejectionReason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
};

const Kpi = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-gray-400"><Icon className="h-4 w-4 text-amber-400" /> {label}</div>
    <p className="mt-2 text-2xl font-extrabold text-white">{formatCount(value)}</p>
    {hint && <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>}
  </div>
);

const ArtistDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api.get('/api/studio/stats')
      .then(({ data: d }) => setData(d))
      .catch((e) => setError(e.response?.status === 403
        ? "L'espace artiste est réservé aux comptes artistes et labels."
        : 'Impossible de charger les statistiques. Réessaie dans un instant.'));
  };
  useEffect(load, []);

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-gray-300">{error}</p>
        <button onClick={load} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" /> Réessayer</button>
      </div>
    );
  }
  if (!data) {
    return <div className="mx-auto max-w-6xl px-4 py-8"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}</div></div>;
  }

  const { totals, daily, songs } = data;
  const max = Math.max(1, ...daily.map((d) => d.plays));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Espace artiste</p>
          <h1 className="mt-1 text-3xl font-black text-white">Bonjour {user?.artistName || user?.name}</h1>
          <p className="mt-1 text-sm text-gray-400">Tes chiffres en temps réel, calculés sur les vraies écoutes.</p>
        </div>
        <Link to="/studio/publish" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-bold text-black hover:bg-amber-400">
          <Plus className="h-4 w-4" /> Publier un titre
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Headphones} label="Écoutes totales" value={totals.plays} hint={`${formatCount(totals.plays30)} ces 30 derniers jours`} />
        <Kpi icon={Users} label="Auditeurs (30 j)" value={totals.listeners30} hint="Personnes différentes" />
        <Kpi icon={Users} label="Abonnés" value={totals.followers} hint={`+${totals.newFollowers30} ce mois-ci`} />
        <Kpi icon={Heart} label="J'aime" value={totals.likes} />
        <Kpi icon={MessageCircle} label="Commentaires" value={totals.comments} />
        <Kpi icon={Share2} label="Partages" value={totals.shares} />
        <Kpi icon={Music2} label="Titres en ligne" value={totals.published} hint={`${totals.songs} au total`} />
        <Kpi icon={Clock} label="En vérification" value={totals.pending} />
      </div>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-amber-400" /><h2 className="text-lg font-bold text-white">Écoutes des 30 derniers jours</h2></div>
        <div className="mt-5 flex h-40 items-end gap-[3px]">
          {daily.map((d) => (
            <div key={d.day} className="group relative flex-1">
              <div className="w-full rounded-t bg-amber-500/80 transition-colors group-hover:bg-amber-400" style={{ height: `${Math.max(2, (d.plays / max) * 150)}px` }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white group-hover:block">
                {new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {d.plays} écoutes
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-gray-500">
          <span>{new Date(daily[0].day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          <span>Aujourd'hui</span>
        </div>
      </section>

      <MyReleases />

      <section className="mt-8">
        <h2 className="text-lg font-bold text-white">Mes titres</h2>
        {songs.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 p-8 text-center">
            <p className="text-gray-300">Tu n'as encore publié aucun titre.</p>
            <Link to="/studio/publish" className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-black"><Plus className="h-4 w-4" /> Publier mon premier titre</Link>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            {songs.map((s) => {
              const st = statusLabel[s.status] || statusLabel.PENDING;
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-3 last:border-0 sm:flex-nowrap">
                  <Cover src={s.coverArt} alt={s.title} className="h-12 w-12 flex-shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/song/${s.id}`} className="block truncate text-sm font-semibold text-white hover:underline">{s.title}</Link>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}><st.icon className="h-3 w-3" /> {st.text}</span>
                    {s.status === 'REJECTED' && s.rejectionReason && <p className="mt-1 text-xs text-red-300">Motif : {s.rejectionReason}</p>}
                  </div>
                  <div className="grid w-full grid-cols-4 gap-2 text-center text-xs text-gray-400 sm:w-auto sm:gap-6">
                    <div><p className="font-bold text-white">{formatCount(s.plays)}</p>écoutes</div>
                    <div><p className="font-bold text-white">{formatCount(s.likes)}</p>j'aime</div>
                    <div><p className="font-bold text-white">{formatCount(s.comments)}</p>comm.</div>
                    <div><p className="font-bold text-white">{formatCount(s.shares)}</p>partages</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ArtistDashboard;
