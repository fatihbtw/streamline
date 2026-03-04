import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const styles = `
  .login-bg {
    min-height: 100vh; background: #0a0a0f;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    background-image: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%);
  }
  .login-card {
    width: 100%; max-width: 400px;
    background: #0f0f1a; border: 1px solid #1a1a2e; border-radius: 16px;
    padding: 40px; display: flex; flex-direction: column; gap: 28px;
  }
  .login-header { text-align: center; }
  .login-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 24px; }
  .login-logo-icon {
    width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
  }
  .login-logo-text { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; color: #fff; }
  .login-title { font-size: 24px; font-weight: 600; color: #e8e8f0; }
  .login-sub { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label { font-size: 13px; font-weight: 500; color: #9ca3af; letter-spacing: 0.03em; }
  .input-wrap { position: relative; }
  .form-input {
    width: 100%; padding: 11px 14px; background: #1a1a2e; border: 1px solid #2a2a4e;
    border-radius: 8px; color: #e8e8f0; font-size: 14px; font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.15s;
  }
  .form-input:focus { border-color: #6366f1; }
  .pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #6b7280; cursor: pointer; }
  .login-btn {
    width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none; border-radius: 8px; color: white; font-size: 15px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.15s;
  }
  .login-btn:hover { opacity: 0.9; }
  .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      toast.success('Willkommen zurück!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-bg">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-icon"><Activity size={20} color="white" /></div>
              <span className="login-logo-text">Streamline</span>
            </div>
            <div className="login-title">Anmelden</div>
            <div className="login-sub">Unified Media Manager</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Benutzername</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div className="form-group">
              <label className="form-label">Passwort</label>
              <div className="input-wrap">
                <input className="form-input" type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                  style={{ paddingRight: '40px' }} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button className="login-btn" type="submit" disabled={isLoading}>
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
