import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaChartLine, 
  FaMapMarkedAlt, 
  FaBrain, 
  FaUserShield, 
  FaSignOutAlt, 
  FaCity 
} from 'react-icons/fa';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { role, logout, user } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FaChartLine /> },
    { name: 'Live Traffic Map', path: '/map', icon: <FaMapMarkedAlt /> },
    { name: 'Area Analytics', path: '/area', icon: <FaCity /> },
    { name: 'AI Predictor', path: '/predict', icon: <FaBrain /> },
  ];

  // Restrict Admin controls to authorized roles
  if (role === 'Admin' || role === 'Traffic Analyst') {
    navItems.push({ name: 'Admin Console', path: '/admin', icon: <FaUserShield /> });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col h-screen border-r border-slate-800 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <FaCity className="text-primary-500 text-3xl animate-pulse" />
          <div>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-primary-500 to-cyan-400 bg-clip-text text-transparent">
              SmartCity AI
            </h1>
            <span className="text-xs text-slate-500 font-medium">Urban Optimizer</span>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 mx-4 mt-4 bg-slate-800/50 rounded-xl border border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center font-bold text-primary-400">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">{user.username}</h4>
              <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">
                {role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-600 to-cyan-500 text-white font-semibold shadow-md shadow-primary-500/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Signout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 rounded-xl transition-colors font-medium text-sm"
          >
            <FaSignOutAlt className="text-lg" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
