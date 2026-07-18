import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaLocationArrow, FaTimes, FaSearch } from 'react-icons/fa';
import { analyticsAPI } from '../services/api';

const LocationManager = ({ onLocationSelect }) => {
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error, manual
  const [currentLocation, setCurrentLocation] = useState(null);
  const [manualForm, setManualForm] = useState(false);
  const [areas, setAreas] = useState([]);
  
  useEffect(() => {
    // Fetch areas from backend to populate manual dropdown
    analyticsAPI.getFilters().then(res => {
      if (res.data && res.data.areas) {
        setAreas(res.data.areas);
      }
    }).catch(err => console.error(err));
  }, []);

  const requestLocation = () => {
    setLocationStatus('loading');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setManualForm(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Mock Reverse Geocoding
        const mockCity = "Smart City Center"; 
        
        setCurrentLocation({
          latitude,
          longitude,
          city: mockCity
        });
        setLocationStatus('success');
        onLocationSelect(mockCity);
      },
      (error) => {
        setLocationStatus('error');
        setManualForm(true);
      }
    );
  };

  const handleManualSelect = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedArea = formData.get('area');
    setCurrentLocation({ city: selectedArea, isManual: true });
    setLocationStatus('success');
    setManualForm(false);
    onLocationSelect(selectedArea);
  };

  return (
    <div className="glass rounded-3xl p-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-900/50 flex items-center justify-center text-primary-400">
            <FaMapMarkerAlt size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Location Context</h3>
            <p className="text-slate-400 text-sm">
              {locationStatus === 'success' ? `Tracking: ${currentLocation.city}` : 'Enable location for local insights'}
            </p>
          </div>
        </div>

        {locationStatus === 'idle' && (
          <button onClick={requestLocation} className="btn-primary flex items-center gap-2">
            <FaLocationArrow /> Detect Location
          </button>
        )}
        
        {locationStatus === 'loading' && (
          <span className="text-primary-400 animate-pulse">Detecting...</span>
        )}

        {locationStatus === 'success' && (
           <button onClick={() => setManualForm(!manualForm)} className="text-slate-400 hover:text-white text-sm underline">
             Change Location
           </button>
        )}
      </div>

      {(manualForm || locationStatus === 'error') && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-slate-700/50">
          {locationStatus === 'error' && (
            <p className="text-rose-400 text-sm mb-3">Location access denied or unavailable. Please select manually.</p>
          )}
          <form onSubmit={handleManualSelect} className="flex gap-4">
            <select name="area" className="input-field flex-1">
              {areas.map((a, i) => <option key={i} value={a}>{a}</option>)}
              <option value="Demo Highway">Demo Highway</option>
              <option value="Demo Street">Demo Street</option>
            </select>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <FaSearch /> Apply
            </button>
            <button type="button" onClick={() => setManualForm(false)} className="btn-secondary">
              <FaTimes />
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default LocationManager;
