const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: 'postgresql://sonimusic_user:TGZTr4hoDwzjZU8TvNDwxUgyngv8loAM@dpg-da1l5jp5efls73b5duog-a.frankfurt-postgres.render.com:5432/sonimusic',
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Vérifier si l'admin existe déjà
    const checkResult = await client.query(
      'SELECT * FROM "User" WHERE email = $1',
      ['contact@sonimusic.online']
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ Admin existe déjà:', checkResult.rows[0]);
      return;
    }

    // Créer l'admin
    const result = await client.query(
      `INSERT INTO "User" (email, password, name, role, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      ['contact@sonimusic.online', hashedPassword, 'Administrateur', 'ADMIN', true]
    );

    console.log('✅ Admin créé avec succès:', result.rows[0]);
    console.log('🔑 Email: contact@sonimusic.online');
    console.log('🔑 Mot de passe: admin123');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

createAdmin();
