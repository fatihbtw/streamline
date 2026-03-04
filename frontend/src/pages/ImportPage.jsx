import React, { useState } from 'react';
import { Search, Film, Tv, Plus, Check, Star, FolderOpen, AlertCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .import-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; margin-bottom: 6px; }
  .import-sub { font-size: 14px; color: #6b7280; margin-bottom: 28px; }
  .import-tabs { display: flex; gap: 4px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 10px; padding: 4px; margin-bottom: 28px; width: fit-content; }
  .tab-btn { padding: 8px 18px; border: none; border-radius: 7px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; background: none; color: #6b7280; }
  .tab-btn.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; }

  /* Manual import */
  .manual-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
  .manual-title { font-size: 15px; font-weight: 600; color: #e8e8f0; margin-bottom: 6px; }
  .manual-sub { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
  .import-search-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .import-input { flex: 1; min-width: 200px; padding: 10px 14px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; }
  .import-input:focus { border-color: #6366f1; }
  .type-toggle { display: flex; gap: 4px; }
  .type-btn { padding: 10px 14px; border: 1px solid #2a2a4e; border-radius: 8px; background: #1a1a2e; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .type-btn.active { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,0.1); }
  .import-btn { padding: 10px 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
  .import-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Results list */
  .result-list { display: flex; flex-direction: column; gap: 8px; }
  .result-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 10px; transition: border-color 0.15s; }
  .result-row:hover { border-color: #3a3a5e; }
  .result-thumb { width: 40px; height: 60px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #0f0f1a; }
  .result-thumb-ph { width: 40px; height: 60px; background: #0f0f1a; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .result-row-info { flex: 1; min-width: 0; }
  .result-row-title { font-size: 14px; font-weight: 600; color: #e8e8f0; margin-bottom: 3px; }
  .result-row-meta { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #6b7280; flex-wrap: wrap; }
  .result-row-overview { font-size: 12px; color: #4b5563; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 500px; }
  .row-type-badge { font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 500; }
  .badge-movie { background: rgba(99,102,241,0.15); color: #6366f1; }
  .badge-series { background: rgba(139,92,246,0.15); color: #8b5cf6; }
  .row-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .quality-sel { padding: 6px 10px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 6px; color: #e8e8f0; font-size: 12px; font-family: 'DM Sans', sans-serif; outline: none; }
  .status-sel { padding: 6px 10px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 6px; color: #e8e8f0; font-size: 12px; font-family: 'DM Sans', sans-serif; outline: none; }
  .add-row-btn { padding: 7px 14px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3); border-radius: 7px; color: #6366f1; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 5px; white-space: nowrap; transition: background 0.15s; }
  .add-row-btn:hover { background: rgba(99,102,241,0.2); }
  .add-row-btn.added { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; cursor: default; }

  /* Bulk import */
  .bulk-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
  .bulk-textarea { width: 100%; min-height: 160px; padding: 12px 14px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #e8e8f0; font-size: 13px; font-family: 'Space Mono', monospace; outline: none; resize: vertical; box-sizing: border-box; line-height: 1.6; }
  .bulk-textarea:focus { border-color: #6366f1; }
  .bulk-hint { font-size: 12px; color: #4b5563; margin-top: 8px; margin-bottom: 16px; line-height: 1.5; }
  .bulk-results { margin-top: 16px; display: flex; flex-direction: column; gap: 6px; }
  .bulk-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #1a1a2e; border-radius: 8px; font-size: 13px; }
  .bulk-row-title { flex: 1; color: #e8e8f0; }
  .bulk-status { font-size: 12px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
  .bulk-pending { background: rgba(234,179,8,0.1); color: #ca8a04; }
  .bulk-ok { background: rgba(34,197,94,0.1); color: #16a34a; }
  .bulk-err { background: rgba(239,68,68,0.1); color: #dc2626; }
  .bulk-skip { background: rgba(107,114,128,0.1); color: #6b7280; }

  .empty-hint { padding: 40px 20px; text-align: center; color: #4b5563; font-size: 14px; }
  .warn-box { display: flex; align-items: flex-start; gap: 10px; padding: 14px 16px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px; font-size: 13px; color: #d97706; margin-bottom: 16px; line-height: 1.5; }
`;

// ── Manual import (TMDB search → pick → add) ─────────────────────────────────
function ManualImport() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('both');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await api.get('/search/tmdb', { params: { q: query, type } });
      setResults(res.data.results || []);
    } catch { toast.error('Search failed'); setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="manual-card">
      <div className="manual-title">Search & Import</div>
      <div className="manual-sub">Search TMDB for any movie or TV show and add it with your preferred status — e.g. mark as already downloaded.</div>
      <form className="import-search-bar" onSubmit={doSearch}>
        <input className="import-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Title..." autoFocus />
        <div className="type-toggle">
          {[['both','All'],['movie','Movies'],['series','TV Shows']].map(([v,l]) => (
            <button key={v} type="button" className={`type-btn ${type === v ? 'active' : ''}`} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <button className="import-btn" type="submit" disabled={loading || !query.trim()}>
          <Search size={14} />{loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {!searched
        ? <div className="empty-hint"><FolderOpen size={40} style={{margin:'0 auto 10px',opacity:0.3,display:'block'}} />Search for titles to import them into your library</div>
        : loading ? <div className="empty-hint">Searching...</div>
        : results.length === 0 ? <div className="empty-hint">No results for "{query}"</div>
        : <div className="result-list">{results.map(r => <ImportResultRow key={`${r.type}-${r.tmdb_id}`} item={r} />)}</div>
      }
    </div>
  );
}

function ImportResultRow({ item }) {
  const [quality, setQuality] = useState('1080p');
  const [status, setStatus] = useState('wanted');
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await api.post('/media', {
        type: item.type, title: item.title, tmdb_id: item.tmdb_id,
        year: item.year ? parseInt(item.year) : undefined,
        poster_url: item.poster_url, backdrop_url: item.backdrop_url,
        overview: item.overview, rating: item.rating,
        quality_profile: quality, status,
      });
      setAdded(true);
      toast.success(`"${item.title}" imported (${status})`);
    } catch (err) {
      if (err.response?.status === 409) { toast.error('Already in library'); setAdded(true); }
      else toast.error('Import failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="result-row">
      {item.poster_url
        ? <img src={item.poster_url} alt={item.title} className="result-thumb" loading="lazy" />
        : <div className="result-thumb-ph">{item.type === 'movie' ? <Film size={18} color="#2a2a4e" /> : <Tv size={18} color="#2a2a4e" />}</div>}
      <div className="result-row-info">
        <div className="result-row-title">{item.title}</div>
        <div className="result-row-meta">
          {item.year && <span>{item.year}</span>}
          {item.rating > 0 && <span style={{display:'flex',alignItems:'center',gap:'3px'}}><Star size={11} color="#f59e0b" fill="#f59e0b" />{item.rating.toFixed(1)}</span>}
          <span className={`row-type-badge ${item.type === 'movie' ? 'badge-movie' : 'badge-series'}`}>{item.type === 'movie' ? 'Movie' : 'TV Show'}</span>
        </div>
        {item.overview && <div className="result-row-overview">{item.overview}</div>}
      </div>
      <div className="row-actions">
        <select className="quality-sel" value={quality} onChange={e => setQuality(e.target.value)} disabled={added}>
          <option>720p</option><option>1080p</option><option>2160p</option><option>Any</option>
        </select>
        <select className="status-sel" value={status} onChange={e => setStatus(e.target.value)} disabled={added}>
          <option value="wanted">Wanted</option>
          <option value="downloaded">Downloaded</option>
          <option value="missing">Missing</option>
        </select>
        <button className={`add-row-btn ${added ? 'added' : ''}`} onClick={handleAdd} disabled={added || loading}>
          {added ? <><Check size={13} />Imported</> : loading ? 'Adding...' : <><Plus size={13} />Import</>}
        </button>
      </div>
    </div>
  );
}

// ── Bulk import (paste list of titles) ───────────────────────────────────────
function BulkImport() {
  const [text, setText] = useState('');
  const [type, setType] = useState('movie');
  const [status, setStatus] = useState('downloaded');
  const [quality, setQuality] = useState('1080p');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const startImport = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error('No titles entered'); return; }

    setRunning(true);
    const out = lines.map(title => ({ title, status: 'pending' }));
    setResults([...out]);

    for (let i = 0; i < lines.length; i++) {
      const title = lines[i];
      try {
        // Search TMDB for best match
        const searchRes = await api.get('/search/tmdb', { params: { q: title, type } });
        const match = searchRes.data.results?.[0];
        if (!match) {
          out[i] = { title, status: 'not_found' };
          setResults([...out]);
          continue;
        }
        // Add to library
        await api.post('/media', {
          type: match.type, title: match.title, tmdb_id: match.tmdb_id,
          year: match.year ? parseInt(match.year) : undefined,
          poster_url: match.poster_url, overview: match.overview,
          rating: match.rating, quality_profile: quality, status,
        });
        out[i] = { title, matched: match.title, status: 'ok' };
      } catch (err) {
        out[i] = { title, status: err.response?.status === 409 ? 'duplicate' : 'error' };
      }
      setResults([...out]);
      // Small delay to avoid hammering API
      await new Promise(r => setTimeout(r, 300));
    }
    setRunning(false);
    const ok = out.filter(r => r.status === 'ok').length;
    toast.success(`Import complete — ${ok} of ${lines.length} added`);
  };

  const statusLabel = { pending: 'Pending', ok: 'Imported', not_found: 'Not found', duplicate: 'Already exists', error: 'Error' };
  const statusCls = { pending: 'bulk-pending', ok: 'bulk-ok', not_found: 'bulk-err', duplicate: 'bulk-skip', error: 'bulk-err' };

  return (
    <div className="bulk-card">
      <div className="manual-title">Bulk Import</div>
      <div className="manual-sub">Paste a list of titles (one per line). Streamline will match each against TMDB and add them automatically.</div>

      <div className="warn-box">
        <AlertCircle size={16} style={{flexShrink:0, marginTop:'1px'}} />
        The first TMDB result is used for each title. Review the matched names in the results below after import.
      </div>

      <textarea
        className="bulk-textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"Breaking Bad\nThe Wire\nThe Godfather\nInception\n..."}
        disabled={running}
      />
      <div className="bulk-hint">One title per line · Streaming-friendly names work best (e.g. "The Office US" instead of just "The Office")</div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="type-toggle">
          {[['movie','Movies'],['series','TV Shows']].map(([v,l]) => (
            <button key={v} type="button" className={`type-btn ${type === v ? 'active' : ''}`} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <select className="quality-sel" value={quality} onChange={e => setQuality(e.target.value)} disabled={running}>
          <option>720p</option><option>1080p</option><option>2160p</option><option>Any</option>
        </select>
        <select className="status-sel" value={status} onChange={e => setStatus(e.target.value)} disabled={running}>
          <option value="wanted">Wanted</option>
          <option value="downloaded">Downloaded</option>
          <option value="missing">Missing</option>
        </select>
        <button className="import-btn" onClick={startImport} disabled={running || !text.trim()}>
          <FolderOpen size={14} />{running ? `Importing... (${results.filter(r=>r.status!=='pending').length}/${results.length})` : 'Start Import'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bulk-results">
          {results.map((r, i) => (
            <div key={i} className="bulk-row">
              <ChevronRight size={14} color="#4b5563" style={{flexShrink:0}} />
              <div className="bulk-row-title">
                {r.title}
                {r.matched && r.matched !== r.title && <span style={{color:'#4b5563',marginLeft:'6px'}}>→ {r.matched}</span>}
              </div>
              <span className={`bulk-status ${statusCls[r.status]}`}>{statusLabel[r.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [tab, setTab] = useState('manual');

  return (
    <>
      <style>{styles}</style>
      <div className="import-title">Import</div>
      <div className="import-sub">Add existing movies and TV shows to your library — mark them as already downloaded, wanted, or missing.</div>
      <div className="import-tabs">
        <button className={`tab-btn ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>Manual Search</button>
        <button className={`tab-btn ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>Bulk Import</button>
      </div>
      {tab === 'manual' ? <ManualImport /> : <BulkImport />}
    </>
  );
}
