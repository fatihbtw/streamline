import React, { useState, useEffect } from 'react';
import { Download, Pause, Play, Trash2, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .dl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
  .dl-title { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; color: #e8e8f0; }
  .dl-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 8px; color: #6b7280; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .dl-refresh:hover { color: #e8e8f0; }
  .section-title { font-size: 15px; font-weight: 600; color: #e8e8f0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .queue-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  .queue-table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #1a1a2e; }
  .queue-table td { padding: 12px 14px; font-size: 13px; color: #d1d5db; border-bottom: 1px solid #0f0f1a; vertical-align: middle; }
  .queue-table tr:hover td { background: #0f0f1a; }
  .progress-bar-wrap { width: 100%; height: 6px; background: #1a1a2e; border-radius: 3px; overflow: hidden; }
  .progress-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px; transition: width 0.5s; }
  .action-btn { padding: 5px; background: none; border: none; cursor: pointer; border-radius: 4px; }
  .action-btn:hover { background: #1a1a2e; }
  .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .status-downloading { background: rgba(99,102,241,0.15); color: #6366f1; }
  .status-queued { background: rgba(234,179,8,0.15); color: #ca8a04; }
  .status-completed { background: rgba(34,197,94,0.15); color: #16a34a; }
  .status-failed { background: rgba(239,68,68,0.15); color: #dc2626; }
  .status-paused { background: rgba(107,114,128,0.15); color: #6b7280; }
  .empty-box { padding: 32px; text-align: center; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 10px; color: #4b5563; font-size: 14px; margin-bottom: 24px; }
  .not-configured { padding: 24px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 10px; color: #6b7280; font-size: 14px; margin-bottom: 24px; }
`;

function statusClass(s) {
  return { Downloading: 'status-downloading', Queued: 'status-queued', Completed: 'status-completed', Failed: 'status-failed', Paused: 'status-paused' }[s] || '';
}

export default function DownloadsPage() {
  const [sabData, setSabData] = useState(null);
  const [sabError, setSabError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get('/downloads/sabnzbd');
      setSabData(res.data);
      setSabError(null);
    } catch (err) {
      setSabError(err.response?.data?.error || 'Verbindung fehlgeschlagen');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 10000); return () => clearInterval(t); }, []);

  const doAction = async (action, nzo_id) => {
    try {
      await api.post('/downloads/sabnzbd/action', { action, nzo_id });
      toast.success(`Aktion "${action}" ausgeführt`);
      fetchData();
    } catch { toast.error('Aktion fehlgeschlagen'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="dl-header">
        <div className="dl-title">Downloads</div>
        <button className="dl-refresh" onClick={fetchData}>
          <RefreshCw size={14} /> Aktualisieren
        </button>
      </div>

      <div className="section-title">
        <div className="live-dot" />
        SABnzbd — Live-Queue
      </div>

      {loading ? <div className="empty-box">Lade...</div>
        : sabError ? <div className="not-configured">⚠️ {sabError} — SABnzbd in den <a href="/settings" style={{ color: '#6366f1' }}>Einstellungen</a> konfigurieren.</div>
        : sabData?.queue?.length === 0 ? <div className="empty-box">Queue ist leer</div>
        : (
        <table className="queue-table">
          <thead>
            <tr>
              <th>Datei</th>
              <th>Fortschritt</th>
              <th>Größe</th>
              <th>ETA</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {(sabData?.queue || []).map(item => (
              <tr key={item.id}>
                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</td>
                <td style={{ minWidth: '120px' }}>
                  <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: `${item.progress || 0}%` }} /></div>
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', display: 'block' }}>{Math.round(item.progress || 0)}%</span>
                </td>
                <td>{item.size ? `${parseFloat(item.size).toFixed(1)} MB` : '-'}</td>
                <td>{item.eta || '-'}</td>
                <td><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="action-btn" onClick={() => doAction('pause', item.id)} title="Pausieren"><Pause size={14} color="#6b7280" /></button>
                    <button className="action-btn" onClick={() => doAction('resume', item.id)} title="Fortsetzen"><Play size={14} color="#6b7280" /></button>
                    <button className="action-btn" onClick={() => doAction('delete', item.id)} title="Löschen"><Trash2 size={14} color="#ef4444" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {sabData?.history?.length > 0 && (
        <>
          <div className="section-title"><CheckCircle size={16} color="#10b981" />Verlauf</div>
          <table className="queue-table">
            <thead>
              <tr><th>Datei</th><th>Größe</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sabData.history.map(item => (
                <tr key={item.id}>
                  <td style={{ maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</td>
                  <td>{item.size ? `${(item.size / 1024 / 1024).toFixed(1)} MB` : '-'}</td>
                  <td><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
