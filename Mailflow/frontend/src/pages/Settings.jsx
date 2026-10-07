import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [aliases, setAliases] = useState([]);
  const [signature, setSignature] = useState('');
  const [savingSig, setSavingSig] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const gmailStatus = searchParams.get('gmail');
    if (gmailStatus === 'connected') {
      refreshUser();
      toast.success('Gmail connected successfully!');
    }
    if (gmailStatus === 'error') toast.error('Gmail connection failed: ' + (searchParams.get('msg') || 'Unknown error'));
  }, []);

  useEffect(() => {
    if (user?.signature) setSignature(user.signature);
    if (user?.gmail_email) {
      api.get('/auth/gmail/aliases')
        .then(res => setAliases(res.data))
        .catch(() => {});
    }
  }, [user]);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const res = await api.get('/auth/gmail/url');
      window.location.href = res.data.url;
    } catch { toast.error('Failed to get auth URL'); setConnecting(false); }
  };

  const disconnectGmail = async () => {
    if (!window.confirm('Disconnect Gmail? Active sequences will stop sending.')) return;
    await api.post('/auth/gmail/disconnect');
    await refreshUser();
    setAliases([]);
    toast.success('Gmail disconnected');
  };

  const saveSignature = async () => {
    setSavingSig(true);
    try {
      await api.put('/auth/signature', { signature });
      toast.success('Signature saved');
    } catch { toast.error('Failed'); }
    finally { setSavingSig(false); }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure your Gmail connection and preferences</div>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 600 }}>

        {/* Gmail Connection */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Gmail Connection</div>
          <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Connect your Gmail account to send emails and detect replies
          </div>

          {user?.gmail_email ? (
            <div>
              <div className="alert alert-success" style={{ marginBottom: 14 }}>
                ✅ Connected as <strong>{user.gmail_email}</strong>
                {user.gmail_connected_at && <span style={{ marginLeft: 8, opacity: 0.7 }}>since {new Date(user.gmail_connected_at).toLocaleDateString()}</span>}
              </div>

              {aliases.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="form-label" style={{ marginBottom: 8 }}>Send As Aliases Detected</div>
                  {aliases.map(a => (
                    <div key={a.email} className="flex-center gap-8" style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>📧</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{a.email}</div>
                        {a.name && <div className="text-xs">{a.name}</div>}
                      </div>
                      {a.isPrimary && <span className="badge badge-active">Primary</span>}
                    </div>
                  ))}
                </div>
              )}

              <button className="btn btn-danger btn-sm" onClick={disconnectGmail}>Disconnect Gmail</button>
            </div>
          ) : (
            <div>
              <div className="alert alert-warning" style={{ marginBottom: 14 }}>
                ⚠️ Gmail not connected. You won't be able to send emails until connected.
              </div>
              <button className="btn btn-primary" onClick={connectGmail} disabled={connecting}>
                {connecting ? 'Redirecting...' : '🔗 Connect Gmail'}
              </button>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Email Signature</div>
          <div className="text-sm text-muted" style={{ marginBottom: 16 }}>
            This signature is appended to emails when "Include Signature" is enabled in a sequence.
            {user?.gmail_email && ' Auto-fetched from your Gmail settings.'}
          </div>
          <div className="form-group">
            <textarea
              className="textarea"
              style={{ minHeight: 120, fontFamily: 'inherit' }}
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Your Name&#10;Your Title | Your Company&#10;Phone | Website"
            />
            <div className="form-hint">Supports plain text and basic HTML</div>
          </div>
          <button className="btn btn-primary" onClick={saveSignature} disabled={savingSig}>
            {savingSig ? 'Saving...' : 'Save Signature'}
          </button>
        </div>

        {/* Account info */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Account</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <div style={{ marginBottom: 6 }}>Logged in as: <strong style={{ color: 'var(--text)' }}>{user?.email}</strong></div>
          </div>
          <div className="divider" />
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
            <div>📬 Emails send through Gmail API — from your own Gmail account</div>
            <div>🔄 Scheduler checks every 5 minutes for pending sends</div>
            <div>💬 Reply detection runs every 15 minutes</div>
            <div>⚡ Gmail daily limit: ~500 emails/day for @gmail.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
