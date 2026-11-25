// Crée le compte administrateur s'il n'existe pas.
// Usage : DATABASE_URL=... ADMIN_PASSWORD=... [ADMIN_EMAIL=...] node scripts/create-admin-pg.cjs
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'contact@sonimusic.online').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!DATABASE_URL) {
  console.error('❌ La variable d\'environnement DATABASE_URL est requise.');
  process.exit(1);
}
if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
  console.error('❌ La variable d\'environnement ADMIN_PASSWORD est requise (12 caractères minimum).');
  process.exit(1);
}
if (ADMIN_PASSWORD.length > 72) {
  console.error('❌ ADMIN_PASSWORD ne doit pas dépasser 72 caractères.');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DB_SSL_STRICT === 'true' }
});

async function createAdmin() {
  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    const checkResult = await client.query(
      'SELECT id, email, role FROM "User" WHERE LOWER(email) = $1',
      [ADMIN_EMAIL]
    );

    if (checkResult.rows.length > 0) {
      console.log('ℹ️ Un compte existe déjà pour', ADMIN_EMAIL, '(rôle :', checkResult.rows[0].role + ')');
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const result = await client.query(
      `INSERT INTO "User" (email, password, name, role, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, role`,
      [ADMIN_EMAIL, hashedPassword, 'Administrateur', 'ADMIN', true]
    );

    console.log('✅ Admin créé avec succès:', result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

createAdmin();
