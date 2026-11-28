// Analyses réalisées dans le navigateur avant l'envoi : rapides, gratuites,
// et complétées ensuite par la vérification côté serveur.

const AUDIO_DEEP_LIMIT = 160 * 1024 * 1024; // au-delà, analyse fine ignorée (mémoire des téléphones)

export const sha256File = async (file) => {
  if (!window.crypto?.subtle || file.size > AUDIO_DEEP_LIMIT) return null;
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

let sharedCtx = null;
const getCtx = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctx();
  return sharedCtx;
};

const decode = (ctx, buf) => new Promise((resolve, reject) => {
  const p = ctx.decodeAudioData(buf, resolve, reject);
  if (p?.then) p.then(resolve, reject);
});

/**
 * Analyse un fichier audio : durée, silences, saturation, volume, empreinte.
 * Renvoie aussi l'AudioBuffer décodé (pour fabriquer un extrait).
 */
export const analyzeAudio = async (file) => {
  const result = { duration: null, checks: {}, fingerprint: null, buffer: null, deep: false };
  const ctx = getCtx();
  if (!ctx || file.size > AUDIO_DEEP_LIMIT) {
    result.duration = await new Promise((resolve) => {
      const a = document.createElement('audio');
      a.preload = 'metadata';
      a.onloadedmetadata = () => { resolve(Number.isFinite(a.duration) ? a.duration : null); URL.revokeObjectURL(a.src); };
      a.onerror = () => resolve(null);
      a.src = URL.createObjectURL(file);
    });
    return result;
  }
  const audio = await decode(ctx, await file.arrayBuffer());
  result.buffer = audio;
  result.deep = true;
  result.duration = audio.duration;

  const { sampleRate, length, numberOfChannels } = audio;
  const chans = [];
  for (let c = 0; c < Math.min(2, numberOfChannels); c += 1) chans.push(audio.getChannelData(c));

  // Fenêtres de 50 ms : énergie et crête.
  const win = Math.max(1, Math.floor(sampleRate * 0.05));
  const nWin = Math.ceil(length / win);
  const energy = new Float32Array(nWin);
  let clipped = 0; let peak = 0; let sumSq = 0;
  for (let w = 0; w < nWin; w += 1) {
    const start = w * win;
    const end = Math.min(length, start + win);
    let e = 0;
    for (let i = start; i < end; i += 1) {
      let v = 0;
      for (let c = 0; c < chans.length; c += 1) {
        const s = chans[c][i];
        const abs = s < 0 ? -s : s;
        if (abs >= 0.999) clipped += 1;
        if (abs > peak) peak = abs;
        v += s;
      }
      v /= chans.length;
      e += v * v;
    }
    sumSq += e;
    energy[w] = e / (end - start);
  }
  const db = (x) => (x > 0 ? 10 * Math.log10(x) : -120);
  const silentWin = (e) => db(e) < -55;
  let first = 0; while (first < nWin && silentWin(energy[first])) first += 1;
  let last = nWin - 1; while (last > first && silentWin(energy[last])) last -= 1;

  result.checks = {
    silent: first >= nWin,
    silenceStart: (first * win) / sampleRate,
    silenceEnd: first >= nWin ? 0 : ((nWin - 1 - last) * win) / sampleRate,
    clippingRatio: clipped / (length * chans.length),
    peakDb: Math.round(20 * Math.log10(peak || 1e-9) * 10) / 10,
    loudness: Math.round(db(sumSq / length) * 10) / 10,
  };

  // Empreinte : enveloppe d'énergie sur 128 points (pour repérer un même enregistrement).
  const points = 128;
  const fp = [];
  const per = nWin / points;
  let max = 0;
  for (let p = 0; p < points; p += 1) {
    let s = 0; let n = 0;
    for (let w = Math.floor(p * per); w < Math.floor((p + 1) * per); w += 1) { s += energy[w] || 0; n += 1; }
    const v = n ? Math.sqrt(s / n) : 0;
    fp.push(v); if (v > max) max = v;
  }
  result.fingerprint = fp.map((v) => Math.round((max ? v / max : 0) * 1000));
  return result;
};

// Messages lisibles à partir des contrôles navigateur.
export const describeAudioChecks = (checks = {}, duration) => {
  const errors = []; const warnings = [];
  if (checks.silent) errors.push('Le fichier ne contient que du silence.');
  if (duration != null && duration < 30) errors.push('Titre trop court (moins de 30 secondes).');
  if (duration != null && duration > 1200) errors.push('Titre trop long (plus de 20 minutes).');
  if (checks.silenceStart > 5) warnings.push(`${Math.round(checks.silenceStart)} s de silence au début.`);
  if (checks.silenceEnd > 10) warnings.push(`${Math.round(checks.silenceEnd)} s de silence à la fin.`);
  if (checks.clippingRatio > 0.001) warnings.push('Saturation détectée : le son peut grésiller.');
  if (Number.isFinite(checks.loudness) && checks.loudness < -30) warnings.push('Volume très faible.');
  return { errors, warnings };
};

/**
 * Fabrique un extrait d'écoute (WAV mono 22 kHz, fondu d'entrée et de sortie).
 * C'est la seule version entendue par les non-acheteurs.
 */
export const makePreview = async (audioBuffer, startSec, lengthSec = 45) => {
  const rate = 22050;
  const start = Math.max(0, Math.min(startSec, Math.max(0, audioBuffer.duration - lengthSec)));
  const len = Math.min(lengthSec, audioBuffer.duration - start);
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new Offline(1, Math.ceil(len * rate), rate);
  const src = off.createBufferSource();
  src.buffer = audioBuffer;
  const gain = off.createGain();
  gain.gain.setValueAtTime(0, 0);
  gain.gain.linearRampToValueAtTime(1, 1.5);
  gain.gain.setValueAtTime(1, Math.max(1.5, len - 2.5));
  gain.gain.linearRampToValueAtTime(0, len);
  src.connect(gain).connect(off.destination);
  src.start(0, start, len);
  const rendered = await off.startRendering();
  const data = rendered.getChannelData(0);

  const bytes = 44 + data.length * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const w = (o, s) => { for (let i = 0; i < s.length; i += 1) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, 'data'); view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i += 1) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new File([view.buffer], 'extrait.wav', { type: 'audio/wav' });
};

/**
 * Analyse de la pochette : dimensions, carré, flou (variance du laplacien).
 */
export const analyzeCover = (file) => new Promise((resolve) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const { naturalWidth: width, naturalHeight: height } = img;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const gray = new Float32Array(size * size);
    for (let i = 0; i < size * size; i += 1) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    let sum = 0; let sumSq = 0; let n = 0;
    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const i = y * size + x;
        const lap = gray[i - 1] + gray[i + 1] + gray[i - size] + gray[i + size] - 4 * gray[i];
        sum += lap; sumSq += lap * lap; n += 1;
      }
    }
    const variance = sumSq / n - (sum / n) ** 2;
    URL.revokeObjectURL(url);
    const errors = []; const warnings = [];
    if (width !== height) errors.push(`La pochette doit être carrée (actuellement ${width} × ${height} px).`);
    if (Math.min(width, height) < 1400) errors.push(`Trop petite (${width} px). Minimum 1400 px, idéal 3000 × 3000 px.`);
    else if (width < 3000) warnings.push(`${width} × ${height} px : 3000 × 3000 px est recommandé.`);
    if (!['image/jpeg', 'image/png'].includes(file.type)) errors.push('Format accepté : JPG ou PNG.');
    if (file.size > 10 * 1024 * 1024) errors.push('Fichier trop lourd (10 Mo maximum).');
    const blurry = variance < 40;
    if (blurry) warnings.push('L’image semble floue, pixelisée ou unie.');
    resolve({ width, height, blurry, previewUrl: URL.createObjectURL(file), errors, warnings });
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve({ errors: ["Impossible de lire l'image."], warnings: [] }); };
  img.src = url;
});
