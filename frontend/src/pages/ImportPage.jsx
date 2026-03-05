import React, { useState, useCallback } from 'react';
import { Search, Film, Tv, Plus, Check, Star, FolderOpen, AlertCircle,
         ChevronRight, HardDrive, FileVideo, Loader, RefreshCw, CheckSquare,
         Square, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .import-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0;margin-bottom:6px; }
  .import-sub { font-size:14px;color:#6b7280;margin-bottom:28px; }
  .import-tabs { display:flex;gap:4px;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:10px;padding:4px;margin-bottom:28px;width:fit-content; }
  .tab-btn { padding:8px 18px;border:none;border-radius:7px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;background:none;color:#6b7280; }
  .tab-btn.active { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white; }

  /* ── Common card ── */
  .imp-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;padding:24px;margin-bottom:20px; }
  .imp-card-title { font-size:15px;font-weight:600;color:#e8e8f0;margin-bottom:6px; }
  .imp-card-sub { font-size:13px;color:#6b7280;margin-bottom:20px; }

  /* ── Search bar ── */
  .import-search-bar { display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap; }
  .import-input { flex:1;min-width:200px;padding:10px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:14px;font-family:'DM Sans',sans-serif;outline:none; }
  .import-input:focus { border-color:#6366f1; }
  .type-toggle { display:flex;gap:4px; }
  .type-btn { padding:10px 14px;border:1px solid #2a2a4e;border-radius:8px;background:#1a1a2e;color:#6b7280;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s; }
  .type-btn.active { border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,0.1); }
  .import-btn { padding:10px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap; }
  .import-btn:disabled { opacity:0.5;cursor:not-allowed; }

  /* ── Result rows ── */
  .result-list { display:flex;flex-direction:column;gap:8px; }
  .result-row { display:flex;align-items:center;gap:14px;padding:12px 16px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:10px;transition:border-color 0.15s; }
  .result-row:hover { border-color:#3a3a5e; }
  .result-thumb { width:40px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#0f0f1a; }
  .result-thumb-ph { width:40px;height:60px;background:#0f0f1a;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  .result-row-info { flex:1;min-width:0; }
  .result-row-title { font-size:14px;font-weight:600;color:#e8e8f0;margin-bottom:3px; }
  .result-row-meta { display:flex;align-items:center;gap:10px;font-size:12px;color:#6b7280;flex-wrap:wrap; }
  .result-row-overview { font-size:12px;color:#4b5563;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:500px; }
  .row-type-badge { font-size:11px;padding:2px 7px;border-radius:4px;font-weight:500; }
  .badge-movie { background:rgba(99,102,241,0.15);color:#6366f1; }
  .badge-series { background:rgba(139,92,246,0.15);color:#8b5cf6; }
  .row-actions { display:flex;align-items:center;gap:8px;flex-shrink:0; }
  .quality-sel { padding:6px 10px;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:6px;color:#e8e8f0;font-size:12px;font-family:'DM Sans',sans-serif;outline:none; }
  .status-sel { padding:6px 10px;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:6px;color:#e8e8f0;font-size:12px;font-family:'DM Sans',sans-serif;outline:none; }
  .add-row-btn { padding:7px 14px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:7px;color:#6366f1;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background 0.15s; }
  .add-row-btn:hover { background:rgba(99,102,241,0.2); }
  .add-row-btn.added { background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:#10b981;cursor:default; }

  /* ── Bulk import ── */
  .bulk-textarea { width:100%;min-height:160px;padding:12px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'Space Mono',monospace;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6; }
  .bulk-textarea:focus { border-color:#6366f1; }
  .bulk-hint { font-size:12px;color:#4b5563;margin-top:8px;margin-bottom:16px;line-height:1.5; }
  .bulk-results { margin-top:16px;display:flex;flex-direction:column;gap:6px; }
  .bulk-row { display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-radius:8px;font-size:13px; }
  .bulk-row-title { flex:1;color:#e8e8f0; }
  .bulk-status { font-size:12px;padding:2px 8px;border-radius:4px;font-weight:500; }
  .bulk-pending { background:rgba(234,179,8,0.1);color:#ca8a04; }
  .bulk-ok { background:rgba(34,197,94,0.1);color:#16a34a; }
  .bulk-err { background:rgba(239,68,68,0.1);color:#dc2626; }
  .bulk-skip { background:rgba(107,114,128,0.1);color:#6b7280; }

  /* ── Folder scan ── */
  .scan-path-bar { display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap; }
  .scan-path-input { flex:1;min-width:200px;padding:10px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'Space Mono',monospace;outline:none; }
  .scan-path-input:focus { border-color:#6366f1; }
  .scan-path-hint { font-size:12px;color:#4b5563;margin-bottom:16px; }
  .scan-results-header { display:flex;align-items:center;justify-content:space-between;padding:10px 0;margin-bottom:8px;border-bottom:1px solid #1a1a2e; }
  .scan-results-meta { font-size:13px;color:#6b7280; }
  .scan-action-bar { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
  .scan-sel-btn { padding:6px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:6px;color:#9ca3af;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px; }
  .scan-sel-btn:hover { color:#e8e8f0;border-color:#6366f1; }
  .scan-import-btn { padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px; }
  .scan-import-btn:disabled { opacity:0.5;cursor:not-allowed; }

  .scan-file-list { display:flex;flex-direction:column;gap:6px;max-height:480px;overflow-y:auto; }
  .scan-file-row {
    display:flex;align-items:flex-start;gap:12px;
    padding:12px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;
    transition:border-color 0.15s;
  }
  .scan-file-row.selected { border-color:rgba(99,102,241,0.4);background:rgba(99,102,241,0.04); }
  .scan-file-row.imported { opacity:0.5; }
  .scan-file-check { flex-shrink:0;margin-top:2px;cursor:pointer; }
  .scan-file-info { flex:1;min-width:0; }
  .scan-filename { font-size:12px;color:#4b5563;font-family:'Space Mono',monospace;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .scan-parsed { display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px; }
  .scan-parsed-title { font-size:13px;font-weight:600;color:#e8e8f0; }
  .scan-parsed-year { font-size:12px;color:#6b7280; }
  .scan-parsed-qual { font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(99,102,241,0.12);color:#6366f1;font-weight:500; }
  .scan-ep-badge { font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(139,92,246,0.12);color:#8b5cf6;font-weight:500; }
  .scan-file-size { font-size:11px;color:#4b5563;flex-shrink:0;white-space:nowrap;align-self:center; }
  .scan-file-selects { display:flex;gap:6px;flex-shrink:0;align-self:center; }
  .scan-sel-row-status { font-size:11px;padding:2px 7px;border-radius:4px;font-weight:600; }
  .scan-imported { background:rgba(16,185,129,0.1);color:#10b981; }
  .scan-err-badge { background:rgba(239,68,68,0.1);color:#dc2626;font-size:11px;padding:2px 6px;border-radius:4px; }

  .scan-title-edit { padding:5px 8px;background:#0f0f1a;border:1px solid #2a2a4e;border-radius:6px;color:#e8e8f0;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;min-width:160px; }
  .scan-title-edit:focus { border-color:#6366f1; }

  /* ── Misc ── */
  .empty-hint { padding:40px 20px;text-align:center;color:#4b5563;font-size:14px; }
  .warn-box { display:flex;align-items:flex-start;gap:10px;padding:14px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:13px;color:#d97706;margin-bottom:16px;line-height:1.5; }
`;

function fmtSize(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

// ── Manual import ─────────────────────────────────────────────────────────────
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
    } catch { toast.error('Suche fehlgeschlagen'); setResults([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="imp-card">
      <div className="imp-card-title">Suchen & Importieren</div>
      <div className="imp-card-sub">TMDB nach einem Film oder einer Serie durchsuchen und direkt mit gewünschtem Status hinzufügen.</div>
      <form className="import-search-bar" onSubmit={doSearch}>
        <input className="import-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Titel..." autoFocus />
        <div className="type-toggle">
          {[['both','Alle'],['movie','Filme'],['series','Serien']].map(([v,l]) => (
            <button key={v} type="button" className={`type-btn ${type === v ? 'active' : ''}`} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <button className="import-btn" type="submit" disabled={loading || !query.trim()}>
          <Search size={14} />{loading ? 'Sucht...' : 'Suchen'}
        </button>
      </form>
      {!searched
        ? <div className="empty-hint"><FolderOpen size={40} style={{margin:'0 auto 10px',opacity:0.3,display:'block'}} />Titel suchen um sie in die Bibliothek zu importieren</div>
        : loading ? <div className="empty-hint">Sucht...</div>
        : results.length === 0 ? <div className="empty-hint">Keine Ergebnisse für „{query}"</div>
        : <div className="result-list">{results.map(r => <ManualResultRow key={`${r.type}-${r.tmdb_id}`} item={r} />)}</div>
      }
    </div>
  );
}

function ManualResultRow({ item }) {
  const [quality, setQuality] = useState('1080p');
  const [status, setStatus] = useState('downloaded');
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      await api.post('/media', {
        type: item.type, title: item.title, tmdb_id: item.tmdb_id,
        original_title: item.original_title,
        year: item.year ? parseInt(item.year) : undefined,
        poster_url: item.poster_url, backdrop_url: item.backdrop_url,
        overview: item.overview, rating: item.rating,
        quality_profile: quality, status,
      });
      setAdded(true);
      toast.success(`„${item.title}" importiert (${status})`);
    } catch (err) {
      if (err.response?.status === 409) { toast.error('Bereits in der Bibliothek'); setAdded(true); }
      else toast.error('Import fehlgeschlagen');
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
          <span className={`row-type-badge ${item.type === 'movie' ? 'badge-movie' : 'badge-series'}`}>{item.type === 'movie' ? 'Film' : 'Serie'}</span>
        </div>
        {item.overview && <div className="result-row-overview">{item.overview}</div>}
      </div>
      <div className="row-actions">
        <select className="quality-sel" value={quality} onChange={e => setQuality(e.target.value)} disabled={added}>
          <option>720p</option><option>1080p</option><option>2160p</option><option>Any</option>
        </select>
        <select className="status-sel" value={status} onChange={e => setStatus(e.target.value)} disabled={added}>
          <option value="wanted">Wanted</option>
          <option value="downloaded">Vorhanden</option>
          <option value="missing">Fehlend</option>
        </select>
        <button className={`add-row-btn ${added ? 'added' : ''}`} onClick={handleAdd} disabled={added || loading}>
          {added ? <><Check size={13} />Importiert</> : loading ? 'Lädt...' : <><Plus size={13} />Import</>}
        </button>
      </div>
    </div>
  );
}

// ── Bulk import ───────────────────────────────────────────────────────────────
function BulkImport() {
  const [text, setText] = useState('');
  const [type, setType] = useState('movie');
  const [status, setStatus] = useState('downloaded');
  const [quality, setQuality] = useState('1080p');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);

  const startImport = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error('Keine Titel eingegeben'); return; }
    setRunning(true);
    const out = lines.map(title => ({ title, status: 'pending' }));
    setResults([...out]);

    for (let i = 0; i < lines.length; i++) {
      const title = lines[i];
      try {
        const searchRes = await api.get('/search/tmdb', { params: { q: title, type } });
        const match = searchRes.data.results?.[0];
        if (!match) { out[i] = { title, status: 'not_found' }; setResults([...out]); continue; }
        await api.post('/media', {
          type: match.type, title: match.title, tmdb_id: match.tmdb_id,
          original_title: match.original_title,
          year: match.year ? parseInt(match.year) : undefined,
          poster_url: match.poster_url, overview: match.overview,
          rating: match.rating, quality_profile: quality, status,
        });
        out[i] = { title, matched: match.title, status: 'ok' };
      } catch (err) {
        out[i] = { title, status: err.response?.status === 409 ? 'duplicate' : 'error' };
      }
      setResults([...out]);
      await new Promise(r => setTimeout(r, 300));
    }
    setRunning(false);
    const ok = out.filter(r => r.status === 'ok').length;
    toast.success(`Import abgeschlossen — ${ok} von ${lines.length} hinzugefügt`);
  };

  const statusLabel = { pending: 'Ausstehend', ok: 'Importiert', not_found: 'Nicht gefunden', duplicate: 'Bereits vorhanden', error: 'Fehler' };
  const statusCls = { pending: 'bulk-pending', ok: 'bulk-ok', not_found: 'bulk-err', duplicate: 'bulk-skip', error: 'bulk-err' };

  return (
    <div className="imp-card">
      <div className="imp-card-title">Massen-Import</div>
      <div className="imp-card-sub">Titelliste einfügen (ein Titel pro Zeile). Streamline sucht jeden Titel automatisch in TMDB und importiert ihn.</div>
      <div className="warn-box">
        <AlertCircle size={16} style={{flexShrink:0,marginTop:'1px'}} />
        Es wird jeweils das erste TMDB-Ergebnis verwendet. Die gematchten Namen bitte nach dem Import prüfen.
      </div>
      <textarea className="bulk-textarea" value={text} onChange={e => setText(e.target.value)}
        placeholder={"Breaking Bad\nThe Wire\nThe Godfather\nInception\n..."} disabled={running} />
      <div className="bulk-hint">Ein Titel pro Zeile · Englische Originaltitel liefern die besten Matches</div>
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
        <div className="type-toggle">
          {[['movie','Filme'],['series','Serien']].map(([v,l]) => (
            <button key={v} type="button" className={`type-btn ${type === v ? 'active' : ''}`} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>
        <select className="quality-sel" value={quality} onChange={e => setQuality(e.target.value)} disabled={running}>
          <option>720p</option><option>1080p</option><option>2160p</option><option>Any</option>
        </select>
        <select className="status-sel" value={status} onChange={e => setStatus(e.target.value)} disabled={running}>
          <option value="wanted">Wanted</option>
          <option value="downloaded">Vorhanden</option>
          <option value="missing">Fehlend</option>
        </select>
        <button className="import-btn" onClick={startImport} disabled={running || !text.trim()}>
          <FolderOpen size={14} />
          {running ? `Importiert... (${results.filter(r=>r.status!=='pending').length}/${results.length})` : 'Import starten'}
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

// ── Folder Scan ───────────────────────────────────────────────────────────────
function FolderScan() {
  const [scanPath, setScanPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [files, setFiles] = useState([]);
  const [scanMeta, setScanMeta] = useState(null);
  // Per-file state: title (editable), type, quality, status, selected, importStatus
  const [fileStates, setFileStates] = useState({});
  const [importing, setImporting] = useState(false);

  const updateFile = (idx, patch) => {
    setFileStates(prev => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));
  };

  const initFileStates = (files) => {
    const states = {};
    files.forEach((f, i) => {
      const isSeries = f.parsed.season !== null;
      states[i] = {
        title: f.parsed.title || f.filename,
        type: isSeries ? 'series' : 'movie',
        quality: f.parsed.quality || '1080p',
        status: 'downloaded',
        selected: true,
        importStatus: null, // null | 'ok' | 'duplicate' | 'error' | 'not_found'
      };
    });
    return states;
  };

  const doScan = async () => {
    if (!scanPath.trim()) return;
    setScanning(true);
    setFiles([]);
    setFileStates({});
    setScanMeta(null);
    try {
      const res = await api.post('/import/scan-folder', { path: scanPath.trim() });
      setFiles(res.data.files || []);
      setScanMeta({ total: res.data.totalFound, returned: res.data.returned, path: res.data.scanPath });
      setFileStates(initFileStates(res.data.files || []));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scan fehlgeschlagen');
    } finally { setScanning(false); }
  };

  const selectedIndices = Object.entries(fileStates)
    .filter(([, s]) => s.selected && !s.importStatus)
    .map(([i]) => parseInt(i));

  const toggleAll = () => {
    const allSelected = selectedIndices.length === files.filter((_, i) => !fileStates[i]?.importStatus).length;
    setFileStates(prev => {
      const next = { ...prev };
      files.forEach((_, i) => {
        if (!next[i]?.importStatus) next[i] = { ...next[i], selected: !allSelected };
      });
      return next;
    });
  };

  const doImport = async () => {
    if (!selectedIndices.length) return;
    setImporting(true);

    for (const idx of selectedIndices) {
      const f = files[idx];
      const s = fileStates[idx];
      if (!s.title.trim()) { updateFile(idx, { importStatus: 'error' }); continue; }

      try {
        // Search TMDB for best match
        const searchRes = await api.get('/search/tmdb', { params: { q: s.title, type: s.type } });
        const match = searchRes.data.results?.[0];
        if (!match) { updateFile(idx, { importStatus: 'not_found' }); continue; }

        await api.post('/media', {
          type: match.type,
          title: match.title,
          original_title: match.original_title,
          tmdb_id: match.tmdb_id,
          year: match.year ? parseInt(match.year) : undefined,
          poster_url: match.poster_url,
          backdrop_url: match.backdrop_url,
          overview: match.overview,
          rating: match.rating,
          quality_profile: s.quality,
          status: s.status,
          path: f.filePath,
        });
        updateFile(idx, { importStatus: 'ok', matchedTitle: match.title });
      } catch (err) {
        updateFile(idx, { importStatus: err.response?.status === 409 ? 'duplicate' : 'error' });
      }
      await new Promise(r => setTimeout(r, 250));
    }

    setImporting(false);
    const okCount = Object.values(fileStates).filter(s => s.importStatus === 'ok').length + selectedIndices.filter(i => fileStates[i].importStatus === 'ok').length;
    toast.success(`Import abgeschlossen`);
  };

  const importStatusBadge = (status) => {
    if (!status) return null;
    const map = {
      ok: ['scan-imported', 'Importiert'],
      duplicate: ['bulk-skip', 'Vorhanden'],
      not_found: ['bulk-err', 'Nicht gefunden'],
      error: ['bulk-err', 'Fehler'],
    };
    const [cls, label] = map[status] || ['', status];
    return <span className={`bulk-status ${cls}`}>{label}</span>;
  };

  return (
    <div className="imp-card">
      <div className="imp-card-title">Ordner scannen</div>
      <div className="imp-card-sub">
        Einen Ordner auf dem Server nach Videodateien durchsuchen. Streamline erkennt Titel automatisch anhand der Dateinamen
        und schlägt TMDB-Matches vor.
      </div>

      <div className="scan-path-bar">
        <input
          className="scan-path-input"
          value={scanPath}
          onChange={e => setScanPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doScan()}
          placeholder="/downloads/movies"
        />
        <button className="import-btn" onClick={doScan} disabled={scanning || !scanPath.trim()}>
          {scanning ? <Loader size={14} style={{animation:'spin 0.8s linear infinite'}} /> : <HardDrive size={14} />}
          {scanning ? 'Scannt...' : 'Ordner scannen'}
        </button>
      </div>
      <div className="scan-path-hint">
        Der Pfad bezieht sich auf das Dateisystem des Servers · Unterordner werden bis zu 4 Ebenen tief durchsucht · Unterstützte Formate: MKV, MP4, AVI, M4V, TS, ...
      </div>

      {scanMeta && (
        <div style={{marginBottom:'14px',fontSize:'13px',color:'#6b7280',display:'flex',alignItems:'center',gap:'8px'}}>
          <FileVideo size={14} />
          <span>
            <strong style={{color:'#e8e8f0'}}>{scanMeta.total}</strong> Dateien gefunden in <code style={{color:'#a5b4fc',fontSize:'11px'}}>{scanMeta.path}</code>
            {scanMeta.total > scanMeta.returned && <span style={{color:'#ca8a04'}}> · nur erste {scanMeta.returned} angezeigt</span>}
          </span>
        </div>
      )}

      {files.length > 0 && (
        <>
          <div className="scan-results-header">
            <div className="scan-results-meta">
              {selectedIndices.length} von {files.length} ausgewählt
            </div>
            <div className="scan-action-bar">
              <button className="scan-sel-btn" onClick={toggleAll}>
                <CheckCheck size={13} /> Alle {selectedIndices.length === files.length ? 'abwählen' : 'auswählen'}
              </button>
              <select
                className="quality-sel"
                disabled={importing}
                onChange={e => {
                  const q = e.target.value;
                  setFileStates(prev => {
                    const next = { ...prev };
                    selectedIndices.forEach(i => { next[i] = { ...next[i], quality: q }; });
                    return next;
                  });
                }}
              >
                <option value="">Qualität alle</option>
                {['720p','1080p','2160p','Any'].map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <button className="scan-import-btn" onClick={doImport} disabled={importing || !selectedIndices.length}>
                {importing
                  ? <><Loader size={13} style={{animation:'spin 0.8s linear infinite'}} /> Importiert...</>
                  : <><Plus size={13} /> {selectedIndices.length} Importieren</>
                }
              </button>
            </div>
          </div>

          <div className="scan-file-list">
            {files.map((f, idx) => {
              const s = fileStates[idx] || {};
              const done = !!s.importStatus;
              return (
                <div key={idx} className={`scan-file-row ${s.selected && !done ? 'selected' : ''} ${done ? 'imported' : ''}`}>
                  <div className="scan-file-check" onClick={() => !done && updateFile(idx, { selected: !s.selected })}>
                    {done
                      ? importStatusBadge(s.importStatus)
                      : s.selected
                        ? <CheckSquare size={16} color="#6366f1" />
                        : <Square size={16} color="#4b5563" />
                    }
                  </div>
                  <div className="scan-file-info">
                    <div className="scan-filename" title={f.relativePath}>{f.relativePath}</div>
                    <div className="scan-parsed">
                      <input
                        className="scan-title-edit"
                        value={s.title || ''}
                        onChange={e => updateFile(idx, { title: e.target.value })}
                        disabled={done || importing}
                        title="Erkannter Titel — klicken zum Bearbeiten"
                      />
                      {f.parsed.year && <span className="scan-parsed-year">{f.parsed.year}</span>}
                      {f.parsed.quality && <span className="scan-parsed-qual">{f.parsed.quality}</span>}
                      {f.parsed.season !== null && (
                        <span className="scan-ep-badge">S{String(f.parsed.season).padStart(2,'0')}E{String(f.parsed.episode).padStart(2,'0')}</span>
                      )}
                      {s.matchedTitle && s.matchedTitle !== s.title && (
                        <span style={{fontSize:'11px',color:'#4b5563'}}>→ {s.matchedTitle}</span>
                      )}
                    </div>
                  </div>
                  <div className="scan-file-selects">
                    <select className="quality-sel" value={s.quality || '1080p'} onChange={e => updateFile(idx, { quality: e.target.value })} disabled={done || importing}>
                      {['720p','1080p','2160p','Any'].map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <select className="type-btn" value={s.type || 'movie'} onChange={e => updateFile(idx, { type: e.target.value })} disabled={done || importing}
                      style={{padding:'5px 8px',borderRadius:'6px',background:'#0f0f1a',border:'1px solid #1a1a2e',color:'#9ca3af',fontSize:'12px',fontFamily:"'DM Sans',sans-serif",outline:'none'}}>
                      <option value="movie">Film</option>
                      <option value="series">Serie</option>
                    </select>
                  </div>
                  {f.size > 0 && <div className="scan-file-size">{fmtSize(f.size)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!scanning && files.length === 0 && scanMeta !== null && (
        <div className="empty-hint">
          <FileVideo size={36} style={{margin:'0 auto 10px',opacity:0.3,display:'block'}} />
          Keine Videodateien in diesem Ordner gefunden
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const [tab, setTab] = useState('manual');

  return (
    <>
      <style>{styles}</style>
      <div className="import-title">Importieren</div>
      <div className="import-sub">Vorhandene Filme und Serien zur Bibliothek hinzufügen — manuell, als Liste oder direkt vom Server-Ordner.</div>
      <div className="import-tabs">
        <button className={`tab-btn ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>Manuelle Suche</button>
        <button className={`tab-btn ${tab === 'bulk' ? 'active' : ''}`} onClick={() => setTab('bulk')}>Massen-Import</button>
        <button className={`tab-btn ${tab === 'folder' ? 'active' : ''}`} onClick={() => setTab('folder')}>Ordner scannen</button>
      </div>
      {tab === 'manual' && <ManualImport />}
      {tab === 'bulk' && <BulkImport />}
      {tab === 'folder' && <FolderScan />}
    </>
  );
}
