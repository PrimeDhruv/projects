import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatIST } from '../utils/dateUtils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAll = async () => {
    await api.post('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <div className="page-title">🔔 Notifications</div>
          <div className="page-subtitle">{unread > 0 ? `${unread} unread` : 'All caught up!'}</div>
        </div>
        {unread > 0 && <button className="btn btn-secondary" onClick={markAll}>Mark all read</button>}
      </div>
      <div className="page-body">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications yet</div>
            <div className="empty-state-desc">You'll see updates here</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => (
              <div
                key={n.id}
                className="card"
                style={{ padding: '14px 18px', cursor: n.is_read ? 'default' : 'pointer', opacity: n.is_read ? 0.65 : 1, borderLeft: n.is_read ? '3px solid var(--border)' : '3px solid var(--accent)' }}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className="flex-between">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                  <div className="text-xs">{formatIST(n.created_at)}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{n.message}</div>
                {!n.is_read && <div className="text-xs" style={{ marginTop: 6, color: 'var(--accent)' }}>Click to mark as read</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
