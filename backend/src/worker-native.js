// src/worker-native.js - API native Cloudflare Workers avec KV et Prisma Accelerate
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

// Initialiser Prisma Client avec Accelerate
const prisma = new PrismaClient().$extends(withAccelerate());

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

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://sonimusic.online',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// ============================================================
// LISTE DES COMPTES BLOQUÉS (SUPPRIMÉS)
// ============================================================
const BLOCKED_ACCOUNTS = [
  'demo@sonimusic.com',
  'admin@sonimusic.com',
  'test@sonimusic.com',
  'anduxara.newsletter@gmail.com',
  'user@test.com'
];

// ============================================================
// STOCKAGE EN MÉMOIRE POUR LES DONNÉES DYNAMIQUES
// ============================================================
let favorites = {};
let playlists = {};
let comments = {};
let notifications = {};
let playHistory = {};

// ============================================================
// LISTE DE TOUS LES ARTISTES
// ============================================================
const artistsList = [
  { id: 1, name: "Demba Tandia", artistName: "Demba Tandia", genre: "Soninké", country: "Mauritanie", profilePic: "/images/artists/demba-tandia.jpg", bio: "Artiste Soninké, chanteur et compositeur." },
  { id: 2, name: "JKERIA", artistName: "JKERIA", genre: "Soninké", country: "Mauritanie", profilePic: "/images/artists/jkeria.jpg", bio: "Artiste Soninké" },
  { id: 3, name: "David Soni", artistName: "David Soni", genre: "Soninké", country: "Mauritanie", profilePic: "/images/artists/david-soni.jpg", bio: "Artiste Soninké" },
  { id: 4, name: "Lass Ko", artistName: "Lass Ko", genre: "Soninké", country: "Mauritanie", profilePic: "/images/artists/lass-ko.jpg", bio: "Artiste Soninké" },
  { id: 5, name: "Mister Gang", artistName: "Mister Gang", genre: "Soninké", country: "Mauritanie", profilePic: "/images/artists/mister-gang.jpg", bio: "Artiste Soninké" },
  { id: 6, name: "Pispa le roi", artistName: "Pispa le roi", genre: "Pular", country: "Mauritanie", profilePic: "/images/artists/pispa-le-roi.jpg", bio: "Artiste Pular" }
];

// ============================================================
// MUSIQUES MOCKÉES
// ============================================================
const fiiSiireSongs = [
  { id: 1, title: "Fii Siire 1", audioFile: "/audio/demba-tandia/Fii_Siire_1.mp3" },
  { id: 2, title: "Fii Siire 2", audioFile: "/audio/demba-tandia/Fii_Siire_2.mp3" },
  { id: 3, title: "Fii Siire 3", audioFile: "/audio/demba-tandia/Fii_Siire_3.mp3" },
  { id: 4, title: "Fii Siire 4", audioFile: "/audio/demba-tandia/Fii_Siire_4.mp3" },
  { id: 5, title: "Fii Siire 5", audioFile: "/audio/demba-tandia/Fii_Siire_5.mp3" },
  { id: 6, title: "Fii Siire 6", audioFile: "/audio/demba-tandia/Fii_Siire_6.mp3" },
  { id: 7, title: "Fii Siire 7", audioFile: "/audio/demba-tandia/Fii_Siire_7.mp3" },
  { id: 8, title: "Fii Siire 8", audioFile: "/audio/demba-tandia/Fii_Siire_8.mp3" },
  { id: 9, title: "Fii Siire 9", audioFile: "/audio/demba-tandia/Fii_Siire_9.mp3" },
  { id: 10, title: "Fii Siire 10", audioFile: "/audio/demba-tandia/Fii_Siire_10.mp3" }
];

const bataaxeSongs = [
  { id: 11, title: "Bataaxe 1", audioFile: "/audio/demba-tandia/Bataaxe_1.mp3" },
  { id: 12, title: "Bataaxe 2", audioFile: "/audio/demba-tandia/Bataaxe_2.mp3" },
  { id: 13, title: "Bataaxe 3", audioFile: "/audio/demba-tandia/Bataaxe_3.mp3" },
  { id: 14, title: "Bataaxe 4", audioFile: "/audio/demba-tandia/Bataaxe_4.mp3" },
  { id: 15, title: "Bataaxe 5", audioFile: "/audio/demba-tandia/Bataaxe_5.mp3" },
  { id: 16, title: "Bataaxe 6", audioFile: "/audio/demba-tandia/Bataaxe_6.mp3" },
  { id: 17, title: "Bataaxe 7", audioFile: "/audio/demba-tandia/Bataaxe_7.mp3" },
  { id: 18, title: "Bataaxe 8", audioFile: "/audio/demba-tandia/Bataaxe_8.mp3" }
];

const otherSongs = [
  { id: 101, title: "O Yani", artistId: 2, artist: { id: 2, name: "JKERIA" }, genre: "Hip-Hop", coverArt: "/images/albums/default.jpg", audioFile: "/audio/jkeria/O_yani.mp3", status: "ACCEPTED", album: "", createdAt: new Date().toISOString(), _count: { favorites: 0 } },
  { id: 102, title: "Hip Hop", artistId: 5, artist: { id: 5, name: "Mister Gang" }, genre: "Hip-Hop", coverArt: "/images/albums/default.jpg", audioFile: "/audio/mister-gang/Hip_Hop_Feat_David_Soni.mp3", status: "ACCEPTED", album: "", createdAt: new Date().toISOString(), _count: { favorites: 0 } },
  { id: 103, title: "Baby - 5", artistId: 4, artist: { id: 4, name: "Lass Ko" }, genre: "Soninké", coverArt: "/images/albums/default.jpg", audioFile: "/audio/lass-ko/Baby_5.mp3", status: "ACCEPTED", album: "Soobé", createdAt: new Date().toISOString(), _count: { favorites: 0 } },
  { id: 104, title: "NKE MA SIMMA KUNDU", artistId: 3, artist: { id: 3, name: "David Soni" }, genre: "Soninké", coverArt: "/images/albums/default.jpg", audioFile: "/audio/david-soni/NKE_MA_SIMMA_KUNDU.mp3", status: "ACCEPTED", album: "", createdAt: new Date().toISOString(), _count: { favorites: 0 } },
  { id: 105, title: "DOUBLE IMPACT", artistId: 6, artist: { id: 6, name: "Pispa le roi" }, genre: "Pular", coverArt: "/images/albums/default.jpg", audioFile: "/audio/pispa-le-roi/DOUBLE_IMPACT.mp3", status: "ACCEPTED", album: "", createdAt: new Date().toISOString(), _count: { favorites: 0 } }
];

const mockSongs = [
  ...fiiSiireSongs.map(s => ({ ...s, artist: { id: 1, name: "Demba Tandia" }, genre: "Soninké", coverArt: "/images/albums/fii-siire.jpg", status: "ACCEPTED", album: "Fii Siire", createdAt: new Date().toISOString(), _count: { favorites: 0 } })),
  ...bataaxeSongs.map(s => ({ ...s, artist: { id: 1, name: "Demba Tandia" }, genre: "Soninké", coverArt: "/images/albums/bataaxe.jpg", status: "ACCEPTED", album: "Bataaxe", createdAt: new Date().toISOString(), _count: { favorites: 0 } })),
  ...otherSongs
];

const mockAlbums = [
  { id: 1, title: "Fii Siire", artistId: 1, artist: { id: 1, name: "Demba Tandia" }, year: 2022, coverArt: "/images/albums/fii-siire.jpg", description: "Album Fii Siire", songs: [1,2,3,4,5,6,7,8,9,10], createdAt: new Date().toISOString() },
  { id: 2, title: "Bataaxe", artistId: 1, artist: { id: 1, name: "Demba Tandia" }, year: 2023, coverArt: "/images/albums/bataaxe.jpg", description: "Album Bataaxe", songs: [11,12,13,14,15,16,17,18], createdAt: new Date().toISOString() }
];

const mockUsers = [
  { id: 1, name: 'Administrateur', email: 'contact@sonimusic.online', role: 'ADMIN', status: 'active', createdAt: new Date().toISOString() },
  { id: 2, name: 'Demo User', email: 'demo@sonimusic.com', role: 'LISTENER', status: 'active', createdAt: new Date().toISOString() },
  { id: 3, name: 'Test User', email: 'test@sonimusic.com', role: 'LISTENER', status: 'active', createdAt: new Date().toISOString() }
];

const artistData = {
  id: 1,
  name: "Demba Tandia",
  artistName: "Demba Tandia",
  bio: "Artiste Soninké",
  country: "Mauritanie",
  profilePic: "/images/artists/demba-tandia.jpg",
  albums: [
    { title: "Fii Siire", year: 2022, coverArt: "/images/albums/fii-siire.jpg", songs: fiiSiireSongs },
    { title: "Bataaxe", year: 2023, coverArt: "/images/albums/bataaxe.jpg", songs: bataaxeSongs }
  ],
  socials: { twitter: "https://twitter.com/dembatandia", instagram: "https://instagram.com/dembatandia", facebook: "https://facebook.com/dembatandia" }
};

export default {
  async fetch(request, env, ctx) {
    // Gestion OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': 'https://sonimusic.online',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Origin, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
      }});
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ========== AUTHENTIFICATION AVEC PRISMA ACCELERATE ==========
    
    // Login
    if (path === '/api/auth/login' && request.method === 'POST') {
      try {
        const { email, password } = await request.json();
        
        if (BLOCKED_ACCOUNTS.includes(email)) {
          return new Response(JSON.stringify({ error: 'Compte désactivé ou supprimé' }), {
            status: 401,
            headers: corsHeaders
          });
        }
        
        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          const isValid = await bcrypt.compare(password, user.password);
          if (isValid) {
            if (!user.emailVerified) {
              return new Response(JSON.stringify({ error: 'Veuillez vérifier votre email' }), {
                status: 403,
                headers: corsHeaders
              });
            }
            const jwtToken = jwt.sign(
              { id: user.id, email: user.email, role: user.role },
              env.JWT_SECRET || 'secret',
              { expiresIn: '7d' }
            );
            return new Response(JSON.stringify({
              success: true,
              token: jwtToken,
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
              }
            }), { headers: corsHeaders });
          }
        }

        // Fallback KV
        const storedData = await env.TOKENS.get(email);
        const storedToken = storedData ? JSON.parse(storedData) : null;
        const demoUsers = {
          "demo@sonimusic.com": { id: 1, email: "demo@sonimusic.com", name: "Démo", role: "LISTENER", password: "password123" },
          "admin@sonimusic.com": { id: 2, email: "admin@sonimusic.com", name: "Admin", role: "ADMIN", password: "admin123" }
        };
        let userFallback = demoUsers[email];
        if (!userFallback && storedToken && storedToken.used) {
          userFallback = { id: 1, email, name: storedToken.name, role: storedToken.role || 'LISTENER', password: storedToken.password };
        }
        if (userFallback && userFallback.password === password) {
          const jwtToken = jwt.sign(
            { email, id: userFallback.id || 1, role: userFallback.role || 'LISTENER' },
            env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
          );
          const { password: _, ...userWithoutPassword } = userFallback;
          return new Response(JSON.stringify({
            success: true,
            token: jwtToken,
            user: userWithoutPassword
          }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: 'Email ou mot de passe incorrect' }), {
          status: 401,
          headers: corsHeaders
        });
      } catch (error) {
        console.error('Erreur login:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Me
    if (path === '/api/auth/me' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        
        if (BLOCKED_ACCOUNTS.includes(decoded.email)) {
          return new Response(JSON.stringify({ error: 'Compte désactivé' }), {
            status: 401,
            headers: corsHeaders
          });
        }
        
        const user = await prisma.user.findUnique({
          where: { email: decoded.email },
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

        if (user) {
          return new Response(JSON.stringify(user), { headers: corsHeaders });
        }

        if (decoded.email === 'contact@sonimusic.online') {
          return new Response(JSON.stringify({
            id: 999,
            email: 'contact@sonimusic.online',
            name: 'Administrateur',
            role: 'ADMIN'
          }), { headers: corsHeaders });
        }
        const storedData = await env.TOKENS.get(decoded.email);
        if (!storedData) return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), { status: 404, headers: corsHeaders });
        const userData = JSON.parse(storedData);
        return new Response(JSON.stringify({
          id: userData.id || 1,
          email: decoded.email,
          name: userData.name || 'Utilisateur',
          role: userData.role || 'LISTENER'
        }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401, headers: corsHeaders });
      }
    }

    // Register
    if (path === '/api/auth/register' && request.method === 'POST') {
      try {
        const { email, name, password, role, artistName, bio, country } = await request.json();
        
        if (BLOCKED_ACCOUNTS.includes(email)) {
          return new Response(JSON.stringify({ error: 'Cet email ne peut pas être utilisé' }), {
            status: 400,
            headers: corsHeaders
          });
        }
        
        const existingUser = await prisma.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          return new Response(JSON.stringify({ error: 'Email déjà utilisé' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomUUID();

        const user = await prisma.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
            role: role || 'LISTENER',
            artistName: role === 'ARTIST' ? artistName : null,
            bio: role === 'ARTIST' ? bio : null,
            country: role === 'ARTIST' ? country : null,
            verificationToken,
            emailVerified: false
          }
        });

        const verificationUrl = `https://sonimusic.online/verify?email=${encodeURIComponent(email)}&token=${verificationToken}`;
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

        return new Response(JSON.stringify({
          success: true,
          message: 'Inscription réussie ! Vérifiez votre email',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }), { headers: corsHeaders });
      } catch (error) {
        console.error('Erreur inscription:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Verify
    if (path === '/api/auth/verify' && request.method === 'POST') {
      try {
        const { email, token } = await request.json();

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        if (user.emailVerified) {
          return new Response(JSON.stringify({ error: 'Email déjà vérifié' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        if (user.verificationToken !== token) {
          return new Response(JSON.stringify({ error: 'Token invalide' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        await prisma.user.update({
          where: { email },
          data: {
            emailVerified: true,
            verificationToken: null
          }
        });

        const jwtToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );

        return new Response(JSON.stringify({
          success: true,
          message: 'Email vérifié avec succès !',
          token: jwtToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }), { headers: corsHeaders });
      } catch (error) {
        console.error('Erreur vérification:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Forgot password
    if (path === '/api/auth/forgot-password' && request.method === 'POST') {
      try {
        const { email } = await request.json();

        const user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          return new Response(JSON.stringify({ error: 'Aucun compte associé à cet email' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        const resetToken = crypto.randomUUID();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.user.update({
          where: { email },
          data: { resetToken, resetTokenExpiry }
        });

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
              <a href="${resetUrl}" style="display:inline-block;padding:12px 30px;background:#d4af37;color:black;text-decoration:none;border-radius:5px;margin:20px 0;">
                🔐 Réinitialiser mon mot de passe
              </a>
              <p style="color:#666;font-size:12px;">⏳ Ce lien expire dans 1 heure.</p>
            </div>
          `
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Un email de réinitialisation a été envoyé'
        }), { headers: corsHeaders });
      } catch (error) {
        console.error('Erreur forgot-password:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Reset password
    if (path === '/api/auth/reset-password' && request.method === 'POST') {
      try {
        const { email, token, newPassword } = await request.json();

        const user = await prisma.user.findUnique({
          where: {
            email,
            resetToken: token,
            resetTokenExpiry: { gt: new Date() }
          }
        });

        if (!user) {
          return new Response(JSON.stringify({ error: 'Token invalide ou expiré' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
          }
        });

        return new Response(JSON.stringify({
          success: true,
          message: 'Mot de passe réinitialisé avec succès'
        }), { headers: corsHeaders });
      } catch (error) {
        console.error('Erreur reset-password:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // ========== ARTISTES ==========
    if (path === '/api/artists' && request.method === 'GET') {
      return new Response(JSON.stringify(artistsList), { headers: corsHeaders });
    }
    if (path.startsWith('/api/artists/') && request.method === 'GET') {
      try {
        const artistId = parseInt(path.split('/').pop());
        const artist = artistsList.find(a => a.id === artistId);
        if (!artist) return new Response(JSON.stringify({ error: 'Artiste non trouvé' }), { status: 404, headers: corsHeaders });
        const artistSongs = mockSongs.filter(s => s.artist.id === artistId);
        return new Response(JSON.stringify({ ...artist, songs: artistSongs, stats: { totalSongs: artistSongs.length } }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path === '/api/artists/demba-tandia' && request.method === 'GET') {
      return new Response(JSON.stringify(artistData), { headers: corsHeaders });
    }

    // ========== ALBUMS ==========
    if (path === '/api/albums' && request.method === 'GET') {
      return new Response(JSON.stringify(mockAlbums), { headers: corsHeaders });
    }

    // ========== SONGS ==========
    if (path === '/api/songs' && request.method === 'GET') {
      return new Response(JSON.stringify(mockSongs), { headers: corsHeaders });
    }

    // ========== FAVORIS ==========
    if (path === '/api/favorites/my-favorites' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const userFavorites = favorites[decoded.email] || [];
        return new Response(JSON.stringify(userFavorites), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path === '/api/favorites/toggle' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const { songId } = await request.json();
        if (!favorites[decoded.email]) favorites[decoded.email] = [];
        const index = favorites[decoded.email].indexOf(songId);
        if (index > -1) {
          favorites[decoded.email].splice(index, 1);
          return new Response(JSON.stringify({ liked: false, message: 'Retiré des favoris' }), { headers: corsHeaders });
        } else {
          favorites[decoded.email].push(songId);
          return new Response(JSON.stringify({ liked: true, message: 'Ajouté aux favoris' }), { headers: corsHeaders });
        }
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== PLAYLISTS ==========
    if (path === '/api/playlists' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const userPlaylists = playlists[decoded.email] || [];
        return new Response(JSON.stringify(userPlaylists), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path === '/api/playlists' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const { name, description, isPublic } = await request.json();
        if (!name) return new Response(JSON.stringify({ error: 'Nom requis' }), { status: 400, headers: corsHeaders });
        if (!playlists[decoded.email]) playlists[decoded.email] = [];
        const newPlaylist = { id: Date.now(), name, description: description || '', isPublic: isPublic !== false, songs: [], createdAt: new Date().toISOString() };
        playlists[decoded.email].push(newPlaylist);
        return new Response(JSON.stringify({ success: true, playlist: newPlaylist }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path.startsWith('/api/playlists/') && path.includes('/add-song') && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const playlistId = parseInt(path.split('/')[3]);
        const { songId } = await request.json();
        if (!playlists[decoded.email]) return new Response(JSON.stringify({ error: 'Playlist non trouvée' }), { status: 404, headers: corsHeaders });
        const playlist = playlists[decoded.email].find(p => p.id === playlistId);
        if (!playlist) return new Response(JSON.stringify({ error: 'Playlist non trouvée' }), { status: 404, headers: corsHeaders });
        if (!playlist.songs) playlist.songs = [];
        if (!playlist.songs.includes(songId)) playlist.songs.push(songId);
        return new Response(JSON.stringify({ success: true, playlist }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path.startsWith('/api/playlists/') && path.includes('/remove-song') && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const playlistId = parseInt(path.split('/')[3]);
        const { songId } = await request.json();
        if (!playlists[decoded.email]) return new Response(JSON.stringify({ error: 'Playlist non trouvée' }), { status: 404, headers: corsHeaders });
        const playlist = playlists[decoded.email].find(p => p.id === playlistId);
        if (!playlist) return new Response(JSON.stringify({ error: 'Playlist non trouvée' }), { status: 404, headers: corsHeaders });
        if (playlist.songs) playlist.songs = playlist.songs.filter(id => id !== songId);
        return new Response(JSON.stringify({ success: true, playlist }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== COMMENTAIRES ==========
    if (path === '/api/comments' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const { songId, content, parentId } = await request.json();
        if (!songId || !content) return new Response(JSON.stringify({ error: 'SongId et contenu requis' }), { status: 400, headers: corsHeaders });
        const userData = await env.TOKENS.get(decoded.email);
        const user = userData ? JSON.parse(userData) : { name: 'Utilisateur', profilePic: null };
        const commentId = Date.now();
        const newComment = {
          id: commentId,
          songId: parseInt(songId),
          userId: decoded.id || 1,
          userEmail: decoded.email,
          userName: user.name || decoded.email.split('@')[0],
          userProfilePic: user.profilePic || null,
          content,
          parentId: parentId || null,
          likes: 0,
          likedBy: [],
          createdAt: new Date().toISOString()
        };
        if (!comments[decoded.email]) comments[decoded.email] = [];
        comments[decoded.email].push(newComment);
        return new Response(JSON.stringify({ success: true, comment: newComment }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path === '/api/comments' && request.method === 'GET') {
      try {
        const urlParams = new URLSearchParams(url.search);
        const songId = urlParams.get('songId');
        if (!songId) return new Response(JSON.stringify({ error: 'SongId requis' }), { status: 400, headers: corsHeaders });
        const allComments = Object.values(comments).flat();
        const songComments = allComments.filter(c => c.songId === parseInt(songId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const commentMap = {};
        const rootComments = [];
        songComments.forEach(c => { commentMap[c.id] = { ...c, replies: [] }; });
        songComments.forEach(c => {
          if (c.parentId && commentMap[c.parentId]) {
            commentMap[c.parentId].replies.push(commentMap[c.id]);
          } else {
            rootComments.push(commentMap[c.id]);
          }
        });
        return new Response(JSON.stringify(rootComments), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path.startsWith('/api/comments/') && path.includes('/like') && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const commentId = parseInt(path.split('/')[3]);
        let foundComment = null;
        let foundUser = null;
        for (const [user, userComments] of Object.entries(comments)) {
          const comment = userComments.find(c => c.id === commentId);
          if (comment) { foundComment = comment; foundUser = user; break; }
        }
        if (!foundComment) return new Response(JSON.stringify({ error: 'Commentaire non trouvé' }), { status: 404, headers: corsHeaders });
        if (!foundComment.likedBy) foundComment.likedBy = [];
        const index = foundComment.likedBy.indexOf(decoded.email);
        if (index > -1) { foundComment.likedBy.splice(index, 1); foundComment.likes--; }
        else { foundComment.likedBy.push(decoded.email); foundComment.likes++; }
        const userComments = comments[foundUser] || [];
        const commentIndex = userComments.findIndex(c => c.id === commentId);
        if (commentIndex > -1) comments[foundUser][commentIndex] = foundComment;
        return new Response(JSON.stringify({ success: true, likes: foundComment.likes, liked: index === -1 }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path.startsWith('/api/comments/') && request.method === 'DELETE') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const commentId = parseInt(path.split('/').pop());
        let found = false;
        for (const [user, userComments] of Object.entries(comments)) {
          const index = userComments.findIndex(c => c.id === commentId);
          if (index > -1) {
            if (user === decoded.email || decoded.role === 'ADMIN') {
              userComments.splice(index, 1);
              comments[user] = userComments;
              found = true;
              break;
            } else {
              return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders });
            }
          }
        }
        if (!found) return new Response(JSON.stringify({ error: 'Commentaire non trouvé' }), { status: 404, headers: corsHeaders });
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== NOTIFICATIONS ==========
    if (path === '/api/notifications' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const userNotifications = notifications[decoded.email] || [];
        return new Response(JSON.stringify(userNotifications), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }
    if (path === '/api/notifications/read' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const { notificationId } = await request.json();
        if (!notifications[decoded.email]) return new Response(JSON.stringify({ error: 'Aucune notification' }), { status: 404, headers: corsHeaders });
        const notification = notifications[decoded.email].find(n => n.id === notificationId);
        if (notification) notification.read = true;
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== STATISTIQUES ==========
    if (path === '/api/stats/track-play' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        const { songId, duration, progress } = await request.json();
        if (!songId) return new Response(JSON.stringify({ error: 'SongId requis' }), { status: 400, headers: corsHeaders });
        if (!playHistory[decoded.email]) playHistory[decoded.email] = [];
        playHistory[decoded.email].push({ songId: parseInt(songId), duration: duration || 0, progress: progress || 0, listenedAt: new Date().toISOString() });
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== UTILISATEURS ==========
    if (path.startsWith('/api/users/') && request.method === 'GET') {
      try {
        const userId = parseInt(path.split('/').pop());
        let user = mockUsers.find(u => u.id === userId);
        if (!user) {
          const keys = await env.TOKENS.list();
          for (const key of keys.keys) {
            const value = await env.TOKENS.get(key.name);
            if (value) {
              const data = JSON.parse(value);
              if (data.id === userId) {
                user = {
                  id: data.id || 1,
                  name: data.name || 'Utilisateur',
                  email: key.name,
                  role: data.role || 'LISTENER',
                  profilePic: data.profilePic || null,
                  bio: data.bio || null,
                  country: data.country || null,
                  status: 'active',
                  createdAt: data.createdAt || new Date().toISOString()
                };
                break;
              }
            }
          }
        }
        if (!user) return new Response(JSON.stringify({ error: 'Utilisateur non trouvé' }), { status: 404, headers: corsHeaders });
        return new Response(JSON.stringify(user), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== ADMIN ==========
    if (path === '/api/admin/songs/pending' && request.method === 'GET') {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
    if (path === '/api/admin/artists' && request.method === 'GET') {
      return new Response(JSON.stringify(artistsList), { headers: corsHeaders });
    }
    if (path === '/api/admin/users' && request.method === 'GET') {
      return new Response(JSON.stringify(mockUsers), { headers: corsHeaders });
    }
    if (path === '/api/admin/songs/add' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET || 'secret');
        if (decoded.role !== 'ADMIN') return new Response(JSON.stringify({ error: 'Accès refusé' }), { status: 403, headers: corsHeaders });
        const formData = await request.formData();
        const title = formData.get('title');
        const artistId = formData.get('artistId');
        const genre = formData.get('genre') || 'Non spécifié';
        const description = formData.get('description') || '';
        const album = formData.get('album') || '';
        const audioFile = formData.get('audio');
        if (!title || !artistId || !audioFile) {
          return new Response(JSON.stringify({ error: 'Titre, artiste et fichier audio requis' }), { status: 400, headers: corsHeaders });
        }
        const artist = artistsList.find(a => a.id === parseInt(artistId));
        if (!artist) return new Response(JSON.stringify({ error: 'Artiste non trouvé' }), { status: 404, headers: corsHeaders });
        const newSong = {
          id: Date.now(),
          title,
          artistId: parseInt(artistId),
          artist: artist,
          genre,
          description,
          album: album || null,
          coverArt: "/images/albums/default.jpg",
          audioFile: `/audio/${artist.artistName.toLowerCase().replace(/\s+/g, '-')}/${title.replace(/\s+/g, '_')}.mp3`,
          status: 'ACCEPTED',
          isVerified: true,
          createdAt: new Date().toISOString(),
          _count: { favorites: 0 }
        };
        mockSongs.push(newSong);
        return new Response(JSON.stringify({ success: true, message: 'Musique ajoutée', song: newSong }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== CONTACT ==========
    if (path === '/api/contact' && request.method === 'POST') {
      try {
        const { name, email, category, message } = await request.json();
        await transporter.sendMail({
          from: '"SONIMUSIC Contact" <noreply@sonimusic.online>',
          to: 'contact@sonimusic.online',
          subject: `📩 Nouveau message - ${category}`,
          html: `<h1>📩 Nouveau message</h1><p><strong>Nom :</strong> ${name}</p><p><strong>Email :</strong> ${email}</p><p><strong>Message :</strong></p><p>${message}</p>`
        });
        return new Response(JSON.stringify({ success: true, message: 'Message envoyé' }), { headers: corsHeaders });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    // ========== HEALTH ==========
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'OK' }), { headers: corsHeaders });
    }

    // 404
    return new Response(JSON.stringify({ error: 'Route not found' }), { status: 404, headers: corsHeaders });
  }
};
