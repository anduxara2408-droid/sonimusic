// src/email-worker.js - Worker minimal pour les emails
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
      return new Response(JSON.stringify({ status: 'OK', message: 'SONIMUSIC API is running' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route pour envoyer un email de test
    if (url.pathname === '/api/test-email' && request.method === 'POST') {
      try {
        const { email, name } = await request.json();

        await transporter.sendMail({
          from: '"SONIMUSIC" <noreply@sonimusic.online>',
          to: email,
          subject: 'Test SONIMUSIC',
          html: `
            <h1>Bonjour ${name} !</h1>
            <p>Cet email est un test de la configuration SONIMUSIC.</p>
          `
        });

        return new Response(JSON.stringify({ success: true, message: 'Email envoyé' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404 });
  }
};
