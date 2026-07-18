import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { FaBell, FaBars } from 'react-icons/fa';

const Navbar = ({ toggleSidebar }) => {
  const location = useLocation();
  const [alerts, setAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Derive title from location pathname
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Urban Control Center';
      case '/map': return 'Live Congestion Map';
      case '/predict': return 'AI Predictive Analysis';
      case '/admin': return 'System Control Panel';
      default: return 'SmartCity AI';
    }
  };

  // Simulating live alerts for the notification center
  useEffect(() => {
    const defaultAlerts = [
      { id: 1, type: 'critical', text: 'Accident reported near Vikas Marg. Average speed dropped to 8 km/h.', time: '2 mins ago' },
      { id: 2, type: 'warning', text: 'High congestion predicted on Ring Road between 6:00 PM - 8:00 PM.', time: '10 mins ago' },
      { id: 3, type: 'info', text: 'Road closure planned on Lodi Road for maintenance tomorrow.', time: '1 hr ago' }
    ];
    setAlerts(defaultAlerts);
  }, []);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar} 
          className="md:hidden text-slate-600 dark:text-slate-300 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <FaBars size={20} />
        </button>
        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white transition-colors truncate max-w-[200px] md:max-w-none">
          {getPageTitle()}
        </h2>
      </div>

      <div className="flex items-center space-x-6">
        <ThemeToggle />

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all relative"
          >
            <FaBell className="text-lg" />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-2xl p-4 z-50 text-slate-800 dark:text-white">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-sm">System Notifications</h3>
                <button 
                  onClick={() => setAlerts([])}
                  className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                >
                  Clear All
                </button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No active traffic notifications.</p>
                ) : (
                  alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`p-2.5 rounded-xl border text-xs flex flex-col space-y-1 ${
                        alert.type === 'critical' 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' 
                          : alert.type === 'warning' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' 
                          : 'bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400'
                      }`}
                    >
                      <p className="font-medium leading-relaxed">{alert.text}</p>
                      <span className="text-[10px] text-slate-400 font-semibold self-end">{alert.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
