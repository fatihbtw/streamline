import React, { useState } from 'react';
import { X, Search, Download, ExternalLink, HardDrive, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .nzb-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 20px;
    backdrop-filter: blur(4px);
  }
  .nzb-modal {
    background: #0f0f1a; border: 1px solid #2a2a4e; border-radius: 16px;
    width: 100%; max-width: 760px; max-height: 85vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .nzb-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid #1a1a2e;
  }
  .nzb-title { font-family: 'Space Mono', monospace; font-size: 16px; font-weight: 700; color: #e8e8f0; }
  .nzb-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .nzb-close { background: none; border: none; color: #6b7280; cursor: pointer; padding: 4px; border-radius: 6px; }
  .nzb-close:hover { color: #e8e8f0; background: #1a1a2e; }
  .nzb-search-bar { padding: 16px 24px; border-bottom: 1px solid #1a1a2e; display: flex; gap: 10px; }
  .nzb-input {
    flex: 1; padding: 10px 14px; background: #1a1a2e; border: 1px solid #2a2a4e;
    border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none;
  }
  .nzb-input:focus { border-color: #6366f1; }
  .nzb-search-btn {
    padding: 10px 18px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  .nzb-search-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .nzb-results { flex: 1; overflow-y: auto; padding: 8px 0; }
  .nzb-empty { padding: 40px; text-align: center; color: #4b5563; font-size: 14px; }
  .nzb-error { padding: 20px 24px; display: flex; align-items: center; gap: 10px; color: #dc2626; font-size: 14px; background: rgba(239,68,68,0.05); }
  .nzb-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 24px;
    border-bottom: 1px solid #0f0f1a; transition: background 0.1s;
  }
  .nzb-row:hover { background: #1a1a2e; }
  .nzb-row-info { flex: 1; min-width: 0; }
  .nzb-row-title {
    font-size: 13px; color: #e8e8f0; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;
  }
  .nzb-row-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .nzb-meta-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280; }
  .nzb-send-btn {
    padding: 6px 12px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
    border-radius: 6px; color: #6366f1; font-size: 12px; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 5px;
    white-space: nowrap; transition: background 0.15s; flex-shrink: 0;
  }
  .nzb-send-btn:hover { background: rgba(99,102,241,0.3); }
  .nzb-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .nzb-send-btn.sent { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #10b981; }
  .nzb-footer { padding: 12px 24px; border-top: 1px solid #1a1a2e; font-size: 12px; color: #4b5563; }
`;

function fmtSize(bytes) {
  if (!bytes) return '?';
  const mb = Number(bytes) / 1024 / 1024;
  return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

function fmtDate(str) {
  if (!str) return '';
  try { return new Date(str).toLocaleDateString('de-DE'); } catch { return ''; }
}

function NzbRow({ item }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const sendToSab = async () => {
    if (!item.link) { toast.error('No download link available'); return; }
    setSending(true);
    try {
      await api.post('/downloads/send-nzb', { nzb_url: item.link });
      setSent(true);
      toast.success('Sent to SABnzbd!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Send failed — is SABnzbd configured?');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="nzb-row">
      <div className="nzb-row-info">
        <div className="nzb-row-title" title={item.title}>{item.title || '–'}</div>
        <div className="nzb-row-meta">
          {item.size && (
            <span className="nzb-meta-item"><HardDrive size={11} />{fmtSize(item.size)}</span>
          )}
          {item.pubDate && (
            <span className="nzb-meta-item"><Clock size={11} />{fmtDate(item.pubDate)}</span>
          )}
          {item.indexer && (
            <span className="nzb-meta-item" style={{background:'rgba(99,102,241,0.1)',padding:'1px 6px',borderRadius:'4px',color:'#6366f1'}}>{item.indexer}</span>
          )}
        </div>
      </div>
      <button className={`nzb-send-btn ${sent ? 'sent' : ''}`} onClick={sendToSab} disabled={sent || sending}>
        {sent ? '✓ Sent' : sending ? 'Sending...' : <><Download size={12} />SABnzbd</>}
      </button>
    </div>
  );
}

export default function NzbSearchModal({ title, mediaType, onClose }) {
  const [query, setQuery] = useState(title || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const cat = mediaType === 'movie' ? 'movie' : mediaType === 'series' ? 'tv' : undefined;
      const res = await api.get('/search/nzb', { params: { q: query, ...(cat && { cat }) } });
      setResults(res.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Suche fehlgeschlagen — Indexer in den Settings prüfen.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search on open if title provided
  React.useEffect(() => {
    if (title) doSearch();
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="nzb-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="nzb-modal">
          <div className="nzb-header">
            <div>
              <div className="nzb-title">NZB Search</div>
              <div className="nzb-subtitle">via NZBHydra2 / Newznab</div>
            </div>
            <button className="nzb-close" onClick={onClose}><X size={18} /></button>
          </div>

          <form className="nzb-search-bar" onSubmit={doSearch}>
            <input
              className="nzb-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search term..."
              autoFocus
            />
            <button className="nzb-search-btn" type="submit" disabled={loading || !query.trim()}>
              <Search size={14} />{loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="nzb-results">
            {error && (
              <div className="nzb-error">
                <AlertCircle size={16} />
                {error} — Configure NZBHydra2 in <a href="/settings" style={{ color: '#6366f1' }}>Settings</a> in Settings.
              </div>
            )}
            {!error && !loading && searched && results.length === 0 && (
              <div className="nzb-empty">No results for „{query}"</div>
            )}
            {!searched && !loading && (
              <div className="nzb-empty">Starting search...</div>
            )}
            {loading && <div className="nzb-empty">Searching...</div>}
            {results.map((item, i) => <NzbRow key={i} item={item} />)}
          </div>

          {results.length > 0 && (
            <div className="nzb-footer">{results.length} result{results.length !== 1 ? 'se' : ''} found</div>
          )}
        </div>
      </div>
    </>
  );
}
