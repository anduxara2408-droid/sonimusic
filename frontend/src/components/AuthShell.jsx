import React from 'react';
import { Link } from 'react-router-dom';
import { Headphones, ShieldCheck, Sparkles } from 'lucide-react';

// Mise en page commune des écrans de connexion / inscription / mot de passe.
export const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2">
    <div className="relative hidden h-full min-h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/30 via-orange-700/10 to-fuchsia-800/40 p-10 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-600/20 blur-3xl" />
      <Link to="/" className="relative text-2xl font-black tracking-tight text-white">SONI<span className="text-amber-400">MUSIC</span></Link>
      <div className="relative">
        <h2 className="text-4xl font-black leading-tight text-white">La musique d'Afrique de l'Ouest, d'abord ici.</h2>
        <ul className="mt-8 space-y-4 text-sm text-gray-200">
          <li className="flex items-center gap-3"><Headphones className="h-5 w-5 text-amber-400" /> Écoute gratuite, radio 24h/24</li>
          <li className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-amber-400" /> Artistes : publie, suis tes statistiques, vends tes projets</li>
          <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-amber-400" /> Compte protégé, e-mail vérifié</li>
        </ul>
      </div>
      <p className="relative text-xs text-gray-400">© {new Date().getFullYear()} SONIMUSIC</p>
    </div>

    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-2xl sm:p-8">
        <h1 className="text-2xl font-black text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-gray-400">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-gray-400">{footer}</div>}
    </div>
  </div>
);

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-gray-300">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
  </label>
);

export const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-amber-500/70 focus:bg-white/[0.06]';

export const Alert = ({ type = 'error', children }) => {
  const styles = {
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    info: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  };
  return <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>;
};

export const SubmitButton = ({ loading, children, ...props }) => (
  <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60" {...props}>
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />}
    {children}
  </button>
);
