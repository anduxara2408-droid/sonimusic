import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

// Configurer l'adaptateur PostgreSQL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// Initialiser Prisma Client avec l'adaptateur et Accelerate
const prisma = new PrismaClient({
  adapter,
}).$extends(withAccelerate());

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
  }
}

createAdmin();
