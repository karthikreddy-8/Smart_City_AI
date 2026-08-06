import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// ── API Base URL ──────────────────────────────────────────────────────────────
// Uses Vite proxy in development (relative path /api) or env variable in production
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) {
    if (envUrl && (envUrl.startsWith('/') || envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl;
    }
    return '/api';
  }
  return envUrl || '/api';
};

export const API_URL = getApiUrl();

// ── Axios instance with auth header injection ────────────────────────────────
export const api = axios.create({ baseURL: API_URL });

// Automatically attach Bearer token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider = ({ children }) => {
  const [token, setToken]   = useState(() => localStorage.getItem('token') || null);
  const [role,  setRole]    = useState(() => localStorage.getItem('role')  || 'Guest');
  const [user,  setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setToken(null);
    setRole('Guest');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // ── Fetch profile from backend ──────────────────────────────────────────────
  const fetchProfile = useCallback(async (accessToken) => {
    try {
      const res = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(res.data);
      setRole(res.data.role);
      localStorage.setItem('role', res.data.role);
    } catch {
      // Token invalid or expired — clear session
      logout();
    }
  }, [logout]);

  // ── Restore session on page load ────────────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      fetchProfile(savedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ──────────────────────────────────────────────────────────────────
  // Accepts username OR email for identification
  const login = async (identifier, password) => {
    const params = new URLSearchParams();
    params.append('username', identifier);   // FastAPI OAuth2 uses 'username' field
    params.append('password', password);

    const res = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, role: userRole } = res.data;

    // Persist session
    localStorage.setItem('token', access_token);
    localStorage.setItem('role', userRole);
    setToken(access_token);
    setRole(userRole);

    // Also set on global axios for any non-intercepted calls
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

    // Fetch full user profile
    await fetchProfile(access_token);

    return userRole;
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (username, email, password, roleChoice = 'Guest') => {
    const res = await api.post('/auth/register', {
      username,
      email,
      password,
      role: roleChoice
    });
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ token, role, user, loading, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
