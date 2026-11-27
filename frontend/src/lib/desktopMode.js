// « Version ordinateur » sur téléphone : on élargit la fenêtre d'affichage à 1280 px.
const KEY = 'sonimusic_desktop_mode';
const MOBILE_VIEWPORT = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
const DESKTOP_VIEWPORT = 'width=1280';

export const isDesktopMode = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const applyDesktopMode = (enabled = isDesktopMode()) => {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', enabled ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT);
  document.documentElement.classList.toggle('desktop-mode', enabled);
};

export const setDesktopMode = (enabled) => {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* stockage indisponible */
  }
  applyDesktopMode(enabled);
};
