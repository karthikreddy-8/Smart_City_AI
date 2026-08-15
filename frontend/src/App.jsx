import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// ── Lazy load all pages for better performance ──────────────────────────────
const LandingPage   = lazy(() => import('./pages/LandingPage'));
const Login         = lazy(() => import('./pages/Login'));
const Register      = lazy(() => import('./pages/Register'));
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const MapPage       = lazy(() => import('./pages/MapPage'));
const Prediction    = lazy(() => import('./pages/Prediction'));
const AdminPanel    = lazy(() => import('./pages/AdminPanel'));
const AreaAnalytics = lazy(() => import('./pages/AreaAnalytics'));
const LiveTrafficPage = lazy(() => import('./pages/LiveTrafficPage'));

// Components (loaded immediately — small)
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// ── Page loading fallback ──────────────────────────────────────────────────
const PageLoader = () => (
  <div className="bg-slate-950 text-white min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-slate-400 text-sm font-medium">Loading…</span>
    </div>
  </div>
);

// ── Auth loading fallback ──────────────────────────────────────────────────
const AuthLoader = () => (
  <div className="bg-slate-950 text-white min-h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── Private Route Wrapper ──────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <AuthLoader />;
  return token ? children : <Navigate to="/login" replace />;
};

// ── Admin Route Wrapper ────────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const { token, role, loading } = useAuth();
  if (loading) return <AuthLoader />;
  const isAuthorized = role === 'Admin' || role === 'Traffic Analyst';
  return token && isAuthorized ? children : <Navigate to="/dashboard" replace />;
};

// ── Layout Wrapper ─────────────────────────────────────────────────────────
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <div className="flex h-screen bg-slate-950 text-white transition-colors overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden relative w-full min-w-0 bg-slate-950">
        <Navbar toggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-8 w-full bg-slate-950/80">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/live-traffic"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <LiveTrafficPage />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <MapPage />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/area"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <AreaAnalytics />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/predict"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <Prediction />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminPanel />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
