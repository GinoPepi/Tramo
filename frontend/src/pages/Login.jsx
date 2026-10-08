import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Si ya tiene sesión activa, redirigir a la página previa o a la raíz
  useEffect(() => {
    if (isAuthenticated) {
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password || cargando) return;

    setError(null);
    setCargando(true);

    try {
      await login(username.trim(), password);
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-stage-container">
      <div className="login-card">
        <header className="login-header">
          <div className="login-badge">
            <span>Tramo Workspace</span>
          </div>
          <h1 className="login-title">Iniciar Sesión</h1>
          <p className="login-subtitle">
            Gestor documental y asistente de lectura académica
          </p>
        </header>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error-alert" role="alert">
              <span className="login-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          <div className="login-field-group">
            <label htmlFor="username" className="login-label">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className="login-input"
              placeholder="Ingresá tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={cargando}
              autoFocus
              required
              autoComplete="username"
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="password" className="login-label">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={cargando}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="login-btn-submit"
            disabled={cargando || !username.trim() || !password}
          >
            {cargando ? (
              <>
                <span className="login-spinner" />
                <span>Ingresando...</span>
              </>
            ) : (
              'Ingresar al espacio'
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p className="login-hint">
            Acceso seguro mediante autenticación basada en tokens
          </p>
        </footer>
      </div>
    </div>
  );
}
