import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Albums() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simuler des données
    setAlbums([
      { id: 1, title: 'Fii Siire', artist: 'Demba Tandia', type: 'album', year: '2024', cover: '/images/albums/fii-siire.jpg', tracks: 10 },
      { id: 2, title: 'Bataaxe', artist: 'Demba Tandia', type: 'album', year: '2023', cover: '/images/albums/bataaxe.jpg', tracks: 8 },
      { id: 3, title: 'Remme', artist: 'Demba Tandia', type: 'single', year: '2024', cover: '/images/albums/fii-siire-1.jpg', tracks: 1 },
    ]);
    setLoading(false);
  }, []);

  const filteredAlbums = filter === 'all' ? albums : albums.filter(a => a.type === filter);

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
          <h1 className="text-3xl font-bold text-white">💿 Albums</h1>
          <p className="text-gray-400 mt-2">Découvrez tous les albums, EP et singles</p>
        </div>

        {/* Filtres */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'all' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setFilter('album')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'album' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            💿 Albums
          </button>
          <button
            onClick={() => setFilter('ep')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'ep' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🎧 EP
          </button>
          <button
            onClick={() => setFilter('single')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'single' 
                ? 'bg-[#c9a25c] text-black' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🎵 Singles
          </button>
        </div>

        {/* Liste des albums */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="bg-gray-900/50 rounded-xl p-4 hover:bg-gray-800 transition-all group">
              <div className="relative">
                <img 
                  src={album.cover} 
                  alt={album.title}
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-lg">
                  <button className="bg-[#c9a25c] text-black w-12 h-12 rounded-full flex items-center justify-center text-2xl">
                    ▶
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-white font-semibold truncate">{album.title}</p>
                <p className="text-gray-400 text-sm truncate">{album.artist}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    album.type === 'album' ? 'bg-blue-500/20 text-blue-400' :
                    album.type === 'ep' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {album.type.toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-xs">{album.year}</span>
                  <span className="text-gray-500 text-xs">• {album.tracks} titres</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Albums;
