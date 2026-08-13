import React, { useState, useEffect } from 'react';
import { liveTrafficAPI } from '../services/api';
import {
  FaMapMarkedAlt, FaFilter, FaTrafficLight, FaCheckCircle, FaCarCrash, FaRoute,
  FaSearch, FaSpinner, FaLocationArrow, FaCamera, FaCar, FaTachometerAlt, FaExclamationTriangle,
  FaArrowRight
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

// Safely configure Leaflet markers
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
} catch (e) {
  console.warn('Leaflet icon error:', e);
}

// Marker Icon Factories
const makeMarkerIcon = (bgColor, iconSvg, size = 30) => {
  try {
    return L.divIcon({
      className: '',
      html: `<div style="background:${bgColor};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 0 10px ${bgColor};">${iconSvg}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  } catch {
    return new L.Icon.Default();
  }
};

const cameraSvg = `<svg stroke="#fff" fill="#fff" viewBox="0 0 512 512" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M512 144v224c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144c0-26.5 21.5-48 48-48h96l16-32h192l16 32h96c26.5 0 48 21.5 48 48zM256 352c61.9 0 112-50.1 112-112s-50.1-112-112-112-112 50.1-112 112 50.1 112 112 112zm0-176c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64z"/></svg>`;
const areaSvg = `<svg stroke="#fff" fill="#fff" viewBox="0 0 384 512" height="15" width="15" xmlns="http://www.w3.org/2000/svg"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"/></svg>`;

const ICON_ONLINE_LOW = makeMarkerIcon('#10b981', cameraSvg);
const ICON_ONLINE_MODERATE = makeMarkerIcon('#f59e0b', cameraSvg);
const ICON_ONLINE_HIGH = makeMarkerIcon('#f97316', cameraSvg);
const ICON_ONLINE_VERY_HIGH = makeMarkerIcon('#ef4444', cameraSvg);
const ICON_OFFLINE = makeMarkerIcon('#475569', cameraSvg);
const ICON_AREA_PIN = makeMarkerIcon('#0284c7', areaSvg, 34);

// Level colors
const levelColor = (lvl) => {
  switch ((lvl || '').toUpperCase()) {
    case 'LOW': case 'FREE FLOW': return 'text-emerald-400 bg-emerald-950/80 border-emerald-700';
    case 'MODERATE': case 'MEDIUM': return 'text-amber-400 bg-amber-950/80 border-amber-700';
    case 'HIGH': case 'HEAVY': return 'text-orange-400 bg-orange-950/80 border-orange-700';
    case 'VERY HIGH': case 'BLOCKED': return 'text-rose-400 bg-rose-950/80 border-rose-700';
    default: return 'text-slate-400 bg-slate-900 border-slate-700';
  }
};

// Map Recenter Helper Component
function MapController({ center, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        map.flyTo(center, zoom, { animate: true, duration: 1.2 });
      } catch (e) {
        console.warn('Map flyTo error:', e);
      }
    }
  }, [center, zoom, map]);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [locationTree, setLocationTree] = useState({});
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedArea, setSelectedArea] = useState('All');
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Active Area Analysis details
  const [selectedAreaAnalytics, setSelectedAreaAnalytics] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Initial view showing all registered areas in India
  const [mapZoom, setMapZoom] = useState(5);

  /* ── Load initial registry & locations hierarchy ───────────────────────── */
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [camsRes, locsRes] = await Promise.all([
        liveTrafficAPI.getCameras(),
        liveTrafficAPI.getLocations()
      ]);

      const camData = Array.isArray(camsRes?.data) ? camsRes.data : [];
      setCameras(camData);

      if (locsRes?.data?.hierarchy) {
        const tree = locsRes.data.hierarchy;
        setLocationTree(tree);
        const country = Object.keys(tree)[0] || 'India';
        const states = Object.keys(tree[country] || {});
        setAvailableStates(['All', ...states]);
      }
    } catch (e) {
      console.warn('Initial map data fetch notice:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserLocation({ lat, lng, accuracy: Math.round(pos.coords.accuracy || 15) });
      setMapCenter([lat, lng]);
      setMapZoom(13);
      try {
        const [geoRes, camsRes, trafficRes] = await Promise.all([
          liveTrafficAPI.reverseGeocode(lat, lng),
          liveTrafficAPI.getCameras(lat, lng),
          liveTrafficAPI.getLocationTraffic(lat, lng, 15, 1.5)
        ]);
        const addr = geoRes?.data || {};
        const cams = Array.isArray(camsRes?.data) ? camsRes.data : [];
        setCameras(cams);
        if (trafficRes?.data) {
          setSelectedAreaAnalytics(trafficRes.data);
        }
        const country = Object.keys(locationTree)[0] || 'India';
        const matchedState = Object.keys(locationTree[country] || {}).find(
          s => s.toLowerCase() === String(addr.state || '').toLowerCase()
        );
        if (matchedState) {
          setSelectedState(matchedState);
          const cities = Object.keys(locationTree[country]?.[matchedState] || {});
          setAvailableCities(['All', ...cities]);
          const matchedCity = cities.find(c => c.toLowerCase() === String(addr.city || '').toLowerCase());
          if (matchedCity) {
            setSelectedCity(matchedCity);
            const areaObjs = locationTree[country]?.[matchedState]?.[matchedCity] || [];
            const areas = areaObjs.map(a => a.area_name);
            setAvailableAreas(['All', ...areas]);
            const matchedArea = areas.find(a => a.toLowerCase() === String(addr.area || '').toLowerCase());
            if (matchedArea) {
              setSelectedArea(matchedArea);
            }
          }
        }
      } catch (e) {
        console.warn('Map location notice:', e);
      } finally {
        setLocationLoading(false);
      }
    }, () => setLocationLoading(false), { enableHighAccuracy: true, timeout: 12000 });
  };

  /* ── Dropdown Cascade Handlers ─────────────────────────────────────────── */
  const handleStateChange = (state) => {
    setSelectedState(state);
    setSelectedCity('All');
    setSelectedArea('All');
    if (state === 'All') {
      setAvailableCities([]);
      setAvailableAreas([]);
      setMapCenter([20.5937, 78.9629]);
      setMapZoom(5);
      setSelectedAreaAnalytics(null);
      return;
    }

    const country = Object.keys(locationTree)[0] || 'India';
    const cities = Object.keys(locationTree[country]?.[state] || {});
    setAvailableCities(['All', ...cities]);

    // Compute center of first camera in this state
    const stateCam = cameras.find(c => (c.state || '').toLowerCase() === state.toLowerCase());
    if (stateCam) {
      setMapCenter([stateCam.latitude, stateCam.longitude]);
      setMapZoom(9);
    }
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setSelectedArea('All');
    if (city === 'All') {
      setAvailableAreas([]);
      return;
    }

    const country = Object.keys(locationTree)[0] || 'India';
    const areaObjs = locationTree[country]?.[selectedState]?.[city] || [];
    const areas = areaObjs.map(a => a.area_name);
    setAvailableAreas(['All', ...areas]);

    const cityCam = cameras.find(c => (c.city || '').toLowerCase() === city.toLowerCase());
    if (cityCam) {
      setMapCenter([cityCam.latitude, cityCam.longitude]);
      setMapZoom(11);
    }
  };

  const handleAreaChange = (area) => {
    setSelectedArea(area);
    if (area === 'All') {
      setSelectedAreaAnalytics(null);
      return;
    }
    loadAreaTraffic(area, selectedCity, selectedState);
  };

  const loadAreaTraffic = async (area, city, state) => {
    try {
      const areaCam = cameras.find(c => (c.area || '').toLowerCase() === area.toLowerCase());
      if (areaCam) {
        setMapCenter([areaCam.latitude, areaCam.longitude]);
        setMapZoom(13);
      }

      const res = await liveTrafficAPI.getAreaQuery(area, city, state);
      if (res?.data) {
        setSelectedAreaAnalytics(res.data);
      }
    } catch (e) {
      console.warn('Area analytics query error:', e);
    }
  };

  const handleShowTraffic = () => {
    if (selectedArea && selectedArea !== 'All') {
      loadAreaTraffic(selectedArea, selectedCity, selectedState);
    } else if (selectedCity && selectedCity !== 'All') {
      const cityCam = cameras.find(c => (c.city || '').toLowerCase() === selectedCity.toLowerCase());
      if (cityCam) {
        setMapCenter([cityCam.latitude, cityCam.longitude]);
        setMapZoom(11);
      }
    } else if (selectedState && selectedState !== 'All') {
      const stateCam = cameras.find(c => (c.state || '').toLowerCase() === selectedState.toLowerCase());
      if (stateCam) {
        setMapCenter([stateCam.latitude, stateCam.longitude]);
        setMapZoom(9);
      }
    } else {
      setMapCenter([20.5937, 78.9629]);
      setMapZoom(5);
    }
  };

  // Search Area Nominatim API Handler
  const handleSearchChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSearchResults(data || []);
    } catch (err) {
      console.warn('OSM Search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectSearchResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setMapCenter([lat, lng]);
    setMapZoom(13);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);

    try {
      const res = await liveTrafficAPI.getLocationTraffic(lat, lng, 1000, 1.5);
      if (res?.data) {
        setSelectedAreaAnalytics(res.data);
      }
    } catch (e) {
      console.warn('Failed to load traffic for searched location:', e);
    }
  };

  /* ── Filtered Markers ──────────────────────────────────────────────────── */
  const filteredCameras = cameras.filter(c => {
    if (selectedState !== 'All' && (c.state || '').toLowerCase() !== selectedState.toLowerCase()) return false;
    if (selectedCity !== 'All' && (c.city || '').toLowerCase() !== selectedCity.toLowerCase()) return false;
    if (selectedArea !== 'All' && (c.area || '').toLowerCase() !== selectedArea.toLowerCase()) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = (c.name || '').toLowerCase().includes(q) ||
        (c.area || '').toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.road_name || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    const isOffline = (c.status || '').toUpperCase() === 'OFFLINE';
    if (filterLevel === 'Offline' && !isOffline) return false;
    if (filterLevel === 'High' && isOffline) return false;
    if (filterLevel === 'Moderate' && isOffline) return false;
    if (filterLevel === 'Low' && isOffline) return false;

    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <FaSpinner className="w-10 h-10 text-sky-400 animate-spin" />
        <p className="text-sm font-bold text-slate-300">Loading Live Traffic Map...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4">

      {/* ── LOCATION / AREA SELECTION PANEL (HEADER) ────────────────────── */}
      <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <FaMapMarkedAlt className="text-sky-400" /> LIVE TRAFFIC MAP
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Select any state, city, or area to view real-time traffic camera markers & segment conditions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-extrabold flex items-center gap-2 disabled:opacity-60"
            >
              {locationLoading ? <FaSpinner className="animate-spin" /> : <FaLocationArrow />}
              {locationLoading ? 'Locating…' : 'Use My Location'}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <FaSearch className="absolute left-3.5 top-3 text-slate-400 text-xs" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="🔍 Search Area, City, Road..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500"
            />
            {searchLoading && <FaSpinner className="absolute right-3.5 top-3 text-sky-400 animate-spin" />}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl max-h-60 overflow-y-auto z-[999] shadow-2xl p-2 space-y-1">
                {searchResults.map((result) => (
                  <button
                    key={`${result.place_id}-${result.lat}-${result.lon}`}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-800 text-[11px] font-semibold text-white transition-colors"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* State -> City -> Area Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Select State</label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:ring-2 focus:ring-sky-500"
            >
              {availableStates.map(s => <option key={s} value={s}>{s === 'All' ? 'All Registered States' : s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Select City</label>
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={selectedState === 'All'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
            >
              {availableCities.map(c => <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Area</label>
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
              disabled={selectedCity === 'All'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-sky-400 disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
            >
              {availableAreas.map(a => <option key={a} value={a}>{a === 'All' ? 'All Areas' : a}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleShowTraffic}
              className="w-full py-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaRoute /> Show Traffic
            </button>
          </div>
        </div>
      </div>

      {/* ── MAP OVERLAY CONTROLS & MAP CONTAINER ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Sidebar Controls */}
        <div className="space-y-4 lg:col-span-1">
          {/* Traffic Status Filter */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FaFilter className="text-sky-400" /> Filter Cameras
            </h3>
            <div className="space-y-1.5">
              {[
                { id: 'All', label: 'All Cameras', count: filteredCameras.length, color: 'text-slate-200 bg-slate-950 border-slate-800' },
                { id: 'High', label: 'Heavy Traffic', count: filteredCameras.filter(c => c.status !== 'OFFLINE').length, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' },
                { id: 'Offline', label: 'Offline Cameras', count: filteredCameras.filter(c => (c.status || '').toUpperCase() === 'OFFLINE').length, color: 'text-rose-400 bg-rose-950/60 border-rose-800' },
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setFilterLevel(btn.id)}
                  className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-extrabold transition-all cursor-pointer ${btn.color} ${filterLevel === btn.id ? 'ring-2 ring-sky-500 shadow-md' : 'opacity-80 hover:opacity-100'}`}
                >
                  <span>{btn.label}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px]">{btn.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Area Summary Details Panel */}
          {selectedAreaAnalytics ? (
            <div className="bg-slate-900/90 p-5 rounded-3xl border border-sky-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-extrabold text-sky-400 uppercase tracking-wider">Area Telemetry</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${levelColor(selectedAreaAnalytics.overall_traffic_level)}`}>
                  {selectedAreaAnalytics.overall_traffic_level}
                </span>
              </div>
              <h4 className="text-sm font-black text-white">{selectedAreaAnalytics.area_name}, {selectedAreaAnalytics.city}</h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Est. Vehicles:</span>
                  <strong className="text-white">{selectedAreaAnalytics.estimated_vehicles_in_area?.toLocaleString() || 0}</strong>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Congestion:</span>
                  <strong className="text-amber-400">{selectedAreaAnalytics.congestion_pct || 0}%</strong>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Avg Speed:</span>
                  <strong className="text-emerald-400">{selectedAreaAnalytics.average_speed_kmh || 0} km/h</strong>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Active Cameras:</span>
                  <strong className="text-sky-400">{selectedAreaAnalytics.active_cameras_count || 0}</strong>
                </div>
              </div>

              <button
                onClick={() => navigate('/area')}
                className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>View Area Analytics</span> <FaArrowRight className="text-[10px]" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/80 p-4 rounded-3xl border border-slate-800 text-center space-y-1">
              <p className="text-xs font-extrabold text-slate-300">Select an Area Zone</p>
              <p className="text-[10px] text-slate-500">Pick an area from the dropdown or click a map marker to view live telemetry.</p>
            </div>
          )}
        </div>

        {/* Primary Interactive Map Container */}
        <div className="lg:col-span-3 min-h-[520px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ width: '100%', height: '100%', minHeight: '520px' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <b>📍 Your current location</b><br />
                  Accuracy: {userLocation.accuracy} m
                </Popup>
              </Marker>
            )}

            <MapController center={mapCenter} zoom={mapZoom} />

            {/* Live traffic road segments */}
            {Array.isArray(selectedAreaAnalytics?.traffic_segments) && selectedAreaAnalytics.traffic_segments.map((seg, idx) => {
              const points = Array.isArray(seg?.points) ? seg.points : [];
              if (points.length < 2) return null;
              const level = (seg.traffic_level || '').toUpperCase();
              const color = level === 'VERY HIGH' || level === 'BLOCKED' ? '#ef4444'
                : level === 'HIGH' ? '#f97316'
                  : level === 'MODERATE' ? '#f59e0b'
                    : '#22c55e';
              return (
                <Polyline
                  key={`map-live-segment-${idx}`}
                  positions={points}
                  pathOptions={{ color, weight: 6, opacity: 0.9 }}
                >
                  <Popup>
                    <div style={{ minWidth: 170, color: '#0f172a' }}>
                      <b>Live Traffic Segment</b>
                      <div style={{ fontSize: 11, marginTop: 4 }}>Traffic: {seg.traffic_level || 'UNKNOWN'}</div>
                      <div style={{ fontSize: 11 }}>Congestion: {seg.congestion_pct ?? 0}%</div>
                      <div style={{ fontSize: 11 }}>Speed: {seg.current_speed_kmh ?? 0} km/h</div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Camera Markers */}
            {filteredCameras.map((cam) => {
              if (!cam || !cam.latitude || !cam.longitude) return null;
              const isOffline = (cam.status || '').toUpperCase() === 'OFFLINE';
              const icon = isOffline ? ICON_OFFLINE : ICON_ONLINE_LOW;

              return (
                <Marker
                  key={cam.id || cam.camera_id || Math.random()}
                  position={[cam.latitude, cam.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      if (cam.area) {
                        setSelectedArea(cam.area);
                        loadAreaTraffic(cam.area, cam.city, cam.state);
                      }
                    }
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{
                        display: 'inline-block',
                        background: isOffline ? '#fee2e2' : '#dcfce7',
                        color: isOffline ? '#991b1b' : '#166534',
                        borderRadius: 4, fontSize: 10, padding: '2px 6px',
                        fontWeight: 700, marginBottom: 4,
                      }}>
                        {isOffline ? '🔴 OFFLINE' : '🟢 ONLINE'}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 2 }}>{cam.name || cam.camera_name}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 1 }}>📍 {cam.road_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>🏙️ {cam.area}, {cam.city}</div>
                      <button
                        onClick={() => navigate('/live-traffic')}
                        style={{
                          width: '100%', background: '#0284c7', color: 'white',
                          fontSize: 11, fontWeight: 700, padding: '5px 8px',
                          borderRadius: 6, cursor: 'pointer', border: 'none',
                        }}
                      >
                        🔗 Connect Live Feed
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Legend Floating Box */}
          <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 z-[400] text-xs shadow-xl space-y-1.5">
            <h4 className="text-white font-extrabold text-[11px] uppercase tracking-wider mb-1">Traffic Legend</h4>
            <div className="flex items-center gap-2 text-slate-300"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> 🟢 Low Traffic</div>
            <div className="flex items-center gap-2 text-slate-300"><span className="w-3 h-3 rounded-full bg-amber-500"></span> 🟡 Moderate</div>
            <div className="flex items-center gap-2 text-slate-300"><span className="w-3 h-3 rounded-full bg-orange-500"></span> 🟠 High</div>
            <div className="flex items-center gap-2 text-slate-300"><span className="w-3 h-3 rounded-full bg-rose-500"></span> 🔴 Very High</div>
            <div className="flex items-center gap-2 text-slate-400"><span className="w-3 h-3 rounded-full bg-slate-600"></span> ⚫ Offline Camera</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;
