import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import ChatView from './pages/ChatView';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

function PageTitleManager() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (path === '/login') {
      document.title = 'Login';
    } else if (path === '/register') {
      document.title = 'Register';
    } else if (path.includes('/document/') || path === '/chat') {
      document.title = 'Documents';
    } else if (path.startsWith('/notebook/')) {
      document.title = 'Notebook';
    } else if (path === '/') {
      document.title = 'Tramo';
    } else {
      document.title = 'Tramo';
    }
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <PageTitleManager />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email/:key" element={<VerifyEmail />} />
            <Route path="/account-confirm-email/:key" element={<VerifyEmail />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document/:documentId"
              element={
                <ProtectedRoute>
                  <ChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notebook/:notebookId/document/:documentId"
              element={
                <ProtectedRoute>
                  <ChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatView />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}