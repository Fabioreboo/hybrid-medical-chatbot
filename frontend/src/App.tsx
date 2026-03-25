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
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/chat" replace />
              ) : (
                <Box component="main" sx={{ flex: 1, p: 3 }}>
                  <Login />
                </Box>
              )
            }
          />
          <Route
            path="/auth/callback"
            element={
              user ? (
                <Navigate to="/chat" replace />
              ) : (
                <Box component="main" sx={{ flex: 1, p: 3 }}>
                  <Login />
                </Box>
              )
            }
          />
          <Route path="/chat" element={user ? <Chat /> : <Navigate to="/" replace />} />
          <Route path="/dashboard" element={
            user ? (
              <>
                <Header />
                <Box component="main" sx={{ flex: 1, p: 3 }}>
                  <Dashboard />
                </Box>
              </>
            ) : <Navigate to="/" replace />
          } />
          <Route path="/admin" element={
            user?.role === 'admin' ? (
              <>
                <Header />
                <Box component="main" sx={{ flex: 1, p: 3 }}>
                  <AdminPanel />
                </Box>
              </>
            ) : <Navigate to="/chat" replace />
          } />
        </Routes>
      </Suspense>
    </Box>
  );
}

export default App;