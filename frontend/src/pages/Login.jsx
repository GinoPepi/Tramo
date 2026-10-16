import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandHeader from '../components/BrandHeader';
import GoogleAuthButton from '../components/GoogleAuthButton';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const { login, loginWithGoogle, isAuthenticated } = useAuth();
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
    if (!email.trim() || !password || cargando) return;

    setError(null);
    setCargando(true);

    try {
      await login(email.trim(), password);
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleSuccess = async (token) => {
    if (!token) {
      setError('No se recibió la credencial de Google.');
      return;
    }

    setError(null);
    setCargando(true);

    try {
      await loginWithGoogle(token);
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al autenticar con Google.');
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleError = () => {
    setError('No se pudo completar el inicio de sesión con Google.');
  };

  return (
    <div className="login-stage-container">
      <BrandHeader />

      <div className="login-card">
        <header className="login-header">
          <h2 className="login-title">Iniciar Sesión</h2>
        </header>

        {error && (
          <div className="login-error-alert" role="alert">
            <span className="login-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Botón de Google OAuth */}
        <div className="google-oauth-zone">
          <GoogleAuthButton
            mode="login"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            disabled={cargando}
          />
        </div>

        <div className="auth-separator">
          <span>o con correo y contraseña</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label htmlFor="email" className="login-label">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              className="login-input"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={cargando}
              autoFocus
              required
              autoComplete="email"
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
            disabled={cargando || !email.trim() || !password}
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
          <p className="login-switch-text">
            ¿No tenés una cuenta?{' '}
            <Link to="/register" className="auth-link">
              Registrate
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
