import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function TrialExpired() {
  const { user, logout } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const requestAccess = async () => {
    setRequesting(true);
    try {
      await api.post('/notifications/request-access');
      setRequested(true);
      toast.success('Request sent! The admin will review it soon.');
    } catch {
      toast.error('Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⏰</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: 'var(--text)' }}>Your trial has ended</h1>
        <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 32, lineHeight: 1.7 }}>
          Your 7-day free trial is over. To continue using MailFlow, request full access below. The admin will review and approve your request.
        </p>
        <div className="card" style={{ marginBottom: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Logged in as</div>
          <div style={{ fontWeight: 600 }}>{user?.full_name || user?.email}</div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{user?.email}</div>
        </div>
        {requested ? (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            ✅ Request sent! You'll get a notification once approved.
          </div>
        ) : (
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 12 }} onClick={requestAccess} disabled={requesting}>
            {requesting ? 'Sending request...' : '📨 Request Full Access'}
          </button>
        )}
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}
