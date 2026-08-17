const bcrypt = require('bcrypt');

const password = '49037697'; // Change ce mot de passe si tu veux

bcrypt.hash(password, 10).then(hash => {
  console.log('Mot de passe:', password);
  console.log('Hash:', hash);
});
