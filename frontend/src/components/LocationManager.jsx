import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaMapMarkerAlt, FaLocationArrow, FaTimes, FaSearch, 
  FaGlobeAsia, FaSpinner, FaCheckCircle
} from 'react-icons/fa';

const LocationManager = ({ onLocationSelect }) => {
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error
  const [currentLocation, setCurrentLocation] = useState(null);
  const [manualForm, setManualForm] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Debounced search using OpenStreetMap Nominatim (free, no API key)
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    const timer = setTimeout(() => {
      handleSearchLocation(searchQuery);
    }, 500);
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
      if (data.length === 0) {
        setSearchError('No locations found. Try a different name or city.');
        setSearchResults([]);
      } else {
        setSearchResults(data);
        setSearchError('');
      }
    } catch (err) {
      setSearchError('Search failed. Check your internet connection.');
    } finally {
      setSearchLoading(false);
    }
  };

  const requestLocation = () => {
    setLocationStatus('loading');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setManualForm(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Reverse geocode using Nominatim
        let cityName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          cityName = addr.city || addr.town || addr.village || addr.county || addr.state || cityName;
        } catch (_) {}

        setCurrentLocation({ latitude, longitude, city: cityName });
        setLocationStatus('success');
        onLocationSelect(cityName);
      },
      () => {
        setLocationStatus('error');
        setManualForm(true);
      },
      { timeout: 8000 }
    );
  };

  const handleSelectSearchResult = (result) => {
    const name = result.display_name.split(',').slice(0, 2).join(', ');
    setCurrentLocation({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: name,
      fullName: result.display_name
    });
    setLocationStatus('success');
    setManualForm(false);
    setSearchQuery('');
    setSearchResults([]);
    onLocationSelect(name);
  };

  const handleClear = () => {
    setLocationStatus('idle');
    setCurrentLocation(null);
    setManualForm(false);
    setSearchQuery('');
    setSearchResults([]);
    onLocationSelect(null);
  };

  return (
    <div className="glass rounded-3xl p-5 mb-6 border border-slate-700/60">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Icon + Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-900/50 flex items-center justify-center text-primary-400 shrink-0">
            <FaMapMarkerAlt size={20} />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Location Context</h3>
            <p className="text-slate-400 text-xs">
              {locationStatus === 'success'
                ? <span className="text-emerald-400 font-semibold flex items-center gap-1"><FaCheckCircle /> {currentLocation?.city}</span>
                : 'Set your location for localised analytics'}
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {locationStatus === 'idle' && (
            <>
              <button
                onClick={requestLocation}
                className="btn-primary text-xs flex items-center gap-2 px-4 py-2"
              >
                <FaLocationArrow /> Detect GPS
              </button>
              <button
                onClick={() => setManualForm(true)}
                className="btn-secondary text-xs flex items-center gap-2 px-4 py-2"
              >
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
              <button
                onClick={() => setManualForm(!manualForm)}
                className="btn-secondary text-xs px-3 py-2 flex items-center gap-1"
              >
                <FaSearch /> Change
              </button>
              <button
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-900/20 rounded-lg transition-colors"
                title="Clear location"
              >
                <FaTimes />
              </button>
            </>
          )}

          {locationStatus === 'error' && (
            <span className="text-rose-400 text-xs">GPS unavailable</span>
          )}
        </div>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {(manualForm || locationStatus === 'error') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 pt-5 border-t border-slate-700/50 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3">
              <FaGlobeAsia className="text-primary-400" />
              <span className="text-white font-semibold text-sm">Search Any Location Worldwide</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type city, area, street, landmark… (e.g. Mumbai, Bengaluru, Times Square)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
              {searchLoading && (
                <FaSpinner className="absolute right-3 top-3 text-primary-400 animate-spin" />
              )}
              {searchQuery && !searchLoading && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Search Error */}
            {searchError && (
              <p className="mt-2 text-xs text-rose-400 font-medium">{searchError}</p>
            )}

            {/* Hint text */}
            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <p className="mt-2 text-xs text-slate-500">Type at least 3 characters to search…</p>
            )}

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                {searchResults.map((result, idx) => {
                  const addr = result.address || {};
                  const city = addr.city || addr.town || addr.village || addr.county || '';
                  const country = addr.country || '';
                  const label = result.display_name.split(',').slice(0, 3).join(', ');
                  return (
                    <button
                      key={result.place_id || idx}
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-start gap-3 border-b border-slate-800 last:border-b-0 transition-colors group"
                    >
                      <FaMapMarkerAlt className="text-primary-400 mt-0.5 shrink-0 group-hover:text-primary-300" />
                      <div className="overflow-hidden">
                        <p className="text-white text-sm font-medium truncate">{label}</p>
                        <p className="text-slate-500 text-[10px] truncate">{country} · {result.type}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* GPS Button as alternative */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
              <span className="text-xs text-slate-500">Or —</span>
              <button
                onClick={() => { setManualForm(false); requestLocation(); }}
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
              >
                <FaLocationArrow /> Use my current GPS location
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationManager;
