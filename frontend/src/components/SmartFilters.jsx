import React, { useState, useEffect } from 'react';
import { FaFilter, FaRedo } from 'react-icons/fa';
import { analyticsAPI } from '../services/api';

const SmartFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({ roads: [], weathers: [], areas: [] });
  const [selectedRoad, setSelectedRoad] = useState('All');
  const [selectedWeather, setSelectedWeather] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  
  useEffect(() => {
    analyticsAPI.getFilters().then(res => {
      if (res.data) setFilters(res.data);
    }).catch(err => console.error(err));
  }, []);

  const handleApply = () => {
    onFilterChange({
      road_name: selectedRoad === 'All' ? null : selectedRoad,
      weather: selectedWeather === 'All' ? null : selectedWeather,
      date: selectedDate
    });
  };

  const handleReset = () => {
    setSelectedRoad('All');
    setSelectedWeather('All');
    setSelectedDate('');
    onFilterChange({ road_name: null, weather: null, date: null });
  };

  return (
    <div className="glass rounded-3xl p-4 flex flex-col md:flex-row items-center gap-4 mb-6 border border-slate-700/50">
      <div className="flex items-center gap-2 text-primary-400 font-bold px-2">
        <FaFilter /> <span>Global Filters:</span>
      </div>
      
      <div className="flex-1 flex flex-wrap gap-3">
        <select 
          value={selectedRoad} onChange={(e) => setSelectedRoad(e.target.value)}
          className="input-field max-w-[200px] text-sm"
        >
          <option value="All">All Roads</option>
          {filters.roads?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        
        <select 
          value={selectedWeather} onChange={(e) => setSelectedWeather(e.target.value)}
          className="input-field max-w-[200px] text-sm"
        >
          <option value="All">All Weather</option>
          {filters.weathers?.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        
        <input 
          type="date" 
          value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field max-w-[200px] text-sm text-slate-400" 
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handleApply} className="btn-primary text-sm px-4 py-2">Apply</button>
        <button onClick={handleReset} className="btn-secondary text-sm px-3 py-2 flex items-center justify-center">
          <FaRedo />
        </button>
      </div>
    </div>
  );
};

export default SmartFilters;
