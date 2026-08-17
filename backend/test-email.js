const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('📧 Test avec les vrais paramètres...');
  console.log('  - HOST:', process.env.EMAIL_HOST);
  console.log('  - PORT:', process.env.EMAIL_PORT);
  console.log('  - USER:', process.env.EMAIL_USER);
  console.log('  - PASS:', process.env.EMAIL_PASS ? '******' : 'Non défini');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"SONIMUSIC" <${process.env.EMAIL_USER}>`,
      to: 'tvculture41@gmail.com',
      subject: 'SONIMUSIC - Test SMTP',
      text: 'Test d\'envoi d\'email depuis le backend SONIMUSIC.'
    });
    console.log('✅ Email envoyé !');
    console.log('📧 Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Erreur détaillée:', error);
  }
}

testEmail();
