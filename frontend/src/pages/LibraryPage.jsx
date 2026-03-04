import React, { useState, useEffect } from 'react';
import { Film, Tv, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .lib-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .lib-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; }
  .lib-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
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
  .card-actions { position: absolute; top: 6px; right: 6px; opacity: 0; transition: opacity 0.15s; }
  .delete-btn { width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; background: rgba(239,68,68,0.9); color: white; }
  .media-info { padding: 10px; }
  .media-title-text { font-size: 12px; font-weight: 500; color: #e8e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .media-meta-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
  .meta-year { font-size: 11px; color: #6b7280; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .dot-wanted { background: #ca8a04; } .dot-downloaded { background: #16a34a; }
  .dot-downloading { background: #6366f1; } .dot-missing { background: #dc2626; }
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
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm(`Remove "${title}" from library?`)) return;
    try {
      await api.delete(`/media/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Removed from library');
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lib-header">
        <div className="lib-title">Library</div>
        <div className="lib-search">
          <Search size={14} className="lib-search-icon" />
          <input className="lib-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />
        </div>
      </div>
      <div className="lib-filters">
        {[['all','All'],['movie','Movies'],['series','TV Shows']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${typeFilter === v ? 'active' : ''}`} onClick={() => setTypeFilter(v)}>{l}</button>
        ))}
        <div style={{ width: '1px', background: '#1a1a2e', margin: '0 4px' }} />
        {[['all','All Status'],['wanted','Wanted'],['downloading','Downloading'],['downloaded','Downloaded'],['missing','Missing']].map(([v,l]) => (
          <button key={v} className={`filter-btn ${statusFilter === v ? 'active' : ''}`} onClick={() => setStatusFilter(v)}>{l}</button>
        ))}
      </div>
      {loading ? <div className="empty-state">Loading...</div>
        : items.length === 0 ? <div className="empty-state">No media found</div>
        : (
        <div className="media-grid">
          {items.map(item => (
            <Link key={item.id} to={`/library/${item.id}`} className="media-card" style={{ textDecoration: 'none' }}>
              {item.poster_url
                ? <img src={item.poster_url} alt={item.title} className="media-poster" loading="lazy" />
                : <div className="media-poster-ph">{item.type === 'movie' ? <Film size={36} color="#2a2a4e" /> : <Tv size={36} color="#2a2a4e" />}</div>}
              <div className="card-actions">
                <button className="delete-btn" onClick={(e) => handleDelete(e, item.id, item.title)} title="Remove">
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
