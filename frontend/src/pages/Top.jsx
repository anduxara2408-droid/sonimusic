import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Top() {
  const [topSongs, setTopSongs] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler des données
    setTopSongs([
      { id: 1, title: 'Kankan', artist: 'Demba Tandia', plays: 1542, cover: '/images/demba-tandia.jpg' },
      { id: 2, title: 'Fii Sire', artist: 'Demba Tandia', plays: 1234, cover: '/images/demba-tandia.jpg' },
      { id: 3, title: 'Fakoly', artist: 'Demba Tandia', plays: 987, cover: '/images/demba-tandia.jpg' },
      { id: 4, title: 'Kannijo', artist: 'Demba Tandia', plays: 876, cover: '/images/demba-tandia.jpg' },
      { id: 5, title: 'Daaru bara', artist: 'Demba Tandia', plays: 765, cover: '/images/demba-tandia.jpg' },
    ]);
    setTopArtists([
      { id: 1, name: 'Demba Tandia', genre: 'Soninké', plays: 5432, image: '/images/demba-tandia.jpg' },
    ]);
    setLoading(false);
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b0a] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🏆 Top SONIMUSIC</h1>
          <p className="text-gray-400 mt-2">Les morceaux et artistes les plus écoutés</p>
        </div>

        {/* Période */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setPeriod('week')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              period === 'week' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Cette semaine
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              period === 'month' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Ce mois
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              period === 'all' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Tous les temps
          </button>
        </div>

        {/* Top Morceaux */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">🎵 Top Morceaux</h2>
          <div className="bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800/50">
            {topSongs.map((song, index) => (
              <div 
                key={song.id}
                className={`flex items-center justify-between py-3 px-6 hover:bg-gray-800/50 transition-all ${
                  index !== topSongs.length - 1 ? 'border-b border-gray-800/30' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className={`text-lg font-bold w-8 text-center ${
                    index === 0 ? 'text-[#c9a25c]' : 'text-gray-500'
                  }`}>
                    #{index + 1}
                  </span>
                  <img src={song.cover} alt={song.title} className="w-12 h-12 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{song.title}</p>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-gray-500 text-sm">▶️ {song.plays}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Artistes */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">⭐ Top Artistes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {topArtists.map((artist) => (
              <Link key={artist.id} to={`/artist/${artist.id}`} className="bg-gray-900/50 rounded-xl p-6 text-center hover:bg-gray-800 transition-all border border-gray-800/50">
                <div className="w-24 h-24 mx-auto rounded-full bg-gray-800 ring-2 ring-gray-700 overflow-hidden">
                  <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-white font-semibold mt-3">{artist.name}</p>
                <p className="text-gray-400 text-sm">{artist.genre}</p>
                <p className="text-[#c9a25c] text-sm mt-1">▶️ {artist.plays} écoutes</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Top;
