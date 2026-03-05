import React, { useState, useEffect, useCallback } from 'react';
import { Film, Tv, Trash2, Search, LayoutGrid, List, Edit2, X,
         Check, ChevronDown, Save, ExternalLink, SlidersHorizontal,
         CheckSquare, Square, Minus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  /* ── Layout ── */
  .lib-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px; }
  .lib-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0; }
  .lib-header-right { display:flex;align-items:center;gap:10px;flex-wrap:wrap; }

  /* ── Stats bar ── */
  .stats-bar { display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap; }
  .stat-chip { display:flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;background:#0f0f1a;border:1px solid #1a1a2e;color:#6b7280; }
  .stat-chip .dot { width:6px;height:6px;border-radius:50%; }

  /* ── Filters ── */
  .lib-toolbar { display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap; }
  .filter-btn { padding:7px 14px;border-radius:8px;border:1px solid #1a1a2e;background:#0f0f1a;color:#6b7280;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s; }
  .filter-btn.active { border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,0.1); }
  .filter-sep { width:1px;height:20px;background:#1a1a2e;margin:0 2px; }

  /* ── Search ── */
  .lib-search { position:relative;flex:1;min-width:180px;max-width:280px; }
  .lib-search-input { width:100%;padding:8px 12px 8px 34px;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;box-sizing:border-box; }
  .lib-search-input:focus { border-color:#6366f1; }
  .lib-search-icon { position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#4b5563;pointer-events:none; }

  /* ── View toggle ── */
  .view-toggle { display:flex;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:8px;overflow:hidden; }
  .view-btn { padding:7px 10px;border:none;background:none;color:#6b7280;cursor:pointer;display:flex;align-items:center;transition:all 0.15s; }
  .view-btn.active { background:rgba(99,102,241,0.15);color:#6366f1; }

  /* ── Bulk bar ── */
  .bulk-bar {
    display:flex;align-items:center;gap:10px;flex-wrap:wrap;
    padding:10px 16px;background:rgba(99,102,241,0.08);
    border:1px solid rgba(99,102,241,0.25);border-radius:10px;margin-bottom:14px;
  }
  .bulk-count { font-size:13px;font-weight:600;color:#a5b4fc;flex:1; }
  .bulk-btn { padding:6px 14px;border-radius:6px;border:1px solid #2a2a4e;background:#1a1a2e;color:#9ca3af;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;transition:all 0.15s; }
  .bulk-btn:hover { color:#e8e8f0;border-color:#6366f1; }
  .bulk-btn-danger:hover { color:#ef4444;border-color:#ef4444; }
  .bulk-status-sel { padding:6px 10px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:6px;color:#e8e8f0;font-size:12px;font-family:'DM Sans',sans-serif;outline:none; }

  /* ── Grid view ── */
  .media-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:14px; }
  .grid-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:10px;overflow:hidden;position:relative;transition:border-color 0.15s;cursor:pointer; }
  .grid-card:hover { border-color:#3a3a5e; }
  .grid-card.selected { border-color:#6366f1;box-shadow:0 0 0 1px #6366f1; }
  .grid-poster { width:100%;aspect-ratio:2/3;object-fit:cover;display:block; }
  .grid-poster-ph { width:100%;aspect-ratio:2/3;background:#1a1a2e;display:flex;align-items:center;justify-content:center; }
  .grid-card-overlay { position:absolute;inset:0;background:linear-gradient(to top,rgba(10,10,15,0.92) 35%,transparent 70%);opacity:0;transition:opacity 0.18s;display:flex;flex-direction:column;justify-content:flex-end;padding:10px; }
  .grid-card:hover .grid-card-overlay { opacity:1; }
  .grid-overlay-actions { display:flex;gap:6px;margin-top:8px; }
  .grid-act-btn { flex:1;padding:6px;border-radius:6px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:4px;transition:opacity 0.15s; }
  .grid-act-btn:hover { opacity:0.85; }
  .grid-edit-btn { background:rgba(99,102,241,0.9);color:white; }
  .grid-del-btn { background:rgba(239,68,68,0.9);color:white; }
  .grid-check { position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:5px;border:2px solid rgba(255,255,255,0.3);background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s; }
  .grid-check.checked { background:#6366f1;border-color:#6366f1; }
  .grid-card:hover .grid-check { border-color:rgba(255,255,255,0.7); }
  .grid-info { padding:8px 10px; }
  .grid-title { font-size:11px;font-weight:500;color:#e8e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .grid-meta { display:flex;align-items:center;gap:5px;margin-top:3px; }
  .grid-year { font-size:10px;color:#6b7280; }
  .grid-sdot { width:5px;height:5px;border-radius:50%;flex-shrink:0; }

  /* ── List view ── */
  .list-table { width:100%;border-collapse:collapse; }
  .list-table th { padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1a1a2e;white-space:nowrap;background:#0a0a0f;position:sticky;top:0;z-index:1; }
  .list-table td { padding:10px 12px;border-bottom:1px solid #0d0d18;vertical-align:middle; }
  .list-table tr:hover td { background:#0f0f17; }
  .list-table tr.selected td { background:rgba(99,102,241,0.06); }
  .list-thumb { width:34px;height:50px;object-fit:cover;border-radius:4px;display:block;background:#1a1a2e;flex-shrink:0; }
  .list-thumb-ph { width:34px;height:50px;background:#1a1a2e;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  .list-title-cell { display:flex;align-items:center;gap:10px; }
  .list-title-text { font-size:13px;font-weight:500;color:#e8e8f0;cursor:pointer; }
  .list-title-text:hover { color:#6366f1; }
  .list-year { font-size:12px;color:#6b7280; }
  .type-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;white-space:nowrap; }
  .type-movie { background:rgba(99,102,241,0.12);color:#6366f1; }
  .type-series { background:rgba(139,92,246,0.12);color:#8b5cf6; }

  /* Inline selects in list view */
  .inline-sel { padding:5px 8px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:6px;color:#e8e8f0;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;cursor:pointer;transition:border-color 0.15s; }
  .inline-sel:hover { border-color:#6366f1; }
  .inline-sel:focus { border-color:#6366f1; }

  /* Status colours for select */
  .sel-wanted { color:#ca8a04; }
  .sel-downloaded { color:#16a34a; }
  .sel-downloading { color:#6366f1; }
  .sel-missing { color:#dc2626; }

  .list-actions { display:flex;align-items:center;gap:6px;justify-content:flex-end; }
  .icon-btn { width:28px;height:28px;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s;background:none;color:#6b7280; }
  .icon-btn:hover { background:#1a1a2e;color:#e8e8f0; }
  .icon-btn-danger:hover { background:rgba(239,68,68,0.1);color:#ef4444; }
  .icon-btn-link:hover { background:rgba(99,102,241,0.1);color:#6366f1; }

  .th-check { width:36px; }
  .th-poster { width:50px; }
  .th-actions { width:90px; }

  /* ── Quick-edit panel ── */
  .qe-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px); }
  .qe-panel { background:#0f0f1a;border:1px solid #2a2a4e;border-radius:16px;width:100%;max-width:480px;overflow:hidden; }
  .qe-header { display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #1a1a2e; }
  .qe-title { font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#e8e8f0; }
  .qe-close { background:none;border:none;color:#6b7280;cursor:pointer;padding:4px;border-radius:6px; }
  .qe-close:hover { color:#e8e8f0;background:#1a1a2e; }
  .qe-body { padding:20px;display:flex;flex-direction:column;gap:16px; }
  .qe-hero { display:flex;gap:14px; }
  .qe-poster { width:72px;height:108px;object-fit:cover;border-radius:8px;background:#1a1a2e;flex-shrink:0; }
  .qe-poster-ph { width:72px;height:108px;background:#1a1a2e;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
  .qe-info { flex:1;min-width:0; }
  .qe-name { font-size:15px;font-weight:700;color:#e8e8f0;margin-bottom:4px;line-height:1.3; }
  .qe-meta { font-size:12px;color:#6b7280;margin-bottom:12px; }
  .qe-fields { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
  .qe-field { display:flex;flex-direction:column;gap:5px; }
  .qe-label { font-size:11px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em; }
  .qe-select { padding:9px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:100%; }
  .qe-select:focus { border-color:#6366f1; }
  .qe-path-input { padding:9px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'Space Mono',monospace;outline:none;width:100%;box-sizing:border-box; }
  .qe-path-input:focus { border-color:#6366f1; }
  .qe-footer { display:flex;gap:8px;padding:14px 20px;border-top:1px solid #1a1a2e; }
  .qe-save-btn { flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;gap:6px;font-size:14px; }
  .qe-save-btn:disabled { opacity:0.5;cursor:not-allowed; }
  .qe-detail-btn { padding:10px 16px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#9ca3af;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;font-size:13px;text-decoration:none; }
  .qe-detail-btn:hover { color:#e8e8f0;border-color:#6366f1; }

  /* ── Status dots ── */
  .sdot-wanted { background:#ca8a04; }
  .sdot-downloaded { background:#16a34a; }
  .sdot-downloading { background:#6366f1; }
  .sdot-missing { background:#dc2626; }

  .empty-state { text-align:center;padding:60px 20px;color:#4b5563;font-size:14px; }
  @media (max-width:640px) { .media-grid { grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); } }
`;

const STATUS_DOT = {
  wanted: 'sdot-wanted', downloaded: 'sdot-downloaded',
  downloading: 'sdot-downloading', missing: 'sdot-missing',
};
const STATUS_LABEL = {
  wanted: 'Wanted', downloaded: 'Downloaded',
  downloading: 'Downloading', missing: 'Missing',
};
const STATUSES = ['wanted', 'downloading', 'downloaded', 'missing'];
const QUALITIES = ['720p', '1080p', '2160p', 'Any'];

// ── Quick-edit panel ──────────────────────────────────────────────────────────
function QuickEditPanel({ item, onClose, onSaved }) {
  const [status, setStatus] = useState(item.status);
  const [quality, setQuality] = useState(item.quality_profile);
  const [path, setPath] = useState(item.path || '');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/media/${item.id}`, { status, quality_profile: quality, path: path || undefined });
      toast.success('Gespeichert');
      onSaved({ ...item, status, quality_profile: quality, path });
      onClose();
    } catch { toast.error('Speichern fehlgeschlagen'); }
    finally { setSaving(false); }
  };

  return (
    <div className="qe-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="qe-panel">
        <div className="qe-header">
          <div className="qe-title">Eintrag bearbeiten</div>
          <button className="qe-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="qe-body">
          <div className="qe-hero">
            {item.poster_url
              ? <img src={item.poster_url} alt={item.title} className="qe-poster" />
              : <div className="qe-poster-ph">{item.type === 'movie' ? <Film size={28} color="#2a2a4e" /> : <Tv size={28} color="#2a2a4e" />}</div>
            }
            <div className="qe-info">
              <div className="qe-name">{item.title}</div>
              <div className="qe-meta">{item.year} · {item.type === 'movie' ? 'Film' : 'Serie'}</div>
              <div className="qe-fields">
                <div className="qe-field">
                  <label className="qe-label">Status</label>
                  <select className="qe-select" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div className="qe-field">
                  <label className="qe-label">Qualität</label>
                  <select className="qe-select" value={quality} onChange={e => setQuality(e.target.value)}>
                    {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="qe-field">
            <label className="qe-label">Dateipfad (optional)</label>
            <input
              className="qe-path-input"
              value={path}
              onChange={e => setPath(e.target.value)}
              placeholder="/downloads/movies/Film.2024.mkv"
            />
          </div>
        </div>
        <div className="qe-footer">
          <Link to={`/library/${item.id}`} className="qe-detail-btn">
            <ExternalLink size={13} /> Details
          </Link>
          <button className="qe-save-btn" onClick={save} disabled={saving}>
            <Save size={14} /> {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────
function GridCard({ item, selected, onToggleSelect, onEdit, onDelete }) {
  return (
    <div className={`grid-card ${selected ? 'selected' : ''}`}>
      {item.poster_url
        ? <img src={item.poster_url} alt={item.title} className="grid-poster" loading="lazy" />
        : <div className="grid-poster-ph">{item.type === 'movie' ? <Film size={34} color="#2a2a4e" /> : <Tv size={34} color="#2a2a4e" />}</div>
      }
      {/* Hover overlay */}
      <div className="grid-card-overlay">
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#e8e8f0', marginBottom: '2px', lineHeight: 1.3 }}>{item.title}</div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px' }}>{item.year}</div>
        <div className="grid-overlay-actions">
          <button className="grid-act-btn grid-edit-btn" onClick={e => { e.stopPropagation(); onEdit(item); }}>
            <Edit2 size={11} /> Edit
          </button>
          <button className="grid-act-btn grid-del-btn" onClick={e => { e.stopPropagation(); onDelete(item); }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {/* Checkbox */}
      <div
        className={`grid-check ${selected ? 'checked' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleSelect(item.id); }}
      >
        {selected && <Check size={12} color="white" />}
      </div>
      <div className="grid-info">
        <div className="grid-title" title={item.title}>{item.title}</div>
        <div className="grid-meta">
          {item.year && <span className="grid-year">{item.year}</span>}
          <div className={`grid-sdot ${STATUS_DOT[item.status] || ''}`} />
        </div>
      </div>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────
function ListRow({ item, selected, onToggleSelect, onEdit, onDelete, onFieldChange }) {
  const navigate = useNavigate();
  return (
    <tr className={selected ? 'selected' : ''}>
      <td>
        <div
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => onToggleSelect(item.id)}
        >
          {selected
            ? <CheckSquare size={16} color="#6366f1" />
            : <Square size={16} color="#4b5563" />}
        </div>
      </td>
      <td>
        {item.poster_url
          ? <img src={item.poster_url} alt="" className="list-thumb" loading="lazy" />
          : <div className="list-thumb-ph">{item.type === 'movie' ? <Film size={16} color="#2a2a4e" /> : <Tv size={16} color="#2a2a4e" />}</div>
        }
      </td>
      <td>
        <div className="list-title-cell">
          <div>
            <div className="list-title-text" onClick={() => navigate(`/library/${item.id}`)}>{item.title}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{item.year}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={`type-badge ${item.type === 'movie' ? 'type-movie' : 'type-series'}`}>
          {item.type === 'movie' ? <Film size={11} /> : <Tv size={11} />}
          {item.type === 'movie' ? 'Film' : 'Serie'}
        </span>
      </td>
      <td>
        <select
          className="inline-sel"
          value={item.status}
          onChange={e => onFieldChange(item.id, 'status', e.target.value)}
          style={{ color: item.status === 'wanted' ? '#ca8a04' : item.status === 'downloaded' ? '#16a34a' : item.status === 'missing' ? '#dc2626' : '#6366f1' }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </td>
      <td>
        <select
          className="inline-sel"
          value={item.quality_profile}
          onChange={e => onFieldChange(item.id, 'quality_profile', e.target.value)}
        >
          {QUALITIES.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </td>
      <td>
        <div className="list-actions">
          <button className="icon-btn icon-btn-link" title="Details" onClick={() => navigate(`/library/${item.id}`)}>
            <ExternalLink size={14} />
          </button>
          <button className="icon-btn" title="Bearbeiten" onClick={() => onEdit(item)}>
            <Edit2 size={14} />
          </button>
          <button className="icon-btn icon-btn-danger" title="Entfernen" onClick={() => onDelete(item)}>
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LibraryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // 'grid' | 'list'
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [editItem, setEditItem] = useState(null);
  const [bulkStatus, setBulkStatus] = useState('downloaded');

  const load = useCallback(() => {
    const params = { limit: 200 };
    if (typeFilter !== 'all') params.type = typeFilter;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    setLoading(true);
    api.get('/media', { params })
      .then(r => setItems(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  // ── Selection ────────────────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(items.map(i => i.id)));
  const clearSelect = () => setSelected(new Set());
  const allSelected = items.length > 0 && selected.size === items.length;

  // ── Inline field change (list view) ──────────────────────────────────────────
  const handleFieldChange = async (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    try {
      await api.patch(`/media/${id}`, { [field]: value });
    } catch {
      toast.error('Speichern fehlgeschlagen');
      load(); // revert on error
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!window.confirm(`„${item.title}" aus der Bibliothek entfernen?`)) return;
    try {
      await api.delete(`/media/${item.id}`);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelected(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      toast.success('Entfernt');
    } catch { toast.error('Fehler beim Entfernen'); }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const bulkChangeStatus = async () => {
    if (!selected.size) return;
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => api.patch(`/media/${id}`, { status: bulkStatus })));
      setItems(prev => prev.map(i => selected.has(i.id) ? { ...i, status: bulkStatus } : i));
      toast.success(`${ids.length} Einträge aktualisiert`);
      clearSelect();
    } catch { toast.error('Bulk-Update fehlgeschlagen'); }
  };

  const bulkDelete = async () => {
    if (!selected.size || !window.confirm(`${selected.size} Einträge entfernen?`)) return;
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => api.delete(`/media/${id}`)));
      setItems(prev => prev.filter(i => !selected.has(i.id)));
      clearSelect();
      toast.success(`${ids.length} Einträge entfernt`);
    } catch { toast.error('Bulk-Löschen fehlgeschlagen'); }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const allItems = items; // currently loaded (filtered)
  const stats = {
    total: allItems.length,
    movies: allItems.filter(i => i.type === 'movie').length,
    series: allItems.filter(i => i.type === 'series').length,
    downloaded: allItems.filter(i => i.status === 'downloaded').length,
    wanted: allItems.filter(i => i.status === 'wanted').length,
    missing: allItems.filter(i => i.status === 'missing').length,
  };

  const handleEditSaved = (updated) => {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
  };

  return (
    <>
      <style>{styles}</style>

      {/* Header */}
      <div className="lib-header">
        <div className="lib-title">Bibliothek</div>
        <div className="lib-header-right">
          <div className="lib-search">
            <Search size={13} className="lib-search-icon" />
            <input
              className="lib-search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen..."
            />
          </div>
          <div className="view-toggle">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Grid-Ansicht">
              <LayoutGrid size={15} />
            </button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="Listen-Ansicht">
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="stats-bar">
          <span className="stat-chip">{stats.total} Einträge</span>
          <span className="stat-chip"><Film size={11} /> {stats.movies} Filme</span>
          <span className="stat-chip"><Tv size={11} /> {stats.series} Serien</span>
          <span className="stat-chip"><span className="dot" style={{ background: '#16a34a' }} />{stats.downloaded} Vorhanden</span>
          <span className="stat-chip"><span className="dot" style={{ background: '#ca8a04' }} />{stats.wanted} Wanted</span>
          {stats.missing > 0 && <span className="stat-chip"><span className="dot" style={{ background: '#dc2626' }} />{stats.missing} Fehlend</span>}
        </div>
      )}

      {/* Toolbar */}
      <div className="lib-toolbar">
        {/* Select all toggle */}
        <button
          className="filter-btn"
          style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
          onClick={allSelected ? clearSelect : selectAll}
          title={allSelected ? 'Alle abwählen' : 'Alle auswählen'}
        >
          {allSelected ? <CheckSquare size={14} /> : selected.size > 0 ? <Minus size={14} /> : <Square size={14} />}
        </button>
        <div className="filter-sep" />
        {[['all','Alle'],['movie','Filme'],['series','Serien']].map(([v, l]) => (
          <button key={v} className={`filter-btn ${typeFilter === v ? 'active' : ''}`} onClick={() => setTypeFilter(v)}>{l}</button>
        ))}
        <div className="filter-sep" />
        {[['all','Alle Status'],['wanted','Wanted'],['downloading','Lädt'],['downloaded','Vorhanden'],['missing','Fehlend']].map(([v, l]) => (
          <button key={v} className={`filter-btn ${statusFilter === v ? 'active' : ''}`} onClick={() => setStatusFilter(v)}>{l}</button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selected.size} ausgewählt</span>
          <select className="bulk-status-sel" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className="bulk-btn" onClick={bulkChangeStatus}>
            <SlidersHorizontal size={13} /> Status setzen
          </button>
          <button className="bulk-btn bulk-btn-danger" onClick={bulkDelete}>
            <Trash2 size={13} /> Alle löschen
          </button>
          <button className="bulk-btn" onClick={clearSelect}>
            <X size={13} /> Abbrechen
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="empty-state">Lädt...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">Keine Einträge gefunden</div>
      ) : view === 'grid' ? (
        <div className="media-grid">
          {items.map(item => (
            <GridCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggleSelect={toggleSelect}
              onEdit={setEditItem}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="list-table">
            <thead>
              <tr>
                <th className="th-check" />
                <th className="th-poster" />
                <th>Titel</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Qualität</th>
                <th className="th-actions" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <ListRow
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  onToggleSelect={toggleSelect}
                  onEdit={setEditItem}
                  onDelete={handleDelete}
                  onFieldChange={handleFieldChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick-edit panel */}
      {editItem && (
        <QuickEditPanel
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleEditSaved}
        />
      )}
    </>
  );
}
