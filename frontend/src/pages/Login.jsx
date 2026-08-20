import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkBackendHealth, wakeBackend } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  FaCity, FaUser, FaLock, FaArrowRight, FaEye, FaEyeSlash,
  FaBolt, FaShieldAlt, FaChartLine, FaRedo, FaSpinner, FaServer
} from 'react-icons/fa';

// ── Animated traffic road SVG ────────────────────────────────────────────────
const TrafficAnimation = () => (
  <div className="relative w-full h-2 bg-slate-700/60 rounded-full overflow-hidden my-2">
    <div className="traffic-car absolute top-0 h-full w-8 rounded-full bg-gradient-to-r from-primary-500 to-cyan-400 opacity-80 blur-sm" />
    <div className="traffic-car-2 absolute top-0 h-full w-5 rounded-full bg-gradient-to-r from-violet-500 to-pink-400 opacity-60 blur-sm" />
    <div className="traffic-car-3 absolute top-0 h-full w-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 opacity-70 blur-sm" />
  </div>
);

// ── Demo account quick-login ─────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { label: 'Admin', username: 'admin@smartcityai.com', password: 'Admin@123', color: 'from-rose-500 to-pink-500', icon: <FaShieldAlt /> },
  { label: 'Analyst', username: 'analyst@smartcityai.com', password: 'Analyst@123', color: 'from-primary-500 to-cyan-400', icon: <FaChartLine /> },
  { label: 'Guest', username: 'guest@smartcityai.com', password: 'Guest@123', color: 'from-emerald-500 to-teal-400', icon: <FaBolt /> },
];

// Role → dashboard path mapping
const ROLE_REDIRECT = {
  'Admin': '/dashboard',
  'Traffic Analyst': '/dashboard',
  'Guest': '/dashboard',
};

// ── Friendly error messages ───────────────────────────────────────────────────
const friendlyError = (err) => {
  const detail = err?.response?.data?.detail;
  const status = err?.response?.status;
  const code = err?.code;

  if (detail) return detail;
  if (code === 'ERR_NETWORK' || code === 'ERR_CANCELED')
    return 'Unable to reach the server. Please check your internet connection and try again.';
  if (code === 'ECONNABORTED')
    return 'The server is taking too long to respond. It may be starting up — please wait a moment and retry.';
  if (status === 401) return 'Invalid email or password. Please check your credentials.';
  if (status === 403) return 'Your account has been deactivated. Please contact an administrator.';
  if (status === 404) return 'Login service not found. Please refresh the page and try again.';
  if (status === 503) return 'The server is temporarily unavailable. It may be starting up — please retry in a moment.';
  if (status >= 500) return 'The server encountered an error. Please try again in a few seconds.';
  return 'Login failed. Please check your credentials and try again.';
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const [wakeSeconds, setWakeSeconds] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Core login flow with health check ──────────────────────────────────────
  const doLogin = async (identifier, password) => {
    setError('');
    setLoading(true);
    setWakingUp(false);

    try {
      // Quick health check — non-blocking, 5s timeout
      const health = await checkBackendHealth();
      if (health === 'waking') {
        // Backend is sleeping — wake it up with a patience wait
        setWakingUp(true);
        setLoading(false);
        const isUp = await wakeBackend((sec) => setWakeSeconds(sec));
        setWakingUp(false);
        setLoading(true);
        if (!isUp) {
          setError('The backend server could not be reached after 40 seconds. Please try again in a minute.');
          setLoading(false);
          return;
        }
      }

      const userRole = await login(identifier, password);
      navigate(ROLE_REDIRECT[userRole] || '/dashboard', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
      setWakingUp(false);
    }
  };

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username/email and password.');
      return;
    }
    await doLogin(username.trim(), password);
  };

  // ── One-click demo login ────────────────────────────────────────────────────
  const handleDemoLogin = async (account) => {
    setUsername(account.username);
    setPassword(account.password);
    await doLogin(account.username, account.password);
  };

  const isDisabled = loading || wakingUp;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden relative">
      {/* ── Animated background blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary-500/15 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-cyan-500/15 blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-violet-500/8 blur-[100px] animate-float" style={{ animationDelay: '4s' }} />

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,180,216,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* ── Left Panel – Smart City Illustration ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center p-16 relative">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-lg"
        >
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-primary-500/30">
              <FaCity className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary-400 to-cyan-300 bg-clip-text text-transparent">
                SmartCity AI
              </h1>
              <p className="text-xs text-slate-500 font-medium">Urban Traffic Intelligence</p>
            </div>
          </div>

          {/* Hero text */}
          <h2 className="text-5xl font-extrabold leading-tight">
            Intelligent<br />
            <span className="bg-gradient-to-r from-primary-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent animate-gradient">
              Traffic Control
            </span><br />
            Platform
          </h2>
          <p className="mt-6 text-slate-400 text-lg leading-relaxed">
            AI-powered urban congestion analytics, real-time road monitoring, and predictive routing optimization for smarter cities.
          </p>

          {/* Traffic Animation Panel */}
          <div className="mt-10 p-6 rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl glass">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Traffic Simulation</span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs text-emerald-400 font-bold">LIVE</span>
              </span>
            </div>

            <div className="space-y-3">
              {[
                { road: 'NH-48 Highway', level: 'High', pct: '85%', color: 'bg-rose-500' },
                { road: 'Ring Road Sector B', level: 'Moderate', pct: '55%', color: 'bg-amber-500' },
                { road: 'Inner City Route C', level: 'Low', pct: '22%', color: 'bg-emerald-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">{item.road}</span>
                    <span className={`font-bold ${item.level === 'High' ? 'text-rose-400' : item.level === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {item.level}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: item.pct }} />
                  </div>
                  <TrafficAnimation />
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-slate-800">
              {[
                { label: 'Vehicles', value: '12,847' },
                { label: 'Avg Speed', value: '43 km/h' },
                { label: 'AI Accuracy', value: '94.2%' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-base font-extrabold text-white">{s.value}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel – Login Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center space-x-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center">
              <FaCity className="text-white" />
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary-400 to-cyan-300 bg-clip-text text-transparent">
              SmartCity AI
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-white">Welcome back</h2>
            <p className="text-slate-400 mt-2">Sign in to your analytics dashboard</p>
          </div>

          {/* Backend waking up indicator */}
          {wakingUp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl text-sm font-medium mb-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <FaServer className="text-amber-400 text-base shrink-0" />
                <span className="font-bold">Backend is starting up…</span>
              </div>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                The server was sleeping and is now waking up. This takes about 30–60 seconds on first access.
                Please wait — you will be logged in automatically.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <FaSpinner className="animate-spin text-amber-400 text-xs" />
                <span className="text-xs text-amber-400 font-mono">{wakeSeconds}s elapsed…</span>
              </div>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-500/10 border border-rose-500/25 text-rose-400 p-4 rounded-2xl text-sm font-medium mb-6 space-y-2"
            >
              <div className="flex items-start space-x-2">
                <FaShieldAlt className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="flex items-center gap-1.5 text-[11px] text-rose-300 hover:text-white transition-colors font-bold"
              >
                <FaRedo className="text-[9px]" /> Dismiss
              </button>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Username or Email
              </label>
              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  id="login-username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-600
                    focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="admin@smartcityai.com"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-12 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-600
                    focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={isDisabled}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-cyan-400 hover:from-primary-600 hover:to-cyan-500
                font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm shadow-xl shadow-primary-500/25
                transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin text-xs" />
                  <span>Authenticating…</span>
                </>
              ) : wakingUp ? (
                <>
                  <FaSpinner className="animate-spin text-xs" />
                  <span>Waiting for server…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <FaArrowRight className="text-xs" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="px-4 text-xs text-slate-600 font-medium">Quick Demo Access</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Demo account buttons */}
          <div className="grid grid-cols-3 gap-3">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.label}
                type="button"
                id={`demo-login-${acc.label.toLowerCase()}`}
                onClick={() => handleDemoLogin(acc)}
                disabled={isDisabled}
                title={`Email: ${acc.username}\nPassword: ${acc.password}`}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-800
                  bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/60 transition-all disabled:opacity-50
                  group hover:scale-[1.03] active:scale-[0.97]`}
              >
                <span className={`text-lg mb-1 bg-gradient-to-r ${acc.color} bg-clip-text text-transparent`}>
                  {acc.icon}
                </span>
                <span className="text-[11px] font-bold text-slate-300">{acc.label}</span>
                <span className="text-[9px] text-slate-500 group-hover:text-slate-400 transition-colors font-mono mt-0.5">
                  {acc.password}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
