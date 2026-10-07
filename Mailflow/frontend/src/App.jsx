import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SequenceEditor from './pages/SequenceEditor';
import SequenceDetail from './pages/SequenceDetail';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import NotificationsPage from './pages/NotificationsPage';
import TrialExpired from './pages/TrialExpired';
import Landing from './pages/Landing';
import { LoginPage, RegisterPage, SetupPage } from './pages/Auth';
import api from './utils/api';
import './index.css';

function AppRoutes() {
  const { user, loading } = useAuth();
  const [setupDone, setSetupDone] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    api.get('/auth/status')
      .then(res => setSetupDone(res.data.setup))
      .catch(() => { setApiError(true); setSetupDone(false); });
  }, []);

  if (loading || setupDone === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (apiError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', gap: 12, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Cannot connect to server</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 320 }}>The backend API is not reachable. Please make sure the server is running and try again.</div>
        <button className="btn btn-primary" onClick={() => { setApiError(false); setSetupDone(null); api.get('/auth/status').then(res => setSetupDone(res.data.setup)).catch(() => { setApiError(true); setSetupDone(false); }); }}>
          Retry
        </button>
      </div>
    );
  }

  if (!setupDone) return <Routes><Route path="*" element={<SetupPage />} /></Routes>;

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // Trial expired check
  const isExpired = user.access_status === 'expired' ||
    (user.access_status === 'trial' && user.trial_expires_at && new Date() > new Date(user.trial_expires_at));

  if (isExpired && !user.is_admin) {
    return (
      <Routes>
        <Route path="*" element={<TrialExpired />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile overlay behind sidebar */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={closeSidebar}
      />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="layout-main">
        {/* Hamburger — only visible on mobile via CSS */}
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <span className="hamburger-icon">☰</span>
          MailFlow
        </button>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sequences/:id" element={<SequenceDetail />} />
          <Route path="/sequences/:id/edit" element={<SequenceEditor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/home" element={<Landing />} />
          <Route path="/admin" element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: { background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13 },
          success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg3)' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg3)' } },
        }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
