import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    songs: [],
    artists: [],
    albums: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (query.length > 2) {
      performSearch();
    } else {
      setResults({ songs: [], artists: [], albums: [] });
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Simuler une recherche (à remplacer par l'API réelle)
      const mockResults = {
        songs: [
          { id: 1, title: 'Kankan', artist: 'Demba Tandia', cover: '/images/demba-tandia.jpg' },
          { id: 2, title: 'Fii Sire', artist: 'Demba Tandia', cover: '/images/demba-tandia.jpg' },
        ],
        artists: [
          { id: 1, name: 'Demba Tandia', genre: 'Soninké', image: '/images/demba-tandia.jpg' },
        ],
        albums: [
          { id: 1, title: 'Fii Siire', artist: 'Demba Tandia', cover: '/images/albums/fii-siire.jpg' },
          { id: 2, title: 'Bataaxe', artist: 'Demba Tandia', cover: '/images/albums/bataaxe.jpg' },
        ]
      };
      setResults(mockResults);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return results;
    }
    return { [activeTab]: results[activeTab] || [] };
  };

  const filtered = getFilteredResults();

  return (
    <div className="min-h-screen bg-[#0c0b0a] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Barre de recherche */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Rechercher un artiste, un morceau, un album..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-6 py-4 bg-gray-900/50 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:border-[#c9a25c] outline-none text-lg"
            />
            {loading && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-[#c9a25c] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {query.length > 0 && query.length <= 2 && (
            <p className="text-gray-400 text-sm mt-2">🔤 Tapez au moins 3 caractères</p>
          )}
        </div>

        {/* Résultats */}
        {query.length > 2 && (
          <>
            {/* Onglets */}
            <div className="flex gap-4 border-b border-gray-800 mb-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-3 px-4 font-medium transition-all ${
                  activeTab === 'all' 
                    ? 'text-[#c9a25c] border-b-2 border-[#c9a25c]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setActiveTab('songs')}
                className={`pb-3 px-4 font-medium transition-all ${
                  activeTab === 'songs' 
                    ? 'text-[#c9a25c] border-b-2 border-[#c9a25c]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Musiques ({results.songs.length})
              </button>
              <button
                onClick={() => setActiveTab('artists')}
                className={`pb-3 px-4 font-medium transition-all ${
                  activeTab === 'artists' 
                    ? 'text-[#c9a25c] border-b-2 border-[#c9a25c]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Artistes ({results.artists.length})
              </button>
              <button
                onClick={() => setActiveTab('albums')}
                className={`pb-3 px-4 font-medium transition-all ${
                  activeTab === 'albums' 
                    ? 'text-[#c9a25c] border-b-2 border-[#c9a25c]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Albums ({results.albums.length})
              </button>
            </div>

            {/* Résultats */}
            <div className="space-y-6">
              {activeTab === 'all' || activeTab === 'songs' ? (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">🎵 Musiques</h3>
                  {results.songs.length === 0 ? (
                    <p className="text-gray-400">Aucune musique trouvée</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.songs.map((song) => (
                        <div key={song.id} className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800 transition-all flex items-center gap-4">
                          <img src={song.cover} alt={song.title} className="w-12 h-12 rounded object-cover" />
                          <div>
                            <p className="text-white font-medium">{song.title}</p>
                            <p className="text-gray-400 text-sm">{song.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'all' || activeTab === 'artists' ? (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">👤 Artistes</h3>
                  {results.artists.length === 0 ? (
                    <p className="text-gray-400">Aucun artiste trouvé</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {results.artists.map((artist) => (
                        <Link key={artist.id} to={`/artist/${artist.id}`} className="text-center group">
                          <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 ring-2 ring-gray-700 group-hover:ring-[#c9a25c] transition-all overflow-hidden">
                            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-white text-sm font-medium mt-2">{artist.name}</p>
                          <p className="text-gray-400 text-xs">{artist.genre}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'all' || activeTab === 'albums' ? (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">💿 Albums</h3>
                  {results.albums.length === 0 ? (
                    <p className="text-gray-400">Aucun album trouvé</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {results.albums.map((album) => (
                        <div key={album.id} className="bg-gray-800/50 rounded-xl p-4 hover:bg-gray-800 transition-all text-center">
                          <img src={album.cover} alt={album.title} className="w-full aspect-square object-cover rounded-lg mb-2" />
                          <p className="text-white font-medium text-sm">{album.title}</p>
                          <p className="text-gray-400 text-xs">{album.artist}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Search;
