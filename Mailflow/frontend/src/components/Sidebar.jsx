import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.body.classList.toggle('light-mode', isLight);
  }, [isLight]);

  const toggleTheme = () => {
    setIsLight(p => {
      const next = !p;
      localStorage.setItem('theme', next ? 'light' : 'dark');
      return next;
    });
  };

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const daysLeft = user?.trial_expires_at
    ? Math.max(0, Math.ceil((new Date(user.trial_expires_at) - new Date()) / 86400000))
    : null;

  return (
    <div className={`sidebar${isOpen ? ' mobile-open' : ''}`} style={{ position: 'relative' }}>
      {/* Mobile close button */}
      <button className="sidebar-close-btn" onClick={onClose}>✕</button>

      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✉️</div>
        <div className="sidebar-logo-text">MailFlow</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="icon">📊</span> Dashboard
        </NavLink>

        <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="icon">🔔</span>
          <span style={{ flex: 1 }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
              {unreadCount}
            </span>
          )}
        </NavLink>

        {user?.is_admin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
            <span className="icon">🛡️</span> Admin
          </NavLink>
        )}

        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <span className="icon">⚙️</span> Settings
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <div style={{ padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>Logged in as</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.full_name || user?.gmail_email || user?.email}
          </div>
          {user?.access_status === 'trial' && daysLeft !== null && (
            <div style={{ fontSize: 11, color: daysLeft <= 2 ? 'var(--red)' : 'var(--yellow)', marginTop: 3 }}>
              ⏳ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in trial
            </div>
          )}
        </div>

        <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ marginBottom: 2 }} onClick={onClose}>
          <span className="icon">🌐</span> Homepage
        </NavLink>

        <button className="nav-item" onClick={toggleTheme} style={{ marginBottom: 2 }}>
          <span className="icon">{isLight ? '🌙' : '☀️'}</span>
          {isLight ? 'Dark Mode' : 'Light Mode'}
        </button>

        <button className="nav-item" onClick={handleLogout}>
          <span className="icon">↩</span> Logout
        </button>
      </div>
    </div>
  );
}
