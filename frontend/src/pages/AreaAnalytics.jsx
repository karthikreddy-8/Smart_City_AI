import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  FaMapMarkedAlt, FaCar, FaTachometerAlt, FaCloudSun, FaGasPump, 
  FaHeartbeat, FaExclamationTriangle, FaRoute, FaBrain, FaChartLine,
  FaSearch, FaLocationArrow, FaSpinner, FaTimes, FaGlobeAsia, FaMapMarkerAlt,
  FaBus, FaTruck, FaMotorcycle, FaAmbulance, FaCamera, FaDesktop,
  FaChevronDown, FaChevronUp, FaCrosshairs, FaFileVideo, FaFileImage,
  FaFileUpload, FaShieldAlt, FaWifi, FaCarSide
} from 'react-icons/fa';
import { analyticsAPI, liveTrafficAPI } from '../services/api';

// Fix Leaflet icon issue
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (err) {
  console.warn('[WARN] Leaflet icon override failed:', err);
}

// Custom Searched Location Pin
const searchedPinIcon = L.divIcon({
  className: 'custom-searched-pin',
  html: `<div style="background-color: #38bdf8; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(56,189,248,0.9); display:flex; align-items: center; justify-content: center; text-align: center; color: white; font-weight: bold; font-size: 14px; line-height: 22px;">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Camera icon for map markers
const cameraMapIcon = L.divIcon({
  className: '',
  html: `<div style="background:#10b981;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 8px rgba(16,185,129,0.6);"><svg stroke="#fff" fill="#fff" viewBox="0 0 512 512" height="13" width="13" xmlns="http://www.w3.org/2000/svg"><path d="M512 144v224c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h96l16-32h192l16 32h96c26.5 0 48 21.5 48 48zM256 352c61.9 0 112-50.1 112-112s-50.1-112-112-112-112 50.1-112 112 50.1 112 112 112zm0-176c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z"/></svg></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -16],
});

const getCongestionColor = (level) => {
  switch (level) {
    case 'High': return '#ef4444';
    case 'Moderate': return '#f59e0b';
    default: return '#10b981';
  }
};

/* ── Traffic Level Helpers ──────────────────────────────────────────────── */
const levelColorClass = (lvl) => {
  switch ((lvl || '').toUpperCase()) {
    case 'LOW': case 'FREE FLOW':
      return 'text-emerald-400 bg-emerald-950/80 border-emerald-700';
    case 'MODERATE': case 'MEDIUM':
      return 'text-amber-400 bg-amber-950/80 border-amber-700';
    case 'HIGH': case 'HEAVY':
      return 'text-orange-400 bg-orange-950/80 border-orange-700';
    case 'VERY HIGH': case 'BLOCKED':
      return 'text-rose-400 bg-rose-950/80 border-rose-700';
    default:
      return 'text-slate-400 bg-slate-900 border-slate-700';
  }
};

const levelIcon = (lvl) => {
  switch ((lvl || '').toUpperCase()) {
    case 'LOW': case 'FREE FLOW': return '🟢';
    case 'MODERATE': case 'MEDIUM': return '🟡';
    case 'HIGH': case 'HEAVY': return '🟠';
    case 'VERY HIGH': case 'BLOCKED': return '🔴';
    default: return '⚪';
  }
};

// Map Recenter Helper Component
const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

/* ── Error Boundary ──────────────────────────────────────────────────────── */
class AreaAnalyticsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('AreaAnalytics Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-4xl mx-auto my-12 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-700 flex items-center justify-center mx-auto text-rose-400 text-3xl">
            <FaExclamationTriangle />
          </div>
          <h2 className="text-xl font-black text-white">Area Analytics Notice</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Live traffic service is temporarily unavailable. Please reload or select another area.
          </p>
          <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
const AreaAnalyticsInner = () => {
  // ── Hierarchical Location Selection State ──
  const [locationTree, setLocationTree] = useState({});
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedState, setSelectedState] = useState('Telangana');
  const [selectedCity, setSelectedCity] = useState('Hyderabad');
  const [selectedArea, setSelectedArea] = useState('Madhapur');

  // Available dropdown options
  const [availableStates, setAvailableStates] = useState(['Telangana', 'Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi']);
  const [availableCities, setAvailableCities] = useState(['Hyderabad']);
  const [availableAreas, setAvailableAreas] = useState(['Madhapur', 'HITEC City', 'Gachibowli', 'Banjara Hills', 'Kukatpally']);

  // Real-time Traffic State
  const [areaAnalysis, setAreaAnalysis] = useState(null);
  const [liveCameras, setLiveCameras] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationAddress, setUserLocationAddress] = useState(null);
  
  const [pageLoading, setPageLoading] = useState(true);
  const [areaLoading, setAreaLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showHistorical, setShowHistorical] = useState(false);

  // Historical CSV Dataset State (preserved)
  const [historicalAnalytics, setHistoricalAnalytics] = useState(null);
  const [markers, setMarkers] = useState([]);

  /* ── Load Location Hierarchy & Default Area on Mount ──────────────────── */
  useEffect(() => {
    const initLocationData = async () => {
      setPageLoading(true);
      try {
        const res = await liveTrafficAPI.getLocations();
        if (res?.data?.hierarchy) {
          const tree = res.data.hierarchy;
          setLocationTree(tree);

          const countries = Object.keys(tree);
          if (countries.length > 0) {
            const country = countries.includes('India') ? 'India' : countries[0];
            setSelectedCountry(country);

            const states = Object.keys(tree[country] || {});
            if (states.length > 0) {
              setAvailableStates(states);
              const state = states[0];
              setSelectedState(state);

              const cities = Object.keys(tree[country][state] || {});
              if (cities.length > 0) {
                setAvailableCities(cities);
                const city = cities[0];
                setSelectedCity(city);

                const areaObjs = tree[country][state][city] || [];
                const areas = areaObjs.map(a => a.area_name);
                if (areas.length > 0) {
                  setAvailableAreas(areas);
                  setSelectedArea(areas[0]);
                  fetchAreaAnalytics(areas[0], city, state, country);
                }
              }
            }
          }
        } else {
          // Default initial fetch
          fetchAreaAnalytics('Madhapur', 'Hyderabad', 'Telangana', 'India');
        }
      } catch (err) {
        console.warn('Locations hierarchy fetch notice:', err);
        // Fallback default fetch
        fetchAreaAnalytics('Madhapur', 'Hyderabad', 'Telangana', 'India');
      } finally {
        setPageLoading(false);
      }
    };

    initLocationData();
    fetchHistoricalData();
  }, []);

  /* ── State Change Cascades ─────────────────────────────────────────────── */
  const handleCountryChange = (c) => {
    setSelectedCountry(c);
    const states = Object.keys(locationTree[c] || {});
    setAvailableStates(states);
    if (states.length > 0) {
      handleStateChange(states[0], c);
    }
  };

  const handleStateChange = (s, c = selectedCountry) => {
    setSelectedState(s);
    const cities = Object.keys(locationTree[c]?.[s] || {});
    setAvailableCities(cities);
    if (cities.length > 0) {
      handleCityChange(cities[0], s, c);
    }
  };

  const handleCityChange = (city, s = selectedState, c = selectedCountry) => {
    setSelectedCity(city);
    const areaObjs = locationTree[c]?.[s]?.[city] || [];
    const areas = areaObjs.map(a => a.area_name);
    setAvailableAreas(areas);
    if (areas.length > 0) {
      setSelectedArea(areas[0]);
      fetchAreaAnalytics(areas[0], city, s, c);
    }
  };

  const handleAreaChange = (area) => {
    setSelectedArea(area);
    fetchAreaAnalytics(area, selectedCity, selectedState, selectedCountry);
  };

  /* ── Fetch Real-Time Area Analytics ────────────────────────────────────── */
  const fetchAreaAnalytics = async (area, city, state, country) => {
    setAreaLoading(true);
    setStatusMessage('');
    setUserLocation(null);
    setUserLocationAddress(null);

    try {
      const res = await liveTrafficAPI.getAreaQuery(area, city, state, country);
      if (res?.data) {
        setAreaAnalysis(res.data);
        if (Array.isArray(res.data.cameras_coverage)) {
          setLiveCameras(res.data.cameras_coverage);
        } else {
          setLiveCameras([]);
        }
      } else {
        setAreaAnalysis(null);
        setStatusMessage('Live traffic data unavailable for this area.');
      }
    } catch (err) {
      console.warn('Area query error:', err);
      setAreaAnalysis(null);
      setStatusMessage('Live traffic service is temporarily unavailable.');
    } finally {
      setAreaLoading(false);
    }
  };

  /* ── Handle Use My Location (Browser GPS) ──────────────────────────────── */
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Location permission was not provided.');
      return;
    }

    setGpsLoading(true);
    setStatusMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 15);
        setUserLocation({ lat, lng, accuracy });

        try {
          const geoRes = await liveTrafficAPI.reverseGeocode(lat, lng);
          if (geoRes?.data) {
            const addr = geoRes.data;
            setUserLocationAddress({ ...addr, accuracy_meters: accuracy });
            setSelectedArea(addr.area || 'Current Area');
            setSelectedCity(addr.city || 'Current City');
            setSelectedState(addr.state || 'Current State');
            setSelectedCountry(addr.country || 'India');
          }
        } catch (e) {
          console.warn('Reverse geocode notice:', e);
        }

        try {
          const res = await liveTrafficAPI.getAreaAnalysis(lat, lng, accuracy);
          if (res?.data) {
            setAreaAnalysis(res.data);
            if (Array.isArray(res.data.cameras_coverage)) {
              setLiveCameras(res.data.cameras_coverage);
            }
          }
        } catch (e) {
          console.warn('Area analysis error:', e);
          setStatusMessage('Live traffic service is temporarily unavailable.');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.warn('GPS denied:', err);
        setGpsLoading(false);
        setStatusMessage('Location permission was not provided.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  /* ── Fetch Historical Dataset Analytics (Preserved) ────────────────────── */
  const fetchHistoricalData = async () => {
    try {
      const [analyticsRes, markersRes] = await Promise.all([
        analyticsAPI.getAreaAnalytics({ road_name: 'All', weather: 'All' }),
        analyticsAPI.getMapMarkers()
      ]);
      setHistoricalAnalytics(analyticsRes?.data || null);
      setMarkers(markersRes?.data || []);
    } catch (e) {
      console.warn('Historical data notice:', e);
    }
  };

  // Map center logic
  const defaultCenter = [17.4486, 78.3908];
  const mapCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : ((liveCameras && liveCameras.length > 0 && liveCameras[0].latitude)
        ? [liveCameras[0].latitude, liveCameras[0].longitude]
        : defaultCenter);

  const vCounts = areaAnalysis?.vehicle_breakdown || {};
  const safeLiveCams = Array.isArray(liveCameras) ? liveCameras : [];
  const activeCamsCount = areaAnalysis?.active_cameras_count || safeLiveCams.filter(c => (c?.status || '').toUpperCase() !== 'OFFLINE').length;
  const offlineCamsCount = areaAnalysis?.offline_cameras_count || safeLiveCams.filter(c => (c?.status || '').toUpperCase() === 'OFFLINE').length;

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <FaSpinner className="w-10 h-10 text-sky-400 animate-spin" />
        <p className="text-sm font-bold text-slate-300">Loading Area Analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ══════════════════════════════════════════════════════════════════
          1. HEADER & HIERARCHICAL LOCATION SELECTION PANEL
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-xl shadow-sky-500/20">
              <FaMapMarkedAlt className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
                AREA ANALYTICS
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
                Real-time area-wide traffic congestion monitoring across registered city zones.
              </p>
            </div>
          </div>

          <button
            onClick={handleUseMyLocation}
            disabled={gpsLoading}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {gpsLoading ? <FaSpinner className="animate-spin text-base" /> : <FaCrosshairs className="text-base" />}
            <span>{gpsLoading ? 'Locating...' : '📍 Use My Location'}</span>
          </button>
        </div>

        {/* Hierarchical Area Selection Controls */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
            Select Area Hierarchy
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Country */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:ring-2 focus:ring-sky-500"
              >
                {Object.keys(locationTree).length > 0 ? (
                  Object.keys(locationTree).map(c => <option key={c} value={c}>{c}</option>)
                ) : (
                  <option value="India">India</option>
                )}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">State</label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:ring-2 focus:ring-sky-500"
              >
                {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">City</label>
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:ring-2 focus:ring-sky-500"
              >
                {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>

            {/* Area */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Area Zone</label>
              <select
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-sky-400 focus:ring-2 focus:ring-sky-500"
              >
                {availableAreas.map(area => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-amber-950/90 border border-amber-700 flex items-center justify-between text-amber-200">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-amber-400 text-lg shrink-0" />
            <p className="text-xs font-bold">{statusMessage}</p>
          </div>
          <button onClick={() => fetchAreaAnalytics(selectedArea, selectedCity, selectedState, selectedCountry)} className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          2. 📍 SELECTED AREA DETAILS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-sky-400 text-lg" />
            <h2 className="text-xs sm:text-sm font-black text-sky-300 uppercase tracking-wider">📍 SELECTED AREA</h2>
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            {userLocation ? 'GPS Geolocation Active' : 'Registry Selected'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">Area</span>
            <strong className="text-white text-xs sm:text-sm font-extrabold truncate block">{selectedArea}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">City</span>
            <strong className="text-sky-300 text-xs sm:text-sm font-extrabold truncate block">{selectedCity}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">State</span>
            <strong className="text-white text-xs sm:text-sm font-extrabold truncate block">{selectedState}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">Country</span>
            <strong className="text-emerald-400 text-xs sm:text-sm font-extrabold truncate block">{selectedCountry}</strong>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          3. 🚦 REAL-TIME AREA TRAFFIC STATUS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Live Traffic Telemetry</span>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>🚦 REAL-TIME AREA TRAFFIC</span>
              <span className="text-slate-400 text-sm font-normal">· {selectedArea}, {selectedCity}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {areaAnalysis ? (
              <div className={`px-4 py-2 rounded-2xl border text-sm font-black flex items-center gap-2 ${levelColorClass(areaAnalysis.overall_traffic_level)}`}>
                <span>{levelIcon(areaAnalysis.overall_traffic_level)}</span>
                <span>{areaAnalysis.overall_traffic_level} TRAFFIC</span>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-500 border border-slate-800 text-xs font-bold">
                {areaLoading ? 'Analyzing...' : 'Waiting for area selection'}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-extrabold">
              Data Source: Live Camera + YOLOv8
            </span>
          </div>
        </div>

        {areaLoading ? (
          <div className="p-8 text-center space-y-3">
            <FaSpinner className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Computing area traffic analysis for {selectedArea}...</p>
          </div>
        ) : areaAnalysis ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Est. Vehicles</span>
              <p className="text-2xl font-black text-white">{areaAnalysis.estimated_vehicles_in_area?.toLocaleString() || 0}</p>
              <span className="text-[9px] text-slate-500 block">Area-wide estimate</span>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Traffic Density</span>
              <p className="text-2xl font-black text-cyan-400">{areaAnalysis.traffic_density_pct || 0}%</p>
              <span className="text-[9px] text-slate-500 block">Road capacity ratio</span>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Congestion</span>
              <p className="text-2xl font-black text-amber-400">{areaAnalysis.congestion_pct || 0}%</p>
              <span className="text-[9px] text-slate-500 block">Delay index</span>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Avg Speed</span>
              <p className="text-2xl font-black text-emerald-400">{areaAnalysis.average_speed_kmh || 0} <span className="text-xs font-bold">km/h</span></p>
              <span className="text-[9px] text-slate-500 block">Flow speed</span>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Waiting Time</span>
              <p className="text-2xl font-black text-orange-400">{areaAnalysis.estimated_waiting_time_mins || 0} <span className="text-xs font-bold">mins</span></p>
              <span className="text-[9px] text-slate-500 block">Signal delay</span>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Active Cameras</span>
              <p className="text-2xl font-black text-sky-400">{activeCamsCount}</p>
              <span className="text-[9px] text-slate-500 block">{offlineCamsCount} offline</span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs font-bold border border-slate-800 rounded-2xl bg-slate-950/60">
            Live traffic data unavailable for {selectedArea}.
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          4. 🛣️ TRAFFIC BY ROAD
      ══════════════════════════════════════════════════════════════════ */}
      {areaAnalysis?.traffic_by_road && areaAnalysis.traffic_by_road.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <FaRoute className="text-sky-400" /> 🛣️ TRAFFIC BY ROAD
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold">Corridors in {selectedArea}</span>
              <span className="px-3 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-extrabold">
                Data Source: Live Camera + YOLOv8
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {areaAnalysis.traffic_by_road.map((road, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white">{road.road_name}</h3>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {road.vehicle_count} vehicles · {road.congestion_pct}% congestion
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${levelColorClass(road.traffic_level)}`}>
                  <span>{road.level_icon || levelIcon(road.traffic_level)}</span>
                  <span>{road.traffic_level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          5. 🚗 VEHICLE BREAKDOWN
      ══════════════════════════════════════════════════════════════════ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <FaCar className="text-sky-400" /> 🚗 VEHICLE BREAKDOWN
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-sky-400 bg-sky-950 px-3 py-1 rounded-full border border-sky-800">
              Total Detected: {vCounts?.total || 0}
            </span>
            <span className="px-3 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-extrabold">
              Data Source: Live Camera + YOLOv8
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Cars',          key: 'car',           icon: <FaCar />,        color: 'text-sky-400' },
            { label: 'Motorcycles',   key: 'motorcycle',    icon: <FaMotorcycle />, color: 'text-cyan-400' },
            { label: 'Buses',         key: 'bus',           icon: <FaBus />,        color: 'text-amber-400' },
            { label: 'Trucks',        key: 'truck',         icon: <FaTruck />,      color: 'text-purple-400' },
            { label: 'Auto Rickshaws',key: 'auto_rickshaw', icon: <FaCarSide />,    color: 'text-yellow-400' },
            { label: 'Emergency',     key: 'emergency',     icon: <FaAmbulance />,  color: 'text-rose-400' },
          ].map(({ label, key, icon, color }) => (
            <div key={key} className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xl ${color}`}>
                {icon}
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">{label}</span>
                <strong className={`text-lg font-black ${(vCounts?.[key] || 0) > 0 ? 'text-white' : 'text-slate-600'}`}>
                  {vCounts?.[key] || 0}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          6. 📹 CAMERA COVERAGE
      ══════════════════════════════════════════════════════════════════ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <FaCamera className="text-sky-400" /> 📹 CAMERA COVERAGE
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">Active: {activeCamsCount}</span>
            <span className="px-3 py-1 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 text-xs font-bold">Offline: {offlineCamsCount}</span>
          </div>
        </div>

        {safeLiveCams.length === 0 ? (
          <div className="p-6 text-center space-y-2 border border-slate-800 rounded-2xl bg-slate-950/60">
            <p className="text-slate-400 text-xs font-bold">Live traffic camera coverage is not available for this area.</p>
            <p className="text-[10px] text-slate-500">You can use device camera view in Live Traffic module for local monitoring.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {safeLiveCams.map((cam) => {
              if (!cam) return null;
              const isOffline = (cam.status || '').toUpperCase() === 'OFFLINE';
              return (
                <div key={cam.id || cam.camera_id || Math.random()} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-white">{cam.name || cam.camera_name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">📍 {cam.road_name} · {cam.area}</p>
                    {cam.distance_km > 0 && (
                      <span className="text-[10px] text-slate-500 font-semibold block mt-1">📏 {cam.distance_km} km away</span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${isOffline ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                    {isOffline ? '🔴 Offline' : '🟢 Online'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          7. 🗺️ MAP SECTION — Centered on Selected Area
      ══════════════════════════════════════════════════════════════════ */}
      <div className="glass rounded-3xl p-1 overflow-hidden h-[480px] border border-slate-700/50 shadow-2xl relative">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          style={{ height: '100%', width: '100%', borderRadius: '1.4rem' }}
        >
          <MapRecenter center={mapCenter} />

          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />

          {/* GPS Location Pin if active */}
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={searchedPinIcon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <b style={{ color: '#db2777' }}>📍 Your Real GPS Location</b><br />
                  {userLocationAddress && (
                    <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
                      <b>{userLocationAddress.area}</b><br />
                      <span>{userLocationAddress.city}, {userLocationAddress.state}</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Camera Markers */}
          {safeLiveCams.map((cam) => {
            if (!cam || !cam.latitude || !cam.longitude) return null;
            return (
              <Marker key={cam.id || cam.camera_id || Math.random()} position={[cam.latitude, cam.longitude]} icon={cameraMapIcon}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>{cam.name || cam.camera_name}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>📍 {cam.road_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>🏙️ {cam.area}, {cam.city}</div>
                    <div style={{ fontSize: 10, color: (cam.status || '').toUpperCase() === 'OFFLINE' ? '#ef4444' : '#10b981', fontWeight: 700, marginTop: 4 }}>
                      {(cam.status || '').toUpperCase() === 'OFFLINE' ? '🔴 Offline' : '🟢 Online'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Historical Hotspot Circles */}
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
                  <p className="text-[10px] text-slate-500 mt-1">Source: Historical Dataset</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur p-3 rounded-xl border border-slate-700 z-[400]">
          <h4 className="text-white text-xs font-bold mb-2">Legend</h4>
          <div className="flex items-center gap-2 text-xs text-slate-300"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Live Camera</div>
          <div className="flex items-center gap-2 text-xs text-slate-300 my-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Risk</div>
          <div className="flex items-center gap-2 text-xs text-slate-300 my-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Moderate</div>
          <div className="flex items-center gap-2 text-xs text-slate-300"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Clear</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          8. 📊 HISTORICAL COMPARISON (Preserved CSV Analysis)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <button
          onClick={() => setShowHistorical(v => !v)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FaChartLine className="text-primary-400 text-lg" />
            <h2 className="text-base sm:text-lg font-black text-white">HISTORICAL TRAFFIC COMPARISON</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-violet-950 text-violet-400 border border-violet-800 text-[10px] font-extrabold">
              Data Source: Historical Dataset
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span>{showHistorical ? 'Hide' : 'Expand'}</span>
              {showHistorical ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>
        </button>

        {showHistorical && (
          <div className="pt-4 border-t border-slate-800 space-y-6">
            {historicalAnalytics && Object.keys(historicalAnalytics).length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Environmental Impact */}
                <div className="glass rounded-3xl p-6 border border-slate-700/50 relative overflow-hidden group">
                  <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 text-cyan-400 group-hover:scale-110 transition-transform"><FaCloudSun /></div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 relative z-10">
                     Environmental Impact
                  </h3>
                  <div className="space-y-5 relative z-10">
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>CO2 Emissions</span>
                        <span className="font-bold text-cyan-400">{historicalAnalytics.co2_emission_kg} kg</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${Math.min((historicalAnalytics.co2_emission_kg / 1000) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Fuel Consumption Wasted</span>
                        <span className="font-bold text-amber-400">{historicalAnalytics.fuel_waste_liters} L</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min((historicalAnalytics.fuel_waste_liters / 500) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Traffic Density</span>
                        <span className="font-bold text-rose-400">{historicalAnalytics.traffic_density} v/km</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${Math.min((historicalAnalytics.traffic_density / 50) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Level & AI Suggestion */}
                <div className="glass rounded-3xl p-6 border border-slate-700/50 flex flex-col justify-center relative">
                  <h3 className="text-lg font-bold text-white mb-2 text-center">Historical Risk Forecast</h3>
                  <div className="flex justify-center items-center py-4">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center border-4 border-dashed animate-[spin_15s_linear_infinite]
                      ${historicalAnalytics.risk_level === 'High' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : historicalAnalytics.risk_level === 'Moderate' ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}>
                      <div className="animate-[spin_15s_linear_infinite_reverse]">
                        <span className={`text-xl font-extrabold ${historicalAnalytics.risk_level === 'High' ? 'text-rose-500' : historicalAnalytics.risk_level === 'Moderate' ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {historicalAnalytics.risk_level}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-700 flex items-start gap-3">
                    <FaBrain className="text-primary-400 text-xl mt-1 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide font-bold">Historical Model Suggestion</p>
                      <p className="text-sm text-white font-medium">{historicalAnalytics.alternative_route}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-950/60 rounded-2xl border border-slate-800">
                No historical dataset records available.
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

const AreaAnalytics = () => (
  <AreaAnalyticsErrorBoundary>
    <AreaAnalyticsInner />
  </AreaAnalyticsErrorBoundary>
);

export default AreaAnalytics;
