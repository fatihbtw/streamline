import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Shuffle, Plus, Star, Film, Tv, TrendingUp, Award, Flame, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .discover-header { margin-bottom: 32px; }
  .discover-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; }
  .discover-sub { font-size: 14px; color: #6b7280; margin-top: 4px; }

  .discover-controls { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; align-items: center; }
  .category-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .tab-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 500; cursor: pointer;
    border: 1px solid #2a2a4e; background: #0f0f1a; color: #6b7280;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .tab-btn:hover { color: #e8e8f0; border-color: #3a3a6e; }
  .tab-btn.active { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #6366f1; }

  .type-toggle { display: flex; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 8px; overflow: hidden; }
  .type-btn { padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; background: none; color: #6b7280; display: flex; align-items: center; gap: 6px; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
  .type-btn.active { background: rgba(99,102,241,0.15); color: #6366f1; }

  .shuffle-btn {
    margin-left: auto;
    display: flex; align-items: center; gap: 8px;
    padding: 8px 18px; border-radius: 8px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none; color: white; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: opacity 0.15s;
  }
  .shuffle-btn:hover { opacity: 0.85; }
  .shuffle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .shuffle-btn svg.spinning { animation: spin 0.6s linear infinite; }

  .discover-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
  }

  .disc-card {
    background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px;
    overflow: hidden; position: relative; cursor: default;
    transition: transform 0.2s, border-color 0.2s;
    animation: fadeSlideIn 0.35s ease both;
  }
  .disc-card:hover { transform: translateY(-3px); border-color: #3a3a6e; }
  .disc-card:hover .card-overlay { opacity: 1; }

  .disc-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; background: #1a1a2e; }
  .disc-poster-placeholder {
    width: 100%; aspect-ratio: 2/3; background: #1a1a2e;
    display: flex; align-items: center; justify-content: center;
    color: #2a2a4e;
  }

  .card-overlay {
    position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,10,15,0.95) 40%, transparent 100%);
    opacity: 0; transition: opacity 0.2s;
    display: flex; flex-direction: column; justify-content: flex-end; padding: 14px;
  }
  .card-overlay-always { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,10,15,0.85) 30%, transparent 70%); display: flex; flex-direction: column; justify-content: flex-end; padding: 12px; }

  .card-title { font-size: 12px; font-weight: 600; color: #e8e8f0; line-height: 1.3; margin-bottom: 4px; }
  .card-meta { font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 6px; }
  .card-rating { display: flex; align-items: center; gap: 3px; color: #f59e0b; font-size: 11px; font-weight: 600; }
  .card-rating svg { width: 10px; height: 10px; }

  .add-btn {
    margin-top: 8px; width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 7px 10px; border-radius: 6px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none; color: white; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: opacity 0.15s;
  }
  .add-btn:hover { opacity: 0.85; }
  .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .add-btn.added { background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #10b981; }

  .shimmer-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px; overflow: hidden; }
  .shimmer-poster {
    width: 100%; aspect-ratio: 2/3;
    background: linear-gradient(90deg, #1a1a2e 0%, #2a2a4e 50%, #1a1a2e 100%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
  }
  .shimmer-info { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
  .shimmer-line { height: 10px; border-radius: 4px; background: linear-gradient(90deg, #1a1a2e 0%, #2a2a4e 50%, #1a1a2e 100%); background-size: 400px 100%; animation: shimmer 1.4s ease infinite; }

  .empty-discover { text-align: center; padding: 60px 20px; color: #4b5563; }
  .empty-discover-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.4; }
  .empty-discover p { font-size: 14px; line-height: 1.6; }
  .empty-discover a { color: #6366f1; text-decoration: none; }
  .empty-discover a:hover { text-decoration: underline; }

  @media (max-width: 640px) {
    .discover-controls { flex-direction: column; align-items: stretch; }
    .shuffle-btn { margin-left: 0; justify-content: center; }
    .discover-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
  }
`;

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'popular', label: 'Beliebt', icon: TrendingUp },
  { id: 'top_rated', label: 'Top Bewertet', icon: Award },
];

function ShimmerCard() {
  return (
    <div className="shimmer-card">
      <div className="shimmer-poster" />
      <div className="shimmer-info">
        <div className="shimmer-line" style={{ width: '80%' }} />
        <div className="shimmer-line" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

function DiscoverCard({ item, onAdd, inLibrary }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(inLibrary);

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (added || adding) return;
    setAdding(true);
    try {
      await api.post('/media', {
        type: item.type,
        title: item.title,
        year: item.year,
        tmdb_id: item.tmdb_id,
        overview: item.overview,
        poster_url: item.poster_url,
        backdrop_url: item.backdrop_url,
      });
      setAdded(true);
      toast.success(`"${item.title}" zur Bibliothek hinzugefügt`);
      if (onAdd) onAdd(item);
    } catch (err) {
      if (err.response?.status === 409) {
        setAdded(true);
        toast('Bereits in der Bibliothek', { icon: 'ℹ️' });
      } else {
        toast.error('Hinzufügen fehlgeschlagen');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="disc-card" style={{ animationDelay: `${Math.random() * 0.15}s` }}>
      {item.poster_url
        ? <img src={item.poster_url} alt={item.title} className="disc-poster" loading="lazy" />
        : (
          <div className="disc-poster-placeholder">
            {item.type === 'series' ? <Tv size={36} /> : <Film size={36} />}
          </div>
        )
      }
      <div className="card-overlay-always">
        <div className="card-title">{item.title}</div>
        <div className="card-meta">
          <span>{item.year || '—'}</span>
          {item.rating > 0 && (
            <span className="card-rating">
              <Star fill="#f59e0b" /> {item.rating?.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div className="card-overlay">
        <div className="card-title">{item.title}</div>
        <div className="card-meta">
          <span>{item.year || '—'}</span>
          {item.rating > 0 && (
            <span className="card-rating">
              <Star fill="#f59e0b" /> {item.rating?.toFixed(1)}
            </span>
          )}
        </div>
        {item.overview && (
          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px', lineHeight: '1.4',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.overview}
          </p>
        )}
        <button
          className={`add-btn ${added ? 'added' : ''}`}
          onClick={handleAdd}
          disabled={adding}
        >
          {adding
            ? <Loader size={12} className="spinning" style={{ animation: 'spin 0.6s linear infinite' }} />
            : added
              ? <><CheckCircle size={12} /> In Bibliothek</>
              : <><Plus size={12} /> Hinzufügen</>
          }
        </button>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shuffling, setShuffling] = useState(false);
  const [category, setCategory] = useState('trending');
  const [mediaType, setMediaType] = useState('both');
  const [libraryIds, setLibraryIds] = useState(new Set());
  const [noApiKey, setNoApiKey] = useState(false);
  const [error, setError] = useState(null);

  // Load library tmdb_ids to mark already-added items
  useEffect(() => {
    api.get('/media?limit=500').then(r => {
      const ids = new Set(r.data.items.map(i => i.tmdb_id).filter(Boolean));
      setLibraryIds(ids);
    }).catch(() => {});
  }, []);

  const fetchDiscover = useCallback(async (cat, type, animate = false) => {
    if (animate) setShuffling(true);
    setLoading(true);
    setNoApiKey(false);
    setError(null);
    try {
      const res = await api.get('/discover', { params: { category: cat, type } });
      setItems(res.data.results || []);
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error || '';
      if (status === 503 || errMsg.toLowerCase().includes('key')) {
        setNoApiKey(true);
        setItems([]);
      } else if (!err.response) {
        // Network error — backend not reachable
        setError('Server nicht erreichbar. Ist das Backend gestartet?');
        setItems([]);
      } else {
        setError(`Fehler ${status || ''}: ${errMsg || 'Discover konnte nicht geladen werden'}`);
        setItems([]);
      }
    } finally {
      setLoading(false);
      setShuffling(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscover(category, mediaType);
  }, [category, mediaType, fetchDiscover]);

  const handleShuffle = () => {
    fetchDiscover(category, mediaType, true);
  };

  // useMemo to avoid mutating state array on every render
  const displayed = useMemo(() => {
    if (!items.length) return [];
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, 24);
  }, [items]);

  return (
    <>
      <style>{styles}</style>
      <div className="discover-header">
        <div className="discover-title">Entdecken</div>
        <div className="discover-sub">Zufällige Empfehlungen für Filme & Serien</div>
      </div>

      <div className="discover-controls">
        <div className="type-toggle">
          <button className={`type-btn ${mediaType === 'both' ? 'active' : ''}`} onClick={() => setMediaType('both')}>
            Alle
          </button>
          <button className={`type-btn ${mediaType === 'movie' ? 'active' : ''}`} onClick={() => setMediaType('movie')}>
            <Film size={13} /> Filme
          </button>
          <button className={`type-btn ${mediaType === 'series' ? 'active' : ''}`} onClick={() => setMediaType('series')}>
            <Tv size={13} /> Serien
          </button>
        </div>

        <div className="category-tabs">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`tab-btn ${category === id ? 'active' : ''}`}
              onClick={() => setCategory(id)}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <button className="shuffle-btn" onClick={handleShuffle} disabled={loading || shuffling}>
          <Shuffle size={14} className={shuffling ? 'spinning' : ''} />
          {shuffling ? 'Lädt...' : 'Neu mischen'}
        </button>
      </div>

      {noApiKey ? (
        <div className="empty-discover">
          <div className="empty-discover-icon">🔑</div>
          <p>
            Kein TMDB API-Key konfiguriert.<br />
            Bitte zuerst einen Key in den{' '}
            <a href="/settings">Einstellungen</a> hinterlegen.
          </p>
        </div>
      ) : error ? (
        <div className="empty-discover">
          <div className="empty-discover-icon">⚠️</div>
          <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
          <button
            onClick={() => fetchDiscover(category, mediaType)}
            style={{
              padding: '9px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      ) : loading ? (
        <div className="discover-grid">
          {Array.from({ length: 18 }).map((_, i) => <ShimmerCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-discover">
          <div className="empty-discover-icon">🎬</div>
          <p>Keine Ergebnisse gefunden.<br />Versuche eine andere Kategorie.</p>
        </div>
      ) : (
        <div className="discover-grid">
          {displayed.map((item, i) => (
            <DiscoverCard
              key={`${item.tmdb_id}-${i}`}
              item={item}
              inLibrary={libraryIds.has(item.tmdb_id)}
              onAdd={(added) => setLibraryIds(prev => new Set([...prev, added.tmdb_id]))}
            />
          ))}
        </div>
      )}
    </>
  );
}
