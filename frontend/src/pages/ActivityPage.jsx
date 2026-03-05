import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, ArrowUpCircle, Import, AlertCircle,
  Info, AlertTriangle, RefreshCw, Trash2, Filter, Activity,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const styles = `
  .act-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px; }
  .act-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0; }
  .act-header-right { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }

  /* Stats bar */
  .act-stats { display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap; }
  .stat-pill { display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid; }
  .stat-grab { background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25);color:#10b981; }
  .stat-search { background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.25);color:#6366f1; }
  .stat-error { background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#ef4444; }
  .stat-info { background:rgba(107,114,128,0.08);border-color:rgba(107,114,128,0.25);color:#9ca3af; }

  /* Monitor status card */
  .monitor-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap; }
  .monitor-status-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0; }
  .dot-active { background:#10b981;box-shadow:0 0 6px rgba(16,185,129,0.5); }
  .dot-inactive { background:#6b7280; }
  .monitor-info { flex:1; }
  .monitor-info-title { font-size:13px;font-weight:600;color:#e8e8f0;margin-bottom:2px; }
  .monitor-info-sub { font-size:12px;color:#6b7280; }
  .monitor-stats-row { display:flex;gap:16px;flex-wrap:wrap; }
  .monitor-stat { text-align:center; }
  .monitor-stat-val { font-size:18px;font-weight:700;color:#e8e8f0;font-family:'Space Mono',monospace; }
  .monitor-stat-lbl { font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em; }
  .trigger-btn { padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px; }
  .trigger-btn:disabled { opacity:0.5;cursor:not-allowed; }

  /* Filters */
  .act-toolbar { display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap; }
  .filter-chip { padding:6px 14px;border-radius:20px;border:1px solid #1a1a2e;background:#0f0f1a;color:#6b7280;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:5px; }
  .filter-chip.active { border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,0.1); }
  .clear-btn { padding:6px 12px;border:1px solid rgba(239,68,68,0.3);border-radius:6px;background:rgba(239,68,68,0.07);color:#ef4444;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px;margin-left:auto; }
  .refresh-btn { padding:6px 10px;border:1px solid #1a1a2e;border-radius:6px;background:#0f0f1a;color:#6b7280;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;font-family:'DM Sans',sans-serif; }
  .refresh-btn:hover { color:#e8e8f0; }

  /* Activity list */
  .act-list { display:flex;flex-direction:column;gap:4px; }
  .act-row { display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:#0f0f1a;border:1px solid #0d0d18;border-radius:8px;transition:border-color 0.15s; }
  .act-row:hover { border-color:#1a1a2e; }
  .act-icon { width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px; }
  .icon-grab { background:rgba(16,185,129,0.15);color:#10b981; }
  .icon-search { background:rgba(99,102,241,0.15);color:#6366f1; }
  .icon-error { background:rgba(239,68,68,0.15);color:#ef4444; }
  .icon-info { background:rgba(107,114,128,0.12);color:#6b7280; }
  .icon-warning { background:rgba(245,158,11,0.12);color:#f59e0b; }
  .icon-upgrade { background:rgba(139,92,246,0.15);color:#8b5cf6; }
  .icon-import { background:rgba(59,130,246,0.15);color:#3b82f6; }
  .act-body { flex:1;min-width:0; }
  .act-message { font-size:13px;color:#d1d5db;line-height:1.4; }
  .act-media { font-size:12px;color:#6366f1;margin-top:2px; }
  .act-media:hover { text-decoration:underline; }
  .act-time { font-size:11px;color:#4b5563;flex-shrink:0;white-space:nowrap; }
  .act-details { font-size:11px;color:#4b5563;margin-top:4px;font-family:'Space Mono',monospace; }

  /* Pagination */
  .pagination { display:flex;align-items:center;justify-content:center;gap:8px;margin-top:20px; }
  .page-btn { padding:6px 12px;border:1px solid #1a1a2e;border-radius:6px;background:#0f0f1a;color:#6b7280;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif; }
  .page-btn:hover:not(:disabled) { color:#e8e8f0;border-color:#6366f1; }
  .page-btn:disabled { opacity:0.4;cursor:not-allowed; }
  .page-info { font-size:13px;color:#6b7280; }

  .empty-act { text-align:center;padding:60px 20px;color:#4b5563;font-size:14px; }
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
`;

const TYPE_CONFIG = {
  grab:    { label: 'Grab',    icon: Download,      cls: 'icon-grab' },
  search:  { label: 'Suche',   icon: Search,        cls: 'icon-search' },
  error:   { label: 'Fehler',  icon: XCircle,       cls: 'icon-error' },
  info:    { label: 'Info',    icon: Info,          cls: 'icon-info' },
  warning: { label: 'Warnung', icon: AlertTriangle, cls: 'icon-warning' },
  upgrade: { label: 'Upgrade', icon: ArrowUpCircle, cls: 'icon-upgrade' },
  import:  { label: 'Import',  icon: Import,        cls: 'icon-import' },
};

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Gerade eben';
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const LIMIT = 50;

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (typeFilter) params.type = typeFilter;
    api.get('/monitor/activity', { params })
      .then(r => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, typeFilter]);

  const loadStatus = () => {
    api.get('/monitor/status').then(r => setMonitorStatus(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStatus(); const t = setInterval(loadStatus, 15000); return () => clearInterval(t); }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await api.post('/monitor/trigger');
      toast.success('Monitor-Zyklus gestartet — Ergebnisse erscheinen hier');
      setTimeout(() => { load(); loadStatus(); setTriggering(false); }, 3000);
    } catch { toast.error('Trigger fehlgeschlagen'); setTriggering(false); }
  };

  const handleClear = async () => {
    if (!window.confirm('Gesamten Aktivitäts-Log löschen?')) return;
    try {
      await api.delete('/monitor/activity');
      setItems([]); setTotal(0);
      toast.success('Log geleert');
    } catch { toast.error('Fehler'); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Stats from items
  const typeCounts = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {});

  return (
    <>
      <style>{styles}</style>

      <div className="act-header">
        <div className="act-title">Aktivität</div>
        <div className="act-header-right">
          <button className="refresh-btn" onClick={() => { load(); loadStatus(); }}>
            <RefreshCw size={13} /> Aktualisieren
          </button>
        </div>
      </div>

      {/* Monitor status card */}
      {monitorStatus && (
        <div className="monitor-card">
          <div className={`monitor-status-dot ${monitorStatus.enabled ? 'dot-active' : 'dot-inactive'}`} />
          <div className="monitor-info">
            <div className="monitor-info-title">
              {monitorStatus.enabled ? 'Monitoring aktiv' : 'Monitoring pausiert'}
            </div>
            <div className="monitor-info-sub">
              Interval: alle {monitorStatus.interval_minutes} Minuten
              {monitorStatus.last_activity && ` · Letzte Aktivität: ${fmtTime(monitorStatus.last_activity.created_at)}`}
            </div>
          </div>
          <div className="monitor-stats-row">
            <div className="monitor-stat">
              <div className="monitor-stat-val">{monitorStatus.stats.wanted_movies + monitorStatus.stats.wanted_episodes}</div>
              <div className="monitor-stat-lbl">Wanted</div>
            </div>
            <div className="monitor-stat">
              <div className="monitor-stat-val">{monitorStatus.stats.downloading}</div>
              <div className="monitor-stat-lbl">Lädt</div>
            </div>
            <div className="monitor-stat">
              <div className="monitor-stat-val">{monitorStatus.stats.grabs_today}</div>
              <div className="monitor-stat-lbl">Grabs heute</div>
            </div>
            <div className="monitor-stat">
              <div className="monitor-stat-val">{monitorStatus.stats.total_monitored}</div>
              <div className="monitor-stat-lbl">Überwacht</div>
            </div>
          </div>
          <button className="trigger-btn" onClick={handleTrigger} disabled={triggering}>
            {triggering
              ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              : <Search size={14} />}
            {triggering ? 'Sucht...' : 'Jetzt suchen'}
          </button>
        </div>
      )}

      {/* Type filter chips */}
      <div className="act-toolbar">
        {[['', 'Alle'], ...Object.entries(TYPE_CONFIG).map(([k, v]) => [k, v.label])].map(([type, label]) => (
          <button
            key={type}
            className={`filter-chip ${typeFilter === type ? 'active' : ''}`}
            onClick={() => { setTypeFilter(type); setPage(1); }}
          >
            {label}
            {type && typeCounts[type] > 0 && (
              <span style={{ fontSize: '10px', padding: '1px 5px', background: 'rgba(99,102,241,0.2)', borderRadius: '8px' }}>
                {typeCounts[type]}
              </span>
            )}
          </button>
        ))}
        <button className="clear-btn" onClick={handleClear}>
          <Trash2 size={12} /> Log leeren
        </button>
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="empty-act">Lädt...</div>
      ) : items.length === 0 ? (
        <div className="empty-act">
          <Activity size={40} style={{ margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
          Noch keine Aktivität.{' '}
          {monitorStatus?.enabled ? 'Der Monitor läuft — Ergebnisse erscheinen hier.' : 'Monitoring ist deaktiviert.'}
        </div>
      ) : (
        <>
          <div className="act-list">
            {items.map(item => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              let details = null;
              try { details = item.details ? JSON.parse(item.details) : null; } catch {}

              return (
                <div key={item.id} className="act-row">
                  <div className={`act-icon ${cfg.cls}`}><Icon size={14} /></div>
                  <div className="act-body">
                    <div className="act-message">{item.message}</div>
                    {item.media_title && (
                      <Link to={`/library/${item.media_id}`} className="act-media">
                        {item.media_title}
                      </Link>
                    )}
                    {details && item.type === 'grab' && details.quality && (
                      <div className="act-details">
                        {[details.quality, details.source, details.client?.toUpperCase()].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {details && item.type === 'search' && (
                      <div className="act-details">
                        {details.query} · {details.results ?? 0} Ergebnisse · {details.indexer_count ?? 0} Indexer
                      </div>
                    )}
                  </div>
                  <div className="act-time">{fmtTime(item.created_at)}</div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>← Zurück</button>
              <span className="page-info">Seite {page} / {totalPages} · {total} Einträge</span>
              <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Weiter →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
