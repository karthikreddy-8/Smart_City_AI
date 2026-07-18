import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCity, FaUser, FaEnvelope, FaLock, FaUserTag, FaArrowRight,
  FaEye, FaEyeSlash, FaCheck, FaTimes, FaCheckCircle
} from 'react-icons/fa';
import ToastContainer, { useToast } from '../components/Toast';

// ── Password strength calculator ─────────────────────────────────────────────
const getPasswordStrength = (pwd) => {
  if (!pwd) return { level: 0, label: '', color: '', hint: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const map = [
    { level: 1, label: 'Weak', color: 'strength-weak', text: 'text-rose-400', hint: 'Too short or simple' },
    { level: 2, label: 'Fair', color: 'strength-fair', text: 'text-amber-400', hint: 'Add numbers or symbols' },
    { level: 3, label: 'Good', color: 'strength-good', text: 'text-blue-400', hint: 'Add special characters' },
    { level: 4, label: 'Strong', color: 'strength-strong', text: 'text-emerald-400', hint: 'Excellent password!' },
  ];
  return map[Math.min(score - 1, 3)] || map[0];
};

// ── Email validator ──────────────────────────────────────────────────────────
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleChoice, setRoleChoice] = useState('Guest');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Live validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const strength = getPasswordStrength(password);
  const emailValid = isValidEmail(email);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const { register } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailValid) { toast.error('Please enter a valid email address.', 'Invalid Email'); return; }
    if (strength.level < 2) { toast.error('Password is too weak. Use at least 8 chars with uppercase and number.', 'Weak Password'); return; }
    if (!passwordsMatch) { toast.error('Passwords do not match. Please check and retry.', 'Password Mismatch'); return; }

    setLoading(true);
    try {
      await register(username, email, password, roleChoice);
      setSuccess(true);
      toast.success('Account created! Redirecting to login...', 'Registration Successful');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const detail = err.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(detail, 'Registration Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden relative">
      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Animated background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary-500/15 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-500/12 blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,180,216,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* ── Form Panel ── */}
      <div className="w-full flex items-center justify-center p-6 lg:p-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <FaCity className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary-400 to-cyan-300 bg-clip-text text-transparent">
                SmartCity AI
              </h1>
              <p className="text-[11px] text-slate-500">Urban Traffic Intelligence</p>
            </div>
          </div>

          {/* Success screen */}
          <AnimatePresence>
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6"
                >
                  <FaCheckCircle className="text-emerald-400 text-4xl" />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-white">Account Created!</h2>
                <p className="text-slate-400 mt-2">Redirecting to login page...</p>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-8 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5 }}
                    className="h-full bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-white">Create account</h2>
                  <p className="text-slate-400 mt-2">Join SmartCity AI analytics platform</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Username</label>
                    <div className="relative">
                      <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                      <input
                        type="text"
                        id="register-username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        minLength={3}
                        className="w-full pl-11 pr-4 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-600
                          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Email Address</label>
                    <div className="relative">
                      <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                      <input
                        type="email"
                        id="register-email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onBlur={() => setEmailTouched(true)}
                        required
                        className={`w-full pl-11 pr-10 py-4 bg-slate-900/80 border rounded-2xl text-sm text-white placeholder-slate-600
                          focus:outline-none focus:ring-2 transition-all
                          ${emailTouched && email ? (emailValid ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20' : 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20') : 'border-slate-800 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="your@email.com"
                      />
                      {emailTouched && email && (
                        <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${emailValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {emailValid ? <FaCheck /> : <FaTimes />}
                        </span>
                      )}
                    </div>
                    {emailTouched && email && !emailValid && (
                      <p className="text-xs text-rose-400 mt-1.5 ml-1">Please enter a valid email address</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Password</label>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="register-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full pl-11 pr-12 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-600
                          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                        placeholder="Create a strong password"
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

                    {/* Password strength bar */}
                    {password && (
                      <div className="mt-2.5">
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`} />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-xs font-bold ${strength.text}`}>{strength.label}</span>
                          <span className="text-[10px] text-slate-500">{strength.hint}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Confirm Password</label>
                    <div className="relative">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        id="register-confirm-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        onBlur={() => setConfirmTouched(true)}
                        required
                        className={`w-full pl-11 pr-12 py-4 bg-slate-900/80 border rounded-2xl text-sm text-white placeholder-slate-600
                          focus:outline-none focus:ring-2 transition-all
                          ${confirmTouched && confirmPassword ? (passwordsMatch ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20' : 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20') : 'border-slate-800 focus:border-primary-500 focus:ring-primary-500/20'}`}
                        placeholder="Repeat your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(p => !p)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {confirmTouched && confirmPassword && !passwordsMatch && (
                      <p className="text-xs text-rose-400 mt-1.5 ml-1 flex items-center space-x-1">
                        <FaTimes className="text-[10px]" />
                        <span>Passwords do not match</span>
                      </p>
                    )}
                    {confirmTouched && passwordsMatch && (
                      <p className="text-xs text-emerald-400 mt-1.5 ml-1 flex items-center space-x-1">
                        <FaCheck className="text-[10px]" />
                        <span>Passwords match</span>
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Role</label>
                    <div className="relative">
                      <FaUserTag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                      <select
                        id="register-role"
                        value={roleChoice}
                        onChange={e => setRoleChoice(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-white
                          focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Guest">Guest (View only)</option>
                        <option value="Traffic Analyst">Traffic Analyst</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="register-submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-primary-500 to-cyan-400 hover:from-primary-600 hover:to-cyan-500
                      font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm shadow-xl shadow-primary-500/25
                      transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <FaArrowRight className="text-xs" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-slate-500 mt-6">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold transition-colors">
                    Sign In
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
