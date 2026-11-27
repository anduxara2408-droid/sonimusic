import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Mic2, MailCheck } from 'lucide-react';
import api from '../lib/api';
import PasswordInput from '../components/PasswordInput';
import { Alert, AuthShell, Field, inputClass, SubmitButton } from '../components/AuthShell';

const roles = [
  { id: 'LISTENER', icon: Headphones, title: 'Auditeur', text: 'Écouter, aimer, suivre des artistes' },
  { id: 'ARTIST', icon: Mic2, title: 'Artiste', text: 'Publier ma musique et vendre mes projets' },
];

const strength = (pwd) => {
  let s = 0;
  if (pwd.length >= 8) s += 1;
  if (pwd.length >= 12) s += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s += 1;
  if (/\d/.test(pwd)) s += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) s += 1;
  return Math.min(s, 4);
};
const strengthLabel = ['Trop court', 'Faible', 'Moyen', 'Bon', 'Excellent'];
const strengthColor = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'LISTENER', artistName: '', country: '' });
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const pwdScore = form.password ? strength(form.password) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (!accept) return setError("Merci d'accepter les conditions d'utilisation.");
    setLoading(true);
    try {
      const payload = { ...form, name: form.name.trim(), email: form.email.trim() };
      if (payload.role !== 'ARTIST') { delete payload.artistName; }
      const { data } = await api.post('/api/auth/register', payload);
      if (data.requiresVerification) {
        setSentTo(payload.email);
      } else if (data.token) {
        localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        window.location.assign('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || "L'inscription a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Vérifie ta boîte mail" subtitle="Plus qu'une étape pour activer ton compte.">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15"><MailCheck className="h-8 w-8 text-amber-400" /></span>
          <p className="mt-5 text-gray-300">Nous avons envoyé un lien de confirmation à</p>
          <p className="mt-1 break-all font-semibold text-white">{sentTo}</p>
          <p className="mt-4 text-sm text-gray-400">Ouvre l'e-mail et clique sur le lien (valable 48 heures). Pense à regarder dans les spams ou « Promotions ».</p>
          <Link to="/login" className="mt-6 inline-block rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">J'ai confirmé, me connecter</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Gratuit, en moins d'une minute."
      footer={<>Déjà inscrit ? <Link to="/login" className="font-semibold text-amber-400 hover:underline">Se connecter</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, role: r.id }))}
              className={`rounded-2xl border p-4 text-left transition ${form.role === r.id ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}
              aria-pressed={form.role === r.id}
            >
              <r.icon className={`h-6 w-6 ${form.role === r.id ? 'text-amber-400' : 'text-gray-400'}`} />
              <p className="mt-2 text-sm font-bold text-white">{r.title}</p>
              <p className="mt-0.5 text-xs leading-snug text-gray-400">{r.text}</p>
            </button>
          ))}
        </div>

        <Field label="Nom complet">
          <input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set('name')} className={inputClass} placeholder="Prénom et nom" />
        </Field>
        {form.role === 'ARTIST' && (
          <Field label="Nom d'artiste" hint="C'est le nom affiché sur tes titres.">
            <input required maxLength={100} value={form.artistName} onChange={set('artistName')} className={inputClass} placeholder="Ton nom de scène" />
          </Field>
        )}
        <Field label="Adresse e-mail">
          <input type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="toi@exemple.com" />
        </Field>
        <Field label="Mot de passe">
          <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={set('password')} className={inputClass} placeholder="8 caractères minimum" />
          {form.password && (
            <div className="mt-2">
              <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < pwdScore ? strengthColor[pwdScore] : 'bg-white/10'}`} />)}</div>
              <p className="mt-1 text-xs text-gray-400">Sécurité : {strengthLabel[pwdScore]}</p>
            </div>
          )}
          {!form.password && <span className="mt-1 block text-xs text-gray-500">Minimum 8 caractères. Mélange lettres, chiffres et symboles.</span>}
        </Field>
        <Field label="Pays (facultatif)">
          <input maxLength={100} value={form.country} onChange={set('country')} className={inputClass} placeholder="Mauritanie, Sénégal, Mali…" />
        </Field>

        <label className="flex items-start gap-3 text-sm text-gray-300">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-amber-500" />
          <span>J'accepte les <Link to="/cgu" className="text-amber-400 hover:underline">conditions d'utilisation</Link> et la <Link to="/confidentialite" className="text-amber-400 hover:underline">politique de confidentialité</Link>.</span>
        </label>

        <SubmitButton loading={loading}>Créer mon compte</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default Register;
