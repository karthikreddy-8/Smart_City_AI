import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMapMarkerAlt, FaLocationArrow, FaTimes, FaSearch,
  FaGlobeAsia, FaSpinner, FaCheckCircle
} from 'react-icons/fa';
import { liveTrafficAPI } from '../services/api';

const LocationManager = ({ onLocationSelect, onLiveTraffic }) => {
  const [locationStatus, setLocationStatus] = useState('idle');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [manualForm, setManualForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState('');

  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    const timer = setTimeout(() => handleSearchLocation(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchLocation = async (query) => {
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) {
        setSearchError('No locations found. Try a different name or city.');
        setSearchResults([]);
      } else {
        setSearchResults(data);
      }
    } catch {
      setSearchError('Search failed. Check your internet connection.');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadLocationTraffic = async (latitude, longitude, accuracy = 15) => {
    setTrafficLoading(true);
    setTrafficError('');
    try {
      const res = await liveTrafficAPI.getLocationTraffic(latitude, longitude, accuracy);
      if (res?.data?.ok === false) {
        throw new Error(res.data.message || 'Live traffic data unavailable.');
      }
      onLiveTraffic?.(res.data);
      return res.data;
    } catch (err) {
      console.warn('Location traffic notice:', err);
      const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Live traffic data is unavailable.';
      setTrafficError(message);
      onLiveTraffic?.(null);
      return null;
    } finally {
      setTrafficLoading(false);
    }
  };

  const requestLocation = () => {
    setLocationStatus('loading');
    setTrafficError('');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setManualForm(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy = 15 } = position.coords;
        let cityName = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        let fullAddress = null;

        try {
          const geo = await liveTrafficAPI.reverseGeocode(latitude, longitude);
          if (geo?.data) {
            fullAddress = geo.data;
            cityName = geo.data.area
              ? `${geo.data.area}, ${geo.data.city}`
              : `${geo.data.city}, ${geo.data.state}`;
          }
        } catch (e) {
          console.warn('Reverse geocode notice:', e);
        }

        const location = {
          name: cityName,
          latitude,
          longitude,
          accuracy: Math.round(accuracy),
          address: fullAddress,
        };

        setCurrentLocation(location);
        setLocationStatus('success');
        onLocationSelect?.(location);
        await loadLocationTraffic(latitude, longitude, Math.round(accuracy));
      },
      () => {
        setLocationStatus('error');
        setManualForm(true);
        setTrafficError('Location permission was not provided.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const handleSelectSearchResult = async (result) => {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    const name = result.display_name.split(',').slice(0, 2).join(', ');
    const location = {
      name,
      latitude,
      longitude,
      accuracy: 1000,
      fullName: result.display_name,
    };
    setCurrentLocation(location);
    setLocationStatus('success');
    setManualForm(false);
    setSearchQuery('');
    setSearchResults([]);
    onLocationSelect?.(location);
    await loadLocationTraffic(latitude, longitude, 1000);
  };

  const handleClear = () => {
    setLocationStatus('idle');
    setCurrentLocation(null);
    setManualForm(false);
    setSearchQuery('');
    setSearchResults([]);
    setTrafficError('');
    onLocationSelect?.(null);
    onLiveTraffic?.(null);
  };

  return (
    <div className="glass rounded-3xl p-5 mb-6 border border-slate-700/60">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-900/50 flex items-center justify-center text-primary-400 shrink-0">
            <FaMapMarkerAlt size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Location Context</h3>
            <p className="text-slate-400 text-xs">
              {locationStatus === 'success'
                ? <span className="text-emerald-400 font-semibold flex items-center gap-1"><FaCheckCircle /> {currentLocation?.name}</span>
                : 'Set your location for live traffic analytics'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {locationStatus === 'idle' && (
            <>
              <button onClick={requestLocation} className="btn-primary text-xs flex items-center gap-2 px-4 py-2">
                <FaLocationArrow /> Detect GPS
              </button>
              <button onClick={() => setManualForm(true)} className="btn-secondary text-xs flex items-center gap-2 px-4 py-2">
                <FaSearch /> Search Location
              </button>
            </>
          )}

          {locationStatus === 'loading' && (
            <span className="text-primary-400 text-xs flex items-center gap-2 animate-pulse">
              <FaSpinner className="animate-spin" /> Detecting…
            </span>
          )}

          {locationStatus === 'success' && (
            <>
              <button onClick={() => setManualForm(!manualForm)} className="btn-secondary text-xs px-3 py-2 flex items-center gap-1">
                <FaSearch /> Change
              </button>
              <button onClick={handleClear} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-900/20 rounded-lg transition-colors" title="Clear location">
                <FaTimes />
              </button>
            </>
          )}

          {locationStatus === 'error' && <span className="text-rose-400 text-xs">GPS unavailable</span>}
        </div>
      </div>

      {trafficLoading && (
        <div className="mt-4 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-cyan-300 flex items-center gap-2">
          <FaSpinner className="animate-spin" /> Loading live traffic for this location…
        </div>
      )}

      {trafficError && (
        <div className="mt-4 p-3 rounded-2xl bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300">
          {trafficError}
        </div>
      )}

      <AnimatePresence>
        {(manualForm || locationStatus === 'error') && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mt-5 pt-5 border-t border-slate-700/50 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <FaGlobeAsia className="text-primary-400" />
              <span className="text-white font-semibold text-sm">Search Any Location</span>
            </div>

            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type city, area, street, landmark…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {searchLoading && <FaSpinner className="absolute right-3 top-3 text-primary-400 animate-spin" />}
            </div>

            {searchError && <p className="text-rose-400 text-xs mt-2">{searchError}</p>}

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((result) => (
                  <button key={`${result.place_id}-${result.lat}-${result.lon}`}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-primary-700 transition-colors">
                    <div className="text-white text-xs font-semibold">{result.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationManager;
