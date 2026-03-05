import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Key, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

const styles = `
  .users-title { font-family:'Space Mono',monospace;font-size:26px;font-weight:700;color:#e8e8f0;margin-bottom:6px; }
  .users-sub { font-size:14px;color:#6b7280;margin-bottom:28px; }
  .users-grid { display:flex;flex-direction:column;gap:10px;margin-bottom:24px; }
  .user-card { background:#0f0f1a;border:1px solid #1a1a2e;border-radius:12px;padding:18px 20px; }
  .user-card-top { display:flex;align-items:center;gap:14px;margin-bottom:14px; }
  .user-avatar { width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:14px;color:white;font-weight:700;flex-shrink:0; }
  .user-avatar.admin { background:linear-gradient(135deg,#f59e0b,#ef4444); }
  .user-name { font-size:15px;font-weight:600;color:#e8e8f0; }
  .user-meta { font-size:12px;color:#4b5563;margin-top:2px; }
  .role-badge { padding:3px 9px;border-radius:5px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em; }
  .role-admin { background:rgba(245,158,11,0.15);color:#f59e0b; }
  .role-user { background:rgba(107,114,128,0.15);color:#9ca3af; }
  .user-actions { margin-left:auto;display:flex;gap:6px; }
  .icon-btn { padding:6px;background:none;border:1px solid #1a1a2e;border-radius:6px;color:#6b7280;cursor:pointer; }
  .icon-btn:hover { background:#1a1a2e;color:#e8e8f0; }
  .icon-btn.danger:hover { background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444; }
  .pw-row { display:flex;gap:8px; }
  .pw-input { flex:1;padding:8px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:7px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none; }
  .pw-input:focus { border-color:#6366f1; }
  .pw-btn { padding:8px 14px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:7px;color:#6366f1;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif; }
  .pw-btn:hover { background:rgba(99,102,241,0.2); }

  .add-card { background:#0f0f1a;border:1px dashed #2a2a4e;border-radius:12px;padding:20px; }
  .add-card-title { font-size:14px;font-weight:600;color:#e8e8f0;margin-bottom:16px;display:flex;align-items:center;gap:8px; }
  .add-form-row { display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end;flex-wrap:wrap; }
  .add-form-group { display:flex;flex-direction:column;gap:5px; }
  .add-label { font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em; }
  .add-input { padding:9px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:7px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none; }
  .add-input:focus { border-color:#6366f1; }
  .add-select { padding:9px 12px;background:#1a1a2e;border:1px solid #2a2a4e;border-radius:7px;color:#e8e8f0;font-size:13px;font-family:'DM Sans',sans-serif;outline:none; }
  .add-btn { padding:9px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:7px;color:white;font-weight:600;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap; }
  .add-btn:disabled { opacity:0.5;cursor:not-allowed; }
  .empty-state { padding:48px;text-align:center;color:#4b5563;font-size:14px; }

  @media (max-width:640px) {
    .add-form-row { grid-template-columns:1fr 1fr; }
  }
`;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwords, setPasswords] = useState({});
  const [showPw, setShowPw] = useState({});
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.get('/auth/users')
      .then(r => setUsers(r.data.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newUser.username || newUser.username.length < 3) { toast.error('Username must be at least 3 characters'); return; }
    if (!newUser.password || newUser.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setCreating(true);
    try {
      await api.post('/auth/users', newUser);
      toast.success('User "' + newUser.username + '" created');
      setNewUser({ username: '', password: '', role: 'user' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm('Delete user "' + username + '"? This cannot be undone.')) return;
    try {
      await api.delete('/auth/users/' + id);
      toast.success('User deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleChangePw = async (id, username) => {
    const pw = passwords[id] || '';
    if (pw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    try {
      await api.patch('/auth/users/' + id + '/password', { password: pw });
      toast.success('Password updated for "' + username + '"');
      setPasswords(prev => ({ ...prev, [id]: '' }));
      setShowPw(prev => ({ ...prev, [id]: false }));
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update password'); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="users-title">Users</div>
      <div className="users-sub">Manage who has access to Streamline.</div>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : (
        <div className="users-grid">
          {users.map(u => (
            <div key={u.id} className="user-card">
              <div className="user-card-top">
                <div className={'user-avatar ' + u.role}>
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="user-name">{u.username}</div>
                  <div className="user-meta">
                    Last login: {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                    {u.created_at && ' · Created ' + new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className={'role-badge ' + (u.role === 'admin' ? 'role-admin' : 'role-user')}>
                  {u.role === 'admin' ? <Shield size={10} style={{display:'inline',marginRight:'3px'}} /> : <User size={10} style={{display:'inline',marginRight:'3px'}} />}
                  {u.role}
                </span>
                <div className="user-actions">
                  <button
                    className="icon-btn"
                    title="Change password"
                    onClick={() => setShowPw(prev => ({ ...prev, [u.id]: !prev[u.id] }))}>
                    <Key size={14} />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Delete user"
                    onClick={() => handleDelete(u.id, u.username)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {showPw[u.id] && (
                <div className="pw-row">
                  <input
                    className="pw-input"
                    type="password"
                    placeholder="New password (min. 8 characters)"
                    value={passwords[u.id] || ''}
                    onChange={e => setPasswords(prev => ({ ...prev, [u.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleChangePw(u.id, u.username)}
                    autoFocus
                  />
                  <button className="pw-btn" onClick={() => handleChangePw(u.id, u.username)}>
                    Update Password
                  </button>
                  <button
                    onClick={() => setShowPw(prev => ({ ...prev, [u.id]: false }))}
                    style={{padding:'8px 10px',background:'none',border:'1px solid #2a2a4e',borderRadius:'7px',color:'#6b7280',cursor:'pointer'}}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new user */}
      <div className="add-card">
        <div className="add-card-title"><UserPlus size={16} color="#6366f1" /> Add New User</div>
        <div className="add-form-row">
          <div className="add-form-group">
            <label className="add-label">Username</label>
            <input className="add-input" value={newUser.username} onChange={e => setNewUser(p => ({...p, username: e.target.value}))} placeholder="username" />
          </div>
          <div className="add-form-group">
            <label className="add-label">Password</label>
            <input className="add-input" type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} placeholder="min. 8 characters" />
          </div>
          <div className="add-form-group">
            <label className="add-label">Role</label>
            <select className="add-select" value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button className="add-btn" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </>
  );
}
