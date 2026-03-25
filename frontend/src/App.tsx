import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { Header } from './components/Header';
import Login from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import { LoadingSpinner } from './components/LoadingSpinner';

const Chat = lazy(() => import('./pages/Chat'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate to="/chat" replace />
              ) : (
                <Box component="main" sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
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
                <Box component="main" sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
                  <Login />
                </Box>
              )
            }
          />
          <Route path="/chat" element={user ? <Chat /> : <Navigate to="/" replace />} />
          <Route path="/admin" element={
            user?.role === 'admin' ? (
              <>
                <Header />
                <Box component="main" sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
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