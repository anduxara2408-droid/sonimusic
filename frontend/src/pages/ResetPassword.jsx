import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import PasswordInput from '../components/PasswordInput';
import { Alert, AuthShell, Field, inputClass, SubmitButton } from '../components/AuthShell';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const email = params.get('email');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token || !email) {
    return (
      <AuthShell title="Lien invalide" subtitle="Ce lien est incomplet ou a expiré.">
        <Link to="/forgot-password" className="block rounded-xl bg-amber-500 px-4 py-3.5 text-center text-sm font-bold text-black">Demander un nouveau lien</Link>
      </AuthShell>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (password !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { email, token, newPassword: password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Le lien a expiré. Demande-en un nouveau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Nouveau mot de passe" subtitle={`Pour le compte ${email}`}>
      {done ? (
        <Alert type="success">Mot de passe modifié. Redirection vers la connexion…</Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Nouveau mot de passe">
            <PasswordInput required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="8 caractères minimum" />
          </Field>
          <Field label="Confirmer le mot de passe">
            <PasswordInput required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} placeholder="Retape le mot de passe" />
          </Field>
          <SubmitButton loading={loading}>Enregistrer</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
