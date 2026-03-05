import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit2, CheckCircle, XCircle, Loader,
  Zap, Globe, ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
  AlertTriangle, BarChart2, RefreshCw, Save, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .idx-page-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0;margin-bottom:6px; }
  .idx-page-sub { font-size:14px;color:#6b7280;margin-bottom:28px; }

  /* Stats overview */
  .idx-stats-row { display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:24px; }
  .idx-stat-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:10px;padding:14px 16px; }
  .idx-stat-val { font-size:22px;font-weight:700;color:#e8e8f0;font-family:'Space Mono',monospace; }
  .idx-stat-lbl { font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px; }
  .idx-stat-sub { font-size:11px;color:#4b5563;margin-top:3px; }

  /* List */
  .idx-list { display:flex;flex-direction:column;gap:10px;margin-bottom:20px; }

  .idx-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;overflow:hidden;transition:border-color 0.15s; }
  .idx-card:hover { border-color:#2a2a4e; }
  .idx-card.disabled { opacity:0.55; }

  .idx-card-head { display:flex;align-items:center;gap:12px;padding:14px 18px; }
  .idx-type-badge { padding:3px 9px;border-radius:5px;font-size:11px;font-weight:700;letter-spacing:0.03em;flex-shrink:0; }
  .badge-newznab { background:rgba(99,102,241,0.15);color:#6366f1; }
  .badge-torznab { background:rgba(16,185,129,0.15);color:#10b981; }
  .badge-torrent-api { background:rgba(245,158,11,0.15);color:#f59e0b; }

  .idx-name { font-size:14px;font-weight:600;color:#e8e8f0;flex:1; }
  .idx-url { font-size:12px;color:#4b5563;font-family:'Space Mono',monospace;max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

  .idx-head-actions { display:flex;align-items:center;gap:6px;flex-shrink:0; }

  /* Test status */
  .test-ok { color:#10b981;display:flex;align-items:center;gap:4px;font-size:11px;font-weight:500; }
  .test-fail { color:#ef4444;display:flex;align-items:center;gap:4px;font-size:11px;font-weight:500; }
  .test-pending { color:#6b7280;display:flex;align-items:center;gap:4px;font-size:11px; }

  /* Inline stats */
  .idx-stats { display:flex;gap:16px;padding:0 18px 14px;border-top:1px solid #0d0d18;padding-top:12px;margin-top:4px;flex-wrap:wrap; }
  .idx-stat-item { display:flex;flex-direction:column;gap:2px; }
  .idx-stat-item-val { font-size:13px;font-weight:600;color:#e8e8f0; }
  .idx-stat-item-lbl { font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:0.04em; }

  /* Icon buttons */
  .icon-btn { width:30px;height:30px;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:none;color:#6b7280;transition:all 0.15s; }
  .icon-btn:hover { background:#1a1a2e;color:#e8e8f0; }
  .icon-btn-danger:hover { background:rgba(239,68,68,0.1);color:#ef4444; }
  .icon-btn-success:hover { background:rgba(16,185,129,0.1);color:#10b981; }
  .icon-btn-primary { background:rgba(99,102,241,0.1);color:#6366f1; }
  .icon-btn-primary:hover { background:rgba(99,102,241,0.2); }

  /* Priority arrows */
  .prio-badge { padding:2px 7px;background:#1a1a2e;border-radius:4px;font-size:11px;color:#6b7280;font-family:'Space Mono',monospace; }

  /* Add / Edit modal */
  .modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px); }
  .modal-panel { background:#0f0f1a;border:1px solid #2a2a4e;border-radius:16px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto; }
  .modal-head { padding:18px 22px;border-bottom:1px solid #1a1a2e;display:flex;align-items:center;justify-content:space-between; }
  .modal-title { font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#e8e8f0; }
  .modal-close { background:none;border:none;color:#6b7280;cursor:pointer;padding:4px;border-radius:6px; }
  .modal-close:hover { color:#e8e8f0;background:#1a1a2e; }
  .modal-body { padding:20px 22px;display:flex;flex-direction:column;gap:16px; }
  .modal-footer { padding:14px 22px;border-top:1px solid #1a1a2e;display:flex;gap:8px;justify-content:flex-end; }

  .field { display:flex;flex-direction:column;gap:6px; }
  .field-label { font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em; }
  .field-input { padding:9px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:100%;box-sizing:border-box; }
  .field-input:focus { border-color:#6366f1; }
  .field-select { padding:9px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none;width:100%; }
  .field-hint { font-size:11px;color:#4b5563; }
  .field-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }

  .btn-primary { padding:9px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;display:flex;align-items:center;gap:6px; }
  .btn-primary:disabled { opacity:0.5;cursor:not-allowed; }
  .btn-secondary { padding:9px 16px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#9ca3af;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;display:flex;align-items:center;gap:6px; }
  .btn-secondary:hover { color:#e8e8f0;border-color:#6366f1; }

  .add-btn-row { display:flex;justify-content:flex-end; }
  .add-btn { padding:9px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:7px; }

  .empty-idx { text-align:center;padding:50px 20px;color:#4b5563;font-size:14px; }
  @keyframes spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }
`;

const TYPE_LABELS = { newznab: 'Newznab', torznab: 'Torznab', torrent_api: 'Torrent API' };
const TYPE_BADGE = { newznab: 'badge-newznab', torznab: 'badge-torznab', torrent_api: 'badge-torrent-api' };

const EMPTY_FORM = { name: '', type: 'newznab', url: '', api_key: '', priority: 25, categories: '' };

function IndexerModal({ indexer, onClose, onSaved }) {
  const [form, setForm] = useState(indexer ? {
    name: indexer.name, type: indexer.type, url: indexer.url,
    api_key: '', priority: indexer.priority, categories: indexer.categories || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error('Name und URL sind Pflichtfelder');
      return;
    }
    setSaving(true);
    try {
      if (indexer) {
        await api.patch(`/settings/indexers/${indexer.id}`, form);
        toast.success('Indexer aktualisiert');
      } else {
        await api.post('/settings/indexers', form);
        toast.success('Indexer hinzugefügt');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Speichern fehlgeschlagen');
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!indexer) { toast('Erst speichern, dann testen'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(`/settings/indexers/${indexer.id}/test`);
      setTestResult({ ok: true, msg: res.data.message });
    } catch (err) {
      setTestResult({ ok: false, msg: err.response?.data?.message || 'Test fehlgeschlagen' });
    } finally { setTesting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-head">
          <div className="modal-title">{indexer ? 'Indexer bearbeiten' : 'Indexer hinzufügen'}</div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <div className="field">
              <label className="field-label">Name</label>
              <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="NZBgeek" />
            </div>
            <div className="field">
              <label className="field-label">Typ</label>
              <select className="field-select" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="newznab">Newznab (Usenet)</option>
                <option value="torznab">Torznab (Torrent)</option>
                <option value="torrent_api">Torrent API</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label">URL</label>
            <input className="field-input" value={form.url} onChange={e => set('url', e.target.value)}
              placeholder="https://indexer.example.com" style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px' }} />
          </div>
          <div className="field">
            <label className="field-label">API Key</label>
            <input className="field-input" value={form.api_key} onChange={e => set('api_key', e.target.value)}
              type="password" placeholder={indexer ? '••••••• (leer = unverändert)' : 'API Schlüssel'} />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label">Priorität (1–100)</label>
              <input className="field-input" type="number" min="1" max="100" value={form.priority}
                onChange={e => set('priority', parseInt(e.target.value))} />
              <span className="field-hint">Höher = bevorzugt bei gleichem Ergebnis</span>
            </div>
            <div className="field">
              <label className="field-label">Kategorien (optional)</label>
              <input className="field-input" value={form.categories} onChange={e => set('categories', e.target.value)}
                placeholder="2000,5000" />
              <span className="field-hint">Komma-getrennte Newznab-Kategorien</span>
            </div>
          </div>

          {testResult && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
              borderRadius: '8px', fontSize: '13px',
              background: testResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${testResult.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: testResult.ok ? '#10b981' : '#ef4444',
            }}>
              {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.msg}
            </div>
          )}
        </div>
        <div className="modal-footer">
          {indexer && (
            <button className="btn-secondary" onClick={handleTest} disabled={testing}>
              {testing ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Zap size={13} />}
              {testing ? 'Teste...' : 'Verbindung testen'}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={13} />}
            {saving ? 'Speichert...' : indexer ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IndexerSettingsPage() {
  const [indexers, setIndexers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editIndexer, setEditIndexer] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/settings/indexers')
      .then(r => setIndexers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (indexer) => {
    if (!window.confirm(`"${indexer.name}" entfernen?`)) return;
    try {
      await api.delete(`/settings/indexers/${indexer.id}`);
      setIndexers(prev => prev.filter(i => i.id !== indexer.id));
      toast.success('Indexer entfernt');
    } catch { toast.error('Fehler beim Entfernen'); }
  };

  const handleToggle = async (indexer) => {
    try {
      await api.patch(`/settings/indexers/${indexer.id}`, { enabled: !indexer.enabled });
      setIndexers(prev => prev.map(i => i.id === indexer.id ? { ...i, enabled: !i.enabled } : i));
    } catch { toast.error('Fehler'); }
  };

  const handlePriorityChange = async (indexer, delta) => {
    const newPrio = Math.max(1, Math.min(100, (indexer.priority || 25) + delta));
    try {
      await api.patch(`/settings/indexers/${indexer.id}`, { priority: newPrio });
      setIndexers(prev => prev.map(i => i.id === indexer.id ? { ...i, priority: newPrio } : i)
        .sort((a, b) => b.priority - a.priority));
    } catch { toast.error('Fehler'); }
  };

  const testIndexer = async (indexer) => {
    setTestingId(indexer.id);
    try {
      const res = await api.post(`/settings/indexers/${indexer.id}/test`);
      setIndexers(prev => prev.map(i => i.id === indexer.id ? { ...i, test_status: 'ok' } : i));
      toast.success(res.data.message);
    } catch (err) {
      setIndexers(prev => prev.map(i => i.id === indexer.id ? { ...i, test_status: 'failed' } : i));
      toast.error(err.response?.data?.message || 'Test fehlgeschlagen');
    } finally { setTestingId(null); }
  };

  // Aggregate stats
  const totalQueries = indexers.reduce((s, i) => s + (i.total_queries || 0), 0);
  const successRate = totalQueries > 0
    ? Math.round((indexers.reduce((s, i) => s + (i.successful_queries || 0), 0) / totalQueries) * 100)
    : 0;
  const avgMs = indexers.length
    ? Math.round(indexers.reduce((s, i) => s + (i.avg_response_ms || 0), 0) / indexers.length)
    : 0;

  return (
    <>
      <style>{styles}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div className="idx-page-title">Indexer</div>
        <button className="add-btn" onClick={() => { setEditIndexer(null); setShowModal(true); }}>
          <Plus size={14} /> Indexer hinzufügen
        </button>
      </div>
      <div className="idx-page-sub">Verwalte Newznab/Torznab Indexer für automatische Suchen und Downloads.</div>

      {/* Stats */}
      {indexers.length > 0 && (
        <div className="idx-stats-row">
          <div className="idx-stat-card">
            <div className="idx-stat-val">{indexers.filter(i => i.enabled).length}</div>
            <div className="idx-stat-lbl">Aktive Indexer</div>
            <div className="idx-stat-sub">von {indexers.length} gesamt</div>
          </div>
          <div className="idx-stat-card">
            <div className="idx-stat-val">{totalQueries.toLocaleString()}</div>
            <div className="idx-stat-lbl">Suchanfragen</div>
            <div className="idx-stat-sub">{successRate}% erfolgreich</div>
          </div>
          <div className="idx-stat-card">
            <div className="idx-stat-val">{avgMs}ms</div>
            <div className="idx-stat-lbl">Ø Antwortzeit</div>
          </div>
          <div className="idx-stat-card">
            <div className="idx-stat-val">{indexers.filter(i => i.test_status === 'ok').length}</div>
            <div className="idx-stat-lbl">Getestet OK</div>
            <div className="idx-stat-sub">{indexers.filter(i => i.test_status === 'failed').length} fehlgeschlagen</div>
          </div>
        </div>
      )}

      {/* Indexer list */}
      {loading ? (
        <div style={{ color: '#4b5563', padding: '40px', textAlign: 'center' }}>Lädt...</div>
      ) : indexers.length === 0 ? (
        <div className="empty-idx">
          <Globe size={40} style={{ margin: '0 auto 12px', opacity: 0.2, display: 'block' }} />
          Noch keine Indexer konfiguriert.<br />
          <button className="add-btn" style={{ marginTop: '16px', display: 'inline-flex' }}
            onClick={() => { setEditIndexer(null); setShowModal(true); }}>
            <Plus size={14} /> Ersten Indexer hinzufügen
          </button>
        </div>
      ) : (
        <div className="idx-list">
          {indexers.map(idx => (
            <div key={idx.id} className={`idx-card ${!idx.enabled ? 'disabled' : ''}`}>
              <div className="idx-card-head">
                <span className={`idx-type-badge ${TYPE_BADGE[idx.type] || ''}`}>
                  {TYPE_LABELS[idx.type] || idx.type}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="idx-name">{idx.name}</div>
                  <div className="idx-url">{idx.url}</div>
                </div>

                {/* Test status */}
                {idx.test_status === 'ok' && (
                  <div className="test-ok"><CheckCircle size={12} /> OK</div>
                )}
                {idx.test_status === 'failed' && (
                  <div className="test-fail"><XCircle size={12} /> Fehler</div>
                )}

                {/* Priority */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button className="icon-btn" onClick={() => handlePriorityChange(idx, 5)} title="Priorität erhöhen">
                    <ChevronUp size={14} />
                  </button>
                  <span className="prio-badge">{idx.priority}</span>
                  <button className="icon-btn" onClick={() => handlePriorityChange(idx, -5)} title="Priorität senken">
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="idx-head-actions">
                  <button className="icon-btn icon-btn-success" title="Verbindung testen"
                    onClick={() => testIndexer(idx)} disabled={testingId === idx.id}>
                    {testingId === idx.id
                      ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                      : <Zap size={14} />}
                  </button>
                  <button className="icon-btn" title="Bearbeiten"
                    onClick={() => { setEditIndexer(idx); setShowModal(true); }}>
                    <Edit2 size={14} />
                  </button>
                  <button className="icon-btn" title={idx.enabled ? 'Deaktivieren' : 'Aktivieren'}
                    onClick={() => handleToggle(idx)}
                    style={{ color: idx.enabled ? '#10b981' : '#6b7280' }}>
                    {idx.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button className="icon-btn icon-btn-danger" title="Löschen"
                    onClick={() => handleDelete(idx)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Stats row */}
              {idx.total_queries > 0 && (
                <div className="idx-stats">
                  <div className="idx-stat-item">
                    <span className="idx-stat-item-val">{idx.total_queries}</span>
                    <span className="idx-stat-item-lbl">Anfragen</span>
                  </div>
                  <div className="idx-stat-item">
                    <span className="idx-stat-item-val" style={{ color: '#10b981' }}>{idx.successful_queries}</span>
                    <span className="idx-stat-item-lbl">Erfolgreich</span>
                  </div>
                  <div className="idx-stat-item">
                    <span className="idx-stat-item-val">{idx.avg_response_ms}ms</span>
                    <span className="idx-stat-item-lbl">Ø Antwort</span>
                  </div>
                  {idx.last_queried_at && (
                    <div className="idx-stat-item">
                      <span className="idx-stat-item-val" style={{ fontSize: '11px' }}>
                        {new Date(idx.last_queried_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="idx-stat-item-lbl">Letzte Anfrage</span>
                    </div>
                  )}
                  {idx.categories && (
                    <div className="idx-stat-item">
                      <span className="idx-stat-item-val" style={{ fontSize: '11px', fontFamily: "'Space Mono',monospace" }}>{idx.categories}</span>
                      <span className="idx-stat-item-lbl">Kategorien</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <IndexerModal
          indexer={editIndexer}
          onClose={() => { setShowModal(false); setEditIndexer(null); }}
          onSaved={load}
        />
      )}
    </>
  );
}
