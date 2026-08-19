const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialiser Prisma Client directement
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'contact@sonimusic.online' },
      update: {},
      create: {
        email: 'contact@sonimusic.online',
        password: hashedPassword,
        name: 'Administrateur',
        role: 'ADMIN',
        emailVerified: true
      }
    });
    console.log('✅ Admin créé avec succès:', admin);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
