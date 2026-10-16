import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandHeader from '../components/BrandHeader';
import GoogleAuthButton from '../components/GoogleAuthButton';
import './Register.css';

export default function Register() {
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    password: '',
    password2: '',
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [esReenvio, setEsReenvio] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenvioNotif, setReenvioNotif] = useState(null);
  const [emailValidacion, setEmailValidacion] = useState({
    verificando: false,
    existe: false,
    verificado: false,
    mensaje: null,
  });

  const { register, loginWithGoogle, resendEmail, checkEmail, isAuthenticated } = useAuth();
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

    if (name === 'email') {
      if (emailValidacion.mensaje) {
        setEmailValidacion({ verificando: false, existe: false, verificado: false, mensaje: null });
      }
      if (error) setError(null);
    }
  };

  const handleEmailBlur = async () => {
    const emailLimpio = formData.email.trim().toLowerCase();
    if (!emailLimpio || !emailLimpio.includes('@') || emailLimpio.length < 5) {
      setEmailValidacion({ verificando: false, existe: false, verificado: false, mensaje: null });
      return;
    }

    setEmailValidacion((prev) => ({ ...prev, verificando: true }));
    try {
      const res = await checkEmail(emailLimpio);
      if (res.exists) {
        if (res.verified) {
          setEmailValidacion({
            verificando: false,
            existe: true,
            verificado: true,
            mensaje: 'Este correo ya tiene una cuenta registrada y activa.',
          });
        } else {
          setEmailValidacion({
            verificando: false,
            existe: true,
            verificado: false,
            mensaje: 'Esta cuenta ya está registrada pero no fue activada. Al crear tu cuenta te reenviaremos el correo de confirmación.',
          });
        }
      } else {
        setEmailValidacion({
          verificando: false,
          existe: false,
          verificado: false,
          mensaje: null,
        });
      }
    } catch {
      setEmailValidacion({ verificando: false, existe: false, verificado: false, mensaje: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, password2, first_name } = formData;
    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio || !password || !password2) {
      setError('Por favor completá todos los campos requeridos.');
      return;
    }

    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // Si ya sabemos que está verificado, bloquear inmediatamente
    if (emailValidacion.existe && emailValidacion.verificado) {
      setError('Este correo ya tiene una cuenta registrada y activa. Por favor iniciá sesión.');
      return;
    }

    setError(null);
    setCargando(true);

    // Validación preliminar en backend por si dio submit sin salir del input
    try {
      const statusCheck = await checkEmail(emailLimpio);
      if (statusCheck.exists) {
        if (statusCheck.verified) {
          setEmailValidacion({
            verificando: false,
            existe: true,
            verificado: true,
            mensaje: 'Este correo ya tiene una cuenta registrada y activa.',
          });
          setError('Este correo ya tiene una cuenta registrada y activa. Por favor iniciá sesión.');
          setCargando(false);
          return;
        } else {
          // Existe pero no está verificado -> reenvío de correo
          await resendEmail(emailLimpio);
          setEsReenvio(true);
          setRegistroExitoso(true);
          setCargando(false);
          return;
        }
      }
    } catch (checkErr) {
      console.warn('Error en validación preliminar de email:', checkErr);
    }

    try {
      await register({
        email: emailLimpio,
        password1: password,
        password2: password2,
        first_name: first_name.trim(),
      });
      setEsReenvio(false);
      setRegistroExitoso(true);
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      const esEmailRegistrado =
        msg.includes('ya existe') ||
        msg.includes('already registered') ||
        (err.data?.email && String(err.data.email).toLowerCase().includes('already registered'));

      if (esEmailRegistrado) {
        try {
          await resendEmail(emailLimpio);
          setEsReenvio(true);
          setRegistroExitoso(true);
          return;
        } catch (resendErr) {
          console.warn('No se pudo reenviar email automáticamente:', resendErr);
        }
      }

      setError(err.message || 'Error al crear la cuenta. Verificá los datos ingresados.');
    } finally {
      setCargando(false);
    }
  };

  const handleReenviarManual = async () => {
    setReenviando(true);
    setReenvioNotif(null);
    try {
      await resendEmail(formData.email.trim().toLowerCase());
      setReenvioNotif('¡Nuevo enlace de confirmación enviado exitosamente!');
    } catch (err) {
      setReenvioNotif(err.message || 'No se pudo reenviar el correo.');
    } finally {
      setReenviando(false);
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
    setError('No se pudo completar el registro con Google.');
  };

  return (
    <div className="login-stage-container">
      <BrandHeader />

      <div className="login-card">
        <header className="login-header">
          <h2 className="login-title">Crear Cuenta</h2>
        </header>

        {error && (
          <div className="login-error-alert" role="alert">
            <span className="login-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {registroExitoso ? (
          <div className="login-success-flow">
            <div className="login-success-alert">
              <div className="login-success-header">
                <span className="login-success-icon">✓</span>
                <h4 className="login-success-title">
                  {esReenvio ? '¡Correo de confirmación reenviado!' : '¡Cuenta creada con éxito!'}
                </h4>
              </div>
              <p className="login-success-desc">
                {esReenvio ? (
                  <>
                    Esta cuenta ya se encontraba registrada. Te acabamos de reenviar un nuevo enlace de confirmación a <strong>{formData.email}</strong>.
                    Revisá tu casilla (o la consola de Docker) para activar tu cuenta. Si ya la habías activado previamente, podés iniciar sesión directamente.
                  </>
                ) : (
                  <>
                    Te enviamos un correo de confirmación a <strong>{formData.email}</strong>.
                    Por favor revisá tu casilla (o la consola de Docker) para activar tu cuenta antes de iniciar sesión.
                  </>
                )}
              </p>
            </div>

            {reenvioNotif && (
              <p style={{ color: '#10b981', fontSize: '0.875rem', margin: '0.25rem 0', textAlign: 'center' }}>
                {reenvioNotif}
              </p>
            )}

            <Link
              to="/login"
              className="login-btn-submit"
            >
              Ir a Iniciar Sesión
            </Link>

            <button
              type="button"
              className="auth-link"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem 0 0 0',
                fontSize: '0.85rem',
                textAlign: 'center',
                width: '100%',
                color: 'var(--text-muted, #94a3b8)',
                textDecoration: 'underline'
              }}
              onClick={handleReenviarManual}
              disabled={reenviando}
            >
              {reenviando ? 'Reenviando correo...' : '¿No recibiste el correo? Hacé clic acá para reenviarlo'}
            </button>
          </div>
        ) : (
          <>
            {/* Registro con Google */}
            <div className="google-oauth-zone">
              <GoogleAuthButton
                mode="register"
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
                <label htmlFor="first_name" className="login-label">
                  Nombre (opcional)
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  className="login-input"
                  placeholder="nombre"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={cargando}
                  autoFocus
                />
              </div>

              <div className="login-field-group">
                <label htmlFor="email" className="login-label">
                  Correo Electrónico *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`login-input ${
                    emailValidacion.existe
                      ? emailValidacion.verificado
                        ? 'has-error'
                        : 'has-warning'
                      : ''
                  }`}
                  placeholder="nombre@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  disabled={cargando}
                  required
                  autoComplete="email"
                />
                {emailValidacion.verificando && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                    Comprobando disponibilidad...
                  </span>
                )}
                {emailValidacion.mensaje && (
                  <div
                    className={`field-validation-msg ${
                      emailValidacion.verificado ? 'error' : 'warning'
                    }`}
                  >
                    <span>{emailValidacion.mensaje}</span>
                    {emailValidacion.verificado && (
                      <Link to="/login" className="field-link">
                        Hacé clic acá para Iniciar Sesión →
                      </Link>
                    )}
                  </div>
                )}
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

              <div className="login-field-group">
                <label htmlFor="password2" className="login-label">
                  Confirmar Contraseña *
                </label>
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  className="login-input"
                  placeholder="Repetí tu contraseña"
                  value={formData.password2}
                  onChange={handleChange}
                  disabled={cargando}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="login-btn-submit"
                disabled={
                  cargando ||
                  emailValidacion.verificando ||
                  (emailValidacion.existe && emailValidacion.verificado) ||
                  !formData.email.trim() ||
                  !formData.password ||
                  !formData.password2
                }
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
          </>
        )}

        <footer className="login-footer">
          <p className="login-switch-text">
            ¿Ya tenés una cuenta?{' '}
            <Link to="/login" className="auth-link">
              Iniciar sesión
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
