import React, { useState, useEffect } from 'react';
import { FaFilter, FaRedo, FaDatabase, FaInfoCircle } from 'react-icons/fa';
import { analyticsAPI } from '../services/api';

const SmartFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({ roads: [], weathers: [], areas: [], road_types: [], is_demo: [] });
  const [selectedRoad, setSelectedRoad] = useState('All');
  const [selectedWeather, setSelectedWeather] = useState('All');
  const [selectedRoadType, setSelectedRoadType] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    analyticsAPI.getFilters()
      .then(res => {
        if (res.data) {
          setFilters(res.data);
          setIsDemo(res.data.is_demo?.includes('true') || false);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleApply = () => {
    onFilterChange({
      road_name: selectedRoad === 'All' ? null : selectedRoad,
      weather: selectedWeather === 'All' ? null : selectedWeather,
      date: selectedDate || null
    });
  };

  const handleReset = () => {
    setSelectedRoad('All');
    setSelectedWeather('All');
    setSelectedRoadType('All');
    setSelectedDate('');
    onFilterChange({ road_name: null, weather: null, date: null });
  };

  return (
    <div className="glass rounded-3xl p-4 border border-slate-700/50 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">

        {/* Label */}
        <div className="flex items-center gap-2 text-primary-400 font-bold px-1 shrink-0">
          <FaFilter />
          <span className="text-sm">Filters:</span>
          {isDemo && (
            <span className="ml-1 text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Demo Data
            </span>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex-1 flex flex-wrap gap-3">
          {/* Road Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Road / Area</label>
            <select
              value={selectedRoad}
              onChange={(e) => setSelectedRoad(e.target.value)}
              className="input-field text-sm min-w-[160px] max-w-[220px]"
            >
              <option value="All">All Roads</option>
              {filters.roads?.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Weather */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Weather</label>
            <select
              value={selectedWeather}
              onChange={(e) => setSelectedWeather(e.target.value)}
              className="input-field text-sm min-w-[130px] max-w-[180px]"
            >
              <option value="All">All Weather</option>
              {filters.weathers?.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Road Type (from real dataset) */}
          {filters.road_types?.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Road Type</label>
              <select
                value={selectedRoadType}
                onChange={(e) => setSelectedRoadType(e.target.value)}
                className="input-field text-sm min-w-[130px] max-w-[180px]"
              >
                <option value="All">All Types</option>
                {filters.road_types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field text-sm text-slate-300 min-w-[150px]"
            />
          </div>
        </div>

        {/* Apply / Reset */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleApply}
            className="btn-primary text-xs px-5 py-2.5 font-bold"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="btn-secondary text-xs px-3 py-2.5 flex items-center gap-1"
            title="Reset all filters"
          >
            <FaRedo />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Demo info row */}
      {isDemo && (
        <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center gap-2 text-xs text-amber-400/80">
          <FaDatabase className="shrink-0" />
          <span>
            Showing <strong>demo data</strong>. Filter options are placeholders.
            <a href="/admin" className="ml-1 underline hover:text-white">Upload a dataset</a> to enable real road/area filtering.
          </span>
        </div>
      )}
    </div>
  );
};

export default SmartFilters;
