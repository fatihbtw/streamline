import React, { useState, useEffect } from 'react';
import { Activity, User, Key, Server, Rss, CheckCircle, ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import api from '../utils/api';

const styles = `
  .ob-wrap { min-height:100vh;background:#0a0a0f;display:flex;align-items:center;justify-content:center;padding:20px; }
  .ob-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:20px;width:100%;max-width:560px; }
  .ob-header { padding:28px 32px 20px;border-bottom:1px solid #1a1a2e; }
  .ob-logo { display:flex;align-items:center;gap:10px;margin-bottom:20px; }
  .ob-logo-icon { width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:8px;display:flex;align-items:center;justify-content:center; }
  .ob-logo-text { font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:#fff; }
  .ob-steps { display:flex;gap:0;align-items:center; }
  .ob-step { display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500; }
  .ob-step-num { width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0; }
  .ob-step.done .ob-step-num { background:rgba(16,185,129,0.2);color:#10b981; }
  .ob-step.active .ob-step-num { background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white; }
  .ob-step.pending .ob-step-num { background:#1a1a2e;color:#4b5563; }
  .ob-step.done .ob-step-label { color:#10b981; }
  .ob-step.active .ob-step-label { color:#e8e8f0; }
  .ob-step.pending .ob-step-label { color:#4b5563; }
  .ob-step-sep { flex:1;height:1px;background:#1a1a2e;margin:0 8px;min-width:12px; }

  .ob-body { padding:28px 32px; }
  .ob-step-title { font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:#e8e8f0;margin-bottom:6px; }
  .ob-step-sub { font-size:13px;color:#6b7280;margin-bottom:24px;line-height:1.5; }

  .ob-form-group { margin-bottom:16px; }
  .ob-label { display:block;font-size:12px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px; }
  .ob-input { width:100%;padding:11px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;box-sizing:border-box;transition:border-color 0.15s; }
  .ob-input:focus { border-color:#6366f1; }
  .ob-input::placeholder { color:#4b5563; }
  .ob-select { width:100%;padding:11px 14px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:8px;color:#e8e8f0;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;box-sizing:border-box; }
  .ob-row { display:grid;grid-template-columns:1fr 1fr;gap:12px; }

  .ob-skip-note { font-size:12px;color:#4b5563;margin-top:8px;font-style:italic; }

  .ob-footer { padding:20px 32px;border-top:1px solid #1a1a2e;display:flex;align-items:center;justify-content:space-between;gap:12px; }
  .ob-btn-next { padding:11px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:8px;color:white;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;display:flex;align-items:center;gap:6px; }
  .ob-btn-next:disabled { opacity:0.5;cursor:not-allowed; }
  .ob-btn-back { padding:11px 18px;background:none;border:1px solid #2a2a4e;border-radius:8px;color:#6b7280;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;display:flex;align-items:center;gap:6px; }
  .ob-btn-back:hover { color:#e8e8f0; }
  .ob-btn-skip { padding:11px 18px;background:none;border:none;color:#4b5563;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif; }
  .ob-btn-skip:hover { color:#6b7280; }

  .ob-timer { display:flex;align-items:center;gap:5px;font-size:12px;color:#4b5563;margin-left:auto; }
  .ob-timer.urgent { color:#ef4444; }

  .ob-success { text-align:center;padding:12px 0; }
  .ob-success-icon { width:64px;height:64px;background:rgba(16,185,129,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px; }
  .ob-success-title { font-family:'Space Mono',monospace;font-size:20px;font-weight:700;color:#e8e8f0;margin-bottom:8px; }
  .ob-success-sub { font-size:14px;color:#6b7280;line-height:1.5; }

  .ob-error { padding:10px 14px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:13px;color:#dc2626;margin-bottom:16px; }
`;

const STEPS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'indexer', label: 'Indexer', icon: Rss },
  { id: 'done', label: 'Done', icon: CheckCircle },
];

function Timer({ expiresAt, onExpired }) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left === 0) { clearInterval(t); onExpired(); }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 60000;

  return (
    <div className={'ob-timer' + (urgent ? ' urgent' : '')}>
      <Clock size={13} />
      {mins}:{String(secs).padStart(2, '0')} remaining
    </div>
  );
}

export default function OnboardingPage({ expiresAt, onComplete }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

  const [account, setAccount] = useState({ username: '', password: '', confirm: '' });
  const [sabnzbd, setSabnzbd] = useState({ url: '', api_key: '' });
  const [tmdbKey, setTmdbKey] = useState('');
  const [indexer, setIndexer] = useState({ name: '', type: 'newznab', url: '', api_key: '' });

  const handleExpired = () => {
    setExpired(true);
    // Auto-redirect after 3s
    setTimeout(() => onComplete(), 3000);
  };

  const validateStep = () => {
    setError('');
    if (step === 0) {
      if (!account.username || account.username.length < 3) { setError('Username must be at least 3 characters'); return false; }
      if (!account.password || account.password.length < 8) { setError('Password must be at least 8 characters'); return false; }
      if (account.password !== account.confirm) { setError('Passwords do not match'); return false; }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep(s => s + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/onboarding/complete', {
        admin: { username: account.username, password: account.password },
        sabnzbd: sabnzbd.url ? sabnzbd : null,
        tmdb_api_key: tmdbKey || null,
        indexer: indexer.name && indexer.url ? indexer : null,
      });
      setStep(3); // done
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (expired) {
    return (
      <>
        <style>{styles}</style>
        <div className="ob-wrap">
          <div className="ob-card">
            <div className="ob-body" style={{textAlign:'center',padding:'48px 32px'}}>
              <div style={{fontSize:'48px',marginBottom:'16px'}}>⏰</div>
              <div style={{fontFamily:'Space Mono',fontSize:'18px',fontWeight:700,color:'#e8e8f0',marginBottom:'8px'}}>Setup window expired</div>
              <div style={{fontSize:'13px',color:'#6b7280'}}>Redirecting to login...</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="ob-wrap">
        <div className="ob-card">
          <div className="ob-header">
            <div className="ob-logo">
              <div className="ob-logo-icon"><Activity size={18} color="white" /></div>
              <div className="ob-logo-text">Streamline</div>
              <div style={{marginLeft:'auto'}}>
                <Timer expiresAt={expiresAt} onExpired={handleExpired} />
              </div>
            </div>
            <div className="ob-steps">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className={'ob-step ' + (i < step ? 'done' : i === step ? 'active' : 'pending')}>
                    <div className="ob-step-num">
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span className="ob-step-label">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className="ob-step-sep" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="ob-body">
            {error && <div className="ob-error">{error}</div>}

            {/* Step 0 — Admin Account */}
            {step === 0 && (
              <>
                <div className="ob-step-title">Create your account</div>
                <div className="ob-step-sub">This will be your admin account for Streamline.</div>
                <div className="ob-form-group">
                  <label className="ob-label">Username</label>
                  <input className="ob-input" value={account.username} onChange={e => setAccount(p => ({...p, username: e.target.value}))} placeholder="admin" autoFocus />
                </div>
                <div className="ob-row">
                  <div className="ob-form-group">
                    <label className="ob-label">Password</label>
                    <input className="ob-input" type="password" value={account.password} onChange={e => setAccount(p => ({...p, password: e.target.value}))} placeholder="Min. 8 characters" />
                  </div>
                  <div className="ob-form-group">
                    <label className="ob-label">Confirm Password</label>
                    <input className="ob-input" type="password" value={account.confirm} onChange={e => setAccount(p => ({...p, confirm: e.target.value}))} placeholder="Repeat password" />
                  </div>
                </div>
              </>
            )}

            {/* Step 1 — Services */}
            {step === 1 && (
              <>
                <div className="ob-step-title">Connect services</div>
                <div className="ob-step-sub">Add your download client and TMDB API key. You can skip this and configure later in Settings.</div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#9ca3af',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'0.05em'}}>SABnzbd</div>
                <div className="ob-row">
                  <div className="ob-form-group">
                    <label className="ob-label">URL</label>
                    <input className="ob-input" value={sabnzbd.url} onChange={e => setSabnzbd(p => ({...p, url: e.target.value}))} placeholder="http://192.168.1.x:8080" />
                  </div>
                  <div className="ob-form-group">
                    <label className="ob-label">API Key</label>
                    <input className="ob-input" value={sabnzbd.api_key} onChange={e => setSabnzbd(p => ({...p, api_key: e.target.value}))} placeholder="SABnzbd API key" />
                  </div>
                </div>
                <div style={{fontSize:'13px',fontWeight:'600',color:'#9ca3af',marginBottom:'12px',marginTop:'8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>TMDB</div>
                <div className="ob-form-group">
                  <label className="ob-label">API Key (v3)</label>
                  <input className="ob-input" value={tmdbKey} onChange={e => setTmdbKey(e.target.value)} placeholder="Get yours at themoviedb.org/settings/api" />
                </div>
                <div className="ob-skip-note">All fields are optional — skip to configure later in Settings.</div>
              </>
            )}

            {/* Step 2 — Indexer */}
            {step === 2 && (
              <>
                <div className="ob-step-title">Add an indexer</div>
                <div className="ob-step-sub">Add your first Newznab/Torznab indexer. You can add more in Settings → Indexers.</div>
                <div className="ob-row">
                  <div className="ob-form-group">
                    <label className="ob-label">Name</label>
                    <input className="ob-input" value={indexer.name} onChange={e => setIndexer(p => ({...p, name: e.target.value}))} placeholder="e.g. DrunkenSlug" />
                  </div>
                  <div className="ob-form-group">
                    <label className="ob-label">Type</label>
                    <select className="ob-select" value={indexer.type} onChange={e => setIndexer(p => ({...p, type: e.target.value}))}>
                      <option value="newznab">Newznab (NZB)</option>
                      <option value="torznab">Torznab (Torrent)</option>
                    </select>
                  </div>
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">URL</label>
                  <input className="ob-input" value={indexer.url} onChange={e => setIndexer(p => ({...p, url: e.target.value}))} placeholder="https://indexer.example.com" />
                </div>
                <div className="ob-form-group">
                  <label className="ob-label">API Key</label>
                  <input className="ob-input" value={indexer.api_key} onChange={e => setIndexer(p => ({...p, api_key: e.target.value}))} placeholder="Indexer API key" />
                </div>
                <div className="ob-skip-note">No indexer yet? Skip and add one later in Settings → Indexers.</div>
              </>
            )}

            {/* Step 3 — Done */}
            {step === 3 && (
              <div className="ob-success">
                <div className="ob-success-icon"><CheckCircle size={32} color="#10b981" /></div>
                <div className="ob-success-title">You're all set!</div>
                <div className="ob-success-sub">
                  Streamline is ready. Sign in with your new account to get started.
                  {sabnzbd.url && <><br /><br />✅ SABnzbd connected</>}
                  {tmdbKey && <><br />✅ TMDB API key saved</>}
                  {indexer.name && <><br />✅ Indexer "{indexer.name}" added</>}
                </div>
              </div>
            )}
          </div>

          <div className="ob-footer">
            {step > 0 && step < 3 && (
              <button className="ob-btn-back" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 3 && <div style={{flex:1}} />}
            {step === 0 && (
              <button className="ob-btn-next" onClick={next}>
                Next <ChevronRight size={16} />
              </button>
            )}
            {step === 1 && (
              <>
                <button className="ob-btn-skip" onClick={() => setStep(2)}>Skip</button>
                <button className="ob-btn-next" onClick={next}>
                  Next <ChevronRight size={16} />
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <button className="ob-btn-skip" onClick={submit} disabled={submitting}>{submitting ? 'Saving...' : 'Skip & Finish'}</button>
                <button className="ob-btn-next" onClick={submit} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Finish'} <CheckCircle size={16} />
                </button>
              </>
            )}
            {step === 3 && (
              <button className="ob-btn-next" onClick={onComplete} style={{margin:'0 auto'}}>
                Sign In <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
