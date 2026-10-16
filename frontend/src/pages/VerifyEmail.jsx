import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Login.css';

export default function VerifyEmail() {
  const { key } = useParams();
  const [cargando, setCargando] = useState(true);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const confirmar = async () => {
      if (!key) {
        setError('Clave de verificación no proporcionada.');
        setCargando(false);
        return;
      }

      try {
        const res = await fetch('http://localhost:8000/auth/registration/verify-email/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key }),
        });

        if (res.ok) {
          setExito(true);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.detail || 'El enlace de confirmación es inválido o ha expirado.');
        }
      } catch (err) {
        setError('Error de conexión al verificar el correo.');
      } finally {
        setCargando(false);
      }
    };

    confirmar();
  }, [key]);

  return (
    <div className="login-stage-container">
      <div className="login-card">
        <header className="login-header">
          <div className="login-badge">
            <span>Tramo Workspace</span>
          </div>
          <h1 className="login-title">Verificación de Correo</h1>
          <p className="login-subtitle">Confirmación de cuenta de usuario</p>
        </header>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
            <div className="login-spinner" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontSize: '13.5px' }}>Verificando tu cuenta...</p>
          </div>
        )}

        {!cargando && exito && (
          <div className="login-success-alert">
            <h4 style={{ margin: '0 0 6px 0', color: '#86efac', fontSize: '15px' }}>
              ✓ ¡Correo confirmado con éxito!
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
              Tu cuenta ha sido activada correctamente. Ya podés iniciar sesión en Tramo.
            </p>
            <Link
              to="/login"
              className="login-btn-submit"
              style={{ marginTop: '16px', textDecoration: 'none', textAlign: 'center' }}
            >
              Iniciar Sesión
            </Link>
          </div>
        )}

        {!cargando && error && (
          <div>
            <div className="login-error-alert" role="alert">
              <span className="login-error-icon">!</span>
              <span>{error}</span>
            </div>
            <Link
              to="/login"
              className="login-btn-submit"
              style={{ marginTop: '16px', textDecoration: 'none', textAlign: 'center' }}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
