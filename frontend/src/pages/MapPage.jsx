import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import MapComponent from '../components/MapComponent';
import { FaFilter, FaTrafficLight, FaCheckCircle, FaCarCrash } from 'react-icons/fa';

const MapPage = () => {
  const [markers, setMarkers] = useState([]);
  const [filterLevel, setFilterLevel] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkers();
  }, []);

  const fetchMarkers = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getMapMarkers();
      setMarkers(res.data);
    } catch (err) {
      console.error("Map Markers Fetch Error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Get active stats from markers
  const criticalCount = markers.filter(m => m.congestion_level === 'High').length;
  const warningCount = markers.filter(m => m.congestion_level === 'Moderate').length;
  const healthyCount = markers.filter(m => m.congestion_level === 'Low').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pb-12">
      {/* Sidebar Controls */}
      <div className="space-y-6 lg:col-span-1">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <FaFilter className="text-primary-500" />
            <span>Map Overlays</span>
          </h3>

          <div className="space-y-2">
            {[
              { id: 'All', label: 'All Hotspots', count: markers.length, color: 'border-slate-200 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/50' },
              { id: 'High', label: 'Critical (High)', count: criticalCount, color: 'border-rose-500/20 text-rose-500 bg-rose-500/10' },
              { id: 'Moderate', label: 'Warning (Mod)', count: warningCount, color: 'border-amber-500/20 text-amber-500 bg-amber-500/10' },
              { id: 'Low', label: 'Healthy (Low)', count: healthyCount, color: 'border-emerald-500/20 text-emerald-500 bg-emerald-500/10' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterLevel(btn.id)}
                className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${btn.color} ${
                  filterLevel === btn.id ? 'ring-2 ring-primary-500 shadow-md' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <span>{btn.label}</span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 shadow-sm">{btn.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live System Alerts Feed */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100 uppercase tracking-wider mb-4">
            Segment Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-750">
              <FaTrafficLight className="text-amber-500 text-lg" />
              <div>
                <h4 className="text-xs font-bold">Dynamic Signals</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Optimizing crossing phases</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-750">
              <FaCarCrash className="text-rose-500 text-lg" />
              <div>
                <h4 className="text-xs font-bold">Accident Alert Zones</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{markers.reduce((acc, m) => acc + m.total_accidents, 0)} incidents logged</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-750">
              <FaCheckCircle className="text-emerald-500 text-lg" />
              <div>
                <h4 className="text-xs font-bold">System Status</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Active connections stable</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Map Viewport */}
      <div className="lg:col-span-3">
        <MapComponent markers={markers} filterLevel={filterLevel} />
      </div>
    </div>
  );
};

export default MapPage;
