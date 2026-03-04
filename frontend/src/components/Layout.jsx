import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Film, Tv, Search, Download, Settings, LogOut, Menu, X, Activity, Home } from 'lucide-react';
import useAuthStore from '../store/authStore';

const NAV = [
  { to: '/', icon: Home, label: 'Dashboard', exact: true },
  { to: '/library', icon: Film, label: 'Mediathek' },
  { to: '/search', icon: Search, label: 'Suchen' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
  { to: '/settings', icon: Settings, label: 'Einstellungen' },
];

const styles = `
  .layout { display: flex; min-height: 100vh; background: #0a0a0f; }

  .sidebar {
    width: 240px; min-height: 100vh; background: #0f0f1a;
    border-right: 1px solid #1a1a2e; display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; z-index: 100;
    transition: transform 0.3s ease;
  }
  .sidebar.hidden { transform: translateX(-100%); }

  .sidebar-logo {
    padding: 28px 24px 20px; border-bottom: 1px solid #1a1a2e;
    font-family: 'Space Mono', monospace; font-size: 18px; font-weight: 700;
    color: #fff; letter-spacing: -0.02em;
    display: flex; align-items: center; gap: 10px;
  }
  .logo-icon { width: 28px; height: 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 6px; display: flex; align-items: center; justify-content: center; }

  .sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; }
  .nav-link {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px;
    color: #6b7280; text-decoration: none; font-size: 14px; font-weight: 500;
    transition: all 0.15s ease; cursor: pointer; border: none; background: none; width: 100%;
  }
  .nav-link:hover { background: #1a1a2e; color: #e8e8f0; }
  .nav-link.active { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
  .nav-link svg { width: 18px; height: 18px; flex-shrink: 0; }

  .sidebar-footer { padding: 16px 12px; border-top: 1px solid #1a1a2e; }
  .user-info { display: flex; align-items: center; gap: 10px; padding: 8px 12px; }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Space Mono', monospace; font-size: 12px; color: white; font-weight: 700;
  }
  .username { font-size: 13px; font-weight: 500; color: #e8e8f0; flex: 1; }
  .logout-btn { background: none; border: none; color: #6b7280; cursor: pointer; padding: 4px; border-radius: 4px; }
  .logout-btn:hover { color: #ef4444; }

  .main-content { flex: 1; margin-left: 240px; display: flex; flex-direction: column; min-height: 100vh; }
  .topbar { height: 60px; background: #0f0f1a; border-bottom: 1px solid #1a1a2e; display: flex; align-items: center; padding: 0 24px; gap: 12px; }
  .menu-btn { display: none; background: none; border: none; color: #6b7280; cursor: pointer; }
  .page-content { flex: 1; padding: 32px; max-width: 1600px; }

  .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 99; }

  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .main-content { margin-left: 0; }
    .menu-btn { display: flex; align-items: center; }
    .overlay.show { display: block; }
    .page-content { padding: 20px 16px; }
  }
`;

export default function Layout() {
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      <style>{styles}</style>
      <div className="layout">
        <div className={`overlay ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />

        <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <div className="logo-icon">
              <Activity size={16} color="white" />
            </div>
            Streamline
          </div>

          <nav className="sidebar-nav">
            {NAV.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-info">
              <div className="avatar">{user?.username?.[0]?.toUpperCase() || '?'}</div>
              <span className="username">{user?.username || 'User'}</span>
              <button className="logout-btn" onClick={handleLogout} title="Abmelden">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <main className="main-content">
          <div className="topbar">
            <button className="menu-btn" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
