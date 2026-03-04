import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

const styles = `
  .login-wrap { min-height: 100vh; background: #0a0a0f; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .login-card { background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 16px; padding: 40px; width: 100%; max-width: 380px; }
  .login-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
  .login-logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .login-logo-text { font-family: 'Space Mono', monospace; font-size: 20px; font-weight: 700; color: #fff; }
  .login-title { font-size: 22px; font-weight: 700; color: #e8e8f0; margin-bottom: 6px; }
  .login-sub { font-size: 14px; color: #6b7280; margin-bottom: 28px; }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 12px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
  .form-input { width: 100%; padding: 11px 14px; background: #1a1a2e; border: 1px solid #2a2a4e; border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
  .form-input:focus { border-color: #6366f1; }
  .login-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; margin-top: 8px; }
  .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      setAuth(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon"><Activity size={18} color="white" /></div>
            <div className="login-logo-text">Streamline</div>
          </div>
          <div className="login-title">Welcome back</div>
          <div className="login-sub">Sign in to your account</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
