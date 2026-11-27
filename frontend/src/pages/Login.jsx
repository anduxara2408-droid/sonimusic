import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import { Alert, AuthShell, Field, inputClass, SubmitButton } from '../components/AuthShell';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate(location.state?.from || '/dashboard');
    } else if (result.error?.includes('vérifier votre email')) {
      setInfo("Ton adresse e-mail n'est pas encore vérifiée. Nous venons de t'envoyer un nouveau lien : ouvre-le puis reconnecte-toi.");
    } else {
      setError(result.error || 'E-mail ou mot de passe incorrect');
    }
  };

  return (
    <AuthShell
      title="Connexion"
      subtitle="Content de te revoir sur SONIMUSIC."
      footer={<>Pas encore de compte ? <Link to="/register" className="font-semibold text-amber-400 hover:underline">Créer un compte</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {info && <Alert type="info">{info}</Alert>}
        <Field label="Adresse e-mail">
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="toi@exemple.com" />
        </Field>
        <Field label="Mot de passe">
          <PasswordInput autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Ton mot de passe" />
        </Field>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-amber-400">Mot de passe oublié ?</Link>
        </div>
        <SubmitButton loading={loading}>Se connecter</SubmitButton>
      </form>
    </AuthShell>
  );
};

export default Login;
