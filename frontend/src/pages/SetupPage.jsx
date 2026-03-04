import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

const styles = `
  .setup-wrap { min-height: 100vh; background: #0a0a0f; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .setup-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 16px; padding: 40px; width: 100%; max-width: 420px; }
  .setup-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
  .setup-logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .setup-title { font-size: 22px; font-weight: 700; color: #e8e8f0; margin-bottom: 6px; }
  .setup-sub { font-size: 14px; color: #6b7280; margin-bottom: 28px; line-height: 1.5; }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
  .form-input { width: 100%; padding: 11px 14px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
  .form-input:focus { border-color: #6366f1; }
  .setup-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-top: 8px; }
  .setup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/setup', { username, password });
      setAuth(res.data.token, res.data.user);
      toast.success('Welcome to Streamline!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="setup-wrap">
        <div className="setup-card">
          <div className="setup-logo">
            <div className="setup-logo-icon"><Activity size={18} color="white" /></div>
            <span style={{ fontFamily: 'Space Mono', fontSize: '20px', fontWeight: 700, color: '#fff' }}>Streamline</span>
          </div>
          <div className="setup-title">Initial Setup</div>
          <div className="setup-sub">Create your admin account to get started.</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} required autoFocus minLength={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button className="setup-btn" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
