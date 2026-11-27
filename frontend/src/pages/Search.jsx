import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import api from '../lib/api';
import { ArtistCard, SectionTitle, SongCard, SongRow } from '../components/SongItems';

const Search = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') || '';
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latest, setLatest] = useState([]);

  useEffect(() => { setQuery(params.get('q') || ''); }, [params]);

  useEffect(() => {
    api.get('/api/charts/new').then(({ data }) => setLatest(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return undefined; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/api/search', { params: { q } })
        .then(({ data }) => setResults(data))
        .catch(() => setResults({ songs: [], artists: [] }))
        .finally(() => setLoading(false));
      setParams(q ? { q } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <h1 className="text-3xl font-black text-white">Rechercher</h1>
      <div className="relative mt-5">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Titre, artiste…"
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 pl-12 pr-12 text-base text-white placeholder-gray-500 outline-none focus:border-amber-500/60"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" aria-label="Effacer"><X className="h-5 w-5" /></button>
        )}
      </div>

      {results === null ? (
        <section className="mt-10">
          <SectionTitle title="Derniers titres" subtitle="Tape au moins 2 lettres pour rechercher" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {latest.slice(0, 10).map((s) => <SongCard key={s.id} song={s} list={latest} />)}
          </div>
        </section>
      ) : loading && !results.songs ? (
        <p className="mt-8 text-sm text-gray-500">Recherche…</p>
      ) : results.songs.length === 0 && results.artists.length === 0 ? (
        <p className="mt-10 text-center text-gray-400">Aucun résultat pour « {query} ».</p>
      ) : (
        <>
          {results.artists.length > 0 && (
            <section className="mt-8">
              <SectionTitle title="Artistes" />
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {results.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}
          {results.songs.length > 0 && (
            <section className="mt-8">
              <SectionTitle title="Titres" />
              {results.songs.map((s) => <SongRow key={s.id} song={s} list={results.songs} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default Search;
