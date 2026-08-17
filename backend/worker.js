// worker.js - Version qui fonctionne avec nodemailer
import nodemailer from 'nodemailer';

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ 
        status: 'OK', 
        message: 'SONIMUSIC API is running' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route pour envoyer un email de vérification
    if (url.pathname === '/api/auth/register' && request.method === 'POST') {
      try {
        const { email, name } = await request.json();

        await transporter.sendMail({
          from: '"SONIMUSIC" <noreply@sonimusic.online>',
          to: email,
          subject: 'SONIMUSIC - Confirmez votre adresse email',
          html: `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h1 style="color: #d4af37;">SONIMUSIC</h1>
              <h2>Bonjour ${name} ! 👋</h2>
              <p>Merci de vous être inscrit sur SONIMUSIC.</p>
              <p>Pour activer votre compte, cliquez sur le lien ci-dessous :</p>
              <a href="https://sonimusic.online/verify" style="display: inline-block; padding: 10px 20px; background: #d4af37; color: black; text-decoration: none; border-radius: 5px;">Confirmer mon email</a>
            </div>
          `
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Email de vérification envoyé' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error.message 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }
};
