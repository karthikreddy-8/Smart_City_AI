import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import {
  FaCar, FaTachometerAlt, FaExclamationTriangle, FaHeartbeat,
  FaGasPump, FaCloudSun, FaBrain, FaChartLine, FaInfoCircle, FaVideo
} from 'react-icons/fa';
import { analyticsAPI } from '../services/api';
import LocationManager from '../components/LocationManager';
import SmartFilters from '../components/SmartFilters';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#f1f5f9',
        font: { family: 'Outfit, sans-serif', size: 12, weight: '600' },
        usePointStyle: true,
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#38bdf8',
      bodyColor: '#f8fafc',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 12
    }
  },
  scales: {
    x: {
      ticks: { color: '#cbd5e1', font: { family: 'Outfit, sans-serif', size: 11, weight: '500' } },
      grid: { color: 'rgba(255, 255, 255, 0.08)' }
    },
    y: {
      ticks: { color: '#cbd5e1', font: { family: 'Outfit, sans-serif', size: 11, weight: '500' } },
      grid: { color: 'rgba(255, 255, 255, 0.08)' }
    }
  }
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: {
        color: '#f1f5f9',
        font: { family: 'Outfit, sans-serif', size: 12, weight: '600' },
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#38bdf8',
      bodyColor: '#f8fafc',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 12
    }
  }
};

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [globalFilters, setGlobalFilters] = useState({});
  const [liveVehicleData, setLiveVehicleData] = useState(null);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    if (location && typeof location === 'string') {
      setGlobalFilters(prev => ({ ...prev, road_name: location }));
    } else if (location?.name) {
      setGlobalFilters(prev => ({ ...prev, road_name: location.name }));
    } else if (!location) {
      setGlobalFilters(prev => ({ ...prev, road_name: null }));
      setLiveVehicleData(null);
    }
  };

  const handleFilterChange = (filters) => {
    setGlobalFilters(filters);
  };

  useEffect(() => {
    let interval;
    const loadDashboard = async () => {
      try {
        const [kpiRes, chartRes] = await Promise.all([
          analyticsAPI.getKPIs(globalFilters),
          analyticsAPI.getCharts(globalFilters)
        ]);
        setKpis(kpiRes.data);

        const c = chartRes.data;
        setChartsData({
          hourly: {
            labels: c.hourly?.map(item => item.hour) || [],
            datasets: [
              {
                label: 'Vehicle Count',
                data: c.hourly?.map(item => item.vehicles) || [],
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                fill: true,
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#00b4d8',
                pointRadius: 4
              }
            ]
          },
          roadCongestion: {
            labels: c.road_type?.map(item => item.road_type) || [],
            datasets: [
              {
                label: 'Avg Speed (km/h)',
                data: c.road_type?.map(item => item.avg_speed) || [],
                backgroundColor: ['#10b981', '#38bdf8', '#a855f7', '#f59e0b', '#f43f5e'],
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)'
              }
            ]
          },
          congestionPie: {
            labels: c.congestion_distribution?.map(item => item.level) || [],
            datasets: [
              {
                data: c.congestion_distribution?.map(item => item.count) || [],
                backgroundColor: ['#f43f5e', '#fbbf24', '#34d399'],
                borderWidth: 2,
                borderColor: '#0f172a'
              }
            ]
          },
          scatterPlot: {
            datasets: [
              {
                label: 'Vehicle Count vs Speed',
                data: c.scatter || [],
                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                borderColor: '#c084fc',
                borderWidth: 1.5,
                pointRadius: 6
              }
            ]
          }
        });
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    // Initial Load
    loadDashboard();

    // Polling every 10 seconds for real-time updates without page refresh
    interval = setInterval(loadDashboard, 10000);

    return () => clearInterval(interval);
  }, [globalFilters]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FaChartLine className="text-primary-400" /> Executive Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Real-time urban traffic intelligence overview (Auto-updating)</p>
        </div>
      </div>

      <LocationManager onLocationSelect={handleLocationSelect} onLiveTraffic={setLiveVehicleData} />

      {/* Always show filters so users can explore */}
      <SmartFilters onFilterChange={handleFilterChange} />
      {liveVehicleData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-5 border border-cyan-800/60"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2"><FaVideo className="text-cyan-400" /> Live Vehicle Prediction</h3>
              <p className="text-xs text-slate-400 mt-1">Live location-based traffic estimate from TomTom Traffic Flow</p>
            </div>
            <span className="text-xs font-bold text-emerald-400">● LIVE DATA</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              ['Cars', liveVehicleData.vehicle_counts?.car || 0],
              ['Bikes', liveVehicleData.vehicle_counts?.motorcycle || 0],
              ['Buses', liveVehicleData.vehicle_counts?.bus || 0],
              ['Trucks', liveVehicleData.vehicle_counts?.truck || 0],
              ['Autos', liveVehicleData.vehicle_counts?.auto_rickshaw || 0],
              ['Total', liveVehicleData.vehicle_counts?.total || 0],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
                <p className="text-xl font-black text-white mt-1">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Traffic: <span className="font-bold text-cyan-300">{liveVehicleData.traffic_density || 'Unknown'}</span>
            {' · '}Congestion: <span className="font-bold text-amber-300">{liveVehicleData.congestion_percentage ?? 0}%</span>
          </div>
        </motion.div>
      )}


      {kpis?.is_demo && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-900/30 border border-amber-500/30 text-amber-200 p-4 rounded-2xl text-sm font-medium flex items-center space-x-3"
        >
          <FaInfoCircle className="text-xl text-amber-400" />
          <span>
            <strong>Demo Mode Active</strong> — No dataset uploaded yet. Charts and KPIs show sample data.
            {' '}<a href="/admin" className="underline text-amber-300 hover:text-white font-semibold">Upload a dataset in Admin Console →</a>
          </span>
        </motion.div>
      )}

      {loading && !kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 glass rounded-2xl skeleton" />
          ))}
        </div>
      ) : kpis ? (
        <>
          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<FaCar />} title="Total Vehicles" value={kpis.total_vehicles?.toLocaleString()} color="text-blue-400" />
            <StatCard icon={<FaTachometerAlt />} title="Avg Speed" value={`${kpis.average_speed} km/h`} subValue={`Max: ${kpis.max_speed} | Min: ${kpis.min_speed}`} color="text-emerald-400" />
            <StatCard icon={<FaChartLine />} title="Traffic Density" value={`${kpis.traffic_density}`} color="text-indigo-400" />
            <StatCard icon={<FaExclamationTriangle />} title="Congestion Index" value={`${kpis.congestion_index}`} color="text-rose-400" />

            <StatCard icon={<FaHeartbeat />} title="Road Health" value={`${kpis.road_health_score}%`} color="text-violet-400" />
            <StatCard icon={<FaGasPump />} title="Fuel Wasted" value={`${kpis.fuel_waste_liters} L`} color="text-amber-400" />
            <StatCard icon={<FaCloudSun />} title="CO2 Emission" value={`${kpis.co2_emission_kg} kg`} color="text-cyan-400" />
            <StatCard icon={<FaExclamationTriangle />} title="Total Accidents" value={kpis.accident_count} color="text-red-500" />
          </div>

          {/* Time Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-3xl p-5 flex justify-between items-center border-l-4 border-rose-500">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Peak Hours</h3>
                <p className="text-3xl font-extrabold text-white mt-1">{kpis.peak_hours}</p>
              </div>
              <FaChartLine className="text-4xl opacity-30 text-rose-400" />
            </div>
            <div className="glass rounded-3xl p-5 flex justify-between items-center border-l-4 border-emerald-500">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Off-Peak Hours</h3>
                <p className="text-3xl font-extrabold text-white mt-1">{kpis.off_peak_hours}</p>
              </div>
              <FaChartLine className="text-4xl opacity-30 text-emerald-400" />
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> 24-Hour Traffic Volume
              </h3>
              {chartsData?.hourly && <Line options={chartOptions} data={chartsData.hourly} />}
            </div>

            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Average Speed by Road Type
              </h3>
              {chartsData?.roadCongestion && <Bar options={chartOptions} data={chartsData.roadCongestion} />}
            </div>

            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span> Speed vs Density Distribution
              </h3>
              {chartsData?.scatterPlot && <Scatter options={chartOptions} data={chartsData.scatterPlot} />}
            </div>

            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Congestion Distribution
              </h3>
              {chartsData?.congestionPie && <Doughnut options={doughnutOptions} data={chartsData.congestionPie} />}
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-3xl p-12 text-center text-slate-300">
          <p>Failed to load dashboard data.</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, subValue, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-3xl p-5 border-l-4 border-l-transparent hover:border-l-primary-500 transition-all duration-300 relative overflow-hidden group shadow-lg"
  >
    <div className={`absolute -right-4 -bottom-4 text-8xl opacity-[0.06] group-hover:opacity-15 transition-opacity ${color}`}>
      {icon}
    </div>
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-lg ${color} shadow-inner`}>
        {icon}
      </div>
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h3>
    </div>
    <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    {subValue && <p className="text-xs text-slate-400 font-medium mt-1">{subValue}</p>}
  </motion.div>
);

export default Dashboard;
