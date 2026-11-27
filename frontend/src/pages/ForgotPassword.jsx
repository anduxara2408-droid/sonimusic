import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import api from '../lib/api';
import { Alert, AuthShell, Field, inputClass, SubmitButton } from '../components/AuthShell';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "L'envoi a échoué. Réessaie dans quelques minutes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle={sent ? undefined : 'Indique ton e-mail : nous t’envoyons un lien pour choisir un nouveau mot de passe.'}
      footer={<Link to="/login" className="font-semibold text-amber-400 hover:underline">Retour à la connexion</Link>}
    >
      {sent ? (
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15"><MailCheck className="h-8 w-8 text-amber-400" /></span>
          <p className="mt-5 text-gray-300">Si un compte existe avec cette adresse, un lien vient d'être envoyé. Il est valable 1 heure.</p>
          <p className="mt-3 text-sm text-gray-500">Pense à regarder dans les spams.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Adresse e-mail">
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="toi@exemple.com" />
          </Field>
          <SubmitButton loading={loading}>Envoyer le lien</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
