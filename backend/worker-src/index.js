// worker-src/index.js
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
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0c0b0a; color: white;">
              <div style="text-align: center; padding: 20px;">
                <h1 style="color: #d4af37; font-size: 24px;">SONIMUSIC</h1>
              </div>
              <div style="background-color: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #333;">
                <h2 style="color: #d4af37; font-size: 20px;">Bonjour ${name} ! 👋</h2>
                <p style="color: #b3b3b3; font-size: 16px; line-height: 1.6;">
                  Merci de vous être inscrit sur <strong style="color: #d4af37;">SONIMUSIC</strong>.
                </p>
                <p style="color: #b3b3b3; font-size: 16px; line-height: 1.6;">
                  Pour activer votre compte, cliquez sur le lien ci-dessous :
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://sonimusic.online/verify" 
                     style="display: inline-block; padding: 14px 40px; background-color: #d4af37; color: black; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    ✅ Confirmer mon email
                  </a>
                </div>
                <p style="color: #666; font-size: 14px; text-align: center;">
                  Ce lien expire dans 24 heures.
                </p>
              </div>
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
