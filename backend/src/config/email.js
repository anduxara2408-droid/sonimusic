// src/config/email.js - ES Module
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-fr.securemail.pro',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'noreply@sonimusic.online',
    pass: process.env.EMAIL_PASS || 'Nore@SOniMUSIC.online'
  }
});

export const sendVerificationEmail = async (email, name, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://sonimusic.online'}/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"SONIMUSIC" <noreply@sonimusic.online>`,
    to: email,
    subject: 'SONIMUSIC - Confirmez votre adresse email',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0c0b0a; color: white;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #d4af37; font-size: 24px;">SONIMUSIC</h1>
        </div>
        <div style="background-color: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #333;">
          <h2 style="color: #d4af37; font-size: 20px; margin-bottom: 16px;">Bonjour ${name} ! 👋</h2>
          <p style="color: #b3b3b3; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Merci de vous être inscrit sur <strong style="color: #d4af37;">SONIMUSIC</strong>.
            Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; background-color: #d4af37; color: black; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ✅ Confirmer mon email
            </a>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
            Si le bouton ne fonctionne pas, copiez ce lien :<br>
            <a href="${verificationUrl}" style="color: #d4af37; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé à', email);
    return { success: true, info };
  } catch (error) {
    console.error('❌ Erreur:', error);
    return { success: false, error: error.message };
  }
};
