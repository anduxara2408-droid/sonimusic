import api, { API_URL } from './api';

const put = (url, file, { contentType, onProgress, auth }) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('PUT', url);
  if (contentType) xhr.setRequestHeader('Content-Type', contentType);
  if (auth) {
    try {
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    } catch { /* ignore */ }
  }
  xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
  xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(Object.assign(new Error('upload'), { status: xhr.status })));
  xhr.onerror = () => reject(Object.assign(new Error('network'), { status: 0 }));
  xhr.send(file);
});

/**
 * Envoie un fichier puis demande sa vérification au serveur.
 * Essaie l'envoi direct vers le stockage ; en cas de blocage, passe par le serveur.
 */
export const uploadFile = async (file, kind, { onProgress, sha256, fingerprint, clientChecks } = {}) => {
  const { data: sign } = await api.post('/api/uploads/sign', {
    kind, fileName: file.name, size: file.size, mime: file.type,
  });
  try {
    await put(sign.putUrl, file, { contentType: sign.contentType, onProgress });
  } catch (err) {
    if (err.status && err.status !== 0 && err.status !== 403) throw err;
    onProgress?.(0);
    await put(`${API_URL}${sign.proxyUrl}`, file, { contentType: sign.contentType, onProgress, auth: true });
  }
  const { data } = await api.post(`/api/uploads/${sign.uploadId}/complete`, { sha256, fingerprint, clientChecks }, { timeout: 60000 });
  return data;
};

export const errorMessage = (err, fallback = 'Une erreur est survenue.') =>
  err?.response?.data?.error || (err?.message === 'network' ? 'Connexion interrompue. Vérifie ton réseau et réessaie.' : fallback);
