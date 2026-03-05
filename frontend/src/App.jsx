import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import api from './utils/api';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import LibraryPage from './pages/LibraryPage';
import SearchPage from './pages/SearchPage';
import DownloadsPage from './pages/DownloadsPage';
import SettingsPage from './pages/SettingsPage';
import MediaDetailPage from './pages/MediaDetailPage';
import ImportPage from './pages/ImportPage';
import CustomFormatsPage from './pages/CustomFormatsPage';
import UsersPage from './pages/UsersPage';
import OnboardingPage from './pages/OnboardingPage';

function ProtectedRoute({ children }) {
  const token = useAuthStore(s => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { token, fetchMe } = useAuthStore();
  const [setupDone, setSetupDone] = useState(null);
  const [onboarding, setOnboarding] = useState(null); // null=checking, {required,expiresAt}
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/auth/setup-status').then(r => r.data).catch(() => ({ setupComplete: true })),
      api.get('/onboarding/status').then(r => r.data).catch(() => ({ required: false })),
    ]).then(([setup, ob]) => {
      setSetupDone(setup.setupComplete);
      setOnboarding(ob);
    }).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (token) fetchMe();
  }, [token, fetchMe]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}>
        <div style={{ color: '#6366f1', fontFamily: 'Space Mono, monospace', fontSize: '14px', letterSpacing: '0.2em' }}>
          LOADING...
        </div>
      </div>
    );
  }

  // Show onboarding wizard on first launch
  if (onboarding?.required) {
    return (
      <OnboardingPage
        expiresAt={onboarding.expiresAt}
        onComplete={() => {
          setOnboarding({ required: false });
          setSetupDone(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a2e', color: '#e8e8f0', border: '1px solid #2a2a4e', fontFamily: 'DM Sans, sans-serif' },
          success: { iconTheme: { primary: '#6366f1', secondary: '#0a0a0f' } },
        }}
      />
      <Routes>
        <Route path="/setup" element={setupDone ? <Navigate to="/login" /> : <SetupPage onDone={() => setSetupDone(true)} />} />
        <Route path="/login" element={!setupDone ? <Navigate to="/setup" /> : <LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:id" element={<MediaDetailPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="downloads" element={<DownloadsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="custom-formats" element={<CustomFormatsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
