import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  FaMapMarkedAlt, FaCar, FaTachometerAlt, FaCloudSun, FaGasPump, 
  FaHeartbeat, FaExclamationTriangle, FaRoute, FaBrain 
} from 'react-icons/fa';
import { analyticsAPI } from '../services/api';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const getCongestionColor = (level) => {
  switch (level) {
    case 'High': return '#ef4444'; // red-500
    case 'Moderate': return '#f59e0b'; // amber-500
    default: return '#10b981'; // emerald-500
  }
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
        setAnalytics(analyticsRes.data);
        
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
  }, [selectedRoad, selectedWeather, selectedArea]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FaMapMarkedAlt className="text-primary-400" /> Area Traffic Search
          </h1>
          <p className="text-slate-400 mt-1">Deep dive into specific zones and roads</p>
        </div>

        {/* Smart Filters */}
        <div className="flex flex-wrap gap-3 glass p-4 rounded-2xl border border-slate-700/50">
          <select className="input-field w-32" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            <option value="Smart City Center">Smart City Center</option>
          </select>
          <select className="input-field w-32" value={selectedArea} onChange={e => setSelectedArea(e.target.value)}>
            <option value="All">All Areas</option>
            {filters.areas?.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input-field w-32" value={selectedRoad} onChange={e => setSelectedRoad(e.target.value)}>
            <option value="All">All Roads</option>
            {filters.roads?.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="input-field w-32" value={selectedWeather} onChange={e => setSelectedWeather(e.target.value)}>
            <option value="All">All Weather</option>
            {filters.weathers?.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <input type="date" className="input-field w-32 text-slate-400" />
          <input type="time" className="input-field w-32 text-slate-400" />
        </div>
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
                center={markers.length > 0 ? [markers[0].latitude, markers[0].longitude] : [28.6139, 77.2090]} 
                zoom={13} 
                style={{ height: '100%', width: '100%', borderRadius: '1.4rem' }}
                theme="dark"
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CARTO'
                />
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
    className="glass rounded-3xl p-4 border border-slate-700/30 hover:border-primary-500/50 transition-all duration-300 relative overflow-hidden group shadow-lg"
  >
    <div className={`absolute -right-3 -bottom-3 text-7xl opacity-[0.04] group-hover:opacity-10 group-hover:scale-110 transition-all ${color}`}>
      {icon}
    </div>
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center text-sm ${color} shadow-inner`}>
          {icon}
        </div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    </div>
  </motion.div>
);

export default AreaAnalytics;
