import React, { useState, useCallback } from 'react';
import { Search, Film, Tv, Plus, Check, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .search-header { margin-bottom: 28px; }
  .search-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; }
  .search-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
  .search-input-wrap { flex: 1; min-width: 240px; position: relative; }
  .search-input {
    width: 100%; padding: 12px 16px 12px 44px; background: #0f0f1a;
    border: 1px solid #1a1a2e; border-radius: 10px; color: #e8e8f0;
    font-size: 15px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s;
  }
  .search-input:focus { border-color: #6366f1; }
  .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #4b5563; }
  .type-select { padding: 12px 16px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 10px; color: #e8e8f0; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; cursor: pointer; }
  .search-btn { padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
  .search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .result-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
  .result-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #1a1a2e; display: block; }
  .result-poster-ph { width: 100%; aspect-ratio: 2/3; background: #1a1a2e; display: flex; align-items: center; justify-content: center; }
  .result-body { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .result-title { font-size: 13px; font-weight: 600; color: #e8e8f0; line-height: 1.3; }
  .result-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .result-year { font-size: 12px; color: #6b7280; }
  .result-rating { display: flex; align-items: center; gap: 3px; font-size: 12px; color: #f59e0b; }
  .result-type-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
  .type-movie { background: rgba(99,102,241,0.15); color: #6366f1; }
  .type-series { background: rgba(139,92,246,0.15); color: #8b5cf6; }
  .add-btn {
    margin-top: auto; padding: 8px; background: #1a1a2e; border: 1px solid #2a2a4e;
    border-radius: 8px; color: #6366f1; font-size: 13px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    font-family: 'DM Sans', sans-serif; transition: background 0.15s;
  }
  .add-btn:hover { background: rgba(99,102,241,0.2); }
  .add-btn.added { color: #10b981; cursor: default; }
  .quality-select { padding: 6px 10px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 6px; color: #e8e8f0; font-size: 12px; font-family: 'DM Sans', sans-serif; outline: none; margin-top: 4px; }
  .empty-state { text-align: center; padding: 60px 20px; color: #4b5563; }
  .empty-icon { margin: 0 auto 12px; opacity: 0.3; }
`;

function ResultCard({ item, onAdd }) {
  const [quality, setQuality] = useState('1080p');
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await api.post('/media', {
        type: item.type,
        title: item.title,
        tmdb_id: item.tmdb_id,
        year: item.year ? parseInt(item.year) : undefined,
        poster_url: item.poster_url,
        backdrop_url: item.backdrop_url,
        overview: item.overview,
        rating: item.rating,
        quality_profile: quality,
      });
      setAdded(true);
      toast.success(`"${item.title}" zur Mediathek hinzugefügt`);
      onAdd && onAdd(item);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('Bereits in der Mediathek');
        setAdded(true);
      } else {
        toast.error('Hinzufügen fehlgeschlagen');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="result-card">
      {item.poster_url
        ? <img src={item.poster_url} alt={item.title} className="result-poster" loading="lazy" />
        : <div className="result-poster-ph">{item.type === 'movie' ? <Film size={40} color="#2a2a4e" /> : <Tv size={40} color="#2a2a4e" />}</div>
      }
      <div className="result-body">
        <div className="result-title">{item.title}</div>
        <div className="result-meta">
          {item.year && <span className="result-year">{item.year}</span>}
          {item.rating > 0 && (
            <span className="result-rating"><Star size={11} fill="currentColor" />{item.rating.toFixed(1)}</span>
          )}
          <span className={`result-type-badge ${item.type === 'movie' ? 'type-movie' : 'type-series'}`}>
            {item.type === 'movie' ? 'Film' : 'Serie'}
          </span>
        </div>
        <select className="quality-select" value={quality} onChange={e => setQuality(e.target.value)} disabled={added}>
          <option>720p</option>
          <option>1080p</option>
          <option>2160p</option>
          <option>Any</option>
        </select>
        <button className={`add-btn ${added ? 'added' : ''}`} onClick={handleAdd} disabled={added || loading}>
          {added ? <><Check size={14} />Hinzugefügt</> : loading ? 'Wird hinzugefügt...' : <><Plus size={14} />Hinzufügen</>}
        </button>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('both');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/search/tmdb', { params: { q: query, type } });
      setResults(res.data.results || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Suche fehlgeschlagen');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="search-header">
        <div className="search-title">Suchen</div>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input className="search-input" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Filme oder Serien suchen..." />
        </div>
        <select className="type-select" value={type} onChange={e => setType(e.target.value)}>
          <option value="both">Alle</option>
          <option value="movie">Nur Filme</option>
          <option value="series">Nur Serien</option>
        </select>
        <button className="search-btn" type="submit" disabled={loading || !query.trim()}>
          {loading ? 'Suchen...' : 'Suchen'}
        </button>
      </form>

      {!searched ? (
        <div className="empty-state">
          <div className="empty-icon"><Search size={48} /></div>
          Gib einen Suchbegriff ein, um Filme und Serien zu finden
        </div>
      ) : loading ? (
        <div className="empty-state">Suche läuft...</div>
      ) : results.length === 0 ? (
        <div className="empty-state">Keine Ergebnisse für "{query}"</div>
      ) : (
        <div className="results-grid">
          {results.map(item => (
            <ResultCard key={`${item.type}-${item.tmdb_id}`} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
