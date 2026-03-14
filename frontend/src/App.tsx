import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from './components/Header';
import Login from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/LoadingSpinner';

const Chat = lazy(() => import('./pages/Chat'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {user && <Header />}
      <Box component="main" sx={{ flex: 1, p: 3 }}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to="/chat" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route
              path="/auth/callback"
              element={
                user ? (
                  <Navigate to="/chat" replace />
                ) : (
                  <Login />
                )
              }
            />
            <Route path="/chat" element={user ? <Chat /> : <Navigate to="/" replace />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" replace />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
}

export default App;