// Génère un hash bcrypt pour un mot de passe passé en argument.
// Usage : node generateHash.js "monMotDePasse"
// Le mot de passe n'est jamais affiché.
import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage : node generateHash.js "<mot de passe>"');
  process.exit(1);
}
if (password.length > 72) {
  console.error('❌ Le mot de passe ne doit pas dépasser 72 caractères (limite bcrypt).');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('Hash:', hash);
