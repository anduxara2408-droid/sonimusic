// src/worker.js - Version sans nodemailer pour tester
export default {
  async fetch(request, env, ctx) {
    // Gérer les requêtes OPTIONS (preflight CORS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://sonimusic.online',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Headers CORS pour toutes les réponses
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://sonimusic.online',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json'
    };

    // Health check
    if (path === '/api/health') {
      return new Response(JSON.stringify({ 
        status: 'OK', 
        message: 'SONIMUSIC API is running' 
      }), { headers: corsHeaders });
    }

    // Inscription (simulée sans email)
    if (path === '/api/auth/register' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email, name } = body;

        console.log(`📝 Inscription: ${email} (${name})`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Inscription réussie ! (email simulé)',
          requiresVerification: false
        }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Connexion (simulée)
    if (path === '/api/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Connexion réussie',
          token: 'fake-token-123456',
          user: { id: 1, email, name: 'Test User', role: 'LISTENER' }
        }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
