import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const TOAST_TYPES = {
  success: {
    icon: <FaCheckCircle />,
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: <FaExclamationCircle />,
    bg: 'bg-rose-500/15 border-rose-500/30',
    text: 'text-rose-400',
    bar: 'bg-rose-500',
  },
  info: {
    icon: <FaInfoCircle />,
    bg: 'bg-primary-500/15 border-primary-500/30',
    text: 'text-primary-400',
    bar: 'bg-primary-500',
  },
};

const ToastItem = ({ toast, onRemove }) => {
  const [leaving, setLeaving] = useState(false);
  const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), toast.duration - 400);
    const removeTimer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => { clearTimeout(leaveTimer); clearTimeout(removeTimer); };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 w-80 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl
        ${config.bg} ${leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
    >
      <span className={`text-lg mt-0.5 flex-shrink-0 ${config.text}`}>{config.icon}</span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-bold ${config.text}`}>{toast.title}</p>
        )}
        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => { setLeaving(true); setTimeout(() => onRemove(toast.id), 350); }}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 mt-0.5"
      >
        <FaTimes className="text-xs" />
      </button>
    </div>
  );
};

// ── Toast Container ────────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────────
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = ({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    info: (message, title = 'Info') => addToast({ type: 'info', title, message }),
  };

  return { toasts, removeToast, toast };
};

export default ToastContainer;
