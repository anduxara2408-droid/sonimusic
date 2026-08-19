const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://sonimusic_user:TGZTr4hoDwzjZU8TvNDwxUgyngv8loAM@dpg-da1l5jp5efls73b5duog-a.frankfurt-postgres.render.com:5432/sonimusic',
  ssl: { rejectUnauthorized: false }
});

async function checkAdmin() {
  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');
    
    const res = await client.query('SELECT * FROM "User" WHERE email = $1', ['contact@sonimusic.online']);
    
    if (res.rows.length > 0) {
      console.log('✅ Admin trouvé:', res.rows[0]);
    } else {
      console.log('❌ Admin non trouvé');
    }
  } catch (err) {
    console.error('❌ Erreur:', err);
  } finally {
    await client.end();
  }
}

checkAdmin();
