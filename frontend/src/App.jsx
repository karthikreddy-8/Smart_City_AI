import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Prediction from './pages/Prediction';
import AdminPanel from './pages/AdminPanel';
import AreaAnalytics from './pages/AreaAnalytics';

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Private Route Wrapper
const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-slate-950 text-white min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
};

// Admin Route Wrapper
const AdminRoute = ({ children }) => {
  const { token, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-slate-950 text-white min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAuthorized = role === 'Admin' || role === 'Traffic Analyst';
  return token && isAuthorized ? children : <Navigate to="/dashboard" replace />;
};

// Layout Wrapper
const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white transition-colors overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        <Navbar toggleSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8 w-full">
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
