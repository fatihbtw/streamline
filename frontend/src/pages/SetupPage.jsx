import React, { useState } from 'react';
import { Activity, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const styles = `
  .setup-bg { min-height: 100vh; background: #0a0a0f; display: flex; align-items: center; justify-content: center; padding: 20px; background-image: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%); }
  .setup-card { width: 100%; max-width: 480px; background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 16px; padding: 40px; }
  .setup-step { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .step-num { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; color: white; flex-shrink: 0; }
  .setup-title { font-size: 22px; font-weight: 700; color: #e8e8f0; }
  .setup-desc { font-size: 14px; color: #6b7280; margin-top: 4px; margin-bottom: 28px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .form-label { font-size: 13px; font-weight: 500; color: #9ca3af; }
  .form-input { width: 100%; padding: 11px 14px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; }
  .form-input:focus { border-color: #6366f1; }
  .setup-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-top: 8px; }
  .setup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .pw-hint { font-size: 12px; color: #4b5563; margin-top: 4px; }
  .setup-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
  .logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .logo-text { font-family: 'Space Mono', monospace; font-size: 20px; font-weight: 700; color: #fff; }
`;

export default function SetupPage({ onDone }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwörter stimmen nicht überein'); return; }
    if (password.length < 8) { toast.error('Passwort muss mindestens 8 Zeichen haben'); return; }

    setLoading(true);
    try {
      await api.post('/auth/setup', { username, password });
      toast.success('Admin-Konto erstellt! Bitte anmelden.');
      onDone();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Setup fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="setup-bg">
        <div className="setup-card">
          <div className="setup-logo">
            <div className="logo-icon"><Activity size={18} color="white" /></div>
            <span className="logo-text">Streamline</span>
          </div>

          <div className="setup-step">
            <div className="step-num">1</div>
            <div className="setup-title">Ersteinrichtung</div>
          </div>
          <div className="setup-desc">Erstelle deinen Administrator-Account, um Streamline zu starten.</div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Benutzername</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
                minLength={3} maxLength={32} required placeholder="admin" />
            </div>
            <div className="form-group">
              <label className="form-label">Passwort</label>
              <input className="form-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} required />
              <span className="pw-hint">Mindestens 8 Zeichen</span>
            </div>
            <div className="form-group">
              <label className="form-label">Passwort wiederholen</label>
              <input className="form-input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button className="setup-btn" type="submit" disabled={loading}>
              {loading ? 'Erstellen...' : 'Account erstellen & starten'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
