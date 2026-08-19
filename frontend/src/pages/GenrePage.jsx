import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

function GenrePage() {
  const { genre } = useParams();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, [genre]);

  const fetchSongs = async () => {
    try {
      const response = await axios.get('https://sonimusic-1.onrender.com/api/songs');
      const filtered = response.data.filter(song => 
        song.genre?.toLowerCase() === genre?.toLowerCase()
      );
      setSongs(filtered);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  // Playlists fictives pour l'exemple
  const playlists = [
    { name: `${genre} Hits 2025`, tracks: 50, fans: 438137 },
    { name: `${genre} Ambiance`, tracks: 80, fans: 42365 },
    { name: `${genre} Chill`, tracks: 100, fans: 305 },
    { name: `${genre} Workout`, tracks: 50, fans: 245886 },
    { name: `${genre} Love`, tracks: 50, fans: 4529 },
    { name: `${genre} Party`, tracks: 70, fans: 244308 },
  ];

  // Artistes fictifs
  const artists = [
    { name: 'Artiste 1', fans: 167479 },
    { name: 'Artiste 2', fans: 201540 },
    { name: 'Artiste 3', fans: 239504 },
    { name: 'Artiste 4', fans: 99322 },
    { name: 'Artiste 5', fans: 143696 },
    { name: 'Artiste 6', fans: 173801 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ===== SIDEBAR GAUCHE ===== */}
      <div className="hidden md:flex flex-col w-56 bg-[#121212] border-r border-gray-800 p-4 min-h-screen sticky top-0 overflow-y-auto fixed left-0 top-0 z-30">
        <div className="flex items-center gap-2 mb-6">
          <img src="/images/logo-sonimusic.png" alt="SONIMUSIC" className="w-8 h-8" />
          <span className="text-lg font-bold text-[#d4af37]">SONIMUSIC</span>
        </div>

        <nav className="space-y-1 mb-6">
          <Link to="/" className="flex items-center gap-3 py-2 px-3 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all">
            <span className="text-lg">🏠</span> Accueil
          </Link>
          <Link to="/discover" className="flex items-center gap-3 py-2 px-3 bg-gray-800/50 rounded-lg text-white font-medium">
            <span className="text-lg">🔍</span> Découvrir
          </Link>
          <Link to="/library" className="flex items-center gap-3 py-2 px-3 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all">
            <span className="text-lg">📚</span> Bibliothèque
          </Link>
        </nav>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Playlists</p>
          <button className="flex items-center gap-3 py-2 px-3 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all w-full text-left">
            <span className="text-lg text-[#d4af37]">➕</span> Créer une playlist
          </button>
          <Link to="/favorites" className="flex items-center gap-3 py-2 px-3 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all">
            <span className="text-lg">❤️</span> Titres likés
          </Link>
        </div>

        <div className="border-t border-gray-800 pt-4 mt-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">Genres</p>
          {['Afrobeat', 'Jazz', 'Pop', 'RnB', 'Hip-Hop', 'Soul', 'Reggae', 'Folk'].map((g) => (
            <Link 
              key={g}
              to={`/genre/${g.toLowerCase()}`}
              className={`flex items-center gap-3 py-1.5 px-3 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all text-sm ${genre?.toLowerCase() === g.toLowerCase() ? 'bg-gray-800/50 text-white' : ''}`}
            >
              🎵 {g}
            </Link>
          ))}
        </div>
      </div>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div className="md:ml-56 p-6 pb-28">
        
        {/* ===== EN-TÊTE ===== */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">
            {genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : 'Musique'}
          </h1>
          <span className="text-sm text-gray-400">{songs.length} titres</span>
        </div>

        {/* ===== SECTION : PLAYLISTS POPULAIRES ===== */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">🎧 Playlists les plus écoutées</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {playlists.map((playlist, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-all cursor-pointer group">
                <div className="aspect-square bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 rounded-lg flex items-center justify-center mb-2 relative">
                  <span className="text-3xl">🎵</span>
                  <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-3xl rounded-lg">
                    ▶
                  </button>
                </div>
                <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                <p className="text-gray-400 text-xs">{playlist.tracks} titres</p>
                <p className="text-[#d4af37] text-xs">{playlist.fans.toLocaleString()} fans</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SECTION : AMBIANCES ===== */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">🌴 Ambiances {genre}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {playlists.slice(0, 6).map((playlist, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition-all cursor-pointer group">
                <div className="aspect-square bg-gradient-to-br from-[#d4af37]/20 to-[#d4af37]/5 rounded-lg flex items-center justify-center mb-2 relative">
                  <span className="text-3xl">🎵</span>
                  <button className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-3xl rounded-lg">
                    ▶
                  </button>
                </div>
                <p className="text-white text-sm font-medium truncate">{playlist.name}</p>
                <p className="text-gray-400 text-xs">{playlist.tracks} titres</p>
                <p className="text-[#d4af37] text-xs">{playlist.fans.toLocaleString()} fans</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SECTION : ARTISTES POPULAIRES ===== */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">⭐ Artistes populaires</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {artists.map((artist, index) => (
              <div key={index} className="text-center cursor-pointer group">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 flex items-center justify-center ring-2 ring-gray-700 group-hover:ring-[#d4af37] transition-all">
                  <span className="text-3xl">👤</span>
                </div>
                <p className="text-white text-sm font-medium mt-2 truncate">{artist.name}</p>
                <p className="text-[#d4af37] text-xs">{artist.fans.toLocaleString()} fans</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SECTION : TOUTES LES MUSIQUES ===== */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">🎵 Tous les titres</h2>
          <div className="bg-gray-900/30 rounded-xl overflow-hidden">
            {songs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>Aucune musique dans ce genre pour le moment.</p>
              </div>
            ) : (
              songs.map((song, index) => (
                <div 
                  key={song.id} 
                  className={`flex items-center justify-between py-2 px-3 hover:bg-gray-800/50 transition-all cursor-pointer ${index !== songs.length - 1 ? 'border-b border-gray-800/30' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-gray-500 text-xs w-5 text-center">{index + 1}</span>
                    <img 
                      src={song.coverArt ? `https://sonimusic-1.onrender.com/${song.coverArt}` : '/images/logo-sonimusic.png'} 
                      alt={song.title}
                      className="w-8 h-8 object-cover rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{song.title}</p>
                      <p className="text-gray-400 text-xs truncate">
                        {song.artist?.artistName || song.artist?.name || 'Artiste'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-gray-500 text-xs hidden sm:block">{song.genre || '—'}</span>
                    <button className="text-white hover:text-[#d4af37] transition-all text-sm">
                      ▶
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ===== LECTEUR EN BAS ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 px-4 py-3 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center">
              <span className="text-lg">🎵</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">Chanson en cours</p>
              <p className="text-gray-400 text-xs truncate">Artiste</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button className="text-gray-400 hover:text-white text-sm">⏮</button>
            <button className="bg-[#d4af37] text-black w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all text-sm">
              ▶
            </button>
            <button className="text-gray-400 hover:text-white text-sm">⏭</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenrePage;
