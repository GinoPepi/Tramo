import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    first_name: '',
    username: '',
    email: '',
    password: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const { register, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Si ya tiene sesión activa, redirigir a la página principal
  useEffect(() => {
    if (isAuthenticated) {
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { first_name, username, email, password } = formData;

    if (!username.trim() || !email.trim() || !password) {
      setError('Por favor completá todos los campos requeridos.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setError(null);
    setCargando(true);

    try {
      await register({
        first_name: first_name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Verificá los datos ingresados.');
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setError('No se recibió la credencial de Google.');
      return;
    }

    setError(null);
    setCargando(true);

    try {
      await loginWithGoogle(credentialResponse.credential);
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al autenticar con Google.');
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleError = () => {
    setError('No se pudo completar el registro con Google.');
  };

  return (
    <div className="login-stage-container">
      <div className="login-card">
        <header className="login-header">
          <div className="login-badge">
            <span>Tramo Workspace</span>
          </div>
          <h1 className="login-title">Crear Cuenta</h1>
          <p className="login-subtitle">
            Unite a tu asistente de lectura y organizador de cuadernos
          </p>
        </header>

        {error && (
          <div className="login-error-alert" role="alert">
            <span className="login-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Registro con Google */}
        <div className="google-oauth-zone">
          <div className="google-btn-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="signup_with"
              width="100%"
            />
          </div>
        </div>

        <div className="auth-separator">
          <span>o con usuario y contraseña</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="register-grid-names">
            <div className="login-field-group">
              <label htmlFor="first_name" className="login-label">
                Nombre
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                className="login-input"
                placeholder="Ej: Gino"
                value={formData.first_name}
                onChange={handleChange}
                disabled={cargando}
                autoFocus
              />
            </div>

            <div className="login-field-group">
              <label htmlFor="username" className="login-label">
                Usuario *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="login-input"
                placeholder="Ej: ginop"
                value={formData.username}
                onChange={handleChange}
                disabled={cargando}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-field-group">
            <label htmlFor="email" className="login-label">
              Correo Electrónico *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="login-input"
              placeholder="nombre@ejemplo.com"
              value={formData.email}
              onChange={handleChange}
              disabled={cargando}
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field-group">
            <label htmlFor="password" className="login-label">
              Contraseña *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="login-input"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              disabled={cargando}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="login-btn-submit"
            disabled={cargando || !formData.username.trim() || !formData.email.trim() || !formData.password}
          >
            {cargando ? (
              <>
                <span className="login-spinner" />
                <span>Registrando cuenta...</span>
              </>
            ) : (
              'Crear mi cuenta'
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p className="login-switch-text">
            ¿Ya tenés una cuenta?{' '}
            <Link to="/login" className="auth-link">
              Iniciar sesión
            </Link>
          </p>
          <p className="login-hint">
            Tus datos se encuentran resguardados con cifrado estándar
          </p>
        </footer>
      </div>
    </div>
  );
}
