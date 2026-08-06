import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBrain, FaRobot, FaExclamationTriangle, FaRoute, 
  FaCheckCircle, FaCarSide, FaTemperatureHigh, FaSmog, FaDirections, FaDatabase
} from 'react-icons/fa';
import { predictionAPI, adminAPI } from '../services/api';
import RoutePlanner from '../components/RoutePlanner';

const Prediction = () => {
  const [activeTab, setActiveTab] = useState('route'); // 'route' or 'simulation'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  
  const [formData, setFormData] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    vehicle_count: 150,
    road_type: 'Arterial',
    weather: 'Clear',
    temperature: 32.0,
    humidity: 60.0,
    accident_count: 0,
    traffic_signal: true,
    holiday: false
  });

  useEffect(() => {
    let interval;
    const loadModelsAndDatasets = () => {
      Promise.all([
        adminAPI.getModels(),
        adminAPI.getDatasets().catch(() => ({ data: [] }))
      ]).then(([modelRes, datasetRes]) => {
        setModels(modelRes.data);
        if (datasetRes?.data) setDatasets(datasetRes.data);

        const active = modelRes.data.find(m => m.is_active);
        setSelectedModel(prev => prev || (active ? active.model_name : (modelRes.data.length > 0 ? modelRes.data[0].model_name : '')));
      }).catch(err => console.error("Could not fetch predictions metadata:", err));
    };
    
    loadModelsAndDatasets();
    interval = setInterval(loadModelsAndDatasets, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await predictionAPI.predict(formData, selectedModel || null);
      setTimeout(() => {
        setResult(res.data);
        setLoading(false);
      }, 600);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const activeModelObj = models.find(m => m.model_name === selectedModel);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header & Status Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FaBrain className="text-primary-400" /> AI Predictions & Travel Intelligence
          </h1>
          <p className="text-slate-400 mt-1">Predict travel time, congestion levels, and route directions powered by trained machine learning models</p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          {datasets.length > 0 && (
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <FaDatabase />
              <span>{datasets.length} Dataset(s) Active</span>
            </div>
          )}
          {activeModelObj && (
            <div className="px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold flex items-center gap-2">
              <FaCheckCircle />
              <span>{activeModelObj.model_name} (Acc: {(activeModelObj.accuracy * 100).toFixed(1)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Mode Toggle Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('route')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'route' 
              ? 'text-primary-400 border-primary-400' 
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <FaDirections size={18} />
          <span>Point A → Point B Travel Navigation</span>
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'simulation' 
              ? 'text-primary-400 border-primary-400' 
              : 'text-slate-400 border-transparent hover:text-slate-200'
          }`}
        >
          <FaRobot size={18} />
          <span>Traffic Parameter Simulator</span>
        </button>
      </div>

      {/* Tab 1: Point A to Point B Route Planner */}
      {activeTab === 'route' && (
        <RoutePlanner />
      )}

      {/* Tab 2: Custom Simulation Parameters */}
      {activeTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Form */}
          <div className="lg:col-span-5 glass rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <FaRobot className="text-9xl text-primary-500" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-6 relative z-10">Simulation Parameters</h2>
            
            <form onSubmit={handlePredict} className="space-y-4 relative z-10">
              {models.length > 0 && (
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">AI Model Engine</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.model_name}>
                        {m.model_name} (Acc: {(m.accuracy * 100).toFixed(1)}%)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">Vehicle Count</label>
                  <div className="relative">
                    <FaCarSide className="absolute left-3 top-3.5 text-slate-400" />
                    <input type="number" name="vehicle_count" value={formData.vehicle_count} onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">Accident Count</label>
                  <div className="relative">
                    <FaExclamationTriangle className="absolute left-3 top-3.5 text-slate-400" />
                    <input type="number" name="accident_count" value={formData.accident_count} onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">Road Type</label>
                  <select name="road_type" value={formData.road_type} onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm">
                    <option>Highway</option>
                    <option>Arterial</option>
                    <option>Local</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">Weather</label>
                  <select name="weather" value={formData.weather} onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm">
                    <option>Clear</option>
                    <option>Rainy</option>
                    <option>Snowy</option>
                    <option>Foggy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">Temperature (°C)</label>
                  <div className="relative">
                    <FaTemperatureHigh className="absolute left-3 top-3.5 text-slate-400" />
                    <input type="number" name="temperature" value={formData.temperature} onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-200 font-bold uppercase tracking-wider mb-1 block">Humidity (%)</label>
                  <div className="relative">
                    <FaSmog className="absolute left-3 top-3.5 text-slate-400" />
                    <input type="number" name="humidity" value={formData.humidity} onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white focus:ring-2 focus:ring-primary-500 font-medium text-sm" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="traffic_signal" checked={formData.traffic_signal} onChange={handleChange} className="w-5 h-5 rounded text-primary-500 bg-slate-900 border-slate-700" />
                  <span className="text-sm font-medium text-slate-300">Traffic Signal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="holiday" checked={formData.holiday} onChange={handleChange} className="w-5 h-5 rounded text-primary-500 bg-slate-900 border-slate-700" />
                  <span className="text-sm font-medium text-slate-300">Holiday</span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-4 py-4 bg-gradient-to-r from-primary-500 to-cyan-400 hover:from-primary-600 hover:to-cyan-500 font-bold text-white rounded-xl shadow-lg shadow-primary-500/25 transition-all flex justify-center items-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FaBrain />}
                {loading ? "Analyzing Neural Network..." : "Generate AI Prediction"}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center glass rounded-3xl p-12 text-center text-slate-400 border border-dashed border-slate-700"
                >
                  <FaRobot className="text-6xl text-slate-600 mb-4" />
                  <h3 className="text-xl font-bold text-slate-300 mb-2">Awaiting Simulation Parameters</h3>
                  <p className="max-w-xs text-xs">Adjust the simulation parameters on the left and click predict to see AI-generated insights.</p>
                </motion.div>
              )}

              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center glass rounded-3xl p-12"
                >
                  <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mb-6" />
                  <h3 className="text-xl font-bold text-white animate-pulse">Running Model Inference...</h3>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Top Result Card */}
                  <div className={`rounded-3xl p-8 relative overflow-hidden ${
                    result.congestion_level === 'High' ? 'bg-gradient-to-br from-rose-900/80 to-slate-900 border border-rose-500/30' :
                    result.congestion_level === 'Moderate' ? 'bg-gradient-to-br from-amber-900/80 to-slate-900 border border-amber-500/30' :
                    'bg-gradient-to-br from-emerald-900/80 to-slate-900 border border-emerald-500/30'
                  }`}>
                    <div className="absolute top-0 right-0 p-6">
                      <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <FaCheckCircle className="text-primary-400" />
                        <span className="text-xs font-bold text-white">Confidence: {(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-1">Predicted Congestion</p>
                    <h2 className={`text-6xl font-black tracking-tight ${
                      result.congestion_level === 'High' ? 'text-rose-400' :
                      result.congestion_level === 'Moderate' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {result.congestion_level}
                    </h2>
                    
                    <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase">Travel Time</p>
                        <p className="text-2xl font-bold text-white">{result.predicted_travel_time} <span className="text-sm font-normal text-slate-400">min</span></p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase">Avg Speed</p>
                        <p className="text-2xl font-bold text-white">{result.predicted_average_speed} <span className="text-sm font-normal text-slate-400">km/h</span></p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase">Risk Level</p>
                        <p className="text-2xl font-bold text-white">{result.accident_risk}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="glass rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <FaRoute className="text-primary-400" /> AI Recommendations
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Alternative Route</p>
                        <p className="text-white font-medium">{result.recommendation.alternative_route}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Traffic Signal Optimization</p>
                        <p className="text-white font-medium">{result.recommendation.signal_optimization}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">CO₂ Avoided</p>
                          <p className="text-emerald-400 font-bold text-xl">{result.recommendation.co2_saved_kg} kg</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Fuel Saved</p>
                          <p className="text-cyan-400 font-bold text-xl">{result.recommendation.fuel_saved_liters} L</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prediction;
