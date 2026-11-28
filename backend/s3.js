// Accès au stockage objet compatible S3 (Neon Object Storage).
// Signature AWS SigV4 « presigned URL » écrite avec le module crypto de Node,
// pour ne dépendre d'aucune bibliothèque externe.
import crypto from 'crypto';
import https from 'https';

const cfg = () => ({
  endpoint: (process.env.S3_ENDPOINT || '').replace(/\/+$/, ''),
  region: process.env.S3_REGION || 'eu-central-1',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  privateBucket: process.env.S3_PRIVATE_BUCKET || 'sonimusic-private',
  publicBucket: process.env.S3_PUBLIC_BUCKET || 'sonimusic-public',
});

export const storageConfigured = () => {
  const c = cfg();
  return Boolean(c.endpoint && c.accessKeyId && c.secretAccessKey);
};

export const buckets = () => {
  const c = cfg();
  return { private: c.privateBucket, public: c.publicBucket };
};

// Encodage RFC 3986 exigé par SigV4.
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
const encPath = (key) => key.split('/').map(enc).join('/');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const sha256hex = (data) => crypto.createHash('sha256').update(data).digest('hex');

/**
 * URL présignée pour une opération sur un objet.
 * @param {object} o
 * @param {'GET'|'PUT'|'HEAD'|'DELETE'} o.method
 * @param {string} o.bucket
 * @param {string} o.key
 * @param {number} [o.expires] secondes (max 7 jours)
 * @param {object} [o.query] paramètres supplémentaires signés (ex. response-content-disposition)
 */
export const presign = ({ method, bucket, key, expires = 300, query = {} }) => {
  const c = cfg();
  const url = new URL(c.endpoint);
  const host = url.host;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${c.region}/s3/aws4_request`;
  const path = `/${enc(bucket)}/${encPath(key)}`;

  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${c.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.min(Math.max(1, Math.floor(expires)), 604800)),
    'X-Amz-SignedHeaders': 'host',
    ...query,
  };
  const canonicalQuery = Object.keys(params).sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`).join('&');
  const canonicalRequest = [method, path, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${c.secretAccessKey}`, date);
  const kSigning = hmac(hmac(hmac(kDate, c.region), 's3'), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  return `${url.protocol}//${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
};

// Adresse publique (bucket en lecture publique).
export const publicUrl = (key) => {
  const c = cfg();
  return `${c.endpoint}/${enc(c.publicBucket)}/${encPath(key)}`;
};

// Taille et type d'un objet (null s'il n'existe pas).
export const headObject = async (bucket, key) => {
  const res = await fetch(presign({ method: 'HEAD', bucket, key, expires: 60 }), { method: 'HEAD' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HEAD ${res.status}`);
  return { size: Number(res.headers.get('content-length')) || 0, contentType: res.headers.get('content-type') || '' };
};

// Premiers octets d'un objet (pour vérifier son vrai format côté serveur).
export const readRange = async (bucket, key, length = 65536) => {
  const res = await fetch(presign({ method: 'GET', bucket, key, expires: 60 }), { headers: { Range: `bytes=0-${length - 1}` } });
  if (!res.ok && res.status !== 206) throw new Error(`GET ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

export const deleteObject = async (bucket, key) => {
  const res = await fetch(presign({ method: 'DELETE', bucket, key, expires: 60 }), { method: 'DELETE' });
  return res.ok || res.status === 404;
};

// Copie un objet d'un bucket à l'autre en passant par le serveur (flux, sans tout charger en mémoire).
export const copyObject = async (fromBucket, fromKey, toBucket, toKey, contentType) => {
  const src = await fetch(presign({ method: 'GET', bucket: fromBucket, key: fromKey, expires: 600 }));
  if (!src.ok) throw new Error(`GET ${src.status}`);
  const len = src.headers.get('content-length');
  await new Promise((resolve, reject) => {
    const req = https.request(presign({ method: 'PUT', bucket: toBucket, key: toKey, expires: 600 }), {
      method: 'PUT',
      headers: { 'Content-Type': contentType || src.headers.get('content-type') || 'application/octet-stream', ...(len ? { 'Content-Length': len } : {}) },
    }, (r) => { r.resume(); r.on('end', () => (r.statusCode < 300 ? resolve() : reject(new Error(`PUT ${r.statusCode}`)))); });
    req.on('error', reject);
    (async () => {
      try {
        for await (const chunk of src.body) req.write(chunk);
        req.end();
      } catch (e) { req.destroy(e); }
    })();
  });
};

// Envoi d'un flux entrant (requête HTTP du navigateur) vers le stockage.
// Utilisé en secours si l'envoi direct navigateur → stockage est bloqué.
export const putStream = (bucket, key, stream, { contentType, contentLength }) => new Promise((resolve, reject) => {
  const req = https.request(presign({ method: 'PUT', bucket, key, expires: 900 }), {
    method: 'PUT',
    headers: { 'Content-Type': contentType || 'application/octet-stream', 'Content-Length': contentLength },
  }, (r) => { r.resume(); r.on('end', () => (r.statusCode < 300 ? resolve() : reject(new Error(`PUT ${r.statusCode}`)))); });
  req.on('error', reject);
  stream.on('error', (e) => req.destroy(e));
  stream.pipe(req);
});
