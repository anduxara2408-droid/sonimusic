// src/controllers/authController.js - ES Module
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { sendVerificationEmail } from '../config/email.js';

const prisma = new PrismaClient();

export const register = async (req, res) => {
  try {
    const { email, password, name, role, artistName, bio, country, socials } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '1d' }
    );

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'LISTENER',
        artistName: role === 'ARTIST' ? artistName : null,
        bio: role === 'ARTIST' ? bio : null,
        country: role === 'ARTIST' ? country : null,
        socials: role === 'ARTIST' ? socials : null,
        emailVerified: false,
        verificationToken: verificationToken
      }
    });

    const emailResult = await sendVerificationEmail(email, name, verificationToken);
    console.log('📧 Email envoyé:', emailResult);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Inscription réussie ! Vérifiez votre email',
      token,
      requiresVerification: true,
      emailSent: emailResult.success,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        artistName: user.artistName
      }
    });
  } catch (error) {
    console.error('❌ ERREUR:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!user.emailVerified) {
      return res.status(401).json({ 
        error: 'Veuillez vérifier votre email avant de vous connecter.',
        requiresVerification: true
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        artistName: user.artistName
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email et token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    
    if (decoded.email !== email) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    const user = await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const tokenJWT = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.json({ 
      verified: true, 
      message: 'Email vérifié avec succès !',
      token: tokenJWT,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        artistName: user.artistName
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
};
