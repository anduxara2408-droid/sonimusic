import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

// Consentement aux cookies : le choix est mémorisé un an (cookie + stockage local)
// et le bandeau ne réapparaît pas. Il peut être rouvert depuis « Gestionnaire de cookies ».
export const CONSENT_KEY = 'sonimusic_consent';
const CONSENT_VERSION = 1;
const ONE_YEAR = 365 * 24 * 60 * 60;

const readConsent = () => {
  try {
    const fromCookie = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_KEY}=`));
    const raw = fromCookie ? decodeURIComponent(fromCookie.split('=').slice(1).join('=')) : localStorage.getItem(CONSENT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.v === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
};

const saveConsent = (choices) => {
  const value = JSON.stringify({ v: CONSENT_VERSION, ...choices, date: new Date().toISOString() });
  try {
    document.cookie = `${CONSENT_KEY}=${encodeURIComponent(value)}; max-age=${ONE_YEAR}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch { /* cookies bloqués */ }
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch { /* stockage indisponible */ }
};

export const openCookieSettings = () => window.dispatchEvent(new Event('sonimusic:cookie-settings'));

const CookieConsent = () => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [prefs, setPrefs] = useState({ audience: false, personalisation: false });

  useEffect(() => {
    const existing = readConsent();
    if (!existing) setOpen(true);
    else setPrefs({ audience: !!existing.audience, personalisation: !!existing.personalisation });
    const reopen = () => {
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener('sonimusic:cookie-settings', reopen);
    return () => window.removeEventListener('sonimusic:cookie-settings', reopen);
  }, []);

  const decide = (choices) => {
    saveConsent(choices);
    setPrefs({ audience: choices.audience, personalisation: choices.personalisation });
    setOpen(false);
    setDetails(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4" role="dialog" aria-label="Préférences de cookies">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#141414]/95 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-400" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Nous prenons à cœur la protection de vos données</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              SONIMUSIC utilise des cookies indispensables pour vous garder connecté, mémoriser vos réglages et sécuriser le site.
              Avec votre accord, nous utilisons aussi des cookies de mesure d'audience et de personnalisation. Nous ne vendons pas vos données.
              Vous pouvez changer d'avis à tout moment depuis « Gestionnaire de cookies » en bas du site.{' '}
              <Link to="/cookies" className="text-amber-400 underline" onClick={() => setOpen(false)}>Politique cookies</Link>
            </p>
          </div>
        </div>

        {details && (
          <div className="mt-4 space-y-3 rounded-xl bg-black/30 p-4 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-amber-500" />
              <span><strong className="text-white">Indispensables</strong><br /><span className="text-gray-400">Connexion, sécurité, panier, préférences d'affichage. Toujours actifs.</span></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={prefs.audience} onChange={(e) => setPrefs((p) => ({ ...p, audience: e.target.checked }))} className="mt-1 h-4 w-4 accent-amber-500" />
              <span><strong className="text-white">Mesure d'audience</strong><br /><span className="text-gray-400">Statistiques anonymes de visite pour améliorer le site.</span></span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={prefs.personalisation} onChange={(e) => setPrefs((p) => ({ ...p, personalisation: e.target.checked }))} className="mt-1 h-4 w-4 accent-amber-500" />
              <span><strong className="text-white">Personnalisation</strong><br /><span className="text-gray-400">Recommandations de musique selon vos écoutes.</span></span>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {details ? (
            <button onClick={() => decide(prefs)} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              Enregistrer mes choix
            </button>
          ) : (
            <button onClick={() => setDetails(true)} className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-white">
              Afficher toutes les finalités
            </button>
          )}
          <button onClick={() => decide({ audience: false, personalisation: false })} className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Tout refuser
          </button>
          <button onClick={() => decide({ audience: true, personalisation: true })} className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-black hover:bg-amber-400">
            J'accepte
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
