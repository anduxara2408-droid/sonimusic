// Vérifie la présence du compte administrateur.
// Usage : DATABASE_URL=... [ADMIN_EMAIL=...] node check-admin.cjs
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'contact@sonimusic.online').trim().toLowerCase();

if (!DATABASE_URL) {
  console.error('❌ La variable d\'environnement DATABASE_URL est requise.');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DB_SSL_STRICT === 'true' }
});

async function checkAdmin() {
  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    const res = await client.query(
      'SELECT id, email, name, role, "createdAt" FROM "User" WHERE LOWER(email) = $1',
      [ADMIN_EMAIL]
    );

    if (res.rows.length > 0) {
      const { id, email, name, role, createdAt } = res.rows[0];
      console.log('✅ Compte trouvé:', { id, email, name, role, createdAt });
      if (role !== 'ADMIN') console.warn('⚠️ Ce compte n\'a pas le rôle ADMIN.');
    } else {
      console.log('❌ Admin non trouvé:', ADMIN_EMAIL);
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

checkAdmin();
