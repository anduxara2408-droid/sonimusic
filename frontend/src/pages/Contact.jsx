import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, CircleHelp, CreditCard, FileWarning, Headset, Mail, MessageSquareWarning, Mic2, ShieldAlert, UserRound, Wrench,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Alert, Field, inputClass, SubmitButton } from '../components/AuthShell';

const categories = [
  { id: 'question', icon: CircleHelp, label: 'Question générale' },
  { id: 'compte', icon: UserRound, label: 'Mon compte' },
  { id: 'paiement', icon: CreditCard, label: 'Paiement / achat' },
  { id: 'reclamation', icon: MessageSquareWarning, label: 'Réclamation' },
  { id: 'droits', icon: ShieldAlert, label: "Droits d'auteur" },
  { id: 'artiste', icon: Mic2, label: 'Espace artiste / label' },
  { id: 'technique', icon: Wrench, label: 'Problème technique' },
  { id: 'autre', icon: FileWarning, label: 'Autre' },
];

const faq = [
  { q: "Je n'ai pas reçu l'e-mail de confirmation", a: 'Regarde dans les spams ou « Promotions ». Tu peux aussi te reconnecter : un nouveau lien est envoyé automatiquement.' },
  { q: 'Comment publier ma musique ?', a: "Crée un compte Artiste, puis ouvre l'Espace artiste et clique sur « Publier un titre »." },
  { q: "Quelqu'un a publié mon son sans autorisation", a: "Choisis « Droits d'auteur », indique le lien ou le numéro du titre et ta preuve. Nous traitons ces demandes en priorité." },
  { q: "J'ai payé mais je n'ai pas accès à mon achat", a: 'Choisis « Paiement / achat » et indique le numéro de commande et la référence de la transaction.' },
];

const Contact = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ category: params.get('type') || 'question', name: '', email: '', subject: '', message: '', orderRef: '', songId: params.get('song') || '', website: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ref, setRef] = useState('');

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || '', email: f.email || user.email || '' }));
  }, [user]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/support/tickets', form);
      setRef(data.ref);
    } catch (err) {
      setError(err.response?.data?.error || "L'envoi a échoué. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15"><Headset className="h-6 w-6 text-amber-400" /></span>
        <div>
          <h1 className="text-3xl font-black text-white">Service client & réclamations</h1>
          <p className="text-sm text-gray-400">Une question, un problème, une réclamation : nous répondons sous 48 h ouvrées.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-3xl border border-white/10 bg-[#121212] p-5 sm:p-8">
          {ref ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
              <h2 className="mt-4 text-2xl font-black text-white">Demande envoyée</h2>
              <p className="mt-2 text-gray-300">Ton numéro de suivi :</p>
              <p className="mt-1 text-2xl font-black tracking-wider text-amber-400">{ref}</p>
              <p className="mt-4 text-sm text-gray-400">Une confirmation a été envoyée à {form.email}. Garde ce numéro pour toute relance.</p>
              <button onClick={() => { setRef(''); setForm((f) => ({ ...f, subject: '', message: '', orderRef: '' })); }} className="mt-6 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">Nouvelle demande</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <Alert>{error}</Alert>}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-300">Type de demande</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {categories.map((c) => (
                    <button key={c.id} type="button" onClick={() => setForm((f) => ({ ...f, category: c.id }))} aria-pressed={form.category === c.id}
                      className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left text-xs font-semibold transition ${form.category === c.id ? 'border-amber-500 bg-amber-500/10 text-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/25'}`}>
                      <c.icon className={`h-5 w-5 ${form.category === c.id ? 'text-amber-400' : 'text-gray-500'}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom"><input required minLength={2} maxLength={100} value={form.name} onChange={set('name')} className={inputClass} /></Field>
                <Field label="E-mail de réponse"><input type="email" required value={form.email} onChange={set('email')} className={inputClass} /></Field>
              </div>
              <Field label="Objet"><input required minLength={3} maxLength={150} value={form.subject} onChange={set('subject')} className={inputClass} placeholder="Résume ta demande en quelques mots" /></Field>

              {form.category === 'paiement' && (
                <Field label="Numéro de commande ou référence de transaction" hint="Par exemple la référence Wave, Bankily ou Masrvi.">
                  <input maxLength={60} value={form.orderRef} onChange={set('orderRef')} className={inputClass} />
                </Field>
              )}
              {(form.category === 'droits' || form.category === 'reclamation') && (
                <Field label="Numéro ou lien du titre concerné (facultatif)" hint="Le numéro figure à la fin de l'adresse de la page du titre (…/song/12).">
                  <input maxLength={200} value={form.songId} onChange={set('songId')} className={inputClass} />
                </Field>
              )}

              <Field label="Message" hint={form.category === 'droits' ? 'Explique pourquoi ce son t’appartient et indique tes preuves (date de création, contrat, lien vers la version originale…).' : undefined}>
                <textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={set('message')} className={`${inputClass} resize-y`} placeholder="Décris ta demande avec le plus de détails possible" />
              </Field>
              <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

              <SubmitButton loading={loading}>Envoyer ma demande</SubmitButton>
              <p className="text-xs text-gray-500">En envoyant ce formulaire, tu acceptes que nous utilisions ces informations pour traiter ta demande (<Link to="/confidentialite" className="text-amber-400 hover:underline">confidentialité</Link>).</p>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-white">Questions fréquentes</h2>
            <div className="mt-3 divide-y divide-white/5">
              {faq.map((f) => (
                <details key={f.q} className="group py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-gray-200 group-open:text-amber-400">{f.q}</summary>
                  <p className="mt-2 text-sm text-gray-400">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-bold text-white">Nous écrire directement</h2>
            <a href="mailto:contact@sonimusic.online" className="mt-3 flex items-center gap-2 text-sm text-gray-300 hover:text-amber-400"><Mail className="h-4 w-4" /> contact@sonimusic.online</a>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Contact;
