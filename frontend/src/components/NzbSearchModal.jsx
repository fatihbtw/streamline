import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Download, AlertCircle, ChevronUp, ChevronDown, Filter, Clock, HardDrive, Rss } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .nzb-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px); }
  .nzb-modal { background:#0f0f1a;border:1px solid #2a2a4e;border-radius:16px;width:100%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden; }
  .nzb-header { display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #1a1a2e; }
  .nzb-title { font-family:'Space Mono',monospace;font-size:15px;font-weight:700;color:#e8e8f0; }
  .nzb-subtitle { font-size:12px;color:#6b7280;margin-top:2px; }
  .nzb-close { background:none;border:none;color:#6b7280;cursor:pointer;padding:4px;border-radius:6px; }
  .nzb-close:hover { color:#e8e8f0;background:#1a1a2e; }

  .nzb-toolbar { padding:12px 24px;border-bottom:1px solid #1a1a2e;display:flex;gap:10px;flex-wrap:wrap;align-items:center; }
  .nzb-input { flex:1;min-width:200px;padding:9px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:14px;font-family:'DM Sans',sans-serif;outline:none; }
  .nzb-input:focus { border-color:#6366f1; }
  .nzb-search-btn { padding:9px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap; }
  .nzb-search-btn:disabled { opacity:0.6;cursor:not-allowed; }
  .filter-group { display:flex;align-items:center;gap:6px;font-size:13px;color:#6b7280;margin-left:auto; }
  .filter-select { padding:7px 10px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:6px;color:#e8e8f0;font-size:12px;font-family:'DM Sans',sans-serif;outline:none; }

  /* Table */
  .nzb-table-wrap { flex:1;overflow:auto; }
  .nzb-table { width:100%;border-collapse:collapse;font-size:13px; }
  .nzb-table th { padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1a1a2e;white-space:nowrap;cursor:pointer;user-select:none;background:#0f0f1a;position:sticky;top:0;z-index:1; }
  .nzb-table th:hover { color:#e8e8f0; }
  .nzb-table th.sorted { color:#6366f1; }
  .nzb-table td { padding:9px 12px;border-bottom:1px solid #0d0d18;vertical-align:middle; }
  .nzb-table tr:hover td { background:#131320; }

  .col-source { width:50px; }
  .col-age { width:80px;white-space:nowrap; }
  .col-title { min-width:280px; }
  .col-indexer { width:120px; }
  .col-size { width:80px;white-space:nowrap; }
  .col-peers { width:60px;text-align:center; }
  .col-lang { width:90px; }
  .col-quality { width:110px; }
  .col-score { width:70px;text-align:center; }
  .col-action { width:90px;text-align:right; }

  .source-badge { display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase; }
  .source-nzb { background:rgba(99,102,241,0.2);color:#6366f1; }
  .source-torrent { background:rgba(16,185,129,0.2);color:#10b981; }

  .title-text { color:#d1d5db;line-height:1.3;word-break:break-word; }
  .title-text a { color:#6366f1;text-decoration:none; }
  .title-text a:hover { text-decoration:underline; }

  .age-text { color:#9ca3af; }
  .indexer-text { color:#9ca3af;font-size:12px; }
  .size-text { color:#9ca3af; }
  .peers-text { color:#9ca3af;text-align:center; }

  .lang-badge { display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;background:rgba(99,102,241,0.1);color:#818cf8; }
  .quality-badge { display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap; }
  .q-remux { background:rgba(139,92,246,0.2);color:#a78bfa; }
  .q-2160p { background:rgba(16,185,129,0.2);color:#34d399; }
  .q-1080p { background:rgba(99,102,241,0.2);color:#6366f1; }
  .q-720p { background:rgba(245,158,11,0.2);color:#fbbf24; }
  .q-other { background:rgba(107,114,128,0.15);color:#9ca3af; }

  .score-pos { color:#10b981;font-weight:700;font-family:'Space Mono',monospace; }
  .score-neg { color:#ef4444;font-weight:700;font-family:'Space Mono',monospace; }
  .score-zero { color:#6b7280;font-family:'Space Mono',monospace; }

  .grab-btn { padding:5px 12px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:6px;color:#6366f1;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;white-space:nowrap;transition:background 0.15s;margin-left:auto; }
  .grab-btn:hover { background:rgba(99,102,241,0.25); }
  .grab-btn.grabbed { background:rgba(16,185,129,0.1);border-color:rgba(16,185,129,0.3);color:#10b981;cursor:default; }
  .grab-btn:disabled { opacity:0.5;cursor:not-allowed; }

  .nzb-footer { padding:10px 24px;border-top:1px solid #1a1a2e;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#4b5563; }
  .nzb-empty { padding:40px;text-align:center;color:#4b5563;font-size:14px; }
  .nzb-error { padding:16px 24px;display:flex;align-items:center;gap:10px;color:#dc2626;font-size:14px;background:rgba(239,68,68,0.05); }

  .sort-icon { display:inline-block;margin-left:4px;opacity:0.5;vertical-align:middle; }
  .sorted .sort-icon { opacity:1; }
`;

function fmtSize(bytes) {
  if (!bytes) return '–';
  const mb = Number(bytes) / 1024 / 1024;
  return mb > 1024 ? `${(mb / 1024).toFixed(1)} GiB` : `${Math.round(mb)} MiB`;
}

function fmtAge(days) {
  if (days === null || days === undefined) return '–';
  if (days < 1) return '< 1 day';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

function qualityClass(q) {
  if (!q) return 'q-other';
  const l = q.toLowerCase();
  if (l.includes('remux')) return 'q-remux';
  if (l.includes('2160') || l.includes('4k')) return 'q-2160p';
  if (l.includes('1080')) return 'q-1080p';
  if (l.includes('720')) return 'q-720p';
  return 'q-other';
}

function GrabBtn({ item }) {
  const [grabbed, setGrabbed] = useState(false);
  const [loading, setLoading] = useState(false);
  const grab = async () => {
    if (!item.link) { toast.error('No download link'); return; }
    setLoading(true);
    try {
      await api.post('/downloads/send-nzb', { nzb_url: item.link });
      setGrabbed(true);
      toast.success('Sent to SABnzbd!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Send failed');
    } finally { setLoading(false); }
  };
  return (
    <button className={`grab-btn ${grabbed ? 'grabbed' : ''}`} onClick={grab} disabled={grabbed || loading}>
      {grabbed ? '✓ Grabbed' : loading ? '...' : <><Download size={12} />Grab</>}
    </button>
  );
}

const SORT_FIELDS = ['agedays','size','score','peers'];

export default function NzbSearchModal({ title, mediaType, onClose }) {
  const [query, setQuery] = useState(title || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [customFormats, setCustomFormats] = useState([]);

  // Load custom formats for scoring
  useEffect(() => {
    api.get('/settings/custom-formats').then(r => setCustomFormats(r.data.formats || [])).catch(() => {});
  }, []);

  const applyCustomFormats = useCallback((items) => {
    if (!customFormats.length) return items;
    return items.map(item => {
      let bonus = 0;
      for (const cf of customFormats) {
        const t = item.title.toLowerCase();
        const matches = (cf.conditions || []).every(cond => {
          const val = (cond.value || '').toLowerCase();
          const hit = t.includes(val);
          return cond.negate ? !hit : hit;
        });
        if (matches) bonus += (cf.score || 0);
      }
      return { ...item, score: (item.score || 0) + bonus, cfBonus: bonus };
    });
  }, [customFormats]);

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setSearched(true);
    try {
      const cat = mediaType === 'movie' ? 'movie' : mediaType === 'series' ? 'tv' : undefined;
      const res = await api.get('/search/nzb', { params: { q: query, ...(cat && { cat }) } });
      setResults(applyCustomFormats(res.data.results || []));
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (title) doSearch(); }, []);

  // Re-apply custom formats when they load
  useEffect(() => {
    if (results.length) setResults(prev => applyCustomFormats(prev));
  }, [customFormats]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const displayed = results
    .filter(r => !filterQuality || r.quality === filterQuality)
    .filter(r => !filterLang || r.language === filterLang)
    .sort((a, b) => {
      const av = a[sortBy] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      const bv = b[sortBy] ?? (sortDir === 'desc' ? -Infinity : Infinity);
      return sortDir === 'desc' ? bv - av : av - bv;
    });

  const qualities = [...new Set(results.map(r => r.quality).filter(Boolean))];
  const langs = [...new Set(results.map(r => r.language).filter(Boolean))];

  const SortTh = ({ field, label, className }) => (
    <th className={`${className || ''} ${sortBy === field ? 'sorted' : ''}`} onClick={() => handleSort(field)}>
      {label}
      <span className="sort-icon">
        {sortBy === field ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : <ChevronDown size={12} />}
      </span>
    </th>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="nzb-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="nzb-modal">
          <div className="nzb-header">
            <div>
              <div className="nzb-title">Interactive Search — {title}</div>
              <div className="nzb-subtitle">via Newznab / NZBHydra2{customFormats.length > 0 ? ` · ${customFormats.length} custom format${customFormats.length !== 1 ? 's' : ''} active` : ''}</div>
            </div>
            <button className="nzb-close" onClick={onClose}><X size={18} /></button>
          </div>

          <div className="nzb-toolbar">
            <input className="nzb-input" value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Search term..." />
            <button className="nzb-search-btn" onClick={doSearch} disabled={loading || !query.trim()}>
              <Search size={14} />{loading ? 'Searching...' : 'Search'}
            </button>
            {results.length > 0 && (
              <div className="filter-group">
                <Filter size={13} />
                {qualities.length > 1 && (
                  <select className="filter-select" value={filterQuality} onChange={e => setFilterQuality(e.target.value)}>
                    <option value="">All Quality</option>
                    {qualities.map(q => <option key={q}>{q}</option>)}
                  </select>
                )}
                {langs.length > 1 && (
                  <select className="filter-select" value={filterLang} onChange={e => setFilterLang(e.target.value)}>
                    <option value="">All Languages</option>
                    {langs.map(l => <option key={l}>{l}</option>)}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="nzb-table-wrap">
            {error && <div className="nzb-error"><AlertCircle size={16} />{error} — Configure an indexer in <a href="/settings" style={{color:'#6366f1'}}>Settings</a>.</div>}
            {!searched && !loading && <div className="nzb-empty">Enter a search term to find releases</div>}
            {loading && <div className="nzb-empty">Searching...</div>}
            {searched && !loading && !error && displayed.length === 0 && <div className="nzb-empty">No results found for "{query}"</div>}
            {displayed.length > 0 && (
              <table className="nzb-table">
                <thead>
                  <tr>
                    <th className="col-source">Source</th>
                    <SortTh field="agedays" label="Age" className="col-age" />
                    <th className="col-title">Title</th>
                    <th className="col-indexer">Indexer</th>
                    <SortTh field="size" label="Size" className="col-size" />
                    <SortTh field="peers" label="Peers" className="col-peers" />
                    <th className="col-lang">Language</th>
                    <th className="col-quality">Quality</th>
                    <SortTh field="score" label="Score" className="col-score" />
                    <th className="col-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((item, i) => (
                    <tr key={i}>
                      <td><span className="source-badge source-nzb">nzb</span></td>
                      <td className="age-text">{fmtAge(item.agedays)}</td>
                      <td><div className="title-text">{item.title}</div></td>
                      <td className="indexer-text">{item.indexer}</td>
                      <td className="size-text">{fmtSize(item.size)}</td>
                      <td className="peers-text">{item.peers ?? '–'}</td>
                      <td>{item.language ? <span className="lang-badge">{item.language}</span> : <span style={{color:'#4b5563'}}>–</span>}</td>
                      <td>{item.quality ? <span className={`quality-badge ${qualityClass(item.quality)}`}>{item.quality}</span> : <span style={{color:'#4b5563'}}>–</span>}</td>
                      <td>
                        <span className={item.score > 0 ? 'score-pos' : item.score < 0 ? 'score-neg' : 'score-zero'}>
                          {item.score > 0 ? '+' : ''}{item.score ?? 0}
                        </span>
                      </td>
                      <td><GrabBtn item={item} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="nzb-footer">
            <span>{displayed.length} result{displayed.length !== 1 ? 's' : ''}{results.length !== displayed.length ? ` (${results.length} total)` : ''}</span>
            <span>Sort: {sortBy} {sortDir}</span>
          </div>
        </div>
      </div>
    </>
  );
}
