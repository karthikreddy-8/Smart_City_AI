import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import { 
  FaCar, FaTachometerAlt, FaExclamationTriangle, FaHeartbeat, 
  FaGasPump, FaCloudSun, FaBrain, FaChartLine, FaInfoCircle
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
    legend: { labels: { color: '#94a3b8' } }
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
  }
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right', labels: { color: '#94a3b8' } }
  }
};

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [chartsData, setChartsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [globalFilters, setGlobalFilters] = useState({});

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
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
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4
              }
            ]
          },
          roadCongestion: {
            labels: c.road_type?.map(item => item.road_type) || [],
            datasets: [
              {
                label: 'Avg Speed (km/h)',
                data: c.road_type?.map(item => item.avg_speed) || [],
                backgroundColor: '#10b981',
                borderRadius: 4
              }
            ]
          },
          congestionPie: {
            labels: c.congestion_distribution?.map(item => item.level) || [],
            datasets: [
              {
                data: c.congestion_distribution?.map(item => item.count) || [],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderWidth: 0
              }
            ]
          },
          scatterPlot: {
            datasets: [
              {
                label: 'Vehicle Count vs Speed',
                data: c.scatter || [],
                backgroundColor: 'rgba(139, 92, 246, 0.6)',
                borderColor: '#8b5cf6',
                borderWidth: 1,
                pointRadius: 5
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
      
      <LocationManager onLocationSelect={handleLocationSelect} />
      
      {!kpis?.is_demo && (
        <SmartFilters onFilterChange={handleFilterChange} />
      )}

      {kpis?.is_demo && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary-900/40 border border-primary-500/30 text-primary-200 p-4 rounded-2xl text-sm font-medium flex items-center space-x-3"
        >
          <FaInfoCircle className="text-xl text-primary-400" />
          <span>No dataset uploaded yet. Showing <strong>demo analytics</strong>. Upload a dataset in the Admin Console to view real data.</span>
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
                 <h3 className="text-sm font-semibold text-slate-400">Peak Hours</h3>
                 <p className="text-2xl font-bold text-white">{kpis.peak_hours}</p>
               </div>
               <FaChartLine className="text-4xl opacity-20 text-rose-500" />
             </div>
             <div className="glass rounded-3xl p-5 flex justify-between items-center border-l-4 border-emerald-500">
               <div>
                 <h3 className="text-sm font-semibold text-slate-400">Off-Peak Hours</h3>
                 <p className="text-2xl font-bold text-white">{kpis.off_peak_hours}</p>
               </div>
               <FaChartLine className="text-4xl opacity-20 text-emerald-500" />
             </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">24-Hour Traffic Volume</h3>
              {chartsData?.hourly && <Line options={chartOptions} data={chartsData.hourly} />}
            </div>
            
            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Average Speed by Road Type</h3>
              {chartsData?.roadCongestion && <Bar options={chartOptions} data={chartsData.roadCongestion} />}
            </div>

            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Speed vs Density Distribution</h3>
              {chartsData?.scatterPlot && <Scatter options={chartOptions} data={chartsData.scatterPlot} />}
            </div>

            <div className="glass rounded-3xl p-6 h-96">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Congestion Distribution</h3>
              {chartsData?.congestionPie && <Doughnut options={doughnutOptions} data={chartsData.congestionPie} />}
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-3xl p-12 text-center text-slate-400">
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
    className="glass rounded-3xl p-5 border-l-4 border-l-transparent hover:border-l-primary-500 transition-all duration-300 relative overflow-hidden group"
  >
    <div className={`absolute -right-4 -bottom-4 text-8xl opacity-[0.03] group-hover:opacity-10 transition-opacity ${color}`}>
      {icon}
    </div>
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-400">{title}</h3>
    </div>
    <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
    {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
  </motion.div>
);

export default Dashboard;
