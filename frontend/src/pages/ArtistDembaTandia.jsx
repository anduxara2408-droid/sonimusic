import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function ArtistDembaTandia() {
  const navigate = useNavigate();
  const [allSongs, setAllSongs] = useState([]);

  // Albums et chansons avec les vrais titres
  const albums = [
    {
      title: 'Fii Siire',
      year: '2024',
      cover: '/images/albums/fii-siire.jpg',
      songs: [
        { title: 'Kankan', duration: '6:20', file: '/audio/demba-tandia/Fii_Siire_1.mp3', cover: '/images/albums/fii-siire-1.jpg' },
        { title: 'Fii Sire', duration: '5:34', file: '/audio/demba-tandia/Fii_Siire_2.mp3', cover: '/images/albums/fii-siire-2.jpg' },
        { title: 'Fakoly', duration: '7:13', file: '/audio/demba-tandia/Fii_Siire_3.mp3', cover: '/images/albums/fii-siire-3.jpg' },
        { title: 'Kannijo', duration: '5:49', file: '/audio/demba-tandia/Fii_Siire_4.mp3', cover: '/images/albums/fii-siire-4.jpg' },
        { title: 'Daaru bara', duration: '5:24', file: '/audio/demba-tandia/Fii_Siire_5.mp3', cover: '/images/albums/fii-siire-5.jpg' },
        { title: 'Sanpaxa', duration: '6:30', file: '/audio/demba-tandia/Fii_Siire_6.mp3', cover: '/images/albums/fii-siire-6.jpg' },
        { title: 'Daaru', duration: '3:36', file: '/audio/demba-tandia/Fii_Siire_7.mp3', cover: '/images/albums/fii-siire-7.jpg' },
        { title: 'Fanne', duration: '6:09', file: '/audio/demba-tandia/Fii_Siire_8.mp3', cover: '/images/albums/fii-siire-8.jpg' },
        { title: 'Banban Sire', duration: '4:38', file: '/audio/demba-tandia/Fii_Siire_9.mp3', cover: '/images/albums/fii-siire-9.jpg' },
        { title: 'Yaxare', duration: '4:46', file: '/audio/demba-tandia/Fii_Siire_10.mp3', cover: '/images/albums/fii-siire-10.jpg' }
      ]
    },
    {
      title: 'Bataaxe',
      year: '2023',
      cover: '/images/albums/bataaxe.jpg',
      songs: [
        { title: 'Daaru', duration: '4:06', file: '/audio/demba-tandia/Bataaxe_1.mp3', cover: '/images/albums/bataaxe-1.jpg' },
        { title: 'Daamandalle', duration: '3:39', file: '/audio/demba-tandia/Bataaxe_2.mp3', cover: '/images/albums/bataaxe-2.jpg' },
        { title: 'Rensire', duration: '6:25', file: '/audio/demba-tandia/Bataaxe_3.mp3', cover: '/images/albums/bataaxe-3.jpg' },
        { title: 'Wuye', duration: '3:09', file: '/audio/demba-tandia/Bataaxe_4.mp3', cover: '/images/albums/bataaxe-4.jpg' },
        { title: 'Kodoore', duration: '6:41', file: '/audio/demba-tandia/Bataaxe_5.mp3', cover: '/images/albums/bataaxe-5.jpg' },
        { title: 'Kunppa', duration: '3:47', file: '/audio/demba-tandia/Bataaxe_6.mp3', cover: '/images/albums/bataaxe-6.jpg' },
        { title: 'Ñaxa vol 2', duration: '3:51', file: '/audio/demba-tandia/Bataaxe_7.mp3', cover: '/images/albums/bataaxe-7.jpg' },
        { title: 'Soobe', duration: '3:51', file: '/audio/demba-tandia/Bataaxe_8.mp3', cover: '/images/albums/bataaxe-8.jpg' }
      ]
    }
  ];

  useEffect(() => {
    const all = [];
    albums.forEach(album => {
      album.songs.forEach(song => {
        all.push({ ...song, album: album.title });
      });
    });
    setAllSongs(all);
  }, []);

  const playSong = (song, index) => {
    navigate('/player', { 
      state: { 
        song: song, 
        index: index, 
        allSongs: allSongs 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0b0a] p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto">
        
        {/* ===== EN-TÊTE ARTISTE ===== */}
        <div className="bg-gray-900/50 rounded-2xl p-6 md:p-8 mb-8 border border-gray-800/50">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <img 
              src="/images/demba-tandia.jpg" 
              alt="Demba Tandia"
              className="w-48 h-48 rounded-full object-cover border-4 border-[#c9a25c]"
            />
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white">Demba Tandia</h1>
              <p className="text-[#c9a25c] text-lg">Artiste Chanteur Soninké</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-[#c9a25c]/20 text-[#c9a25c] px-3 py-1 rounded-full text-sm">152k abonnés</span>
                <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">54.8M vues</span>
                <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">France</span>
              </div>
              <p className="text-gray-400 mt-4">
                Chanteur Soninké, auteur de nombreux titres et albums. 
                Connu pour ses chansons traditionnelles et modernes.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <a href="https://web.facebook.com/demba.tandia74" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">Facebook</a>
                <a href="https://instagram.com/dembatandia1" target="_blank" rel="noopener" className="text-pink-400 hover:text-pink-300">Instagram</a>
                <a href="https://open.spotify.com/artist/1FJSQnwKlvPgI5KPEPMPJo" target="_blank" rel="noopener" className="text-green-400 hover:text-green-300">Spotify</a>
                <a href="https://tiktok.com/@demba.tandia" target="_blank" rel="noopener" className="text-gray-400 hover:text-white">TikTok</a>
                <a href="https://www.youtube.com/@Demba.Tandia" target="_blank" rel="noopener" className="text-red-400 hover:text-red-300">YouTube</a>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ALBUMS ===== */}
        {albums.map((album, idx) => (
          <div key={idx} className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <img 
                src={album.cover} 
                alt={album.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div>
                <h2 className="text-2xl font-bold text-white">{album.title}</h2>
                <p className="text-gray-400">{album.year} • {album.songs.length} titres</p>
              </div>
            </div>
            <div className="bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800/30">
              {album.songs.map((song, index) => {
                const globalIndex = allSongs.indexOf(song);
                return (
                  <div 
                    key={index}
                    className={`flex items-center justify-between py-3 px-4 hover:bg-gray-800/50 transition-all cursor-pointer ${
                      index !== album.songs.length - 1 ? 'border-b border-gray-800/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="text-gray-500 text-sm w-6 text-center">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-white">
                          {song.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-gray-500 text-xs">{song.duration}</span>
                      <button
                        onClick={() => playSong(song, globalIndex)}
                        className="text-white hover:text-[#c9a25c] transition-all text-sm"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ArtistDembaTandia;
