import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatIST } from '../utils/dateUtils';

const STATUS_COLORS = {
  active: 'badge-active', paused: 'badge-paused', stopped: 'badge-stopped',
  draft: 'badge-draft', completed: 'badge-completed'
};

function formatCalendarDate(dateStr) {
  // dateStr is YYYY-MM-DD
  if (!dateStr) return dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Dashboard() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [calendar, setCalendar] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const [seqRes, calRes] = await Promise.all([
        api.get(`/sequences?archived=${showArchived}`),
        api.get('/sequences/calendar/scheduled').catch(() => ({ data: {} }))
      ]);
      setSequences(seqRes.data);
      setCalendar(calRes.data);
    } catch (err) {
      toast.error('Failed to load sequences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showArchived]);

  const createSequence = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/sequences', { name: newName.trim() });
      toast.success('Sequence created');
      navigate(`/sequences/${res.data.id}/edit`);
    } catch (err) {
      toast.error('Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const duplicate = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/sequences/${id}/duplicate`);
      toast.success('Duplicated! Opening editor...');
      navigate(`/sequences/${res.data.id}/edit`);
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const pause = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/sequences/${id}/pause`);
      toast.success('Sequence paused');
      load();
    } catch { toast.error('Failed'); }
  };

  const resume = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/sequences/${id}/resume`);
      toast.success('Sequence resumed');
      load();
    } catch { toast.error('Failed'); }
  };

  const stop = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Stop this sequence? All pending sends will be cancelled.')) return;
    try {
      await api.post(`/sequences/${id}/stop`);
      toast.success('Sequence stopped');
      load();
    } catch { toast.error('Failed'); }
  };

  const deleteSeq = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this sequence? This cannot be undone.')) return;
    try {
      await api.delete(`/sequences/${id}`);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const archive = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/sequences/${id}/archive`);
      toast.success('Archived');
      load();
    } catch { toast.error('Failed'); }
  };

  const unarchive = async (id, e) => {
    e.stopPropagation();
    try {
      await api.post(`/sequences/${id}/unarchive`);
      toast.success('Unarchived');
      load();
    } catch { toast.error('Failed'); }
  };

  const filteredSequences = sequences.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const moveUp = async (idx, e) => {
    e.stopPropagation();
    if (idx === 0) return;
    const newOrder = [...filteredSequences];
    [newOrder[idx-1], newOrder[idx]] = [newOrder[idx], newOrder[idx-1]];
    const orderedIds = newOrder.map(s => s.id);
    try {
      await api.post('/sequences/reorder', { orderedIds });
      load();
    } catch { toast.error('Failed to reorder'); }
  };

  const moveDown = async (idx, e) => {
    e.stopPropagation();
    if (idx === filteredSequences.length - 1) return;
    const newOrder = [...filteredSequences];
    [newOrder[idx], newOrder[idx+1]] = [newOrder[idx+1], newOrder[idx]];
    const orderedIds = newOrder.map(s => s.id);
    try {
      await api.post('/sequences/reorder', { orderedIds });
      load();
    } catch { toast.error('Failed to reorder'); }
  };

  const totalStats = sequences.reduce((acc, s) => ({
    total: acc.total + parseInt(s.total_contacts || 0),
    sent: acc.sent + parseInt(s.sent_count || 0),
    opened: acc.opened + parseInt(s.opened_count || 0),
    replied: acc.replied + parseInt(s.replied_count || 0),
  }), { total: 0, sent: 0, opened: 0, replied: 0 });

  const calendarDates = Object.keys(calendar).sort();

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">All your email sequences in one place</div>
        </div>
        <div className="flex-center gap-8">
          <button
            className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowArchived(v => !v)}
          >
            {showArchived ? '📦 Archived' : '📦 Show Archived'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Sequence</button>
        </div>
      </div>

      <div className="page-body">
        {/* Overall stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Contacts', value: totalStats.total, color: 'var(--text)' },
            { label: 'Emails Sent', value: totalStats.sent, color: 'var(--green)' },
            { label: 'Opened', value: totalStats.opened, color: 'var(--yellow)' },
            { label: 'Replied', value: totalStats.replied, color: 'var(--accent2)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Upcoming Schedule */}
        <div className="card" style={{ marginBottom: 20 }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', textAlign: 'left', padding: 0, fontWeight: 600, fontSize: 14 }}
            onClick={() => setShowCalendar(v => !v)}
          >
            📅 Upcoming Schedule {showCalendar ? '▴' : '▾'}
            {calendarDates.length > 0 && (
              <span className="text-xs" style={{ marginLeft: 8, color: 'var(--text3)', fontWeight: 400 }}>
                ({calendarDates.length} day{calendarDates.length !== 1 ? 's' : ''} with scheduled sends)
              </span>
            )}
          </button>

          {showCalendar && (
            <div style={{ marginTop: 12 }}>
              {calendarDates.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--text3)', padding: '8px 0' }}>No upcoming scheduled emails.</div>
              ) : (
                calendarDates.map(date => (
                  <div key={date} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 6 }}>
                      {formatCalendarDate(date)}
                    </div>
                    {calendar[date].map((item, i) => (
                      <div key={i} className="flex-center gap-12" style={{ padding: '4px 0', fontSize: 13 }}>
                        <span style={{ color: 'var(--text3)', minWidth: 80 }}>{item.time}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{item.sequence}</span>
                        <span style={{ color: 'var(--text2)' }}>Step {item.step}</span>
                        <span className="badge badge-scheduled" style={{ marginLeft: 'auto' }}>{item.count} emails</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <input
          className="input"
          placeholder="🔍 Search sequences..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {/* Sequences list */}
        {loading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : filteredSequences.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">{search ? 'No matching sequences' : showArchived ? 'No archived sequences' : 'No sequences yet'}</div>
            <div className="empty-state-desc">
              {search ? 'Try a different search term' : showArchived ? 'Archive sequences to see them here' : 'Create your first email sequence to get started'}
            </div>
            {!search && !showArchived && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Sequence</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredSequences.map((seq, idx) => (
              <div key={seq.id} className="card card-hover" style={{ cursor: 'pointer', padding: '16px 20px' }} onClick={() => navigate(`/sequences/${seq.id}`)}>
                <div className="flex-between seq-card-main">
                  <div className="flex-center gap-12">
                    <span className={`badge ${STATUS_COLORS[seq.status] || 'badge-draft'}`}>
                      {seq.status === 'active' && '● '}{seq.status}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{seq.name}</div>
                      {seq.description && (
                        <div className="text-xs" style={{ color: 'var(--text3)', marginTop: 2, fontStyle: 'italic' }}>{seq.description}</div>
                      )}
                      <div className="text-xs" style={{ marginTop: 2 }}>
                        {seq.from_email || 'No sender set'} · {seq.total_contacts || 0} contacts
                        {seq.daily_limit_hit && (
                          <span style={{ color: 'var(--yellow)', marginLeft: 8 }}>
                            ⚠️ Limit reached — resumes {seq.daily_limit_reset_at ? formatIST(seq.daily_limit_reset_at) : 'tomorrow'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-center gap-16">
                    {/* Mini stats — hidden on mobile via CSS */}
                    <div className="flex-center gap-12 seq-card-stats" style={{ fontSize: 12, color: 'var(--text2)' }}>
                      <span title="Sent">📤 {seq.sent_count || 0}</span>
                      <span title="Opened">👁 {seq.opened_count || 0}</span>
                      <span title="Replied">💬 {seq.replied_count || 0}</span>
                      {seq.failed_count > 0 && <span title="Failed" style={{ color: 'var(--red)' }}>❌ {seq.failed_count}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex-center gap-8 seq-card-actions" onClick={e => e.stopPropagation()}>
                      {/* Reorder */}
                      <button className="btn btn-ghost btn-sm" onClick={(e) => moveUp(idx, e)} title="Move up" disabled={idx === 0} style={{ opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => moveDown(idx, e)} title="Move down" disabled={idx === filteredSequences.length - 1} style={{ opacity: idx === filteredSequences.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/sequences/${seq.id}/edit`)} title="Edit">✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={(e) => duplicate(seq.id, e)} title="Duplicate">⧉</button>
                      {!showArchived && (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => archive(seq.id, e)} title="Archive">📦</button>
                      )}
                      {showArchived && (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => unarchive(seq.id, e)} title="Unarchive">📤</button>
                      )}
                      {seq.status === 'active' && <button className="btn btn-ghost btn-sm" onClick={(e) => pause(seq.id, e)} title="Pause">⏸</button>}
                      {seq.status === 'paused' && <button className="btn btn-success btn-sm" onClick={(e) => resume(seq.id, e)} title="Resume">▶</button>}
                      {['active', 'paused'].includes(seq.status) && <button className="btn btn-danger btn-sm" onClick={(e) => stop(seq.id, e)} title="Stop">⏹</button>}
                      <button className="btn btn-danger btn-sm" onClick={(e) => deleteSeq(seq.id, e)} title="Delete">🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Sequence</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={createSequence}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Sequence Name</label>
                  <input className="input" autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Internship Outreach Oct 2025" required />
                  <div className="form-hint">Give it a name that describes the campaign</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create & Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
