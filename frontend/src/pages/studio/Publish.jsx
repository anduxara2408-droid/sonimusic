import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Check, CheckCircle, ChevronRight, CreditCard, Disc3, FileWarning, Image, Loader, Music, Pause, Play, ShieldCheck, Trash2, Upload, X,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { analyzeAudio, analyzeCover, describeAudioChecks, makePreview, sha256File } from '../../lib/mediaChecks';
import { errorMessage, uploadFile } from '../../lib/upload';

const GENRES = ['Afrobeat', 'Rap / Hip-hop', 'R&B / Soul', 'Mbalax', 'Pop', 'Reggae', 'Dancehall', 'Coupé-décalé', 'Zouk / Kompa', 'Gospel', 'Musique traditionnelle', 'Électro', 'Jazz', 'Rock', 'Instrumental / Beat', 'Autre'];
const LANGUAGES = ['Français', 'Anglais', 'Hassaniya', 'Arabe', 'Wolof', 'Pulaar', 'Soninké', 'Bambara', 'Instrumental', 'Autre'];
const KINDS = {
  SINGLE: { label: 'Single', hint: '1 à 3 titres', min: 1, max: 3 },
  EP: { label: 'EP', hint: '2 à 7 titres', min: 2, max: 7 },
  ALBUM: { label: 'Album', hint: '6 à 30 titres', min: 6, max: 30 },
};
const BEAT_SOURCES = [
  { id: 'own', label: 'Je l’ai produit moi-même', hint: 'La production est 100 % à moi ou à mon équipe.' },
  { id: 'exclusive', label: 'Acheté en licence exclusive', hint: 'Le beatmaker m’a cédé l’exclusivité.' },
  { id: 'lease', label: 'Licence non exclusive (lease)', hint: 'Vérifie que ta licence autorise la vente.' },
  { id: 'free', label: 'Beat gratuit avec autorisation', hint: 'Le producteur autorise l’usage commercial par écrit.' },
];
const STEPS = ['Type', 'Audio', 'Pochette', 'Infos', 'Récapitulatif'];

const input = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-amber-500 focus:bg-white/[0.06]';
const label = 'mb-1.5 block text-sm font-medium text-gray-300';
const fmtTime = (s) => (s == null ? '–' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const fmtSize = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} Mo` : `${Math.round(b / 1024)} Ko`);
let uid = 0;

const Issues = ({ errors = [], warnings = [] }) => (
  (errors.length || warnings.length) ? (
    <ul className="mt-3 space-y-1.5 text-sm">
      {errors.map((e) => <li key={e} className="flex gap-2 text-red-300"><X className="mt-0.5 h-4 w-4 flex-shrink-0" />{e}</li>)}
      {warnings.map((w) => <li key={w} className="flex gap-2 text-amber-300"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{w}</li>)}
    </ul>
  ) : null
);

const StatusPill = ({ state }) => {
  const map = {
    analyzing: ['Analyse…', 'bg-white/10 text-gray-300'],
    uploading: ['Envoi…', 'bg-white/10 text-gray-300'],
    checking: ['Vérification…', 'bg-white/10 text-gray-300'],
    ok: ['Conforme', 'bg-emerald-500/15 text-emerald-300'],
    warn: ['À vérifier', 'bg-amber-500/15 text-amber-300'],
    error: ['Refusé', 'bg-red-500/15 text-red-300'],
  };
  const [text, cls] = map[state] || map.analyzing;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{['analyzing', 'uploading', 'checking'].includes(state) && <Loader className="h-3 w-3 animate-spin" />}{text}</span>;
};

const Dropzone = ({ accept, multiple, onFiles, children, disabled }) => {
  const ref = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => !disabled && ref.current?.click()}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) ref.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) onFiles([...e.dataTransfer.files]); }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${over ? 'border-amber-500 bg-amber-500/5' : 'border-white/15 hover:border-white/30'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <input ref={ref} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => { onFiles([...e.target.files]); e.target.value = ''; }} />
      {children}
    </div>
  );
};

const Publish = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState(null);
  const [kind, setKind] = useState('SINGLE');
  const [tracks, setTracks] = useState([]);
  const [cover, setCover] = useState(null);
  const [info, setInfo] = useState({
    title: '', primaryArtist: user?.artistName || user?.name || '', featuring: '', genre: '', language: 'Français',
    releaseDate: new Date().toISOString().slice(0, 10), description: '', explicit: false, upc: '',
    price: '', beatSource: '', beatProducer: '', beatLicense: '',
  });
  const [proofs, setProofs] = useState([]);
  const [note, setNote] = useState('');
  const [decl, setDecl] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState('');
  const [done, setDone] = useState(null);
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);
  const topRef = useRef(null);

  const setI = (k) => (e) => setInfo((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const updateTrack = (id, patch) => setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)));

  // Avertit avant de quitter la page en cours de publication.
  useEffect(() => {
    const dirty = tracks.length > 0 && !done;
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [tracks.length, done]);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [step]);

  // ---------- AUDIO ----------
  const addAudio = async (files) => {
    setError('');
    const max = KINDS[kind].max;
    const accepted = files.filter((f) => /\.(mp3|wav|flac)$/i.test(f.name));
    if (accepted.length < files.length) setError('Certains fichiers ont été ignorés : seuls MP3, WAV et FLAC sont acceptés.');
    const room = max - tracks.length;
    if (room <= 0) { setError(`Un ${KINDS[kind].label} contient au maximum ${max} titres.`); return; }
    const list = accepted.slice(0, room).map((file) => ({
      id: ++uid, file, state: 'analyzing', progress: 0, errors: [], warnings: [], meta: null,
      title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 120),
      featuring: '', isrc: '', explicit: false, composer: '', lyricist: '', producer: '', performers: '',
      previewStart: null, previewId: null, buffer: null, duration: null,
    }));
    setTracks((ts) => [...ts, ...list]);
    for (const t of list) {
      // eslint-disable-next-line no-await-in-loop
      await processTrack(t);
    }
  };

  const processTrack = async (t) => {
    try {
      let analysis = { duration: null, checks: {}, fingerprint: null, buffer: null };
      try { analysis = await analyzeAudio(t.file); } catch { /* le navigateur ne sait pas décoder : le serveur vérifiera */ }
      const local = describeAudioChecks(analysis.checks, analysis.duration);
      updateTrack(t.id, {
        duration: analysis.duration, buffer: analysis.buffer, warnings: local.warnings, errors: local.errors,
        previewStart: analysis.duration ? Math.round(Math.min(60, analysis.duration * 0.3)) : 0,
      });
      if (local.errors.length) { updateTrack(t.id, { state: 'error' }); return; }
      updateTrack(t.id, { state: 'uploading' });
      const sha = await sha256File(t.file).catch(() => null);
      const res = await uploadFile(t.file, 'audio', {
        sha256: sha, fingerprint: analysis.fingerprint, clientChecks: analysis.checks,
        onProgress: (p) => updateTrack(t.id, { progress: p, state: p >= 1 ? 'checking' : 'uploading' }),
      });
      updateTrack(t.id, {
        uploadId: res.ok ? res.uploadId : null, meta: res.meta, errors: res.errors,
        warnings: [...new Set([...(res.warnings || [])])], state: !res.ok ? 'error' : res.warnings?.length ? 'warn' : 'ok',
        duration: res.meta?.duration || analysis.duration,
      });
    } catch (err) {
      updateTrack(t.id, { state: 'error', errors: [errorMessage(err, "L'envoi a échoué.")] });
    }
  };

  const removeTrack = (id) => {
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); }
    setTracks((ts) => ts.filter((t) => t.id !== id));
  };
  const move = (i, d) => setTracks((ts) => {
    const n = [...ts]; const j = i + d;
    if (j < 0 || j >= n.length) return ts;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const togglePlay = (t, from = 0) => {
    const a = audioRef.current;
    if (!a) return;
    if (playing === t.id) { a.pause(); setPlaying(null); return; }
    if (a.dataset.src) URL.revokeObjectURL(a.dataset.src);
    const url = URL.createObjectURL(t.file);
    a.dataset.src = url; a.src = url; a.currentTime = from;
    a.play().then(() => setPlaying(t.id)).catch(() => setPlaying(null));
  };

  // ---------- POCHETTE ----------
  const addCover = async (files) => {
    const file = files[0];
    if (!file) return;
    setError('');
    const c = { file, state: 'analyzing', progress: 0, errors: [], warnings: [] };
    setCover(c);
    const a = await analyzeCover(file);
    setCover({ ...c, ...a, state: a.errors.length ? 'error' : 'uploading' });
    if (a.errors.length) return;
    try {
      const res = await uploadFile(file, 'cover', {
        clientChecks: { blurry: a.blurry },
        onProgress: (p) => setCover((s) => (s ? { ...s, progress: p, state: p >= 1 ? 'checking' : 'uploading' } : s)),
      });
      setCover((s) => ({
        ...s, uploadId: res.ok ? res.uploadId : null, errors: res.errors, warnings: [...new Set([...(res.warnings || []), ...a.warnings])],
        state: !res.ok ? 'error' : (res.warnings?.length || a.warnings.length) ? 'warn' : 'ok',
      }));
    } catch (err) {
      setCover((s) => ({ ...s, state: 'error', errors: [errorMessage(err, "L'envoi a échoué.")] }));
    }
  };

  // ---------- JUSTIFICATIFS ----------
  const addProofs = async (files) => {
    setError('');
    const list = files.slice(0, Math.max(0, 6 - proofs.length)).map((file) => ({ id: ++uid, file, state: 'uploading', progress: 0 }));
    setProofs((p) => [...p, ...list]);
    for (const p of list) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await uploadFile(p.file, 'proof', { onProgress: (v) => setProofs((ps) => ps.map((x) => (x.id === p.id ? { ...x, progress: v } : x))) });
        setProofs((ps) => ps.map((x) => (x.id === p.id ? { ...x, state: res.ok ? 'ok' : 'error', uploadId: res.ok ? res.uploadId : null, errors: res.errors } : x)));
      } catch (err) {
        setProofs((ps) => ps.map((x) => (x.id === p.id ? { ...x, state: 'error', errors: [errorMessage(err)] } : x)));
      }
    }
  };

  // ---------- VALIDATION PAR ÉTAPE ----------
  const audioReady = tracks.length >= KINDS[kind].min && tracks.length <= KINDS[kind].max && tracks.every((t) => t.uploadId && ['ok', 'warn'].includes(t.state));
  const coverReady = cover?.uploadId && ['ok', 'warn'].includes(cover.state);
  const infoErrors = useMemo(() => {
    const e = [];
    if (!info.title.trim()) e.push('Titre de la sortie');
    if (!info.primaryArtist.trim()) e.push("Nom d'artiste");
    if (!info.genre) e.push('Genre');
    tracks.forEach((t, i) => {
      if (!t.title.trim()) e.push(`Nom du titre ${i + 1}`);
      if (!t.composer.trim()) e.push(`Compositeur (titre ${i + 1})`);
      if (!t.producer.trim()) e.push(`Producteur (titre ${i + 1})`);
      if (t.isrc && !/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(t.isrc.toUpperCase().replace(/[-\s]/g, ''))) e.push(`ISRC invalide (titre ${i + 1})`);
    });
    if (info.upc && !/^\d{12,13}$/.test(info.upc.replace(/\s/g, ''))) e.push('UPC : 12 ou 13 chiffres');
    if (mode === 'SALE') {
      const p = Number(info.price);
      if (!Number.isInteger(p) || p < 200 || p > 1000000) e.push('Prix (200 à 1 000 000 FCFA)');
      if (!info.beatSource) e.push('Origine du beat');
      if (info.beatSource && info.beatSource !== 'own' && !info.beatProducer.trim()) e.push('Nom du beatmaker');
    }
    return e;
  }, [info, tracks, mode]);

  const declarations = mode === 'SALE'
    ? [
      ['rights', 'Je certifie détenir 100 % des droits sur ces enregistrements, ou disposer de toutes les autorisations écrites nécessaires.'],
      ['samples', 'Ces titres ne contiennent aucun sample, extrait ou reprise non autorisé.'],
      ['beat', 'La production (beat) est à moi ou ma licence autorise explicitement la vente. Je peux le prouver à la demande.'],
      ['accuracy', 'Les crédits et informations fournis sont exacts. Une fausse déclaration entraîne le retrait et un avertissement.'],
      ['commission', 'J’accepte que SONIMUSIC prélève une commission de 15 % sur chaque vente (je reçois 85 %, versés à partir de 5 000 FCFA).'],
      ['terms', 'J’accepte les conditions d’utilisation et la charte artistes.'],
    ]
    : [
      ['rights', 'Je certifie détenir les droits sur ces enregistrements, ou disposer des autorisations nécessaires.'],
      ['samples', 'Ces titres ne contiennent aucun sample, extrait ou reprise non autorisé.'],
      ['accuracy', 'Les crédits et informations fournis sont exacts. SONIMUSIC peut retirer un titre signalé et donner un avertissement (3 avertissements = publication suspendue).'],
      ['terms', 'J’accepte les conditions d’utilisation et la charte artistes.'],
    ];
  const allDeclared = declarations.every(([k]) => decl[k]);
  const proofsNeeded = mode === 'SALE' && info.beatSource && info.beatSource !== 'own';
  const proofsOk = proofs.every((p) => p.state !== 'uploading') && (!proofsNeeded || proofs.some((p) => p.state === 'ok'));
  const canPublish = audioReady && coverReady && infoErrors.length === 0 && allDeclared && proofsOk && !busy;

  const canNext = [Boolean(mode), audioReady, coverReady, infoErrors.length === 0][step] ?? true;

  // Extraits d'écoute pour la vente (générés dans le navigateur, puis envoyés).
  const buildPreviews = async () => {
    for (let i = 0; i < tracks.length; i += 1) {
      const t = tracks[i];
      if (t.previewId && t.previewBuiltFrom === t.previewStart) continue;
      if (!t.buffer) throw new Error(`Titre ${i + 1} : fichier trop lourd pour préparer l’extrait dans le navigateur. Envoie une version MP3 320 kbit/s.`);
      setBusyText(`Préparation de l’extrait ${i + 1}/${tracks.length}…`);
      // eslint-disable-next-line no-await-in-loop
      const file = await makePreview(t.buffer, t.previewStart || 0, 45);
      // eslint-disable-next-line no-await-in-loop
      const res = await uploadFile(file, 'preview');
      if (!res.ok) throw new Error(res.errors?.[0] || 'Extrait refusé.');
      updateTrack(t.id, { previewId: res.uploadId, previewBuiltFrom: t.previewStart });
    }
  };

  const next = async () => {
    setError('');
    if (step === 3 && mode === 'SALE') {
      setBusy(true);
      try { await buildPreviews(); } catch (err) { setError(errorMessage(err, err.message)); setBusy(false); setBusyText(''); return; }
      setBusy(false); setBusyText('');
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    if (!canPublish) return;
    setBusy(true); setError(''); setBusyText('Publication…');
    try {
      const { data } = await api.post('/api/releases', {
        mode, kind, ...info, price: mode === 'SALE' ? Number(info.price) : undefined, upc: info.upc.replace(/\s/g, ''),
        coverUploadId: cover.uploadId, noteToTeam: note,
        proofUploadIds: proofs.filter((p) => p.state === 'ok').map((p) => p.uploadId),
        declarations: Object.fromEntries(declarations.map(([k]) => [k, true])),
        tracks: tracks.map((t) => ({
          audioUploadId: t.uploadId, previewUploadId: t.previewId || undefined, title: t.title, featuring: t.featuring,
          isrc: t.isrc, explicit: t.explicit,
          credits: { composer: t.composer, lyricist: t.lyricist, producer: t.producer, performers: t.performers },
        })),
      }, { timeout: 60000 });
      audioRef.current?.pause();
      setDone(data);
    } catch (err) {
      setError(errorMessage(err, 'La publication a échoué. Réessaie.'));
    } finally {
      setBusy(false); setBusyText('');
    }
  };

  // ---------- RENDU ----------
  if (done) {
    const live = done.status === 'PUBLISHED';
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${live ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
          {live ? <CheckCircle className="h-10 w-10 text-emerald-400" /> : <ShieldCheck className="h-10 w-10 text-amber-400" />}
        </span>
        <h1 className="mt-6 text-3xl font-black text-white">{live ? 'C’est en ligne !' : 'Sortie envoyée'}</h1>
        <p className="mt-3 text-gray-300">
          {live
            ? 'Ta musique a passé les contrôles automatiques et est disponible pour tous.'
            : 'Notre équipe vérifie les droits, les crédits et la qualité. Tu recevras un e-mail avec la décision, en général sous 72 heures.'}
        </p>
        <p className="mt-4 text-sm text-gray-400">Référence : <span className="font-bold tracking-wider text-amber-400">{done.ref}</span></p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/artist-dashboard" className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black hover:bg-amber-400">Voir mon Espace artiste</Link>
          <button onClick={() => window.location.reload()} className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5">Publier autre chose</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6" ref={topRef}>
      <audio ref={audioRef} onEnded={() => setPlaying(null)} className="hidden" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Studio</p>
          <h1 className="mt-1 text-3xl font-black text-white">Publier de la musique</h1>
        </div>
        {mode && <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300">{mode === 'SALE' ? 'À vendre' : 'Gratuit'} · {KINDS[kind].label}</span>}
      </div>

      {/* Progression */}
      <ol className="mt-8 grid grid-cols-5 gap-2">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => i < step && setStep(i)}
              className="w-full text-left disabled:cursor-default"
            >
              <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-amber-500' : 'bg-white/10'}`} />
              <span className={`mt-2 hidden text-xs font-semibold sm:block ${i === step ? 'text-white' : i < step ? 'text-amber-400' : 'text-gray-500'}`}>{i + 1}. {s}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs font-semibold text-gray-400 sm:hidden">Étape {step + 1} sur {STEPS.length} : {STEPS[step]}</p>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[#121212] p-5 sm:p-8">
        {/* ÉTAPE 1 : TYPE */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold text-white">Comment veux-tu diffuser ce projet ?</h2>
            <p className="mt-1 text-sm text-gray-400">Le formulaire s’adapte à ton choix.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { id: 'FREE', icon: Music, title: 'Gratuit', text: 'Écoute libre pour tous. En ligne dès que les contrôles automatiques sont validés.' },
                { id: 'SALE', icon: CreditCard, title: 'À vendre', text: 'Les auditeurs entendent un extrait et achètent le titre. Vérification complète par l’équipe.' },
              ].map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)} aria-pressed={mode === m.id}
                  className={`rounded-2xl border p-5 text-left transition ${mode === m.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                  <div className="flex items-center justify-between">
                    <m.icon className={`h-7 w-7 ${mode === m.id ? 'text-amber-400' : 'text-gray-400'}`} />
                    {mode === m.id && <Check className="h-5 w-5 text-amber-400" />}
                  </div>
                  <p className="mt-3 text-lg font-bold text-white">{m.title}</p>
                  <p className="mt-1 text-sm text-gray-400">{m.text}</p>
                </button>
              ))}
            </div>
            <h3 className="mt-8 text-sm font-semibold text-gray-300">Format</h3>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {Object.entries(KINDS).map(([id, k]) => (
                <button key={id} type="button" onClick={() => setKind(id)} aria-pressed={kind === id}
                  className={`rounded-2xl border p-4 text-left transition ${kind === id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                  <Disc3 className={`h-5 w-5 ${kind === id ? 'text-amber-400' : 'text-gray-500'}`} />
                  <p className="mt-2 font-bold text-white">{k.label}</p>
                  <p className="text-xs text-gray-400">{k.hint}</p>
                </button>
              ))}
            </div>
            {mode === 'SALE' && (
              <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
                Pour vendre, prépare : les noms du compositeur et du producteur de chaque titre, et si le beat n’est pas de toi, une preuve de licence (contrat, reçu ou capture d’écran).
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2 : AUDIO */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white">Fichiers audio</h2>
            <p className="mt-1 text-sm text-gray-400">WAV ou FLAC recommandés (16 ou 24 bits, 44,1 kHz minimum). MP3 accepté à partir de 128 kbit/s, 320 conseillé. 250 Mo maximum par titre.</p>
            <div className="mt-5">
              <Dropzone accept=".mp3,.wav,.flac,audio/mpeg,audio/wav,audio/flac" multiple={kind !== 'SINGLE' || tracks.length === 0} onFiles={addAudio} disabled={tracks.length >= KINDS[kind].max}>
                <Upload className="h-8 w-8 text-amber-400" />
                <p className="mt-3 font-semibold text-white">Glisse tes fichiers ici ou clique pour choisir</p>
                <p className="mt-1 text-xs text-gray-500">{tracks.length}/{KINDS[kind].max} titres · minimum {KINDS[kind].min}</p>
              </Dropzone>
            </div>
            <ul className="mt-5 space-y-3">
              {tracks.map((t, i) => (
                <li key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-gray-500 hover:text-white disabled:opacity-20" aria-label="Monter"><ChevronRight className="h-4 w-4 -rotate-90" /></button>
                      <span className="text-center text-xs font-bold text-gray-500">{i + 1}</span>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === tracks.length - 1} className="rounded p-0.5 text-gray-500 hover:text-white disabled:opacity-20" aria-label="Descendre"><ChevronRight className="h-4 w-4 rotate-90" /></button>
                    </div>
                    <button type="button" onClick={() => togglePlay(t)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-amber-500 hover:text-black" aria-label="Écouter">
                      {playing === t.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-white">{t.file.name}</p>
                        <StatusPill state={t.state} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {fmtSize(t.file.size)} · {fmtTime(t.duration)}
                        {t.meta && ` · ${t.meta.format?.toUpperCase()} · ${(t.meta.sampleRate / 1000).toString().replace('.', ',')} kHz${t.meta.bitsPerSample ? ` · ${t.meta.bitsPerSample} bits` : ''}${t.meta.bitrate && t.meta.format === 'mp3' ? ` · ${t.meta.bitrate} kbit/s` : ''}`}
                      </p>
                      {['uploading', 'checking'].includes(t.state) && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.round(t.progress * 100)}%` }} /></div>
                      )}
                      <Issues errors={t.errors} warnings={t.warnings} />
                      {mode === 'SALE' && t.duration > 0 && ['ok', 'warn'].includes(t.state) && (
                        <div className="mt-4 rounded-xl bg-black/30 p-3">
                          <p className="text-xs font-semibold text-gray-300">Extrait public de 45 s : début à {fmtTime(t.previewStart)}</p>
                          {t.buffer ? (
                            <div className="mt-2 flex items-center gap-3">
                              <input type="range" min={0} max={Math.max(0, Math.floor(t.duration - 45))} value={t.previewStart || 0}
                                onChange={(e) => updateTrack(t.id, { previewStart: Number(e.target.value) })} className="player-range flex-1" aria-label="Début de l'extrait" />
                              <button type="button" onClick={() => togglePlay(t, t.previewStart || 0)} className="text-xs font-semibold text-amber-400 hover:underline">Tester</button>
                            </div>
                          ) : <p className="mt-1 text-xs text-amber-300">Fichier trop lourd pour préparer l’extrait ici : envoie plutôt une version MP3 320 kbit/s de ce titre.</p>}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => removeTrack(t.id)} className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-red-400" aria-label="Retirer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
            {tracks.some((t) => t.state === 'error') && <p className="mt-4 text-sm text-red-300">Retire les fichiers refusés, corrige-les puis renvoie-les.</p>}
          </div>
        )}

        {/* ÉTAPE 3 : POCHETTE */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-white">Pochette</h2>
            <p className="mt-1 text-sm text-gray-400">Image carrée JPG ou PNG, 3000 × 3000 px recommandé (1400 px minimum), en couleurs RVB, 10 Mo maximum. Pas de texte flou, de logo de marque, de lien web, de numéro de téléphone ni de contenu choquant.</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-[240px_1fr]">
              <div className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                {cover?.previewUrl ? <img src={cover.previewUrl} alt="Aperçu de la pochette" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Image className="h-12 w-12 text-gray-600" /></div>}
              </div>
              <div>
                <Dropzone accept="image/jpeg,image/png" onFiles={addCover}>
                  <Upload className="h-7 w-7 text-amber-400" />
                  <p className="mt-2 font-semibold text-white">{cover ? 'Remplacer la pochette' : 'Choisir une image'}</p>
                </Dropzone>
                {cover && (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill state={cover.state} />
                      {cover.width && <span className="text-xs text-gray-400">{cover.width} × {cover.height} px · {fmtSize(cover.file.size)}</span>}
                    </div>
                    {['uploading', 'checking'].includes(cover.state) && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-500" style={{ width: `${Math.round(cover.progress * 100)}%` }} /></div>}
                    <Issues errors={cover.errors} warnings={cover.warnings} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : INFOS */}
        {step === 3 && (
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold text-white">Informations de la sortie</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className={label} htmlFor="r-title">Titre de la sortie</label><input id="r-title" className={input} maxLength={120} value={info.title} onChange={setI('title')} placeholder={kind === 'SINGLE' ? 'Souvent le nom du titre principal' : 'Nom du projet'} /></div>
                <div><label className={label} htmlFor="r-artist">Artiste principal</label><input id="r-artist" className={input} maxLength={100} value={info.primaryArtist} onChange={setI('primaryArtist')} /></div>
                <div><label className={label} htmlFor="r-feat">Featuring (facultatif)</label><input id="r-feat" className={input} maxLength={200} value={info.featuring} onChange={setI('featuring')} placeholder="Séparés par des virgules" /></div>
                <div><label className={label} htmlFor="r-genre">Genre</label>
                  <select id="r-genre" className={input} value={info.genre} onChange={setI('genre')}><option value="">Choisir…</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></div>
                <div><label className={label} htmlFor="r-lang">Langue principale</label>
                  <select id="r-lang" className={input} value={info.language} onChange={setI('language')}>{LANGUAGES.map((g) => <option key={g}>{g}</option>)}</select></div>
                <div><label className={label} htmlFor="r-date">Date de sortie</label><input id="r-date" type="date" className={input} value={info.releaseDate} onChange={setI('releaseDate')} /></div>
                <div><label className={label} htmlFor="r-upc">Code UPC/EAN (facultatif)</label><input id="r-upc" inputMode="numeric" className={input} maxLength={14} value={info.upc} onChange={setI('upc')} placeholder="Si tu en as déjà un" /></div>
                <div className="sm:col-span-2"><label className={label} htmlFor="r-desc">Description (facultatif)</label><textarea id="r-desc" rows={3} className={`${input} resize-y`} maxLength={2000} value={info.description} onChange={setI('description')} placeholder="L’histoire du projet, les remerciements…" /></div>
                <label className="flex items-center gap-3 text-sm text-gray-300 sm:col-span-2"><input type="checkbox" checked={info.explicit} onChange={setI('explicit')} className="h-4 w-4 accent-amber-500" />Contenu explicite (langage cru, violence…)</label>
              </div>
              <p className="mt-3 text-xs text-gray-500">Pas de code UPC ? Ce n’est pas obligatoire : SONIMUSIC attribue une référence interne à chaque sortie.</p>
            </section>

            {mode === 'SALE' && (
              <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
                <h3 className="text-lg font-bold text-white">Vente et droits</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><label className={label} htmlFor="r-price">Prix {kind === 'SINGLE' ? 'du single' : 'du projet'} (FCFA)</label><input id="r-price" inputMode="numeric" className={input} value={info.price} onChange={(e) => setInfo((s) => ({ ...s, price: e.target.value.replace(/\D/g, '') }))} placeholder="Ex. 1000" />
                    {Number(info.price) >= 200 && <p className="mt-1 text-xs text-gray-400">Tu reçois {Math.floor(Number(info.price) * 0.85).toLocaleString('fr-FR')} FCFA par vente (85 %).</p>}</div>
                </div>
                <p className={`${label} mt-5`}>Origine de la production (beat)</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BEAT_SOURCES.map((b) => (
                    <button key={b.id} type="button" onClick={() => setInfo((s) => ({ ...s, beatSource: b.id }))} aria-pressed={info.beatSource === b.id}
                      className={`rounded-xl border p-3 text-left transition ${info.beatSource === b.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-white/25'}`}>
                      <p className="text-sm font-semibold text-white">{b.label}</p><p className="mt-0.5 text-xs text-gray-400">{b.hint}</p>
                    </button>
                  ))}
                </div>
                {info.beatSource && info.beatSource !== 'own' && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div><label className={label} htmlFor="r-bp">Beatmaker / producteur</label><input id="r-bp" className={input} maxLength={120} value={info.beatProducer} onChange={setI('beatProducer')} /></div>
                    <div><label className={label} htmlFor="r-bl">Détails de la licence</label><input id="r-bl" className={input} maxLength={500} value={info.beatLicense} onChange={setI('beatLicense')} placeholder="Plateforme, date, type de licence" /></div>
                    <p className="text-xs text-amber-200 sm:col-span-2">Tu devras joindre la preuve de licence à l’étape suivante.</p>
                  </div>
                )}
              </section>
            )}

            <section>
              <h3 className="text-lg font-bold text-white">Titres et crédits</h3>
              <div className="mt-4 space-y-4">
                {tracks.map((t, i) => (
                  <details key={t.id} open={tracks.length <= 3 || i === 0} className="group rounded-2xl border border-white/10 bg-white/[0.02]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                      <span className="truncate font-semibold text-white">{i + 1}. {t.title || 'Sans titre'}</span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500 transition group-open:rotate-90" />
                    </summary>
                    <div className="grid gap-4 border-t border-white/5 p-4 sm:grid-cols-2">
                      <div><label className={label}>Nom du titre</label><input className={input} maxLength={120} value={t.title} onChange={(e) => updateTrack(t.id, { title: e.target.value })} /></div>
                      <div><label className={label}>Featuring</label><input className={input} maxLength={200} value={t.featuring} onChange={(e) => updateTrack(t.id, { featuring: e.target.value })} /></div>
                      <div><label className={label}>Compositeur(s) *</label><input className={input} maxLength={200} value={t.composer} onChange={(e) => updateTrack(t.id, { composer: e.target.value })} placeholder="Noms réels ou de scène" /></div>
                      <div><label className={label}>Auteur(s) des paroles</label><input className={input} maxLength={200} value={t.lyricist} onChange={(e) => updateTrack(t.id, { lyricist: e.target.value })} /></div>
                      <div><label className={label}>Producteur / beatmaker *</label><input className={input} maxLength={200} value={t.producer} onChange={(e) => updateTrack(t.id, { producer: e.target.value })} /></div>
                      <div><label className={label}>Code ISRC (facultatif)</label><input className={input} maxLength={15} value={t.isrc} onChange={(e) => updateTrack(t.id, { isrc: e.target.value.toUpperCase() })} placeholder="FR-XXX-26-00001" /></div>
                      <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={t.explicit || info.explicit} disabled={info.explicit} onChange={(e) => updateTrack(t.id, { explicit: e.target.checked })} className="h-4 w-4 accent-amber-500" />Titre explicite</label>
                    </div>
                  </details>
                ))}
              </div>
            </section>
            {infoErrors.length > 0 && <p className="text-sm text-gray-400">À compléter : {infoErrors.slice(0, 6).join(', ')}{infoErrors.length > 6 ? '…' : ''}</p>}
          </div>
        )}

        {/* ÉTAPE 5 : RÉCAPITULATIF */}
        {step === 4 && (
          <div className="space-y-8">
            <section className="flex flex-col gap-5 sm:flex-row">
              {cover?.previewUrl && <img src={cover.previewUrl} alt="" className="h-40 w-40 flex-shrink-0 rounded-2xl object-cover" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">{KINDS[kind].label} · {mode === 'SALE' ? `À vendre · ${Number(info.price).toLocaleString('fr-FR')} FCFA` : 'Gratuit'}</p>
                <h2 className="mt-1 text-2xl font-black text-white">{info.title}</h2>
                <p className="text-gray-300">{info.primaryArtist}{info.featuring && ` feat. ${info.featuring}`}</p>
                <p className="mt-1 text-sm text-gray-400">{info.genre} · {info.language} · sortie le {new Date(info.releaseDate).toLocaleDateString('fr-FR')}{info.explicit ? ' · Explicite' : ''}</p>
                <ol className="mt-3 space-y-1 text-sm text-gray-300">
                  {tracks.map((t, i) => <li key={t.id} className="flex justify-between gap-4"><span className="truncate">{i + 1}. {t.title}</span><span className="text-gray-500">{fmtTime(t.duration)}</span></li>)}
                </ol>
              </div>
            </section>

            {(tracks.some((t) => t.warnings?.length) || cover?.warnings?.length) && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="flex items-center gap-2 font-semibold text-amber-200"><FileWarning className="h-4 w-4" />Points d’attention</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
                  {tracks.flatMap((t, i) => (t.warnings || []).map((w) => <li key={`${t.id}${w}`}>Titre {i + 1} : {w}</li>))}
                  {(cover?.warnings || []).map((w) => <li key={w}>Pochette : {w}</li>)}
                </ul>
                <p className="mt-2 text-xs text-amber-100/70">Tu peux publier quand même ; certains points peuvent entraîner une vérification manuelle.</p>
              </section>
            )}

            <section>
              <h3 className="text-lg font-bold text-white">Message à l’équipe {mode === 'SALE' ? '' : '(facultatif)'}</h3>
              <p className="mt-1 text-sm text-gray-400">Explique ce qui peut aider à vérifier tes droits : contexte, contrats, liens vers tes autres plateformes…</p>
              <textarea rows={4} className={`${input} mt-3 resize-y`} maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} />
              <h4 className="mt-5 text-sm font-semibold text-gray-300">Justificatifs {proofsNeeded ? <span className="text-amber-400">(preuve de licence obligatoire)</span> : '(facultatif)'}</h4>
              <p className="mt-1 text-xs text-gray-500">Captures d’écran, contrats ou reçus : JPG, PNG, WEBP ou PDF, 10 Mo maximum, 6 fichiers. Visibles uniquement par l’équipe.</p>
              <div className="mt-3">
                <Dropzone accept="image/jpeg,image/png,image/webp,application/pdf" multiple onFiles={addProofs} disabled={proofs.length >= 6}>
                  <Upload className="h-6 w-6 text-amber-400" /><p className="mt-2 text-sm font-semibold text-white">Ajouter des justificatifs</p>
                </Dropzone>
              </div>
              {proofs.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {proofs.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                      <span className="truncate text-gray-200">{p.file.name}</span>
                      <span className="flex items-center gap-2">
                        {p.state === 'uploading' ? <span className="text-xs text-gray-400">{Math.round(p.progress * 100)} %</span> : <StatusPill state={p.state} />}
                        <button type="button" onClick={() => setProofs((ps) => ps.filter((x) => x.id !== p.id))} className="text-gray-500 hover:text-red-400" aria-label="Retirer"><X className="h-4 w-4" /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-lg font-bold text-white">Déclarations</h3>
              <div className="mt-3 space-y-3">
                {declarations.map(([k, text]) => (
                  <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${decl[k] ? 'border-amber-500/40 bg-amber-500/5 text-white' : 'border-white/10 text-gray-300 hover:border-white/20'}`}>
                    <input type="checkbox" checked={Boolean(decl[k])} onChange={(e) => setDecl((d) => ({ ...d, [k]: e.target.checked }))} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-500" />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {mode === 'SALE' ? 'Un projet à vendre est toujours vérifié à 100 % par l’équipe avant sa mise en vente.' : 'Un titre gratuit conforme est mis en ligne immédiatement. Un titre signalé peut être retiré.'}
                {' '}Voir les <Link to="/cgu" className="text-amber-400 hover:underline">conditions</Link> et la <Link to="/artistes-labels" className="text-amber-400 hover:underline">charte artistes</Link>.
              </p>
            </section>
          </div>
        )}

        {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/5 pt-6">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}
            className="flex items-center gap-1 rounded-xl px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5 disabled:invisible">
            <ChevronRight className="h-4 w-4 rotate-180" />Retour
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} disabled={!canNext || busy}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <><Loader className="h-4 w-4 animate-spin" />{busyText || 'Patiente…'}</> : <>Continuer<ChevronRight className="h-4 w-4" /></>}
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!canPublish}
              title={!canPublish ? 'Coche toutes les déclarations pour publier' : undefined}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <><Loader className="h-4 w-4 animate-spin" />{busyText}</> : mode === 'SALE' ? 'Envoyer pour vérification' : 'Publier'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Publish;
