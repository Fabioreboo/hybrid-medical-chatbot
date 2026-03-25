import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeModeProvider } from './contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import { setupAxios } from './api/axiosConfig';
import './index.css';
import * as Sentry from "@sentry/react";

if (window.React) {
  window.React.startTransition = window.React.startTransition || ((callback) => callback());
}

Sentry.init({
  dsn: "https://13d878ebda8df565f7cd5452c8cd411b@o4511082152919040.ingest.us.sentry.io/4511082175660032",
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
});

setupAxios();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeModeProvider>
          <CssBaseline />
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SnackbarProvider>
        </ThemeModeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
