import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, Calendar, Film, Tv, Trash2, Search,
  HardDrive, FileVideo, FolderOpen, Link2, Link2Off,
  CheckCircle, XCircle, Loader, ChevronRight,
  Monitor, Volume2, Clock, Zap, AlertTriangle,
  CheckSquare, Square, RefreshCw, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import NzbSearchModal from '../components/NzbSearchModal';

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = `
  @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }

  /* ── Back / hero ── */
  .back-btn { display:flex;align-items:center;gap:6px;color:#6b7280;font-size:14px;cursor:pointer;background:none;border:none;padding:0;margin-bottom:24px;font-family:'DM Sans',sans-serif; }
  .back-btn:hover { color:#e8e8f0; }
  .detail-hero { display:flex;gap:28px;margin-bottom:32px;flex-wrap:wrap; }
  .detail-poster { width:180px;flex-shrink:0;border-radius:12px;overflow:hidden; }
  .detail-poster img { width:100%;display:block; }
  .detail-poster-ph { width:180px;height:270px;background:#1a1a2e;border-radius:12px;display:flex;align-items:center;justify-content:center; }
  .detail-info { flex:1;min-width:240px; }
  .detail-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0;line-height:1.2;margin-bottom:10px; }
  .detail-original { font-size:13px;color:#6b7280;margin-top:-6px;margin-bottom:10px;font-style:italic; }
  .detail-meta { display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px; }
  .meta-item { display:flex;align-items:center;gap:5px;font-size:14px;color:#9ca3af; }
  .detail-overview { font-size:14px;color:#9ca3af;line-height:1.6;margin-bottom:20px;max-width:680px; }
  .detail-actions { display:flex;gap:10px;flex-wrap:wrap; }
  .action-primary { padding:10px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;font-size:14px; }
  .action-secondary { padding:10px 20px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#9ca3af;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;font-size:14px; }
  .action-secondary:hover { color:#e8e8f0;border-color:#6366f1; }
  .action-danger { padding:10px 20px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#dc2626;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;font-size:14px; }
  .status-badge { display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:500; }
  .status-wanted { background:rgba(234,179,8,0.15);color:#ca8a04; }
  .status-downloaded { background:rgba(34,197,94,0.15);color:#16a34a; }
  .status-downloading { background:rgba(99,102,241,0.15);color:#6366f1; }
  .status-missing { background:rgba(239,68,68,0.15);color:#dc2626; }

  /* ── Section headings ── */
  .section-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;padding:20px;margin-bottom:20px;animation:fadeIn 0.25s ease; }
  .section-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
  .section-title { font-size:14px;font-weight:600;color:#e8e8f0;display:flex;align-items:center;gap:8px; }
  .section-title svg { color:#6366f1; }

  /* ── File card ── */
  .file-path-row { display:flex;align-items:center;gap:10px;padding:10px 14px;background:#1a1a2e;border-radius:8px;margin-bottom:14px; }
  .file-path-text { flex:1;font-family:'Space Mono',monospace;font-size:12px;color:#a5b4fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0; }
  .file-not-found { display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:13px;color:#dc2626;margin-bottom:14px; }

  .tech-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px; }
  .tech-chip { background:#1a1a2e;border:1px solid #1e1e35;border-radius:8px;padding:12px 14px; }
  .tech-chip-label { font-size:10px;font-weight:600;color:#4b5563;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px; }
  .tech-chip-value { font-size:14px;font-weight:600;color:#e8e8f0;display:flex;align-items:center;gap:5px; }
  .tech-chip-value svg { color:#6366f1;flex-shrink:0; }
  .tech-chip-sub { font-size:11px;color:#6b7280;margin-top:2px; }

  /* HDR / codec badges */
  .badge-hdr { display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;margin-left:5px; }
  .badge-codec { display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;background:rgba(99,102,241,0.2);color:#818cf8; }

  /* Audio tracks */
  .audio-list { display:flex;flex-direction:column;gap:6px;margin-top:10px; }
  .audio-row { display:flex;align-items:center;gap:10px;padding:8px 12px;background:#1a1a2e;border-radius:6px;font-size:12px;color:#9ca3af; }
  .audio-codec { font-weight:700;color:#e8e8f0;font-size:11px;padding:2px 6px;background:rgba(139,92,246,0.15);border-radius:4px; }
  .audio-lang { font-size:11px;padding:2px 6px;background:#0f0f1a;border-radius:4px;color:#6b7280; }
  .audio-ch { font-size:11px;color:#6b7280; }

  /* No file state */
  .no-file-state { text-align:center;padding:28px 20px;color:#4b5563; }
  .no-file-icon { width:52px;height:52px;background:#1a1a2e;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 12px; }
  .no-file-title { font-size:14px;font-weight:500;color:#9ca3af;margin-bottom:6px; }
  .no-file-sub { font-size:12px;color:#4b5563;margin-bottom:16px; }
  .link-file-btn { display:inline-flex;align-items:center;gap:7px;padding:9px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif; }
  .unlink-btn { padding:6px 12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:6px;color:#dc2626;font-size:12px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px; }
  .unlink-btn:hover { background:rgba(239,68,68,0.15); }
  .refresh-btn { padding:6px 10px;background:none;border:1px solid #2a2a4e;border-radius:6px;color:#6b7280;cursor:pointer;display:flex;align-items:center;gap:5px;font-size:12px;font-family:'DM Sans',sans-serif; }
  .refresh-btn:hover { color:#e8e8f0; }

  /* ── Manual Import Modal ── */
  .mi-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px); }
  .mi-modal { background:#0f0f1a;border:1px solid #2a2a4e;border-radius:16px;width:100%;max-width:760px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden; }
  .mi-header { padding:18px 22px;border-bottom:1px solid #1a1a2e;display:flex;align-items:center;justify-content:space-between; }
  .mi-title { font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:#e8e8f0; }
  .mi-close { background:none;border:none;color:#6b7280;cursor:pointer;padding:4px;border-radius:6px; }
  .mi-close:hover { color:#e8e8f0;background:#1a1a2e; }
  .mi-body { flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px; }

  /* Manual path input */
  .mi-manual-row { display:flex;gap:8px;align-items:flex-start;flex-direction:column; }
  .mi-label { font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px; }
  .mi-path-input { width:100%;padding:10px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'Space Mono',monospace;outline:none;box-sizing:border-box; }
  .mi-path-input:focus { border-color:#6366f1; }
  .mi-link-direct-btn { padding:9px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap;align-self:flex-end; }
  .mi-link-direct-btn:disabled { opacity:0.5;cursor:not-allowed; }

  .mi-divider { display:flex;align-items:center;gap:12px;color:#2a2a4e;font-size:12px;color:#374151; }
  .mi-divider::before,.mi-divider::after { content:'';flex:1;height:1px;background:#1a1a2e; }

  /* Folder scan section */
  .mi-scan-bar { display:flex;gap:8px; }
  .mi-scan-input { flex:1;padding:9px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:13px;font-family:'Space Mono',monospace;outline:none; }
  .mi-scan-input:focus { border-color:#6366f1; }
  .mi-scan-btn { padding:9px 16px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#9ca3af;font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap; }
  .mi-scan-btn:hover { color:#e8e8f0;border-color:#6366f1; }
  .mi-scan-btn:disabled { opacity:0.5;cursor:not-allowed; }

  .mi-file-list { display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto; }
  .mi-file-row {
    display:flex;align-items:center;gap:12px;
    padding:11px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;
    cursor:pointer;transition:all 0.15s;
  }
  .mi-file-row:hover { border-color:#6366f1;background:rgba(99,102,241,0.04); }
  .mi-file-row.best-match { border-color:rgba(99,102,241,0.4);background:rgba(99,102,241,0.06); }
  .mi-file-icon { color:#6366f1;flex-shrink:0; }
  .mi-file-info { flex:1;min-width:0; }
  .mi-file-name { font-size:13px;font-weight:500;color:#e8e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .mi-file-path { font-size:11px;color:#4b5563;font-family:'Space Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px; }
  .mi-file-meta { display:flex;gap:6px;align-items:center;flex-shrink:0;flex-wrap:wrap; }
  .mi-qual-badge { font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(99,102,241,0.15);color:#818cf8;font-weight:600; }
  .mi-size-text { font-size:11px;color:#4b5563;white-space:nowrap; }
  .mi-best-label { font-size:10px;padding:2px 7px;border-radius:4px;background:rgba(16,185,129,0.15);color:#10b981;font-weight:700; }
  .mi-select-btn { padding:6px 12px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:6px;color:#6366f1;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:background 0.15s; }
  .mi-select-btn:hover { background:rgba(99,102,241,0.2); }

  .mi-empty { padding:28px;text-align:center;color:#4b5563;font-size:13px; }
  .mi-hint { display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:7px;font-size:12px;color:#818cf8;line-height:1.5; }
  .mi-hint svg { flex-shrink:0;margin-top:1px; }

  /* ── Seasons ── */
  .seasons-section { margin-top:4px; }
  .season-block { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;margin-bottom:14px;overflow:hidden; }
  .season-head { padding:14px 18px;display:flex;align-items:center;justify-content:space-between; }
  .season-title { font-size:14px;font-weight:600;color:#e8e8f0; }
  .season-stats { font-size:12px;color:#6b7280; }
  .episodes-table { width:100%;border-collapse:collapse; }
  .episodes-table th { text-align:left;padding:8px 16px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1a1a2e; }
  .episodes-table td { padding:10px 16px;font-size:13px;color:#d1d5db;border-bottom:1px solid #0d0d18; }
  .episodes-table tr:last-child td { border-bottom:none; }
  .ep-badge { font-size:11px;padding:2px 7px;border-radius:4px;font-weight:500; }
  .ep-wanted { background:rgba(234,179,8,0.15);color:#ca8a04; }
  .ep-downloaded { background:rgba(34,197,94,0.15);color:#16a34a; }
  .ep-unaired { background:rgba(107,114,128,0.15);color:#6b7280; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtSize(bytes) {
  if (!bytes) return null;
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 / 1024;
  return `${Math.round(mb)} MB`;
}

function fmtDuration(secs) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function fmtChannels(n) {
  const map = { 1: 'Mono', 2: 'Stereo', 6: '5.1', 8: '7.1' };
  return map[n] || (n ? `${n}ch` : null);
}

/** Score a filename for how well it matches the media title (for auto-sorting) */
function matchScore(filename, title, originalTitle, year) {
  const fn = filename.toLowerCase().replace(/[._\-]/g, ' ');
  let score = 0;
  const targets = [
    (originalTitle || title).toLowerCase(),
    (title || '').toLowerCase(),
  ];
  for (const t of targets) {
    const words = t.split(/\s+/).filter(w => w.length > 2);
    for (const w of words) {
      if (fn.includes(w)) score += w.length;
    }
  }
  if (year && fn.includes(String(year))) score += 10;
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// File Info Card
// ─────────────────────────────────────────────────────────────────────────────
function FileInfoCard({ itemId, itemTitle, originalTitle, year, onFileLinked }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/media/${itemId}/file-info`)
      .then(r => setInfo(r.data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => { load(); }, [load]);

  const unlink = async () => {
    if (!window.confirm('Dateiverknüpfung entfernen? Der Eintrag bleibt in der Bibliothek.')) return;
    setUnlinking(true);
    try {
      await api.delete(`/media/${itemId}/unlink-file`);
      toast.success('Verknüpfung entfernt');
      setInfo({ linked: false });
      if (onFileLinked) onFileLinked(null);
    } catch { toast.error('Fehler'); }
    finally { setUnlinking(false); }
  };

  const handleLinked = (path) => {
    setShowImport(false);
    load();
    if (onFileLinked) onFileLinked(path);
  };

  return (
    <>
      <div className="section-card">
        <div className="section-head">
          <div className="section-title">
            <HardDrive size={15} /> Verknüpfte Datei
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {info?.linked && info?.accessible && (
              <button className="refresh-btn" onClick={load}><RefreshCw size={12} /> Aktualisieren</button>
            )}
            {info?.linked && (
              <button className="unlink-btn" onClick={unlink} disabled={unlinking}>
                <Link2Off size={12} /> {unlinking ? '...' : 'Verknüpfung lösen'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#4b5563', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Lese Dateiinfo...
          </div>
        ) : !info?.linked ? (
          <div className="no-file-state">
            <div className="no-file-icon"><FileVideo size={24} color="#2a2a4e" /></div>
            <div className="no-file-title">Keine Datei verknüpft</div>
            <div className="no-file-sub">Datei manuell verknüpfen um Auflösung, Codec und weitere Infos anzuzeigen.</div>
            <button className="link-file-btn" onClick={() => setShowImport(true)}>
              <FolderOpen size={14} /> Datei manuell importieren
            </button>
          </div>
        ) : !info?.accessible ? (
          <>
            <div className="file-not-found">
              <AlertTriangle size={14} />
              <span>Datei nicht mehr erreichbar: <code style={{ fontSize: '11px', marginLeft: '4px' }}>{info.path}</code></span>
            </div>
            <button className="link-file-btn" onClick={() => setShowImport(true)}>
              <FolderOpen size={14} /> Neue Datei verknüpfen
            </button>
          </>
        ) : (
          <>
            {/* Path row */}
            <div className="file-path-row">
              <FileVideo size={14} color="#6366f1" style={{ flexShrink: 0 }} />
              <span className="file-path-text" title={info.path}>{info.path}</span>
              {info.size_bytes && (
                <span style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>
                  {fmtSize(info.size_bytes)}
                </span>
              )}
            </div>

            {/* Technical grid */}
            <div className="tech-grid">

              {/* Resolution */}
              {info.video?.resolution && (
                <div className="tech-chip">
                  <div className="tech-chip-label">Auflösung</div>
                  <div className="tech-chip-value">
                    <Monitor size={13} />
                    {info.video.resolution}
                    {info.video.hdr && <span className="badge-hdr">HDR</span>}
                  </div>
                  <div className="tech-chip-sub">{info.quality_detected}</div>
                </div>
              )}

              {/* Video Codec */}
              {info.video?.codec && (
                <div className="tech-chip">
                  <div className="tech-chip-label">Video-Codec</div>
                  <div className="tech-chip-value">
                    <Zap size={13} />
                    {info.video.codec}
                    {info.video.bit_depth && info.video.bit_depth > 8 && (
                      <span className="badge-codec">{info.video.bit_depth}bit</span>
                    )}
                  </div>
                  <div className="tech-chip-sub">
                    {info.video.fps && `${info.video.fps} fps`}
                    {info.video.profile && ` · ${info.video.profile}`}
                  </div>
                </div>
              )}

              {/* Bitrate */}
              {info.bitrate_kbps && (
                <div className="tech-chip">
                  <div className="tech-chip-label">Bitrate</div>
                  <div className="tech-chip-value">
                    <Zap size={13} />
                    {info.bitrate_kbps > 1000
                      ? `${(info.bitrate_kbps / 1000).toFixed(1)} Mbps`
                      : `${info.bitrate_kbps} kbps`}
                  </div>
                </div>
              )}

              {/* Duration */}
              {info.duration_seconds && (
                <div className="tech-chip">
                  <div className="tech-chip-label">Laufzeit</div>
                  <div className="tech-chip-value">
                    <Clock size={13} />
                    {fmtDuration(info.duration_seconds)}
                  </div>
                </div>
              )}

              {/* Container */}
              {info.format_name && (
                <div className="tech-chip">
                  <div className="tech-chip-label">Container</div>
                  <div className="tech-chip-value" style={{ fontSize: '12px' }}>
                    {info.format_name}
                  </div>
                </div>
              )}

              {/* File size */}
              {info.size_bytes && (
                <div className="tech-chip">
                  <div className="tech-chip-label">Dateigröße</div>
                  <div className="tech-chip-value">
                    <HardDrive size={13} />
                    {fmtSize(info.size_bytes)}
                  </div>
                </div>
              )}
            </div>

            {/* Audio tracks */}
            {info.audio?.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={12} /> Audio-Spuren
                </div>
                <div className="audio-list">
                  {info.audio.map((a, i) => (
                    <div key={i} className="audio-row">
                      <Volume2 size={13} color="#6366f1" style={{ flexShrink: 0 }} />
                      {a.codec && <span className="audio-codec">{a.codec}</span>}
                      {a.channel_layout
                        ? <span className="audio-ch">{a.channel_layout}</span>
                        : a.channels && <span className="audio-ch">{fmtChannels(a.channels)}</span>}
                      {a.language && <span className="audio-lang">{a.language.toUpperCase()}</span>}
                      {a.title && <span style={{ fontSize: '11px', color: '#4b5563' }}>{a.title}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ffprobe not available notice */}
            {info.ffprobe_available === false && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={12} /> ffprobe nicht verfügbar — nur Basisinfos werden angezeigt
              </div>
            )}
          </>
        )}
      </div>

      {showImport && (
        <ManualImportModal
          itemId={itemId}
          itemTitle={itemTitle}
          originalTitle={originalTitle}
          year={year}
          onClose={() => setShowImport(false)}
          onLinked={handleLinked}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual Import Modal — like Radarr/Sonarr
// ─────────────────────────────────────────────────────────────────────────────
function ManualImportModal({ itemId, itemTitle, originalTitle, year, onClose, onLinked }) {
  const [directPath, setDirectPath] = useState('');
  const [linking, setLinking] = useState(false);
  const [scanPath, setScanPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [files, setFiles] = useState(null); // null = not scanned yet

  const linkDirect = async () => {
    if (!directPath.trim()) return;
    setLinking(true);
    try {
      await api.post(`/media/${itemId}/link-file`, { path: directPath.trim() });
      toast.success('Datei verknüpft');
      onLinked(directPath.trim());
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verknüpfung fehlgeschlagen');
    } finally { setLinking(false); }
  };

  const doScan = async () => {
    if (!scanPath.trim()) return;
    setScanning(true);
    try {
      const res = await api.post('/import/scan-folder', { path: scanPath.trim(), maxFiles: 300 });
      // Sort by match score against media title
      const sorted = (res.data.files || []).map(f => ({
        ...f,
        matchScore: matchScore(f.filename, itemTitle, originalTitle, year),
      })).sort((a, b) => b.matchScore - a.matchScore);
      setFiles(sorted);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scan fehlgeschlagen');
    } finally { setScanning(false); }
  };

  const selectFile = async (filePath) => {
    try {
      await api.post(`/media/${itemId}/link-file`, { path: filePath });
      toast.success('Datei verknüpft');
      onLinked(filePath);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verknüpfung fehlgeschlagen');
    }
  };

  const qualityFromFilename = (fn) => {
    const f = fn.toLowerCase();
    if (f.includes('2160') || f.includes('4k') || f.includes('uhd')) return '2160p';
    if (f.includes('1080')) return '1080p';
    if (f.includes('720')) return '720p';
    return null;
  };

  return (
    <div className="mi-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mi-modal">
        <div className="mi-header">
          <div className="mi-title">Datei manuell importieren — {itemTitle}</div>
          <button className="mi-close" onClick={onClose}><XCircle size={18} /></button>
        </div>

        <div className="mi-body">
          {/* Hint */}
          <div className="mi-hint">
            <Info size={13} />
            <span>
              Wie Radarr/Sonarr: Ordner scannen und die beste Datei auswählen — oder direkt einen vollständigen Pfad eingeben.
              Die Datei muss auf dem Server zugänglich sein.
            </span>
          </div>

          {/* Direct path input */}
          <div>
            <div className="mi-label">Direkter Dateipfad</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="mi-path-input"
                value={directPath}
                onChange={e => setDirectPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && linkDirect()}
                placeholder="/downloads/movies/Film.2024.1080p.mkv"
              />
              <button className="mi-link-direct-btn" onClick={linkDirect} disabled={linking || !directPath.trim()}>
                {linking
                  ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Link2 size={13} />}
                {linking ? 'Verknüpft...' : 'Verknüpfen'}
              </button>
            </div>
          </div>

          <div className="mi-divider">oder Ordner scannen</div>

          {/* Folder scan */}
          <div>
            <div className="mi-label">Ordner auf dem Server scannen</div>
            <div className="mi-scan-bar">
              <input
                className="mi-scan-input"
                value={scanPath}
                onChange={e => setScanPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doScan()}
                placeholder="/downloads/movies"
              />
              <button className="mi-scan-btn" onClick={doScan} disabled={scanning || !scanPath.trim()}>
                {scanning
                  ? <Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <FolderOpen size={13} />}
                {scanning ? 'Scannt...' : 'Scannen'}
              </button>
            </div>
          </div>

          {/* Scan results */}
          {files !== null && (
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileVideo size={13} />
                {files.length} Dateien gefunden
                {files.length > 0 && <span style={{ color: '#6366f1' }}>· Sortiert nach Titelübereinstimmung</span>}
              </div>

              {files.length === 0 ? (
                <div className="mi-empty">Keine Videodateien in diesem Ordner gefunden</div>
              ) : (
                <div className="mi-file-list">
                  {files.map((f, i) => {
                    const qual = qualityFromFilename(f.filename);
                    const isBest = i === 0 && f.matchScore > 0;
                    return (
                      <div
                        key={i}
                        className={`mi-file-row ${isBest ? 'best-match' : ''}`}
                        onClick={() => selectFile(f.filePath)}
                      >
                        <FileVideo size={16} className="mi-file-icon" />
                        <div className="mi-file-info">
                          <div className="mi-file-name">{f.filename}</div>
                          <div className="mi-file-path">{f.relativePath !== f.filename ? f.relativePath : ''}</div>
                        </div>
                        <div className="mi-file-meta">
                          {isBest && <span className="mi-best-label">Beste Übereinstimmung</span>}
                          {qual && <span className="mi-qual-badge">{qual}</span>}
                          {f.size > 0 && <span className="mi-size-text">{fmtSize(f.size)}</span>}
                          <button className="mi-select-btn" onClick={e => { e.stopPropagation(); selectFile(f.filePath); }}>
                            Auswählen
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MediaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNzb, setShowNzb] = useState(false);

  useEffect(() => {
    api.get(`/media/${id}`)
      .then(r => setItem(r.data))
      .catch(() => navigate('/library'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`„${item.title}" aus der Bibliothek entfernen?`)) return;
    try {
      await api.delete(`/media/${id}`);
      toast.success('Entfernt');
      navigate('/library');
    } catch { toast.error('Fehler beim Entfernen'); }
  };

  if (loading) return <div style={{ color: '#4b5563', padding: '40px', textAlign: 'center' }}>Lädt...</div>;
  if (!item) return null;

  const statusClass = {
    wanted: 'status-wanted', downloaded: 'status-downloaded',
    downloading: 'status-downloading', missing: 'status-missing',
  };
  const epClass = { wanted: 'ep-wanted', downloaded: 'ep-downloaded', unaired: 'ep-unaired' };

  const seasons = {};
  if (item.episodes) {
    for (const ep of item.episodes) {
      if (!seasons[ep.season_number]) seasons[ep.season_number] = [];
      seasons[ep.season_number].push(ep);
    }
  }

  const seasonNums = Object.keys(seasons).map(Number).sort((a, b) => a - b);

  return (
    <>
      <style>{styles}</style>

      <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Zurück</button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-poster">
          {item.poster_url
            ? <img src={item.poster_url} alt={item.title} />
            : <div className="detail-poster-ph">{item.type === 'movie' ? <Film size={48} color="#2a2a4e" /> : <Tv size={48} color="#2a2a4e" />}</div>}
        </div>
        <div className="detail-info">
          <div className="detail-title">{item.title}</div>
          {item.original_title && item.original_title !== item.title && (
            <div className="detail-original">Originaltitel: {item.original_title}</div>
          )}
          <div className="detail-meta">
            {item.year && <span className="meta-item"><Calendar size={14} />{item.year}</span>}
            {item.rating && <span className="meta-item"><Star size={14} color="#f59e0b" fill="#f59e0b" />{item.rating.toFixed(1)}</span>}
            <span className="meta-item">{item.type === 'movie' ? <Film size={14} /> : <Tv size={14} />}{item.type === 'movie' ? 'Film' : 'Serie'}</span>
            <span className={`status-badge ${statusClass[item.status] || ''}`}>{item.status}</span>
            {item.quality_profile && (
              <span className="meta-item" style={{ fontSize: '12px', padding: '2px 8px', background: 'rgba(99,102,241,0.12)', borderRadius: '4px', color: '#6366f1' }}>
                {item.quality_profile}
              </span>
            )}
          </div>
          {item.overview && <div className="detail-overview">{item.overview}</div>}
          <div className="detail-actions">
            <button className="action-primary" onClick={() => setShowNzb(true)}>
              <Search size={14} /> NZB suchen
            </button>
            <button className="action-danger" onClick={handleDelete}>
              <Trash2 size={14} /> Entfernen
            </button>
          </div>
        </div>
      </div>

      {/* File info card */}
      <FileInfoCard
        itemId={item.id}
        itemTitle={item.title}
        originalTitle={item.original_title}
        year={item.year}
        onFileLinked={(path) => {
          setItem(prev => ({
            ...prev,
            path,
            status: path ? 'downloaded' : 'wanted',
          }));
        }}
      />

      {/* Seasons / Episodes */}
      {seasonNums.length > 0 && (
        <div className="seasons-section">
          <div className="section-title" style={{ marginBottom: '14px' }}>
            <Tv size={15} color="#6366f1" /> Staffeln & Episoden
          </div>
          {seasonNums.map(season => {
            const eps = seasons[season];
            const dlCount = eps.filter(e => e.status === 'downloaded').length;
            return (
              <div key={season} className="season-block">
                <div className="season-head">
                  <div className="season-title">Staffel {season}</div>
                  <div className="season-stats">{dlCount} / {eps.length} vorhanden</div>
                </div>
                <table className="episodes-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Titel</th>
                      <th>Erstausstrahlung</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eps.map(ep => (
                      <tr key={ep.id}>
                        <td style={{ color: '#6b7280', fontFamily: "'Space Mono', monospace", fontSize: '12px' }}>
                          E{String(ep.episode_number).padStart(2, '0')}
                        </td>
                        <td>{ep.title || '–'}</td>
                        <td style={{ color: '#6b7280' }}>{ep.air_date || '–'}</td>
                        <td>
                          <span className={`ep-badge ${epClass[ep.status] || 'ep-wanted'}`}>{ep.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {showNzb && (
        <NzbSearchModal
          title={item.title}
          originalTitle={item.original_title}
          year={item.year}
          mediaType={item.type}
          onClose={() => setShowNzb(false)}
        />
      )}
    </>
  );
}
