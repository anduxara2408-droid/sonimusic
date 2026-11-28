// Analyse des en-têtes de fichiers côté serveur : on ne fait jamais confiance
// à l'extension ni au type annoncé par le navigateur.

// ---------- AUDIO ----------

const parseWav = (b, totalSize) => {
  if (b.length < 12 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return null;
  let off = 12;
  let fmt = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ' && off + 24 <= b.length) {
      fmt = {
        audioFormat: b.readUInt16LE(off + 8),
        channels: b.readUInt16LE(off + 10),
        sampleRate: b.readUInt32LE(off + 12),
        byteRate: b.readUInt32LE(off + 16),
        bitsPerSample: b.readUInt16LE(off + 22),
      };
    }
    if (id === 'data') {
      if (!fmt) return null;
      const dataSize = Math.min(size, Math.max(0, totalSize - off - 8));
      return {
        format: 'wav', channels: fmt.channels, sampleRate: fmt.sampleRate, bitsPerSample: fmt.bitsPerSample,
        duration: fmt.byteRate ? dataSize / fmt.byteRate : null, bitrate: Math.round((fmt.byteRate * 8) / 1000),
      };
    }
    off += 8 + size + (size % 2);
  }
  return fmt ? { format: 'wav', channels: fmt.channels, sampleRate: fmt.sampleRate, bitsPerSample: fmt.bitsPerSample, duration: null } : null;
};

const parseFlac = (b) => {
  let off = 0;
  if (b.toString('ascii', 0, 3) === 'ID3' && b.length > 10) {
    off = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
  }
  if (b.length < off + 42 || b.toString('ascii', off, off + 4) !== 'fLaC') return null;
  const s = off + 8; // bloc STREAMINFO
  const sampleRate = (b[s + 10] << 12) | (b[s + 11] << 4) | (b[s + 12] >> 4);
  const channels = ((b[s + 12] >> 1) & 0x07) + 1;
  const bitsPerSample = (((b[s + 12] & 0x01) << 4) | (b[s + 13] >> 4)) + 1;
  const totalSamples = (b[s + 13] & 0x0f) * 2 ** 32 + b.readUInt32BE(s + 14);
  return { format: 'flac', channels, sampleRate, bitsPerSample, duration: sampleRate && totalSamples ? totalSamples / sampleRate : null };
};

const MP3_BITRATES = { // MPEG-1 Layer III, MPEG-2/2.5 Layer III
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};
const MP3_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

const parseMp3 = (b, totalSize) => {
  let off = 0;
  if (b.toString('ascii', 0, 3) === 'ID3' && b.length > 10) {
    off = 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
  }
  for (let i = off; i < Math.min(b.length - 4, off + 16384); i += 1) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) continue;
    const version = (b[i + 1] >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (b[i + 1] >> 1) & 0x03; // 1 = Layer III
    const brIdx = b[i + 2] >> 4;
    const srIdx = (b[i + 2] >> 2) & 0x03;
    if (version === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) continue;
    const bitrate = MP3_BITRATES[version === 3 ? 1 : 2][brIdx];
    const sampleRate = MP3_RATES[version][srIdx];
    const channels = (b[i + 3] >> 6) === 3 ? 1 : 2;
    // Débit variable : en-tête Xing/Info avec le nombre de trames.
    const sideInfo = version === 3 ? (channels === 1 ? 17 : 32) : (channels === 1 ? 9 : 17);
    const x = i + 4 + sideInfo;
    let duration = null;
    let vbr = false;
    if (x + 12 <= b.length) {
      const tag = b.toString('ascii', x, x + 4);
      if ((tag === 'Xing' || tag === 'Info') && (b.readUInt32BE(x + 4) & 1)) {
        const frames = b.readUInt32BE(x + 8);
        duration = (frames * (version === 3 ? 1152 : 576)) / sampleRate;
        vbr = tag === 'Xing';
      }
    }
    if (!duration && bitrate) duration = ((totalSize - i) * 8) / (bitrate * 1000);
    const avgBitrate = duration ? Math.round(((totalSize - i) * 8) / duration / 1000) : bitrate;
    return { format: 'mp3', channels, sampleRate, bitrate: vbr ? avgBitrate : bitrate, vbr, duration };
  }
  return null;
};

export const parseAudioHeader = (buf, totalSize) =>
  parseWav(buf, totalSize) || parseFlac(buf) || parseMp3(buf, totalSize);

// Contrôles de conformité audio. Renvoie { errors, warnings, info }.
export const auditAudio = (meta, size) => {
  const errors = [];
  const warnings = [];
  if (!meta) {
    errors.push('Format audio non reconnu : seuls MP3, WAV et FLAC sont acceptés.');
    return { errors, warnings };
  }
  if (meta.format === 'wav' && meta.bitsPerSample && ![16, 24, 32].includes(meta.bitsPerSample)) {
    warnings.push(`Résolution WAV inhabituelle (${meta.bitsPerSample} bits).`);
  }
  if (meta.sampleRate && meta.sampleRate < 44100) errors.push(`Fréquence trop basse (${meta.sampleRate} Hz). Minimum : 44,1 kHz.`);
  if (meta.format === 'mp3' && meta.vbr) {
    if (meta.bitrate && meta.bitrate < 128) warnings.push(`MP3 à débit variable (moyenne ${meta.bitrate} kbit/s) : vérifie la qualité, 320 kbit/s ou WAV recommandé.`);
  } else if (meta.format === 'mp3' && meta.bitrate && meta.bitrate < 192) {
    (meta.bitrate < 128 ? errors : warnings).push(`Débit MP3 de ${meta.bitrate} kbit/s : ${meta.bitrate < 128 ? 'qualité insuffisante (minimum 128)' : '320 kbit/s ou WAV recommandé'}.`);
  }
  if (meta.channels && meta.channels > 2) errors.push('Plus de 2 canaux : exporte le titre en stéréo.');
  if (meta.duration != null) {
    if (meta.duration < 30) errors.push('Titre trop court (moins de 30 secondes).');
    if (meta.duration > 20 * 60) errors.push('Titre trop long (plus de 20 minutes).');
  }
  if (size > 250 * 1024 * 1024) errors.push('Fichier trop lourd (250 Mo maximum).');
  return { errors, warnings };
};

// ---------- IMAGES ----------

export const parseImageHeader = (b) => {
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString('ascii', 12, 16) === 'IHDR') {
    const colorType = b[25];
    return { format: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorSpace: [0, 4].includes(colorType) ? 'gray' : 'rgb' };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let off = 2;
    while (off + 9 < b.length) {
      if (b[off] !== 0xff) { off += 1; continue; }
      const marker = b[off + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
      const len = b.readUInt16BE(off + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        const comps = b[off + 9];
        return {
          format: 'jpeg', height: b.readUInt16BE(off + 5), width: b.readUInt16BE(off + 7),
          colorSpace: comps === 1 ? 'gray' : comps === 4 ? 'cmyk' : 'rgb',
        };
      }
      off += 2 + len;
    }
    return { format: 'jpeg', width: null, height: null, colorSpace: null };
  }
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { format: 'webp' };
  if (b.length >= 5 && b.toString('ascii', 0, 5) === '%PDF-') return { format: 'pdf' };
  return null;
};

export const auditCover = (img, size) => {
  const errors = [];
  const warnings = [];
  if (!img || !['jpeg', 'png'].includes(img.format)) {
    errors.push('La pochette doit être une image JPG ou PNG.');
    return { errors, warnings };
  }
  if (img.width && img.height) {
    if (img.width !== img.height) errors.push(`La pochette doit être carrée (actuellement ${img.width} × ${img.height}).`);
    if (Math.min(img.width, img.height) < 1400) errors.push(`Pochette trop petite (${img.width} px). Minimum 1400 px, idéal 3000 × 3000.`);
    else if (img.width < 3000) warnings.push(`Pochette de ${img.width} px : 3000 × 3000 px est recommandé.`);
  }
  if (img.colorSpace === 'cmyk') errors.push('Pochette en CMJN : convertis-la en RVB.');
  if (size > 10 * 1024 * 1024) errors.push('Pochette trop lourde (10 Mo maximum).');
  return { errors, warnings };
};

// ---------- CODES ----------

// Somme de contrôle GTIN (UPC-A 12 chiffres, EAN-13).
export const isValidGtin = (code) => {
  if (!/^\d{12,13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
};

// ISRC : CC-XXX-YY-NNNNN (12 caractères sans tirets).
export const normalizeIsrc = (v) => String(v || '').toUpperCase().replace(/[-\s]/g, '');
export const isValidIsrc = (v) => /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(normalizeIsrc(v));
