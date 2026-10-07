import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✉️</div>
          <div className="auth-title">MailFlow</div>
          <div className="auth-subtitle">Sign in to your account</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back to home
          </button>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text2)' }}>
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
              Sign up free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(fullName, email, password);
      toast.success('Welcome! Your 7-day trial has started 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✉️</div>
          <div className="auth-title">Create Account</div>
          <div className="auth-subtitle">Start your free 7-day trial — no credit card needed</div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back to home
          </button>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : 'Start Free Trial 🚀'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text2)' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
              Log in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const res = await api.post('/auth/setup', { email, password });
      localStorage.setItem('mf_token', res.data.token);
      toast.success('Account created! Now connect your Gmail.');
      navigate('/settings');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">✉️</div>
          <div className="auth-title">Welcome to MailFlow</div>
          <div className="auth-subtitle">Create your admin account to get started</div>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
