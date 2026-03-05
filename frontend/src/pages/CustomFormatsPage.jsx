import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .cf-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0;margin-bottom:6px; }
  .cf-sub { font-size:14px;color:#6b7280;margin-bottom:28px; }
  .cf-tabs { display:flex;gap:4px;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:10px;padding:4px;margin-bottom:28px;width:fit-content; }
  .cf-tab { padding:8px 18px;border:none;border-radius:7px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;background:none;color:#6b7280; }
  .cf-tab.active { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white; }

  /* Format list */
  .cf-list { display:flex;flex-direction:column;gap:10px;margin-bottom:24px; }
  .cf-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;overflow:hidden; }
  .cf-card-header { display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer; }
  .cf-card-header:hover { background:#131320; }
  .cf-name { flex:1;font-size:14px;font-weight:600;color:#e8e8f0; }
  .cf-score-badge { padding:3px 10px;border-radius:6px;font-size:13px;font-weight:700;font-family:'Space Mono',monospace; }
  .score-pos { background:rgba(16,185,129,0.1);color:#10b981; }
  .score-neg { background:rgba(239,68,68,0.1);color:#ef4444; }
  .score-zero { background:rgba(107,114,128,0.1);color:#6b7280; }
  .cf-cond-count { font-size:12px;color:#4b5563; }
  .cf-delete { background:none;border:none;color:#4b5563;cursor:pointer;padding:4px;border-radius:4px; }
  .cf-delete:hover { color:#ef4444; }
  .cf-card-body { padding:0 18px 14px;border-top:1px solid #0d0d18; }
  .cf-conditions { margin-top:12px;display:flex;flex-direction:column;gap:6px; }
  .cf-cond-row { display:flex;align-items:center;gap:8px;padding:7px 12px;background:#1a1a2e;border-radius:7px;font-size:13px; }
  .cond-type { color:#6366f1;font-size:11px;padding:2px 7px;background:rgba(99,102,241,0.1);border-radius:4px;font-weight:500; }
  .cond-value { flex:1;color:#d1d5db; }
  .cond-negate { font-size:11px;color:#ef4444;padding:2px 6px;background:rgba(239,68,68,0.1);border-radius:4px; }
  .score-edit { width:80px;padding:6px 10px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:6px;color:#e8e8f0;font-size:13px;font-family:'Space Mono',monospace;outline:none;text-align:center; }
  .score-edit:focus { border-color:#6366f1; }
  .empty-state { padding:48px;text-align:center;color:#4b5563;font-size:14px;background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px; }

  /* Import panel */
  .import-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;padding:24px; }
  .import-card-title { font-size:15px;font-weight:600;color:#e8e8f0;margin-bottom:6px; }
  .import-card-sub { font-size:13px;color:#6b7280;margin-bottom:16px;line-height:1.5; }
  .source-toggle { display:flex;gap:4px;margin-bottom:12px; }
  .source-btn { padding:7px 16px;border:1px solid #2a2a4e;border-radius:7px;background:#1a1a2e;color:#6b7280;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.15s;text-transform:capitalize; }
  .source-btn.active { border-color:#6366f1;color:#6366f1;background:rgba(99,102,241,0.1); }
  .import-hint { font-size:12px;color:#4b5563;margin-bottom:10px;line-height:1.5; }
  .import-textarea { width:100%;min-height:140px;padding:12px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:12px;font-family:'Space Mono',monospace;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6; }
  .import-textarea:focus { border-color:#6366f1; }
  .btn-primary { padding:10px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;margin-top:12px; }
  .btn-primary:disabled { opacity:0.6;cursor:not-allowed; }
  .warn-box { display:flex;align-items:flex-start;gap:10px;padding:12px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:13px;color:#d97706;margin-bottom:16px;line-height:1.5; }
`;

function scoreClass(s) {
  if (s > 0) return 'score-pos';
  if (s < 0) return 'score-neg';
  return 'score-zero';
}

function FormatCard({ fmt, onDelete, onScoreChange }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(fmt.score ?? 0);

  const handleScoreBlur = () => {
    const n = parseInt(score);
    if (!isNaN(n) && n !== fmt.score) onScoreChange(fmt.name, n);
  };

  return (
    <div className="cf-card">
      <div className="cf-card-header" onClick={() => setOpen(o => !o)}>
        <div className="cf-name">{fmt.name}</div>
        <input
          className="score-edit"
          value={score}
          onChange={e => setScore(e.target.value)}
          onBlur={handleScoreBlur}
          onClick={e => e.stopPropagation()}
          type="number"
        />
        <span className={`cf-score-badge ${scoreClass(fmt.score)}`}>
          {fmt.score > 0 ? '+' : ''}{fmt.score ?? 0}
        </span>
        <span className="cf-cond-count">{(fmt.conditions||[]).length} condition{(fmt.conditions||[]).length !== 1 ? 's' : ''}</span>
        {open ? <ChevronUp size={16} color="#4b5563" /> : <ChevronDown size={16} color="#4b5563" />}
        <button className="cf-delete" onClick={e => { e.stopPropagation(); onDelete(fmt.name); }} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
      {open && (
        <div className="cf-card-body">
          {(fmt.conditions || []).length === 0
            ? <div style={{fontSize:'13px',color:'#4b5563',paddingTop:'8px'}}>No conditions defined</div>
            : <div className="cf-conditions">
                {fmt.conditions.map((c, i) => (
                  <div key={i} className="cf-cond-row">
                    <span className="cond-type">{c.type}</span>
                    <span className="cond-value">{c.value || '—'}</span>
                    {c.negate && <span className="cond-negate">negated</span>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

function FormatList({ formats, onDelete, onScoreChange }) {
  if (formats.length === 0) return (
    <div className="empty-state">
      No custom formats yet. Import them from the <strong>Import</strong> tab.
    </div>
  );
  return (
    <div className="cf-list">
      {formats.map(f => (
        <FormatCard key={f.name} fmt={f} onDelete={onDelete} onScoreChange={onScoreChange} />
      ))}
    </div>
  );
}

function ImportPanel({ onImported }) {
  const [source, setSource] = useState('radarr');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const doImport = async () => {
    if (!text.trim()) { toast.error('Paste JSON first'); return; }
    setLoading(true);
    try {
      let data = JSON.parse(text);
      if (!Array.isArray(data)) data = [data];
      const res = await api.post('/settings/import-custom-formats', { source, data });
      toast.success(`Imported ${res.data.imported} format(s) — ${res.data.total} total`);
      setText('');
      onImported();
    } catch (err) {
      toast.error(err.message?.includes('JSON') ? 'Invalid JSON — check your export' : (err.response?.data?.error || 'Import failed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="import-card">
      <div className="import-card-title">Import from Radarr / Sonarr</div>
      <div className="import-card-sub">
        Export your Custom Formats from Radarr or Sonarr and paste the JSON here.
        Existing formats with the same name will be updated.
      </div>
      <div className="warn-box">
        ⚠️ In Radarr/Sonarr: <strong>Settings → Custom Formats → select all → Export</strong>. Paste the resulting JSON below.
      </div>
      <div className="source-toggle">
        {['radarr', 'sonarr'].map(s => (
          <button key={s} className={`source-btn ${source === s ? 'active' : ''}`} onClick={() => setSource(s)}>{s}</button>
        ))}
      </div>
      <div className="import-hint">Paste the exported JSON array from {source === 'radarr' ? 'Radarr' : 'Sonarr'} below:</div>
      <textarea
        className="import-textarea"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={'[\n  { "name": "Remux", ... },\n  { "name": "HDR", ... }\n]'}
      />
      <br />
      <button className="btn-primary" onClick={doImport} disabled={loading || !text.trim()}>
        {loading ? 'Importing...' : `Import ${source === 'radarr' ? 'Radarr' : 'Sonarr'} Formats`}
      </button>
    </div>
  );
}

export default function CustomFormatsPage() {
  const [formats, setFormats] = useState([]);
  const [tab, setTab] = useState('formats');

  const load = () => api.get('/settings/custom-formats').then(r => setFormats(r.data.formats || [])).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleDelete = async (name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    const updated = formats.filter(f => f.name !== name);
    await api.post('/settings/custom-formats', { formats: updated });
    setFormats(updated);
    toast.success('Format removed');
  };

  const handleScoreChange = async (name, newScore) => {
    const updated = formats.map(f => f.name === name ? { ...f, score: newScore } : f);
    await api.post('/settings/custom-formats', { formats: updated });
    setFormats(updated);
    toast.success(`Score updated to ${newScore > 0 ? '+' : ''}${newScore}`);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cf-title">Custom Formats</div>
      <div className="cf-sub">Define scoring rules applied to NZB search results — just like Radarr & Sonarr.</div>
      <div className="cf-tabs">
        <button className={`cf-tab ${tab === 'formats' ? 'active' : ''}`} onClick={() => setTab('formats')}>
          Formats {formats.length > 0 && `(${formats.length})`}
        </button>
        <button className={`cf-tab ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>Import</button>
      </div>
      {tab === 'formats'
        ? <FormatList formats={formats} onDelete={handleDelete} onScoreChange={handleScoreChange} />
        : <ImportPanel onImported={() => { load(); setTab('formats'); }} />}
    </>
  );
}
