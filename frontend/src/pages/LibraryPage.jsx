import React, { useState, useEffect } from 'react';
import { Film, Tv, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .lib-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .lib-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; }
  .lib-filters { display: flex; gap: 10px; flex-wrap: wrap; }
  .filter-btn { padding: 7px 14px; border-radius: 8px; border: 1px solid #1a1a2e; background: #0f0f1a; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .filter-btn.active { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,0.1); }
  .lib-search { position: relative; }
  .lib-search-input { padding: 8px 12px 8px 36px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 8px; color: #e8e8f0; font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; width: 220px; }
  .lib-search-input:focus { border-color: #6366f1; }
  .lib-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #4b5563; }
  .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
  .media-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 10px; overflow: hidden; position: relative; }
  .media-card:hover .card-actions { opacity: 1; }
  .media-poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; }
  .media-poster-ph { width: 100%; aspect-ratio: 2/3; background: #1a1a2e; display: flex; align-items: center; justify-content: center; }
  .card-actions { position: absolute; top: 6px; right: 6px; opacity: 0; transition: opacity 0.15s; display: flex; gap: 4px; }
  .action-btn { width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .delete-btn { background: rgba(239,68,68,0.9); color: white; }
  .media-info { padding: 10px; }
  .media-title-text { font-size: 12px; font-weight: 500; color: #e8e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .media-meta-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
  .meta-year { font-size: 11px; color: #6b7280; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .dot-wanted { background: #ca8a04; }
  .dot-downloaded { background: #16a34a; }
  .dot-downloading { background: #6366f1; }
  .dot-missing { background: #dc2626; }
  .status-text { font-size: 11px; color: #6b7280; }
  .empty-state { text-align: center; padding: 60px 20px; color: #4b5563; }
`;

const STATUS_DOT = { wanted: 'dot-wanted', downloaded: 'dot-downloaded', downloading: 'dot-downloading', missing: 'dot-missing' };

export default function LibraryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    const params = {};
    if (typeFilter !== 'all') params.type = typeFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    api.get('/media', { params }).then(r => setItems(r.data.items)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); load(); }, [typeFilter, statusFilter, search]);

  const handleDelete = async (e, id, title) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`"${title}" wirklich entfernen?`)) return;
    try {
      await api.delete(`/media/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Entfernt');
    } catch { toast.error('Fehler beim Entfernen'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lib-header">
        <div className="lib-title">Mediathek</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className="lib-search">
            <Search size={14} className="lib-search-icon" />
            <input className="lib-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." />
          </div>
        </div>
      </div>

      <div className="lib-filters" style={{ marginBottom: '20px' }}>
        {['all', 'movie', 'series'].map(t => (
          <button key={t} className={`filter-btn ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'all' ? 'Alle' : t === 'movie' ? 'Filme' : 'Serien'}
          </button>
        ))}
        <div style={{ width: '1px', background: '#1a1a2e', margin: '0 4px' }} />
        {['all', 'wanted', 'downloading', 'downloaded', 'missing'].map(s => (
          <button key={s} className={`filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'Alle Status' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">Lade...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">Keine Medien gefunden</div>
      ) : (
        <div className="media-grid">
          {items.map(item => (
            <Link key={item.id} to={`/library/${item.id}`} className="media-card" style={{ textDecoration: 'none' }}>
              {item.poster_url
                ? <img src={item.poster_url} alt={item.title} className="media-poster" loading="lazy" />
                : <div className="media-poster-ph">{item.type === 'movie' ? <Film size={36} color="#2a2a4e" /> : <Tv size={36} color="#2a2a4e" />}</div>
              }
              <div className="card-actions">
                <button className="action-btn delete-btn" onClick={(e) => handleDelete(e, item.id, item.title)} title="Entfernen">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="media-info">
                <div className="media-title-text" title={item.title}>{item.title}</div>
                <div className="media-meta-row">
                  {item.year && <span className="meta-year">{item.year}</span>}
                  <div className={`status-dot ${STATUS_DOT[item.status] || ''}`} />
                  <span className="status-text">{item.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
