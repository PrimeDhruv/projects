import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatIST } from '../utils/dateUtils';

const TABS = ['📊 Overview', '👥 Users', '🔔 Notifications'];

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendModal, setSendModal] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendTitle, setSendTitle] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [sending, setSending] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [uRes, nRes, oRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/notifications'),
        api.get('/admin/overview'),
      ]);
      setUsers(uRes.data);
      setNotifications(nRes.data);
      setOverview(oRes.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const approve = async (id) => {
    try { await api.post(`/admin/users/${id}/approve`); toast.success('Approved!'); loadAll(); }
    catch { toast.error('Failed'); }
  };
  const reject = async (id) => {
    if (!window.confirm('Reject this user?')) return;
    try { await api.post(`/admin/users/${id}/reject`); toast.success('Rejected'); loadAll(); }
    catch { toast.error('Failed'); }
  };
  const extend = async (id) => {
    try { await api.post(`/admin/users/${id}/extend`); toast.success('Trial extended by 7 days'); loadAll(); }
    catch { toast.error('Failed'); }
  };
  const markAllRead = async () => {
    try { await api.post('/notifications/read-all'); loadAll(); }
    catch { }
  };
  const sendNotification = async () => {
    if (!sendTo || !sendTitle || !sendMsg) return toast.error('Fill all fields');
    setSending(true);
    try {
      await api.post('/admin/notifications/send', { user_id: parseInt(sendTo), title: sendTitle, message: sendMsg });
      toast.success('Notification sent!');
      setSendModal(false); setSendTo(''); setSendTitle(''); setSendMsg('');
      loadAll();
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const statusBadge = (status, expires) => {
    if (status === 'trial') {
      const days = expires ? Math.ceil((new Date(expires) - new Date()) / 86400000) : 0;
      const color = days <= 1 ? 'var(--red)' : days <= 3 ? 'var(--yellow)' : 'var(--blue)';
      const bg = days <= 1 ? 'var(--red-bg)' : days <= 3 ? 'var(--yellow-bg)' : 'var(--blue-bg)';
      return <span className="badge" style={{ background: bg, color }}>{days > 0 ? `Trial: ${days}d left` : 'Expiring today'}</span>;
    }
    if (status === 'approved') return <span className="badge badge-active">✅ Approved</span>;
    if (status === 'expired') return <span className="badge badge-stopped">Expired</span>;
    if (status === 'rejected') return <span className="badge" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>Rejected</span>;
    return <span className="badge badge-draft">{status}</span>;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <div className="page-title">🛡️ Admin Dashboard</div>
          <div className="page-subtitle">Manage users, approvals, and notifications</div>
        </div>
      </div>
      <div className="page-body">
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
              {t}
              {i === 2 && unreadCount > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 0 && overview && (
          <div>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { label: 'Total Users', value: overview.total_users, color: 'var(--text)' },
                { label: 'Active Trials', value: overview.trial_users, color: 'var(--blue)' },
                { label: 'Expired', value: overview.expired_users, color: 'var(--red)' },
                { label: 'Approved', value: overview.approved_users, color: 'var(--green)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            {parseInt(overview.expired_users) > 0 && (
              <div className="alert alert-warning">⚠️ {overview.expired_users} user(s) with expired trials may be waiting for approval.</div>
            )}
          </div>
        )}

        {tab === 1 && (
          <div>
            {users.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-title">No users yet</div>
                <div className="empty-state-desc">Users will appear here when they register</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Registered</th>
                      <th>Trial Ends</th>
                      <th>Status</th>
                      <th>Sequences</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.full_name || '—'}</div>
                          <div className="text-xs">{u.email}</div>
                        </td>
                        <td className="text-xs">{formatIST(u.created_at)}</td>
                        <td className="text-xs">{u.trial_expires_at ? formatIST(u.trial_expires_at) : '—'}</td>
                        <td>{statusBadge(u.access_status, u.trial_expires_at)}</td>
                        <td className="text-xs">{u.sequence_count}</td>
                        <td>
                          <div className="flex-center gap-8">
                            {u.access_status !== 'approved' && (
                              <button className="btn btn-success btn-sm" onClick={() => approve(u.id)}>✅ Approve</button>
                            )}
                            <button className="btn btn-secondary btn-sm" onClick={() => extend(u.id)}>+7 days</button>
                            {u.access_status !== 'rejected' && (
                              <button className="btn btn-danger btn-sm" onClick={() => reject(u.id)}>❌</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 2 && (
          <div>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                {unreadCount > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setSendModal(true)}>📨 Send to user</button>
            </div>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔔</div>
                <div className="empty-state-title">No notifications yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map(n => (
                  <div key={n.id} className="card" style={{ padding: '14px 18px', opacity: n.is_read ? 0.6 : 1, borderLeft: n.is_read ? '3px solid var(--border)' : '3px solid var(--accent)' }}>
                    <div className="flex-between">
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                      <div className="text-xs">{formatIST(n.created_at)}</div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{n.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {sendModal && (
        <div className="modal-overlay" onClick={() => setSendModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📨 Send Notification to User</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSendModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Select User</label>
                <select className="select" value={sendTo} onChange={e => setSendTo(e.target.value)}>
                  <option value="">Choose user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email} — {u.email}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="input" value={sendTitle} onChange={e => setSendTitle(e.target.value)} placeholder="e.g. Important Update" />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="input" rows={3} value={sendMsg} onChange={e => setSendMsg(e.target.value)} placeholder="Your message..." style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSendModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={sendNotification} disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
