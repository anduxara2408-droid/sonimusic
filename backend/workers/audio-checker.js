export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('📥 Request received:', method, path);

    // CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    // ===== ROUTE : HEALTH =====
    if (path === '/api/health') {
      return new Response(JSON.stringify({ 
        status: 'OK', 
        message: 'SONIMUSIC API running on Cloudflare Workers' 
      }), {
        headers: corsHeaders,
      });
    }

    // ===== ROUTE : SONGS =====
    if (path === '/api/songs' && method === 'GET') {
      const mockSongs = [
        {
          id: 1,
          title: 'Kankan',
          artist: { name: 'Demba Tandia', artistName: 'Demba Tandia' },
          genre: 'Soninké',
          coverArt: '/images/demba-tandia.jpg',
          audioFile: '',
          status: 'ACCEPTED',
          createdAt: new Date().toISOString(),
          _count: { favorites: 0 }
        },
        {
          id: 2,
          title: 'Fii Sire',
          artist: { name: 'Demba Tandia', artistName: 'Demba Tandia' },
          genre: 'Soninké',
          coverArt: '/images/demba-tandia.jpg',
          audioFile: '',
          status: 'ACCEPTED',
          createdAt: new Date().toISOString(),
          _count: { favorites: 0 }
        },
        {
          id: 3,
          title: 'Fakoly',
          artist: { name: 'Demba Tandia', artistName: 'Demba Tandia' },
          genre: 'Soninké',
          coverArt: '/images/demba-tandia.jpg',
          audioFile: '',
          status: 'ACCEPTED',
          createdAt: new Date().toISOString(),
          _count: { favorites: 0 }
        }
      ];
      
      return new Response(JSON.stringify(mockSongs), {
        headers: corsHeaders,
      });
    }

    // ===== ROUTE : LOGIN =====
    if (path === '/api/auth/login' && method === 'POST') {
      try {
        const body = await request.json();
        const { email, password } = body;
        console.log('🔐 Login attempt:', email);

        const users = {
          'demo@sonimusic.com': { 
            id: 1, 
            email: 'demo@sonimusic.com', 
            password: 'password123', 
            name: 'Démo', 
            role: 'LISTENER' 
          },
          'artist@sonimusic.com': { 
            id: 2, 
            email: 'artist@sonimusic.com', 
            password: 'password123', 
            name: 'Artiste Démo', 
            role: 'ARTIST' 
          },
          'admin@sonimusic.com': { 
            id: 3, 
            email: 'admin@sonimusic.com', 
            password: 'admin123', 
            name: 'Admin', 
            role: 'ADMIN' 
          }
        };

        const user = users[email];
        if (!user || user.password !== password) {
          console.log('❌ Login failed:', email);
          return new Response(JSON.stringify({ error: 'Email ou mot de passe incorrect' }), {
            status: 401,
            headers: corsHeaders,
          });
        }

        console.log('✅ Login success:', email);
        const { password: _, ...userWithoutPassword } = user;

        return new Response(JSON.stringify({
          token: `demo-token-${Date.now()}`,
          user: userWithoutPassword
        }), {
          headers: corsHeaders,
        });
      } catch (error) {
        console.error('❌ Login error:', error);
        return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // ===== ROUTE : REGISTER =====
    if (path === '/api/auth/register' && method === 'POST') {
      try {
        const body = await request.json();
        const { email, password, name, role } = body;
        console.log('📝 Register attempt:', email);

        const newUser = {
          id: Math.floor(Math.random() * 1000),
          email,
          name: name || 'Utilisateur',
          role: role || 'LISTENER',
          password
        };

        console.log('✅ Register success:', email);
        const { password: _, ...userWithoutPassword } = newUser;

        return new Response(JSON.stringify({
          token: `demo-token-${Date.now()}`,
          user: userWithoutPassword
        }), {
          headers: corsHeaders,
        });
      } catch (error) {
        console.error('❌ Register error:', error);
        return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // ===== ROUTE : ME =====
    if (path === '/api/auth/me' && method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Non authentifié' }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({
        id: 3,
        email: 'admin@sonimusic.com',
        name: 'Admin',
        role: 'ADMIN'
      }), {
        headers: corsHeaders,
      });
    }

    // ===== ROUTE : CHECK-AUDIO =====
    if (path === '/check-audio' && method === 'POST') {
      try {
        console.log('🎵 Audio check request received');
        
        const formData = await request.formData();
        const audioFile = formData.get('audio');
        console.log('📁 Audio file:', audioFile?.name, 'Size:', audioFile?.size);

        if (!audioFile) {
          console.log('❌ No audio file');
          return new Response(JSON.stringify({ error: 'Aucun fichier audio' }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        console.log('🔄 Converting to buffer...');
        const buffer = await audioFile.arrayBuffer();
        console.log('✅ Buffer size:', buffer.byteLength);

        console.log('🔍 Calling ACRCloud...');
        const acrResult = await checkAudioWithACRCloud(buffer, env);
        console.log('📊 ACRCloud result:', JSON.stringify(acrResult).substring(0, 200));

        if (acrResult.status?.code === 0 && acrResult.metadata?.music?.length > 0) {
          const matchedMusic = acrResult.metadata.music[0];
          console.log('🚫 Sample blocked:', matchedMusic.title);
          return new Response(JSON.stringify({
            status: 'blocked',
            message: '⚠️ Ce sample/instrumental est protégé par des droits d\'auteur.',
            details: {
              title: matchedMusic.title || 'Titre inconnu',
              artist: matchedMusic.artists?.[0]?.name || 'Artiste inconnu',
            },
            suggestion: 'Veuillez fournir une licence pour ce sample.',
          }), {
            headers: corsHeaders,
          });
        }

        console.log('✅ Audio approved');
        return new Response(JSON.stringify({
          status: 'approved',
          message: '✅ Aucun sample protégé détecté.',
        }), {
          headers: corsHeaders,
        });

      } catch (error) {
        console.error('❌ Audio check error:', error);
        return new Response(JSON.stringify({
          error: 'Erreur lors de la vérification',
          details: error.message,
        }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    console.log('❌ Route not found:', path);
    return new Response(JSON.stringify({ error: 'Route non trouvée' }), {
      status: 404,
      headers: corsHeaders,
    });
  },
};

async function checkAudioWithACRCloud(buffer, env) {
  const ACCESS_KEY = env.ACRCLOUD_ACCESS_KEY;
  const SECRET_KEY = env.ACRCLOUD_SECRET_KEY;
  const HOST = env.ACRCLOUD_HOST || 'identify-eu-west-1.acrcloud.com';

  console.log('🔑 ACRCloud - Access Key:', ACCESS_KEY ? '✅ OK' : '❌ Missing');
  console.log('🔑 ACRCloud - Secret Key:', SECRET_KEY ? '✅ OK' : '❌ Missing');
  console.log('🔑 ACRCloud - Host:', HOST);

  if (!ACCESS_KEY || !SECRET_KEY) {
    console.log('❌ ACRCloud keys missing');
    throw new Error('Clés ACRCloud manquantes');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `${ACCESS_KEY}${timestamp}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToSign + SECRET_KEY);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signatureHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('🔐 Signature generated');

  const acrFormData = new FormData();
  acrFormData.append('access_key', ACCESS_KEY);
  acrFormData.append('timestamp', timestamp.toString());
  acrFormData.append('signature', signatureHex);
  acrFormData.append('data_type', 'audio');
  acrFormData.append('sample_bytes', new Blob([buffer]));

  console.log('📤 Sending to ACRCloud...');
  const response = await fetch(`https://${HOST}/v1/identify`, {
    method: 'POST',
    body: acrFormData,
  });

  console.log('📥 ACRCloud response status:', response.status);

  if (!response.ok) {
    console.log('❌ ACRCloud error:', response.status);
    throw new Error(`ACRCloud API error: ${response.status}`);
  }

  const result = await response.json();
  console.log('✅ ACRCloud response received');
  return result;
}
