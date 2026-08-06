import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaLocationArrow, FaMapMarkerAlt, FaRoute, FaLeaf, FaShieldAlt, 
  FaExchangeAlt, FaDirections, FaBrain, FaSearch, FaSpinner, FaTimes, FaGlobeAsia
} from 'react-icons/fa';
import { predictionAPI, adminAPI } from '../services/api';
import RouteMapComponent from './RouteMapComponent';

// Geocode search using Nominatim (free OSM API, no key needed)
const geocodeSearch = async (query) => {
  if (!query || query.trim().length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  return await res.json();
};

// Location Search Input Component (reusable for both A and B)
const LocationSearchInput = ({ label, color, value, lat, lng, onSelect, placeholder }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await geocodeSearch(query);
        setResults(data);
        setOpen(data.length > 0);
      } catch (_) {}
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = (result) => {
    const name = result.display_name.split(',').slice(0, 3).join(', ');
    onSelect({ name, lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="space-y-1">
      <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${color}`}>
        <FaMapMarkerAlt /> {label}
      </label>

      {/* Show selected value */}
      {value && !query && (
        <div className={`flex items-center justify-between bg-slate-900 border rounded-xl px-4 py-3 ${color === 'text-emerald-400' ? 'border-emerald-600/50' : 'border-rose-600/50'}`}>
          <span className="text-sm text-white font-medium truncate">{value}</span>
          <button onClick={() => onSelect(null)} className="text-slate-400 hover:text-white ml-2 shrink-0">
            <FaTimes size={12} />
          </button>
        </div>
      )}

      {/* Search input */}
      {(!value || query) && (
        <div className="relative">
          <FaSearch className="absolute left-3 top-3.5 text-slate-400 text-xs" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-8 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500"
          />
          {loading && <FaSpinner className="absolute right-3 top-3.5 text-primary-400 animate-spin text-xs" />}
          {query && !loading && (
            <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-3.5 text-slate-500 hover:text-white text-xs">
              <FaTimes />
            </button>
          )}
        </div>
      )}

      {/* Results dropdown */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden mt-1"
          >
            {results.map((r, i) => {
              const label = r.display_name.split(',').slice(0, 3).join(', ');
              const country = r.address?.country || '';
              return (
                <button
                  key={r.place_id || i}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-start gap-3 border-b border-slate-800 last:border-b-0 transition-colors"
                >
                  <FaMapMarkerAlt className="text-primary-400 mt-0.5 shrink-0 text-xs" />
                  <div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-slate-500 text-[10px]">{country} · {r.type}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RoutePlanner = () => {
  const [loading, setLoading] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Origin (Point A)
  const [origin, setOrigin] = useState({ name: '', lat: null, lng: null });
  // Destination (Point B)
  const [destination, setDestination] = useState({ name: '', lat: null, lng: null });

  const [routeResult, setRouteResult] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [error, setError] = useState('');

  useEffect(() => {
    adminAPI.getModels()
      .then(res => {
        setModels(res.data);
        const active = res.data.find(m => m.is_active);
        if (active) setSelectedModel(active.model_name);
        else if (res.data.length > 0) setSelectedModel(res.data[0].model_name);
      })
      .catch(() => {});
  }, []);

  // Detect GPS position for Origin
  const handleDetectGPS = () => {
    setDetectingLoc(true);
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser.');
      setDetectingLoc(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
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
        setOrigin({ name: cityName, lat: latitude, lng: longitude });
        setDetectingLoc(false);
      },
      () => {
        setError('GPS access denied. Please search for a location manually.');
        setDetectingLoc(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    setRouteResult(null);
  };

  const canCalculate = origin.lat && origin.lng && destination.lat && destination.lng;

  const handleCalculateRoute = async (e) => {
    if (e) e.preventDefault();
    if (!canCalculate) {
      setError('Please set both a starting location (Point A) and a destination (Point B).');
      return;
    }
    setLoading(true);
    setRouteResult(null);
    setError('');

    const payload = {
      origin_name: origin.name,
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      destination_name: destination.name,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      travel_mode: 'Driving',
      road_type: 'Arterial',
      weather: 'Clear'
    };

    try {
      const res = await predictionAPI.predictRoute(payload, selectedModel || null);
      setRouteResult({
        ...res.data,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destination.lat,
        destination_lng: destination.lng
      });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Route prediction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Route Form */}
      <div className="glass rounded-3xl p-6 border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FaRoute className="text-primary-400" /> Point A → Point B Smart Navigation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              <FaGlobeAsia className="inline mr-1 text-primary-400" />
              Search any location worldwide — powered by OpenStreetMap geocoding
            </p>
          </div>

          {models.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs font-bold text-white px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-primary-500"
              >
                {models.map(m => (
                  <option key={m.id} value={m.model_name}>
                    {m.model_name} ({(m.accuracy * 100).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-900/30 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleCalculateRoute} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start relative">

            {/* Point A */}
            <div className="md:col-span-5 relative">
              <LocationSearchInput
                label="Origin (Point A)"
                color="text-emerald-400"
                value={origin.name}
                lat={origin.lat}
                lng={origin.lng}
                onSelect={(loc) => setOrigin(loc || { name: '', lat: null, lng: null })}
                placeholder="Search any city, area, street…"
              />
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={detectingLoc}
                className="mt-2 text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
              >
                <FaLocationArrow className={detectingLoc ? 'animate-spin' : ''} />
                {detectingLoc ? 'Detecting GPS…' : 'Use my current GPS location'}
              </button>
            </div>

            {/* Swap */}
            <div className="md:col-span-2 flex justify-center pt-6">
              <button
                type="button"
                onClick={handleSwap}
                title="Swap origin & destination"
                className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-full transition-all hover:scale-110 shadow-md"
              >
                <FaExchangeAlt />
              </button>
            </div>

            {/* Point B */}
            <div className="md:col-span-5 relative">
              <LocationSearchInput
                label="Destination (Point B)"
                color="text-rose-400"
                value={destination.name}
                lat={destination.lat}
                lng={destination.lng}
                onSelect={(loc) => setDestination(loc || { name: '', lat: null, lng: null })}
                placeholder="Search any city, area, landmark…"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !canCalculate}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-primary-500 via-cyan-500 to-emerald-500 hover:from-primary-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white text-sm rounded-xl shadow-lg shadow-primary-500/25 transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <><FaSpinner className="animate-spin" /><span>Computing AI Route…</span></>
              ) : (
                <><FaDirections size={18} /><span>Calculate Route & Predict Traffic</span></>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {routeResult && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Map */}
            <div className="lg:col-span-7 h-[500px]">
              <RouteMapComponent routeData={routeResult} />
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-5 space-y-5">
              {/* Route Banner */}
              <div className={`rounded-3xl p-6 border ${
                routeResult.overall_congestion === 'High'
                  ? 'bg-gradient-to-br from-rose-950 to-slate-900 border-rose-500/40'
                  : routeResult.overall_congestion === 'Moderate'
                  ? 'bg-gradient-to-br from-amber-950 to-slate-900 border-amber-500/40'
                  : 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-500/40'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Route Status</span>
                    <h3 className={`text-4xl font-black ${
                      routeResult.overall_congestion === 'High' ? 'text-rose-400' :
                      routeResult.overall_congestion === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {routeResult.overall_congestion} Congestion
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      {routeResult.origin} → {routeResult.destination}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 px-3 py-1 rounded-full border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FaBrain className="text-primary-400" />
                    {(routeResult.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                  <div className="bg-slate-900/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase block">Distance</span>
                    <strong className="text-lg text-white">{routeResult.total_distance_km} <span className="text-xs font-normal">km</span></strong>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase block">Travel Time</span>
                    <strong className="text-lg text-white">{routeResult.estimated_travel_time_mins} <span className="text-xs font-normal">min</span></strong>
                  </div>
                  <div className="bg-slate-900/40 p-3 rounded-2xl">
                    <span className="text-[10px] text-slate-400 uppercase block">Avg Speed</span>
                    <strong className="text-lg text-white">{routeResult.average_speed_kmh} <span className="text-xs font-normal">km/h</span></strong>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="glass rounded-3xl p-6 border border-slate-700/60 space-y-4">
                <div className="flex border-b border-slate-700 pb-3 gap-4">
                  {['summary', 'steps'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors border-b-2 ${
                        activeTab === tab ? 'text-primary-400 border-primary-400' : 'text-slate-400 border-transparent hover:text-white'
                      }`}
                    >
                      {tab === 'summary' ? 'AI Insights' : 'Turn-by-Turn Steps'}
                    </button>
                  ))}
                </div>

                {activeTab === 'summary' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50">
                      <span className="text-slate-400 font-semibold block mb-1">Recommended Alternative</span>
                      <strong className="text-white">{routeResult.alternative_route_name}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50">
                        <span className="text-slate-400 flex items-center gap-1 mb-1"><FaLeaf className="text-emerald-400" /> Fuel Saved</span>
                        <strong className="text-lg text-emerald-400">{routeResult.fuel_saved_liters} L</strong>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50">
                        <span className="text-slate-400 flex items-center gap-1 mb-1"><FaLeaf className="text-cyan-400" /> CO₂ Reduced</span>
                        <strong className="text-lg text-cyan-400">{routeResult.co2_saved_kg} kg</strong>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                      <FaShieldAlt className="text-amber-400 text-xl" />
                      <div>
                        <span className="text-slate-400 block">Accident Risk</span>
                        <strong className="text-slate-200">{routeResult.accident_risk}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'steps' && (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {routeResult.steps?.map((step) => (
                      <div key={step.step_number} className="p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-xs font-bold text-primary-400 shrink-0">
                          {step.step_number}
                        </div>
                        <div className="text-xs">
                          <p className="text-white font-medium">{step.instruction}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span>{step.distance_km} km</span>·<span>~{step.duration_mins} min</span>·
                            <span className={
                              step.congestion_level === 'High' ? 'text-rose-400 font-bold' :
                              step.congestion_level === 'Moderate' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'
                            }>{step.congestion_level}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoutePlanner;
