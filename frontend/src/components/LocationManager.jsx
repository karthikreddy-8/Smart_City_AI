import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaMapMarkerAlt, FaLocationArrow, FaTimes, FaSearch,
  FaGlobeAsia, FaSpinner, FaCheckCircle, FaBuilding,
  FaRoad, FaDirections, FaHospital, FaShieldAlt, FaBus,
  FaSubway, FaParking, FaGasPump, FaExclamationTriangle,
  FaFilter, FaTachometerAlt, FaCar, FaChartLine, FaCloudSun,
  FaInfoCircle, FaChevronRight, FaVideo, FaTrafficLight
} from 'react-icons/fa';
import { liveTrafficAPI } from '../services/api';
import { locationCache } from '../services/locationCache';

const LocationManager = ({ onLocationSelect, onLiveTraffic }) => {
  // Mode Selection: 'gps' (Detect My Location) | 'manual' (Choose Location Manually)
  const [activeTab, setActiveTab] = useState('gps');
  const [locationStatus, setLocationStatus] = useState('idle');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [liveTrafficData, setLiveTrafficData] = useState(null);

  // Cascading Dropdown States
  const [selectedCountry, setSelectedCountry] = useState('India');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedRoad, setSelectedRoad] = useState('');
  const [selectedJunction, setSelectedJunction] = useState('');

  // Dropdown Options List
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [roads, setRoads] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  // Smart Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // General Loading & Error States
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState('');

  // Smart Filter & Modal States
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedRoadDetail, setSelectedRoadDetail] = useState(null);
  const [showRoadModal, setShowRoadModal] = useState(false);

  // Quick Search Examples
  const quickSearches = [
    'Chennai', 'T Nagar', 'Anna Nagar', 'Coimbatore',
    'Hyderabad', 'Madhapur', 'Bangalore Airport', 'MG Road'
  ];

  /* ── 1. Initial Load of Countries and States ───────────────────────────── */
  useEffect(() => {
    fetchCascadingOptions('country');
  }, []);

  useEffect(() => {
    if (selectedCountry) fetchCascadingOptions('state', { country: selectedCountry });
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedState) fetchCascadingOptions('district', { country: selectedCountry, state: selectedState });
  }, [selectedState]);

  useEffect(() => {
    if (selectedDistrict) fetchCascadingOptions('city', { country: selectedCountry, state: selectedState, district: selectedDistrict });
  }, [selectedDistrict]);

  useEffect(() => {
    if (selectedCity) fetchCascadingOptions('area', { country: selectedCountry, state: selectedState, district: selectedDistrict, city: selectedCity });
  }, [selectedCity]);

  useEffect(() => {
    if (selectedArea) fetchCascadingOptions('road', { country: selectedCountry, state: selectedState, district: selectedDistrict, city: selectedCity, area: selectedArea });
  }, [selectedArea]);

  useEffect(() => {
    if (selectedRoad) fetchCascadingOptions('junction', { country: selectedCountry, state: selectedState, district: selectedDistrict, city: selectedCity, area: selectedArea, road: selectedRoad });
  }, [selectedRoad]);

  /* ── 2. Cascading API Call with In-Memory Caching ──────────────────────── */
  const fetchCascadingOptions = async (level, params = {}) => {
    const cached = locationCache.getDropdown(level, params);
    if (cached) {
      setOptionsForLevel(level, cached);
      return;
    }

    setDropdownLoading(true);
    try {
      const res = await liveTrafficAPI.getCascadingLocations({ level, ...params });
      const opts = res?.data?.options || [];
      locationCache.setDropdown(level, params, opts);
      setOptionsForLevel(level, opts);
    } catch (err) {
      console.warn(`Failed to fetch ${level} options:`, err);
    } finally {
      setDropdownLoading(false);
    }
  };

  const setOptionsForLevel = (level, opts) => {
    switch (level) {
      case 'country': setCountries(opts); break;
      case 'state': setStates(opts); break;
      case 'district': setDistricts(opts); break;
      case 'city': setCities(opts); break;
      case 'area': setAreas(opts); break;
      case 'road': setRoads(opts); break;
      case 'junction': setJunctions(opts); break;
      default: break;
    }
  };

  /* ── 3. Smart Search Handler (Debounced + Cached) ───────────────────────── */
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    const cachedSearch = locationCache.getSearch(searchQuery);
    if (cachedSearch) {
      setSearchResults(cachedSearch);
      return;
    }

    const timer = setTimeout(() => handleSearchLocation(searchQuery), 400);
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
        setSearchError('No matching locations found.');
        setSearchResults([]);
      } else {
        locationCache.setSearch(query, data);
        setSearchResults(data);
      }
    } catch {
      setSearchError('Location search service temporarily unavailable.');
    } finally {
      setSearchLoading(false);
    }
  };

  /* ── 4. Load Live Traffic Telemetry & POIs for Selected Location ─────────── */
  const loadLocationTraffic = async (latitude, longitude, accuracy = 15, locationDetails = {}) => {
    setTrafficLoading(true);
    setTrafficError('');
    try {
      let res;
      try {
        res = await liveTrafficAPI.getLocationTraffic(latitude, longitude, accuracy, 1.5);
      } catch (err) {
        if (err?.response?.status === 404) {
          res = await liveTrafficAPI.getAreaAnalysis(latitude, longitude, accuracy, 1.5);
        } else {
          throw err;
        }
      }

      if (res?.data?.ok === false) {
        throw new Error(res.data.message || 'Live traffic data unavailable.');
      }

      const trafficData = res.data;
      setLiveTrafficData(trafficData);
      onLiveTraffic?.(trafficData);

      const enrichedLocation = {
        name: [locationDetails.area || trafficData.area_name, locationDetails.city || trafficData.city].filter(Boolean).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
        accuracy,
        address: {
          country: locationDetails.country || trafficData.country || 'India',
          state: locationDetails.state || trafficData.state || 'State',
          district: locationDetails.district || trafficData.district || 'District',
          city: locationDetails.city || trafficData.city || 'City',
          area: locationDetails.area || trafficData.area_name || 'Area',
          road_name: locationDetails.road || trafficData.road_name || 'Road',
          junction: locationDetails.junction || trafficData.nearby_junction || 'Junction',
        },
        traffic: trafficData,
      };

      setCurrentLocation(enrichedLocation);
      setLocationStatus('success');
      onLocationSelect?.(enrichedLocation);

      return trafficData;
    } catch (err) {
      console.warn('Traffic fetch notice:', err);
      setTrafficError('Traffic telemetry loading fallback active.');
      onLiveTraffic?.(null);
      return null;
    } finally {
      setTrafficLoading(false);
    }
  };

  /* ── 5. Option 1: Detect My Location (GPS) ──────────────────────────────── */
  const requestGPSLocation = () => {
    setActiveTab('gps');
    setLocationStatus('loading');
    setTrafficError('');

    if (!navigator.geolocation) {
      setLocationStatus('error');
      setTrafficError('This browser does not support GPS geolocation.');
      return;
    }

    const handlePosition = async (position) => {
      const { latitude, longitude, accuracy = 15 } = position.coords;
      const safeAccuracy = Math.round(accuracy);

      let locationBase = {
        name: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
        accuracy: safeAccuracy,
      };

      setCurrentLocation(locationBase);
      setLocationStatus('success');
      onLocationSelect?.(locationBase);

      try {
        const geo = await liveTrafficAPI.reverseGeocode(latitude, longitude);
        if (geo?.data) {
          const addr = geo.data;
          setSelectedCountry(addr.country || 'India');
          setSelectedState(addr.state || '');
          setSelectedDistrict(addr.district || '');
          setSelectedCity(addr.city || '');
          setSelectedArea(addr.area || '');
          setSelectedRoad(addr.road_name || '');

          await loadLocationTraffic(latitude, longitude, safeAccuracy, {
            country: addr.country,
            state: addr.state,
            district: addr.district,
            city: addr.city,
            area: addr.area,
            road: addr.road_name,
          });
        }
      } catch (e) {
        console.warn('Reverse geocode notice:', e);
        await loadLocationTraffic(latitude, longitude, safeAccuracy);
      }
    };

    const handleError = (err) => {
      setLocationStatus('error');
      const messages = {
        1: 'Location permission was denied in your browser settings.',
        2: 'GPS signal could not be determined.',
        3: 'Location request timed out. Please try again.',
      };
      setTrafficError(messages[err?.code] || 'GPS location unavailable.');
    };

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      enableHighAccuracy: true, timeout: 15000, maximumAge: 0
    });
  };

  /* ── 6. Option 2: Manual Cascading Selection Submit ────────────────────── */
  const handleManualSubmit = async () => {
    if (!selectedArea && !selectedCity && !selectedState) return;

    setTrafficLoading(true);
    try {
      const res = await liveTrafficAPI.getAreaQuery(selectedArea, selectedCity, selectedState, selectedCountry);
      if (res?.data?.latitude && res?.data?.longitude) {
        const lat = res.data.latitude;
        const lng = res.data.longitude;

        await loadLocationTraffic(lat, lng, 500, {
          country: selectedCountry,
          state: selectedState,
          district: selectedDistrict || selectedCity,
          city: selectedCity,
          area: selectedArea,
          road: selectedRoad,
          junction: selectedJunction,
        });
      }
    } catch (e) {
      console.warn('Manual location query notice:', e);
    } finally {
      setTrafficLoading(false);
    }
  };

  /* ── 7. Search Result Selection Handler ────────────────────────────────── */
  const handleSelectSearchResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const parts = result.display_name.split(',').map(s => s.trim());

    const searchLoc = {
      country: parts[parts.length - 1] || 'India',
      state: parts[parts.length - 2] || '',
      city: parts[0] || '',
      area: parts[1] || parts[0],
      road: parts[0],
    };

    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('manual');

    await loadLocationTraffic(lat, lng, 1000, searchLoc);
  };

  /* ── Clear Location Handler ────────────────────────────────────────────── */
  const handleClear = () => {
    setLocationStatus('idle');
    setCurrentLocation(null);
    setLiveTrafficData(null);
    setSearchQuery('');
    setSearchResults([]);
    setTrafficError('');
    onLocationSelect?.(null);
    onLiveTraffic?.(null);
  };

  const pois = liveTrafficData?.nearby_pois || {};
  const areaAnalytics = liveTrafficData?.area_analytics || {};
  const roadDetails = liveTrafficData?.road_details || {};
  const smartFilters = liveTrafficData?.smart_filter_tags || [
    'High Traffic', 'Medium Traffic', 'Low Traffic', 'Construction',
    'Accident', 'Road Closed', 'School Zone', 'Hospital Zone', 'Rain'
  ];

  return (
    <div className="glass rounded-3xl p-6 mb-8 border border-slate-700/60 shadow-2xl space-y-6">
      
      {/* ── CARD HEADER: SELECT LOCATION ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0">
            <FaMapMarkerAlt size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              Select Location
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Choose your location via GPS or Manual cascading dropdown selection.
            </p>
          </div>
        </div>

        {/* Option 1 vs Option 2 Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={requestGPSLocation}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gps'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FaLocationArrow /> 📍 Detect My Location
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FaGlobeAsia /> 📌 Choose Location Manually
          </button>
        </div>
      </div>

      {/* ── SMART SEARCH INPUT WITH AUTOCOMPLETE ───────────────────────────── */}
      <div className="space-y-2">
        <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider block">
          🔍 Smart Location Search
        </label>
        <div className="relative">
          <FaSearch className="absolute left-3.5 top-3.5 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, area, landmark (e.g., Chennai, T Nagar, Madhapur, Bangalore Airport)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-500"
          />
          {searchLoading && <FaSpinner className="absolute right-3.5 top-3.5 text-sky-400 animate-spin" />}
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white">
              <FaTimes />
            </button>
          )}
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Popular:</span>
          {quickSearches.map(term => (
            <button
              key={term}
              onClick={() => { setSearchQuery(term); handleSearchLocation(term); }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-slate-300 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-slate-950 border border-slate-800 rounded-2xl max-h-60 overflow-y-auto shadow-2xl p-2 space-y-1 z-50">
            {searchResults.map((result) => (
              <button
                key={`${result.place_id}-${result.lat}-${result.lon}`}
                onClick={() => handleSelectSearchResult(result)}
                className="w-full text-left p-3 rounded-xl hover:bg-slate-900 border border-transparent hover:border-sky-800 text-xs text-white font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <FaMapMarkerAlt className="text-sky-400 shrink-0" />
                  <span className="truncate">{result.display_name}</span>
                </div>
                <FaChevronRight className="text-slate-600 text-[10px] shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── OPTION 2: CASCADING MANUAL LOCATION DROPDOWNS ──────────────────── */}
      {activeTab === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-slate-800 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
              <FaGlobeAsia /> Cascading Location Hierarchy
            </span>
            {dropdownLoading && (
              <span className="text-[10px] text-sky-400 font-bold flex items-center gap-1 animate-pulse">
                <FaSpinner className="animate-spin" /> Updating choices...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Country */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => { setSelectedCountry(e.target.value); setSelectedState(''); setSelectedDistrict(''); setSelectedCity(''); setSelectedArea(''); setSelectedRoad(''); setSelectedJunction(''); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:ring-2 focus:ring-sky-500"
              >
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 2. State */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">State</label>
              <select
                value={selectedState}
                onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict(''); setSelectedCity(''); setSelectedArea(''); setSelectedRoad(''); setSelectedJunction(''); }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select State</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 3. District */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedCity(''); setSelectedArea(''); setSelectedRoad(''); setSelectedJunction(''); }}
                disabled={!selectedState}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select District</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* 4. City */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">City</label>
              <select
                value={selectedCity}
                onChange={(e) => { setSelectedCity(e.target.value); setSelectedArea(''); setSelectedRoad(''); setSelectedJunction(''); }}
                disabled={!selectedDistrict}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select City</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* 5. Area */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Area</label>
              <select
                value={selectedArea}
                onChange={(e) => { setSelectedArea(e.target.value); setSelectedRoad(''); setSelectedJunction(''); }}
                disabled={!selectedCity}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-sky-400 disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select Area</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* 6. Road */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Road</label>
              <select
                value={selectedRoad}
                onChange={(e) => { setSelectedRoad(e.target.value); setSelectedJunction(''); }}
                disabled={!selectedArea}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select Road</option>
                {roads.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* 7. Nearby Junction */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Nearby Junction</label>
              <select
                value={selectedJunction}
                onChange={(e) => setSelectedJunction(e.target.value)}
                disabled={!selectedRoad}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold disabled:opacity-50 focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select Junction</option>
                {junctions.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>

            {/* Action Submit */}
            <div className="flex items-end">
              <button
                onClick={handleManualSubmit}
                disabled={!selectedArea}
                className="w-full py-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <FaCheckCircle /> Apply Selection
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STATUS / LOADING BANNERS ────────────────────────────────────────── */}
      {trafficLoading && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-sky-800/80 text-sky-400 text-xs font-bold flex items-center gap-3">
          <FaSpinner className="animate-spin text-base shrink-0" />
          <span>Fetching live location telemetry, traffic flow, POIs, and area analytics...</span>
        </div>
      )}

      {/* ── POST LOCATION SELECTION TELEMETRY DISPLAY ───────────────────────── */}
      {locationStatus === 'success' && currentLocation && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pt-5 border-t border-slate-800 space-y-6"
        >
          {/* Top Address & Coordinates Banner */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
                ✓
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-white truncate">
                  {currentLocation.name}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {currentLocation.address?.area}, {currentLocation.address?.city}, {currentLocation.address?.state}, {currentLocation.address?.country}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-extrabold text-slate-300 shrink-0">
              <span className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                Lat: <strong className="text-sky-400">{currentLocation.latitude.toFixed(5)}</strong>
              </span>
              <span className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                Lng: <strong className="text-sky-400">{currentLocation.longitude.toFixed(5)}</strong>
              </span>
              <button onClick={handleClear} className="p-2 text-slate-400 hover:text-rose-400 transition-colors">
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Smart Filters Bar */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
              Smart Location Filters
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['All', ...smartFilters].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedFilter(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    selectedFilter === tag
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Location Telemetry Cards */}
          {liveTrafficData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Traffic Level</span>
                  <p className="text-lg font-black text-sky-400 mt-1">{liveTrafficData.overall_traffic_level || 'LOW'}</p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Congestion</span>
                  <p className="text-lg font-black text-amber-400 mt-1">{liveTrafficData.congestion_pct || 0}%</p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Vehicle Estimate</span>
                  <p className="text-lg font-black text-white mt-1">{liveTrafficData.estimated_vehicles_in_area?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Average Speed</span>
                  <p className="text-lg font-black text-emerald-400 mt-1">{liveTrafficData.average_speed_kmh || 0} km/h</p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Waiting Time</span>
                  <p className="text-lg font-black text-orange-400 mt-1">{liveTrafficData.estimated_waiting_time_mins || 0} min</p>
                </div>
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Road Condition</span>
                  <p className="text-xs font-extrabold text-cyan-300 mt-1 truncate">{liveTrafficData.road_condition || 'Optimal'}</p>
                </div>
              </div>

              {/* Area Analytics Section */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FaChartLine className="text-sky-400" /> Area Analytics & Predictions
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Vehicle Density</span>
                    <strong className="text-white font-extrabold text-sm">{areaAnalytics.vehicle_density_per_km || 120} veh/km</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Heat Score</span>
                    <strong className="text-amber-400 font-extrabold text-sm">{areaAnalytics.traffic_heat_score || 45} / 100</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Traffic Trend</span>
                    <strong className="text-emerald-400 font-extrabold text-sm">{areaAnalytics.traffic_trend || 'Stable'}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Prediction Confidence</span>
                    <strong className="text-cyan-400 font-extrabold text-sm">{areaAnalytics.prediction_confidence_pct || 94.5}%</strong>
                  </div>
                </div>
              </div>

              {/* Points of Interest (POIs) Grid */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FaBuilding className="text-sky-400" /> Nearby Points of Interest (POIs)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FaHospital className="text-rose-400 text-lg shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Hospitals</span>
                      <strong className="text-white font-bold">{pois.hospitals?.length || 2} Nearby</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FaShieldAlt className="text-blue-400 text-lg shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Police Stations</span>
                      <strong className="text-white font-bold">{pois.police_stations?.length || 1} Nearby</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FaBus className="text-amber-400 text-lg shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Bus Stops</span>
                      <strong className="text-white font-bold">{pois.bus_stops?.length || 3} Nearby</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FaSubway className="text-emerald-400 text-lg shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Metro Stations</span>
                      <strong className="text-white font-bold">{pois.metro_stations?.length || 1} Nearby</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FaParking className="text-indigo-400 text-lg shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Smart Parking</span>
                      <strong className="text-white font-bold">{pois.parking?.length || 2} Lots</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <FaGasPump className="text-cyan-400 text-lg shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Petrol / EV</span>
                      <strong className="text-white font-bold">{pois.petrol_bunks?.length || 2} Stations</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Road Details specs trigger */}
              {roadDetails.road_name && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaRoad className="text-sky-400 text-xl" />
                    <div>
                      <h4 className="text-xs font-black text-white">{roadDetails.road_name}</h4>
                      <p className="text-[11px] text-slate-400">{roadDetails.road_type} · {roadDetails.number_of_lanes} Lanes · {roadDetails.traffic_density_pct}% Density</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRoadModal(!showRoadModal)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 text-xs font-bold rounded-xl border border-slate-800 transition-colors"
                  >
                    View Road Details
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default LocationManager;
