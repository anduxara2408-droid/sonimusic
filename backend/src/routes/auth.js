import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Configuration email
const transporter = nodemailer.createTransport({
  host: 'smtp-fr.securemail.pro',
  port: 465,
  secure: true,
  auth: {
    user: 'noreply@sonimusic.online',
    pass: 'Nore@SOniMUSIC.online'
  }
});

// ============================================================
// 1. INSCRIPTION
// ============================================================
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, role, artistName, bio, country } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'LISTENER',
        artistName: role === 'ARTIST' ? artistName : null,
        bio: role === 'ARTIST' ? bio : null,
        country: role === 'ARTIST' ? country : null,
        verificationToken: crypto.randomUUID(),
        emailVerified: false
      }
    });

    // Envoyer l'email de vérification
    const verificationUrl = `https://sonimusic.online/verify?email=${encodeURIComponent(email)}&token=${user.verificationToken}`;
    
    await transporter.sendMail({
      from: '"SONIMUSIC" <noreply@sonimusic.online>',
      to: email,
      subject: 'SONIMUSIC - Confirmez votre adresse email',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0c0b0a; color: white;">
          <h1 style="color: #d4af37;">SONIMUSIC</h1>
          <h2>Bonjour ${name || 'Utilisateur'} ! 👋</h2>
          <p>Merci de vous être inscrit sur SONIMUSIC.</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:12px 30px;background:#d4af37;color:black;text-decoration:none;border-radius:5px;margin:20px 0;">
            ✅ Confirmer mon email
          </a>
          <p style="color:#666;font-size:12px;">⏳ Ce lien expire dans 24 heures.</p>
        </div>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

// ============================================================
// 2. VÉRIFICATION D'EMAIL
// ============================================================
router.post('/verify', async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email déjà vérifié' });
    }

    if (user.verificationToken !== token) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    // Générer un token JWT
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email vérifié avec succès !',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// ============================================================
// 3. CONNEXION
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier si l'email est vérifié
    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'Veuillez vérifier votre email avant de vous connecter' 
      });
    }

    // Générer un token JWT
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Connexion réussie',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ============================================================
// 4. DEMANDE DE RÉINITIALISATION (MOT DE PASSE OUBLIÉ)
// ============================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'Aucun compte associé à cet email' 
      });
    }

    // Générer un token sécurisé
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    // Sauvegarder le token
    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry }
    });

    // Envoyer l'email
    const resetUrl = `https://sonimusic.online/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    await transporter.sendMail({
      from: '"SONIMUSIC" <noreply@sonimusic.online>',
      to: email,
      subject: '🔑 Réinitialisation de votre mot de passe SONIMUSIC',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0c0b0a; color: white;">
          <h1 style="color: #d4af37;">🔑 SONIMUSIC</h1>
          <h2>Réinitialisation de mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
          <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 30px;background:#d4af37;color:black;text-decoration:none;border-radius:5px;margin:20px 0;">
            🔐 Réinitialiser mon mot de passe
          </a>
          <p style="color:#666;font-size:12px;">⏳ Ce lien expire dans 1 heure.</p>
          <p style="color:#666;font-size:12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: 'Un email de réinitialisation a été envoyé' 
    });

  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// ============================================================
// 5. RÉINITIALISER LE MOT DE PASSE
// ============================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    // Vérifier le token
    const user = await prisma.user.findUnique({
      where: { 
        email,
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Token invalide ou expiré' 
      });
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
  }
});

// ============================================================
// 6. RÉCUPÉRER LES INFOS DE L'UTILISATEUR CONNECTÉ
// ============================================================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        artistName: true,
        bio: true,
        country: true,
        profilePic: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);

  } catch (error) {
    console.error('Erreur /me:', error);
    res.status(401).json({ error: 'Token invalide' });
  }
});

export default router;
