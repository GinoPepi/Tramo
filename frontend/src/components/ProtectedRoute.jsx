import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, cargandoAuth } = useAuth();
  const location = useLocation();

  if (cargandoAuth) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#0c0d12',
          color: '#94a3b8',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '2px solid rgba(147, 197, 253, 0.15)',
            borderTopColor: '#93c5fd',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <span style={{ fontSize: '13px', letterSpacing: '0.04em' }}>
          Verificando sesión...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
