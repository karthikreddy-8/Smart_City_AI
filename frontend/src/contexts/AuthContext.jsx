import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// ── API Base URL ──────────────────────────────────────────────────────────────
// Strategy:
//   • Local dev  → VITE_API_URL=/api  (Vite proxies /api → http://127.0.0.1:8000)
//   • Production → VITE_API_URL=https://smart-city-ai-d4re.onrender.com/api
//
// Vite selects .env (dev) or .env.production (build) automatically.
const RENDER_BACKEND = 'https://smart-city-ai-d4re.onrender.com/api';

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  // Final fallback: production Render URL
  return RENDER_BACKEND;
};

export const API_URL = getApiUrl();

// ── Axios instance ────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: API_URL,
  timeout: 35000,  // 35s — covers Render cold-start (~30s)
});

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: automatic retry on network errors & 503 ─────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    // Retry at most once, skip retrying login/register forms
    const isRetryable = (
      !config._retried &&
      (
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNABORTED' ||
        (error.response && error.response.status === 503)
      )
    );

    if (isRetryable) {
      config._retried = true;
      // Wait 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

// ── Backend wake-up helper ─────────────────────────────────────────────────────
// Pings the /health endpoint before login to detect if Render is sleeping.
// Returns: 'online' | 'waking' | 'offline'
export const checkBackendHealth = async () => {
  const healthUrl = API_URL.replace(/\/api$/, '') + '/health';
  try {
    const res = await axios.get(healthUrl, { timeout: 5000 });
    if (res.status === 200) return 'online';
    return 'offline';
  } catch (err) {
    if (err.code === 'ECONNABORTED') return 'waking';  // timeout = sleeping
    if (err.code === 'ERR_NETWORK') return 'waking';
    if (err.response?.status >= 500) return 'waking';
    return 'offline';
  }
};

// ── Wake backend with patience ─────────────────────────────────────────────────
// Sends a /wake ping and waits up to 40s for the backend to respond.
export const wakeBackend = async (onProgress) => {
  const wakeUrl = API_URL.replace(/\/api$/, '') + '/wake';
  const maxWaitMs = 40000;
  const startTime = Date.now();

  // Try wake endpoint first, fall back to /health
  const tryPing = async () => {
    try {
      const res = await axios.get(wakeUrl, { timeout: 38000 });
      if (res.status === 200) return true;
    } catch {
      try {
        const healthUrl = API_URL.replace(/\/api$/, '') + '/health';
        const res2 = await axios.get(healthUrl, { timeout: 38000 });
        if (res2.status === 200) return true;
      } catch {
        /* still waking */
      }
    }
    return false;
  };

  // Poll until backend responds or timeout
  while (Date.now() - startTime < maxWaitMs) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    if (onProgress) onProgress(elapsed);
    const isUp = await tryPing();
    if (isUp) return true;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
};

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
