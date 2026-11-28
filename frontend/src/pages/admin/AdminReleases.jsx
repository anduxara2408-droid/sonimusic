import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, ChevronRight, FileWarning, Loader, ShieldCheck, X } from 'lucide-react';
import api from '../../lib/api';

const TABS = [
  ['PENDING_REVIEW', 'À vérifier'],
  ['PUBLISHED', 'En ligne'],
  ['REJECTED', 'Refusées'],
  ['TAKEN_DOWN', 'Retirées'],
];
const fmtTime = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '–');
const fmtDate = (d) => (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '–');
const BEAT = { own: 'Produit par l’artiste', exclusive: 'Licence exclusive', lease: 'Licence non exclusive', free: 'Beat gratuit autorisé' };

export const AdminReleases = () => {
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    api.get('/api/admin/releases', { params: { status } })
      .then(({ data: d }) => alive && setData(d))
      .catch((e) => alive && setError(e.response?.data?.error || 'Chargement impossible'));
    return () => { alive = false; };
  }, [status]);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-black text-white">Sorties des artistes</h1>
      <p className="mt-1 text-sm text-gray-400">Écoute, vérifie les droits et les crédits, puis valide ou refuse avec une raison envoyée à l’artiste.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setStatus(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${status === id ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
            {label}{data?.counts?.[id] ? ` (${data.counts[id]})` : ''}
          </button>
        ))}
      </div>
      {error && <p className="mt-6 text-red-300">{error}</p>}
      {!data && !error && <Loader className="mt-10 h-6 w-6 animate-spin text-amber-400" />}
      {data && data.releases.length === 0 && <p className="mt-10 text-gray-400">Aucune sortie dans cette catégorie.</p>}
      <ul className="mt-6 space-y-3">
        {data?.releases.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/releases/${r.id}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 hover:border-amber-500/40">
              <img src={r.coverUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl bg-white/5 object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{r.title}</p>
                <p className="truncate text-sm text-gray-400">{r.artistName} · {r.kind} · {r.tracks} titre{r.tracks > 1 ? 's' : ''} · {r.mode === 'SALE' ? `${r.price} FCFA` : 'Gratuit'}</p>
                <p className="text-xs text-gray-500">{r.ref} · {fmtDate(r.createdAt)}</p>
                {status === 'PENDING_REVIEW' && r.reviewReasons?.length > 0 && <p className="mt-1 truncate text-xs text-amber-300">{r.reviewReasons.join(' · ')}</p>}
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-500" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Check = ({ ok, children }) => (
  <li className={`flex gap-2 text-sm ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
    {ok ? <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}<span>{children}</span>
  </li>
);

export const AdminReleaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [strike, setStrike] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    api.get(`/api/admin/releases/${id}`).then(({ data }) => setD(data)).catch((e) => setError(e.response?.data?.error || 'Chargement impossible'));
  }, [id]);
  useEffect(load, [load]);

  const decide = async (kind) => {
    setBusy(true); setMsg('');
    try {
      await api.post(`/api/admin/releases/${id}/${kind}`, { reason, strike });
      setMsg(kind === 'approve' ? 'Sortie validée : l’artiste a été prévenu.' : kind === 'reject' ? 'Sortie refusée : l’artiste a reçu la raison par e-mail.' : 'Sortie retirée.');
      setAction(null); setReason(''); setStrike(false);
      load();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Action impossible');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="p-8 text-red-300">{error}</p>;
  if (!d) return <Loader className="m-8 h-6 w-6 animate-spin text-amber-400" />;
  const r = d.release;
  const templates = [
    'Les droits sur le beat ne sont pas prouvés : merci de joindre le contrat ou le reçu de licence autorisant la vente.',
    'Ce titre contient un sample non autorisé. Merci d’obtenir l’autorisation ou de retirer le sample.',
    'La pochette ne respecte pas nos règles (logo, texte illisible, contenu interdit ou qualité insuffisante).',
    'Les crédits (compositeur, producteur) sont incomplets ou incohérents.',
    'Ce titre est déjà publié par un autre artiste ou appartient à un tiers.',
    'La qualité audio est insuffisante (saturation, volume, coupures).',
  ];

  return (
    <div className="p-4 sm:p-8">
      <button onClick={() => navigate('/admin/releases')} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"><ChevronRight className="h-4 w-4 rotate-180" />Toutes les sorties</button>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <img src={r.coverUrl} alt="Pochette" className="h-56 w-56 flex-shrink-0 rounded-2xl bg-white/5 object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">{r.ref} · {r.kind} · {r.mode === 'SALE' ? `À vendre ${r.price} FCFA` : 'Gratuit'} · {r.status}</p>
          <h1 className="mt-1 text-3xl font-black text-white">{r.title}</h1>
          <p className="text-gray-300">{r.primaryArtist}{r.featuring && ` feat. ${r.featuring}`}</p>
          <p className="mt-1 text-sm text-gray-400">{r.genre} · {r.language} · sortie {r.releaseDate ? new Date(r.releaseDate).toLocaleDateString('fr-FR') : '–'}{r.explicit ? ' · Explicite' : ''}{r.upc ? ` · UPC ${r.upc}` : ''}</p>
          <p className="mt-3 text-sm text-gray-400">Compte : <Link to={`/artist/${r.artistId}`} className="text-amber-400 hover:underline">{r.artistName}</Link> ({r.artistEmail}) · inscrit le {new Date(r.artistSince).toLocaleDateString('fr-FR')}</p>
          <p className={`mt-1 text-sm ${d.strikes ? 'text-red-300' : 'text-gray-400'}`}>Avertissements actifs : {d.strikes}/3 · Historique : {d.history.map((h) => `${h.n} ${h.status}`).join(', ') || 'aucun'}</p>
          {r.rejectionReason && <p className="mt-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">Motif : {r.rejectionReason}</p>}
        </div>
      </div>

      {msg && <p className="mt-6 rounded-xl bg-white/5 p-3 text-sm text-white">{msg}</p>}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-white">Titres</h2>
            <ul className="mt-4 space-y-5">
              {d.tracks.map((t) => (
                <li key={t.id} className="border-b border-white/5 pb-5 last:border-0 last:pb-0">
                  <p className="font-semibold text-white">{t.position}. {t.title}{t.featuring && ` feat. ${t.featuring}`} <span className="text-sm font-normal text-gray-500">· {fmtTime(t.duration)}{t.isrc ? ` · ISRC ${t.isrc}` : ''}{t.explicit ? ' · E' : ''}</span></p>
                  <p className="mt-1 text-xs text-gray-400">
                    Fichier : {t.audioName} · {t.audioMeta?.format?.toUpperCase()} · {t.audioMeta?.sampleRate ? `${t.audioMeta.sampleRate / 1000} kHz` : ''}{t.audioMeta?.bitsPerSample ? ` · ${t.audioMeta.bitsPerSample} bits` : ''}{t.audioMeta?.bitrate && t.audioMeta.format === 'mp3' ? ` · ${t.audioMeta.bitrate} kbit/s` : ''}
                  </p>
                  {t.audioUrl && <audio controls preload="none" src={t.audioUrl} className="mt-2 w-full" />}
                  {t.previewUrl && <><p className="mt-2 text-xs text-gray-400">Extrait public :</p><audio controls preload="none" src={t.previewUrl} className="mt-1 w-full" /></>}
                  <p className="mt-2 text-sm text-gray-300">Compositeur : {t.credits?.composer || '–'} · Paroles : {t.credits?.lyricist || '–'} · Production : {t.credits?.producer || '–'}</p>
                  <ul className="mt-2 space-y-1">
                    {(t.audioChecks?.errors || []).map((e) => <Check key={e} ok={false}>{e}</Check>)}
                    {(t.audioChecks?.warnings || []).map((w) => <Check key={w} ok={false}>{w}</Check>)}
                    {!t.audioChecks?.warnings?.length && !t.audioChecks?.errors?.length && <Check ok>Contrôles automatiques conformes</Check>}
                    {(t.audioChecks?.duplicates || []).map((x) => (
                      <Check key={`${x.songId}${x.title}`} ok={false}>
                        {x.exact ? 'Fichier identique' : 'Enregistrement similaire'} à {x.songId ? <Link to={`/song/${x.songId}`} className="underline">« {x.title} »</Link> : 'un fichier existant'}{x.sameOwner ? ' (même artiste)' : ' (autre compte)'}
                      </Check>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          {r.mode === 'SALE' && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="font-bold text-white">Droits de la production</h2>
              <p className="mt-2 text-sm text-gray-300">{BEAT[r.beatSource] || '–'}{r.beatProducer && ` · ${r.beatProducer}`}</p>
              {r.beatLicense && <p className="mt-1 text-sm text-gray-400">{r.beatLicense}</p>}
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-white">Message et justificatifs de l’artiste</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-300">{r.noteToTeam || 'Aucun message.'}</p>
            {d.proofs.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {d.proofs.map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer noopener" className="block overflow-hidden rounded-xl border border-white/10 hover:border-amber-500/50">
                    {p.format === 'pdf'
                      ? <div className="flex h-32 items-center justify-center bg-white/5 text-sm text-gray-300">PDF : {p.name}</div>
                      : <img src={p.url} alt={p.name} className="h-32 w-full object-cover" />}
                  </a>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-gray-500">Aucun justificatif.</p>}
            {r.description && <><h3 className="mt-5 text-sm font-semibold text-gray-300">Description publique</h3><p className="mt-1 whitespace-pre-line text-sm text-gray-400">{r.description}</p></>}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-white">Contrôles</h2>
            <ul className="mt-3 space-y-1.5">
              {(d.cover?.checks?.warnings || []).map((w) => <Check key={w} ok={false}>Pochette : {w}</Check>)}
              {!d.cover?.checks?.warnings?.length && <Check ok>Pochette conforme ({d.cover?.meta?.width} × {d.cover?.meta?.height} px)</Check>}
              {(r.reviewReasons || []).map((x) => <Check key={x} ok={false}>{x}</Check>)}
              <Check ok>Déclarations acceptées le {fmtDate(r.declarations?.acceptedAt)}</Check>
            </ul>
          </section>

          <section className="sticky top-4 rounded-2xl border border-amber-500/30 bg-[#141414] p-5">
            <h2 className="flex items-center gap-2 font-bold text-white"><ShieldCheck className="h-5 w-5 text-amber-400" />Décision</h2>
            {!action && (
              <div className="mt-4 grid gap-2">
                {['PENDING_REVIEW', 'TAKEN_DOWN'].includes(r.status) && <button onClick={() => decide('approve')} disabled={busy} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50">{r.status === 'TAKEN_DOWN' ? 'Remettre en ligne' : 'Valider et publier'}</button>}
                {r.status === 'PENDING_REVIEW' && <button onClick={() => setAction('reject')} className="rounded-xl border border-red-500/50 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">Refuser</button>}
                {r.status === 'PUBLISHED' && <button onClick={() => setAction('takedown')} className="rounded-xl border border-red-500/50 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">Retirer du site</button>}
                {r.status === 'REJECTED' && <p className="text-sm text-gray-400">Sortie refusée le {fmtDate(r.reviewedAt)}. L’artiste peut la soumettre à nouveau.</p>}
              </div>
            )}
            {action && (
              <div className="mt-4">
                <p className="text-sm text-gray-300">Raison envoyée à l’artiste :</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {templates.map((t) => <button key={t} type="button" onClick={() => setReason(t)} className="rounded-full bg-white/5 px-2.5 py-1 text-left text-xs text-gray-300 hover:bg-white/10">{t.split(' ').slice(0, 5).join(' ')}…</button>)}
                </div>
                <textarea rows={5} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white outline-none focus:border-amber-500" placeholder="Explique précisément ce qui doit être corrigé" />
                <label className="mt-3 flex items-start gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={strike} onChange={(e) => setStrike(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-500" />
                  <span>Donner un avertissement (90 jours). À 3, la publication est bloquée. À réserver aux violations de droits ou fraudes.</span>
                </label>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => decide(action)} disabled={busy || reason.trim().length < 10} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-40">
                    {busy ? 'Envoi…' : action === 'reject' ? 'Confirmer le refus' : 'Confirmer le retrait'}
                  </button>
                  <button onClick={() => setAction(null)} className="rounded-xl px-3 text-gray-400 hover:bg-white/5" aria-label="Annuler"><X className="h-5 w-5" /></button>
                </div>
              </div>
            )}
            <p className="mt-4 flex gap-2 text-xs text-gray-500"><FileWarning className="h-4 w-4 flex-shrink-0" />Pour les ventes : vérifier que le beat, les samples et les crédits sont prouvés avant de valider.</p>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminReleases;
