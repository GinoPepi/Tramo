import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = 'http://localhost:8000';

const formatearErrorApi = (data, fallback = 'Ocurrió un error inesperado.') => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail && typeof data.detail === 'string') return data.detail;
  if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
    return data.non_field_errors.join(' ');
  }

  // Traducción y limpieza de errores por campo
  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const val = data[firstKey];
      let msg = Array.isArray(val) ? val[0] : String(val);

      const traducciones = {
        'This password is too common.': 'Esta contraseña es demasiado común.',
        'This password is too short. It must contain at least 8 characters.': 'La contraseña debe tener al menos 8 caracteres.',
        'This password is entirely numeric.': 'La contraseña no puede ser solo números.',
        'The password is too similar to the username.': 'La contraseña es demasiado similar al usuario o correo.',
        'The password is too similar to the email.': 'La contraseña es demasiado similar al correo electrónico.',
        "The two password fields didn't match.": 'Las contraseñas no coinciden.',
        'A user is already registered with this e-mail address.': 'Ya existe una cuenta registrada con este correo electrónico.',
        'User is already registered with this e-mail address.': 'Ya existe una cuenta registrada con este correo electrónico.',
        'Enter a valid email address.': 'Ingresá un correo electrónico válido.',
        'Unable to log in with provided credentials.': 'Credenciales incorrectas o correo no verificado.',
      };

      return traducciones[msg] || msg;
    }
  }

  return fallback;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('tramo_access'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('tramo_refresh'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  // Helper para refrescar token JWT
  const refrescarToken = async () => {
    const currentRefresh = refreshToken || localStorage.getItem('tramo_refresh');
    if (!currentRefresh) throw new Error('No refresh token available');

    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: currentRefresh }),
    });

    if (!res.ok) {
      throw new Error('Refresh token expirado');
    }

    const data = await res.json();
    const newAccess = data.access;
    localStorage.setItem('tramo_access', newAccess);
    setAccessToken(newAccess);
    if (data.refresh) {
      localStorage.setItem('tramo_refresh', data.refresh);
      setRefreshToken(data.refresh);
    }
    return newAccess;
  };

  // Al montar la app: validar sesión existente en localStorage
  useEffect(() => {
    const verificarSesion = async () => {
      const storedAccess = localStorage.getItem('tramo_access');
      if (!storedAccess) {
        setCargandoAuth(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        let tokenParaUsar = storedAccess;
        let response = await fetch(`${API_BASE}/auth/user/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenParaUsar}`,
            'Content-Type': 'application/json',
          },
        });

        // Si expiró el access token, intentamos refrescarlo automáticamente
        if (response.status === 401 && localStorage.getItem('tramo_refresh')) {
          try {
            tokenParaUsar = await refrescarToken();
            response = await fetch(`${API_BASE}/auth/user/`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${tokenParaUsar}`,
                'Content-Type': 'application/json',
              },
            });
          } catch {
            // No se pudo refrescar
            response = { ok: false };
          }
        }

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          limpiarSesion();
        }
      } catch (err) {
        console.error('Error al verificar sesión existente:', err);
        limpiarSesion();
      } finally {
        setCargandoAuth(false);
      }
    };

    verificarSesion();
  }, []);

  const limpiarSesion = () => {
    localStorage.removeItem('tramo_access');
    localStorage.removeItem('tramo_refresh');
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(formatearErrorApi(data, 'Error al iniciar sesión. Verifique sus credenciales.'));
    }

    // dj-rest-auth retorna { access, refresh, user }
    if (data.access) {
      localStorage.setItem('tramo_access', data.access);
      setAccessToken(data.access);
    }
    if (data.refresh) {
      localStorage.setItem('tramo_refresh', data.refresh);
      setRefreshToken(data.refresh);
    }
    if (data.user) {
      setUser(data.user);
    }
    setIsAuthenticated(true);
    return data;
  };

  const register = async ({ email, password1, password2, first_name }) => {
    const payload = {
      email: email.trim().toLowerCase(),
      password1,
      password2,
      first_name: (first_name || '').trim(),
    };

    const response = await fetch(`${API_BASE}/auth/registration/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = formatearErrorApi(data, 'Error al registrar la cuenta.');
      const err = new Error(errorMsg);
      err.data = data;
      err.status = response.status;
      throw err;
    }

    // Si allauth mandó verificación obligatoria, data suele traer mensaje de verificación
    return data;
  };

  const resendEmail = async (email) => {
    const response = await fetch(`${API_BASE}/auth/registration/resend-email/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(formatearErrorApi(data, 'No se pudo reenviar el correo de confirmación.'));
    }

    return data;
  };

  const checkEmail = async (email) => {
    if (!email || !email.includes('@')) {
      return { exists: false, verified: false };
    }
    try {
      const response = await fetch(`${API_BASE}/auth/check-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!response.ok) return { exists: false, verified: false };
      return await response.json();
    } catch (err) {
      console.warn('Error al verificar disponibilidad de correo:', err);
      return { exists: false, verified: false };
    }
  };

  const loginWithGoogle = async (credential) => {
    const isJwt = typeof credential === 'string' && credential.startsWith('ey');
    const payload = isJwt
      ? { access_token: credential, id_token: credential }
      : { access_token: credential };

    const response = await fetch(`${API_BASE}/auth/google/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(formatearErrorApi(data, 'Error al autenticar con Google.'));
    }

    if (data.access) {
      localStorage.setItem('tramo_access', data.access);
      setAccessToken(data.access);
    }
    if (data.refresh) {
      localStorage.setItem('tramo_refresh', data.refresh);
      setRefreshToken(data.refresh);
    }
    if (data.user) {
      setUser(data.user);
    }
    setIsAuthenticated(true);
    return data;
  };

  const logout = async () => {
    const currentAccess = accessToken || localStorage.getItem('tramo_access');
    const currentRefresh = refreshToken || localStorage.getItem('tramo_refresh');

    if (currentAccess) {
      try {
        await fetch(`${API_BASE}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccess}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: currentRefresh }),
        });
      } catch (err) {
        console.error('Error al notificar cierre de sesión al servidor:', err);
      }
    }

    limpiarSesion();
  };

  // Helper fetch autenticado que inyecta automáticamente el token JWT
  const authFetch = async (url, options = {}) => {
    let tokenActual = accessToken || localStorage.getItem('tramo_access');
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${tokenActual}`,
    };

    let res = await fetch(url, { ...options, headers });

    // Si da 401, intentamos refrescar el token y reintentar una vez
    if (res.status === 401 && localStorage.getItem('tramo_refresh')) {
      try {
        tokenActual = await refrescarToken();
        const headersReintento = {
          ...(options.headers || {}),
          'Authorization': `Bearer ${tokenActual}`,
        };
        res = await fetch(url, { ...options, headers: headersReintento });
      } catch (err) {
        limpiarSesion();
        throw new Error('Sesión expirada. Por favor iniciá sesión nuevamente.');
      }
    }

    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: accessToken,
        accessToken,
        refreshToken,
        isAuthenticated,
        cargandoAuth,
        login,
        loginWithGoogle,
        register,
        resendEmail,
        checkEmail,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
