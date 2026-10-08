import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_AUTH_URL = 'http://localhost:8000/chat/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('tramo_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cargandoAuth, setCargandoAuth] = useState(true);

  // Al montar la app: validar token existente en localStorage
  useEffect(() => {
    const verificarSesion = async () => {
      const storedToken = localStorage.getItem('tramo_token');
      if (!storedToken) {
        setCargandoAuth(false);
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch(`${API_AUTH_URL}/me/`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setToken(storedToken);
          setIsAuthenticated(true);
        } else {
          // Token inválido o expirado
          localStorage.removeItem('tramo_token');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Error al validar sesión existente:', err);
        localStorage.removeItem('tramo_token');
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        setCargandoAuth(false);
      }
    };

    verificarSesion();
  }, []);

  const login = async (username, password) => {
    const response = await fetch(`${API_AUTH_URL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.detail || data.error || 'Credenciales incorrectas.';
      throw new Error(errorMsg);
    }

    localStorage.setItem('tramo_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const logout = async () => {
    const currentToken = token || localStorage.getItem('tramo_token');
    if (currentToken) {
      try {
        await fetch(`${API_AUTH_URL}/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${currentToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.error('Error al notificar cierre de sesión al servidor:', err);
      }
    }

    localStorage.removeItem('tramo_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        cargandoAuth,
        login,
        logout,
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
