import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  FaMapMarkedAlt, FaCar, FaTachometerAlt, FaCloudSun, FaGasPump, 
  FaHeartbeat, FaExclamationTriangle, FaRoute, FaBrain,
  FaSearch, FaLocationArrow, FaSpinner, FaTimes, FaGlobeAsia, FaMapMarkerAlt
} from 'react-icons/fa';
import { analyticsAPI } from '../services/api';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Searched Location Pin
const searchedPinIcon = L.divIcon({
  className: 'custom-searched-pin',
  html: `<div style="background-color: #38bdf8; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(56,189,248,0.9); flex; align-items: center; justify-center; text-align: center; color: white; font-weight: bold; font-size: 14px; line-height: 22px;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const getCongestionColor = (level) => {
  switch (level) {
    case 'High': return '#ef4444'; // red-500
    case 'Moderate': return '#f59e0b'; // amber-500
    default: return '#10b981'; // emerald-500
  }
};

// Map Recenter Helper Component
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const AreaAnalytics = () => {
  const [filters, setFilters] = useState({ roads: [], weathers: [], areas: [] });
  const [selectedCity, setSelectedCity] = useState('Smart City Center');
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedRoad, setSelectedRoad] = useState('All');
  const [selectedWeather, setSelectedWeather] = useState('All');
  
  const [analytics, setAnalytics] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search Location state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null); // { name, lat, lng }
  const [gpsLoading, setGpsLoading] = useState(false);
  const searchRef = useRef(null);

  // Outside click listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced OpenStreetMap Nominatim search
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSearchResults(data);
        setSearchOpen(data.length > 0);
      } catch (err) {
        console.error("Location search error:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (place) => {
    const displayName = place.display_name.split(',').slice(0, 3).join(', ');
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    setSearchedLocation({ name: displayName, lat, lng });
    setSelectedCity(displayName);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);

    // Try matching road filter if available
    const matchedRoad = filters.roads?.find(r => 
      displayName.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(place.name?.toLowerCase() || '')
    );
    if (matchedRoad) {
      setSelectedRoad(matchedRoad);
    }
  };

  const handleDetectGPS = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let placeName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          placeName = addr.city || addr.town || addr.suburb || addr.road || placeName;
        } catch (_) {}

        setSearchedLocation({ name: placeName, lat: latitude, lng: longitude });
        setSelectedCity(placeName);
        setGpsLoading(false);
      },
      (err) => {
        console.warn("GPS detection failed:", err);
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const clearSearchedLocation = () => {
    setSearchedLocation(null);
    setSelectedCity('Smart City Center');
    setSearchQuery('');
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [filtersRes, analyticsRes, markersRes] = await Promise.all([
          analyticsAPI.getFilters(),
          analyticsAPI.getAreaAnalytics({ road_name: selectedRoad, weather: selectedWeather }),
          analyticsAPI.getMapMarkers()
        ]);
        
        setFilters(filtersRes.data);
        
        // If searched location exists, update area_name in analytics
        let analyticsData = analyticsRes.data;
        if (searchedLocation && analyticsData) {
          analyticsData = {
            ...analyticsData,
            area_name: searchedLocation.name
          };
        }
        setAnalytics(analyticsData);
        
        let filteredMarkers = markersRes.data;
        if (selectedRoad !== 'All') {
          filteredMarkers = filteredMarkers.filter(m => m.road_name === selectedRoad);
        }
        setMarkers(filteredMarkers);
      } catch (err) {
        console.error("Error fetching area analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedRoad, selectedWeather, selectedArea, searchedLocation]);

  // Determine current map center
  const mapCenter = searchedLocation 
    ? [searchedLocation.lat, searchedLocation.lng]
    : (markers.length > 0 ? [markers[0].latitude, markers[0].longitude] : [28.6139, 77.2090]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header & Location Search Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FaMapMarkedAlt className="text-primary-400" /> Area Traffic Search
          </h1>
          <p className="text-slate-400 mt-1">Deep dive into specific zones, roads, and custom locations worldwide</p>
        </div>

        {/* Global Location Search & Smart Filters Container */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Search Location Input with Nominatim Geocoding */}
          <div ref={searchRef} className="relative flex-1 sm:w-80">
            <div className="relative">
              <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-sm" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Search any location worldwide..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {searchLoading && (
                <FaSpinner className="absolute right-3 top-3 text-primary-400 animate-spin text-sm" />
              )}
              {!searchLoading && searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false); }}
                  className="absolute right-3 top-3 text-slate-500 hover:text-white text-xs"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            <AnimatePresence>
              {searchOpen && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                >
                  {searchResults.map((place, idx) => {
                    const label = place.display_name.split(',').slice(0, 3).join(', ');
                    const country = place.address?.country || '';
                    return (
                      <button
                        key={place.place_id || idx}
                        onClick={() => handleSelectLocation(place)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-start gap-2.5 border-b border-slate-800 last:border-b-0 transition-colors"
                      >
                        <FaMapMarkerAlt className="text-primary-400 mt-0.5 shrink-0 text-xs" />
                        <div className="overflow-hidden">
                          <p className="text-white text-xs font-semibold truncate">{label}</p>
                          <p className="text-slate-500 text-[10px] truncate">{country} · {place.type}</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            onClick={handleDetectGPS}
            disabled={gpsLoading}
            title="Detect GPS Current Location"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <FaLocationArrow className={gpsLoading ? "animate-spin" : ""} />
            <span>{gpsLoading ? "GPS..." : "GPS Location"}</span>
          </button>
        </div>
      </div>

      {/* Searched Location Active Banner */}
      {searchedLocation && (
        <div className="bg-primary-950/60 border border-primary-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-primary-300 font-semibold truncate">
            <FaGlobeAsia className="text-primary-400 text-base shrink-0" />
            <span>Active Location Focus: <strong className="text-white font-bold">{searchedLocation.name}</strong> ({searchedLocation.lat.toFixed(4)}, {searchedLocation.lng.toFixed(4)})</span>
          </div>
          <button
            onClick={clearSearchedLocation}
            className="text-slate-400 hover:text-rose-400 font-bold flex items-center gap-1 shrink-0 transition-colors"
          >
            <FaTimes /> Clear Location
          </button>
        </div>
      )}

      {/* Smart Filters Bar */}
      <div className="flex flex-wrap gap-3 glass p-4 rounded-2xl border border-slate-700/50 items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
          <FaGlobeAsia className="text-primary-400" />
          <span>Filters:</span>
        </div>

        <select className="input-field w-40 text-xs" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
          <option value={selectedCity}>{selectedCity}</option>
          <option value="Smart City Center">Smart City Center</option>
        </select>
        
        <select className="input-field w-36 text-xs" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
          <option value="All">All Areas</option>
          {filters.areas?.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select className="input-field w-36 text-xs" value={selectedRoad} onChange={e => setSelectedRoad(e.target.value)}>
          <option value="All">All Roads</option>
          {filters.roads?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select className="input-field w-36 text-xs" value={selectedWeather} onChange={e => setSelectedWeather(e.target.value)}>
          <option value="All">All Weather</option>
          {filters.weathers?.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        <input type="date" className="input-field w-36 text-xs text-slate-300" />
        <input type="time" className="input-field w-32 text-xs text-slate-300" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 glass rounded-2xl skeleton" />
          ))}
        </div>
      ) : analytics && Object.keys(analytics).length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon={<FaCar />} title="Total Vehicles" value={analytics.total_vehicles?.toLocaleString()} color="text-blue-400" />
            <StatCard icon={<FaTachometerAlt />} title="Avg Speed" value={`${analytics.average_speed} km/h`} color="text-emerald-400" />
            <StatCard icon={<FaExclamationTriangle />} title="Congestion Level" value={`${analytics.congestion_index}`} color="text-rose-400" />
            <StatCard icon={<FaRoute />} title="Travel Time" value={`${analytics.travel_time} min`} color="text-indigo-400" />
            <StatCard icon={<FaHeartbeat />} title="Road Health" value={`${analytics.road_health_score}/100`} color="text-violet-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-3xl p-1 overflow-hidden h-[600px] border border-slate-700/50 shadow-2xl relative">
              <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%', borderRadius: '1.4rem' }}
                theme="dark"
              >
                <MapRecenter center={mapCenter} />

                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />

                {/* Searched Location Marker Pin */}
                {searchedLocation && (
                  <Marker position={[searchedLocation.lat, searchedLocation.lng]} icon={searchedPinIcon}>
                    <Popup>
                      <div className="text-slate-900 font-bold p-1">
                        <span className="px-2 py-0.5 rounded bg-sky-500 text-white text-[10px] font-bold">SEARCHED LOCATION</span>
                        <h4 className="font-bold text-sm text-slate-800 mt-1">{searchedLocation.name}</h4>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {markers.map((marker, idx) => (
                  <CircleMarker
                    key={idx}
                    center={[marker.latitude, marker.longitude]}
                    radius={Math.max(8, Math.min(marker.avg_vehicles / 50, 30))}
                    pathOptions={{ 
                      color: getCongestionColor(marker.congestion_level),
                      fillColor: getCongestionColor(marker.congestion_level),
                      fillOpacity: 0.7,
                      weight: 2
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="text-slate-900 font-bold p-1">
                        <p className="text-sm border-b pb-1 mb-1">{marker.road_name}</p>
                        <p className="text-xs">Vehicles: {marker.avg_vehicles}</p>
                        <p className="text-xs">Speed: {marker.avg_speed} km/h</p>
                        <p className="text-xs font-bold mt-1" style={{color: getCongestionColor(marker.congestion_level)}}>
                          {marker.congestion_level} Congestion
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur p-3 rounded-xl border border-slate-700 z-[400]">
                <h4 className="text-white text-xs font-bold mb-2">Traffic Hotspots</h4>
                <div className="flex items-center gap-2 text-xs text-slate-300"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Risk</div>
                <div className="flex items-center gap-2 text-xs text-slate-300 my-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Moderate</div>
                <div className="flex items-center gap-2 text-xs text-slate-300"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Clear Route</div>
              </div>
            </div>

            <div className="space-y-6">
              
              <div className="glass rounded-3xl p-6 border border-slate-700/50 relative overflow-hidden group">
                <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 text-cyan-400 group-hover:scale-110 transition-transform"><FaCloudSun /></div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                   Environmental Impact
                </h3>
                <div className="space-y-5 relative z-10">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>CO2 Emissions</span>
                      <span className="font-bold text-cyan-400">{analytics.co2_emission_kg} kg</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-cyan-500 h-2 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${Math.min((analytics.co2_emission_kg / 1000) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Fuel Consumption (Wasted)</span>
                      <span className="font-bold text-amber-400">{analytics.fuel_waste_liters} L</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min((analytics.fuel_waste_liters / 500) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Traffic Density</span>
                      <span className="font-bold text-rose-400">{analytics.traffic_density} v/km</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-rose-500 h-2 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ width: `${Math.min((analytics.traffic_density / 50) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-slate-700/50 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-white mb-2 text-center">Risk Level & Prediction</h3>
                <div className="flex justify-center items-center py-4">
                  <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 border-dashed animate-[spin_15s_linear_infinite]
                    ${analytics.risk_level === 'High' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : analytics.risk_level === 'Moderate' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}>
                    <div className="animate-[spin_15s_linear_infinite_reverse]">
                      <span className={`text-xl font-extrabold ${analytics.risk_level === 'High' ? 'text-rose-500' : analytics.risk_level === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {analytics.risk_level}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 flex items-start gap-3">
                  <FaBrain className="text-primary-400 text-xl mt-1 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide font-bold">AI Suggestion</p>
                    <p className="text-sm text-white font-medium">{analytics.alternative_route}</p>
                  </div>
                </div>
                <div className="mt-2 text-center">
                    <p className="text-xs text-slate-500">Accident Count: <strong className="text-rose-400">{analytics.accident_count}</strong></p>
                </div>
              </div>
              
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-3xl p-12 text-center text-slate-400">
          <p>No data available for the selected area or filters.</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="glass rounded-3xl p-4 border border-slate-700/50 hover:border-primary-500/50 transition-all duration-300 relative overflow-hidden group shadow-lg"
  >
    <div className={`absolute -right-3 -bottom-3 text-7xl opacity-[0.06] group-hover:opacity-15 group-hover:scale-110 transition-all ${color}`}>
      {icon}
    </div>
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-sm ${color} shadow-inner`}>
          {icon}
        </div>
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    </div>
  </motion.div>
);

export default AreaAnalytics;
