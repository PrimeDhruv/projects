import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatIST } from '../utils/dateUtils';

const STATUS_COLORS = {
  active: 'badge-active', paused: 'badge-paused', stopped: 'badge-stopped',
  draft: 'badge-draft', completed: 'badge-completed', replied: 'badge-replied'
};

const SEND_STATUS = {
  sent: { label: 'Sent', cls: 'badge-sent' },
  scheduled: { label: 'Scheduled', cls: 'badge-scheduled' },
  failed: { label: 'Failed', cls: 'badge-failed' },
  skipped: { label: 'Skipped', cls: 'badge-skipped' },
  opened: { label: 'Opened', cls: 'badge-opened' },
};

function getSendStatus(send) {
  if (!send) return { label: 'Pending', cls: 'badge-draft' };
  if (send.opened_at) return { label: '👁 Opened', cls: 'badge-opened' };
  return SEND_STATUS[send.status] || { label: send.status, cls: 'badge-draft' };
}

export default function SequenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seq, setSeq] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const [seqRes, contRes, actRes] = await Promise.all([
        api.get(`/sequences/${id}`),
        api.get(`/sequences/${id}/contacts`),
        api.get(`/sequences/${id}/activity`)
      ]);
      setSeq(seqRes.data);
      setContacts(contRes.data);
      setActivity(actRes.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  // Auto refresh every 30s if active
  useEffect(() => {
    if (seq?.status !== 'active') return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [seq?.status]);

  const pause = async () => {
    await api.post(`/sequences/${id}/pause`);
    toast.success('Paused'); load();
  };

  const resume = async () => {
    await api.post(`/sequences/${id}/resume`);
    toast.success('Resumed'); load();
  };

  const stop = async () => {
    if (!window.confirm('Stop this sequence?')) return;
    await api.post(`/sequences/${id}/stop`);
    toast.success('Stopped'); load();
  };

  const duplicate = async () => {
    const res = await api.post(`/sequences/${id}/duplicate`);
    toast.success('Duplicated!');
    navigate(`/sequences/${res.data.id}/edit`);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!seq) return <div className="page-loader">Sequence not found</div>;

  const filteredContacts = filter === 'all' ? contacts : contacts.filter(c => c.status === filter);

  const EVENT_ICONS = {
    email_sent: '📤', email_opened: '👁', reply_detected: '💬',
    followup_skipped: '⏭', limit_reached: '⚠️', sequence_launched: '🚀',
    sequence_paused: '⏸', sequence_stopped: '⏹', sequence_resumed: '▶'
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <div className="flex-center gap-8" style={{ marginBottom: 4 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Back</button>
          </div>
          <div className="flex-center gap-12">
            <div className="page-title">{seq.name}</div>
            <span className={`badge ${STATUS_COLORS[seq.status]}`}>{seq.status}</span>
          </div>
          <div className="page-subtitle">From: {seq.from_email || 'Not set'}</div>
        </div>
        <div className="flex-center gap-8">
          <button className="btn btn-secondary" onClick={() => navigate(`/sequences/${id}/edit`)}>✏️ Edit</button>
          <button className="btn btn-secondary" onClick={duplicate}>⧉ Duplicate</button>
          {seq.status === 'active' && <button className="btn btn-secondary" onClick={pause}>⏸ Pause</button>}
          {seq.status === 'paused' && <button className="btn btn-success" onClick={resume}>▶ Resume</button>}
          {['active', 'paused'].includes(seq.status) && <button className="btn btn-danger" onClick={stop}>⏹ Stop</button>}
        </div>
      </div>

      <div className="page-body">
        {/* Daily limit warning */}
        {seq.daily_limit_hit && (
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            ⚠️ Gmail daily sending limit reached. Sending will resume at {seq.daily_limit_reset_at ? formatIST(seq.daily_limit_reset_at) : 'tomorrow'}.
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Contacts', value: contacts.length, color: 'var(--text)' },
            { label: 'Sent', value: seq.sent_count || 0, color: 'var(--green)' },
            { label: 'Opened', value: seq.opened_count || 0, color: 'var(--yellow)' },
            { label: 'Replied', value: seq.replied_count || 0, color: 'var(--accent2)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.value > 0 && contacts.length > 0 && (
                <div className="text-xs" style={{ marginTop: 4 }}>
                  {Math.round((s.value / contacts.length) * 100)}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {['Contacts', 'Activity Log'].map((t, i) => (
            <button key={t} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* Contacts tab */}
        {tab === 0 && (
          <div>
            {/* Filter */}
            <div className="flex-center gap-8" style={{ marginBottom: 16 }}>
              {['all', 'active', 'replied', 'completed', 'stopped'].map(f => (
                <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilter(f)}>
                  {f === 'all' ? `All (${contacts.length})` : f}
                </button>
              ))}
            </div>

            {filteredContacts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No contacts</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Step 1</th>
                      <th>Step 2</th>
                      <th>Step 3</th>
                      <th>Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map(c => {
                      const sends = c.sends || [];
                      const step1 = sends.find(s => s.step === 1);
                      const step2 = sends.find(s => s.step === 2);
                      const step3 = sends.find(s => s.step === 3);
                      const lastSend = sends.filter(s => s.sent_at).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];

                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{c.email}</div>
                            {c.data?.name && <div className="text-xs">{c.data.name}</div>}
                          </td>
                          <td><span className={`badge ${STATUS_COLORS[c.status] || 'badge-draft'}`}>{c.status}</span></td>
                          <td>
                            {step1 ? (
                              <div>
                                <span className={`badge ${getSendStatus(step1).cls}`}>{getSendStatus(step1).label}</span>
                                <div className="text-xs" style={{ marginTop: 2, color: 'var(--text3)' }}>
                                  {step1.sent_at ? formatIST(step1.sent_at) : step1.scheduled_at ? formatIST(step1.scheduled_at) : ''}
                                </div>
                              </div>
                            ) : <span className="text-xs">—</span>}
                          </td>
                          <td>
                            {step2 ? (
                              <div>
                                <span className={`badge ${getSendStatus(step2).cls}`}>{getSendStatus(step2).label}</span>
                                <div className="text-xs" style={{ marginTop: 2, color: 'var(--text3)' }}>
                                  {step2.sent_at ? formatIST(step2.sent_at) : step2.scheduled_at ? formatIST(step2.scheduled_at) : ''}
                                </div>
                              </div>
                            ) : <span className="text-xs">—</span>}
                          </td>
                          <td>
                            {step3 ? (
                              <div>
                                <span className={`badge ${getSendStatus(step3).cls}`}>{getSendStatus(step3).label}</span>
                                <div className="text-xs" style={{ marginTop: 2, color: 'var(--text3)' }}>
                                  {step3.sent_at ? formatIST(step3.sent_at) : step3.scheduled_at ? formatIST(step3.scheduled_at) : ''}
                                </div>
                              </div>
                            ) : <span className="text-xs">—</span>}
                          </td>
                          <td className="text-xs">
                            {lastSend?.sent_at ? formatIST(lastSend.sent_at) : (
                              step1?.scheduled_at ? `Scheduled: ${formatIST(step1.scheduled_at)}` : '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Activity log tab */}
        {tab === 1 && (
          <div>
            {activity.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No activity yet</div>
                <div className="empty-state-desc">Activity will appear here once the sequence is launched</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map(a => (
                      <tr key={a.id}>
                        <td className="text-xs mono">{formatIST(a.created_at)}</td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {EVENT_ICONS[a.event_type] || '•'} {a.event_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-sm" style={{ color: 'var(--text2)' }}>{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
