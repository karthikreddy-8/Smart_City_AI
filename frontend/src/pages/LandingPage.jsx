import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FaRoad, 
  FaBrain, 
  FaMapMarkedAlt, 
  FaCogs, 
  FaFileInvoiceDollar, 
  FaArrowRight, 
  FaServer,
  FaReact,
  FaPython,
  FaDatabase
} from 'react-icons/fa';

const LandingPage = () => {
  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans overflow-hidden">
      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-50 relative">
        <div className="flex items-center space-x-2">
          <span className="text-primary-500 text-3xl font-extrabold animate-pulse">❖</span>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-cyan-400 bg-clip-text text-transparent">
            SmartCity AI
          </span>
        </div>
        <div className="space-x-4">
          <Link to="/login" className="px-5 py-2.5 rounded-xl hover:bg-slate-800 text-sm font-semibold transition-all">
            Login
          </Link>
          <Link to="/register" className="px-5 py-2.5 bg-gradient-to-r from-primary-500 to-cyan-400 hover:from-primary-600 hover:to-cyan-500 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 grid lg:grid-cols-2 gap-12 items-center z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-primary-500/10 border border-primary-500/20 text-cyan-400 uppercase tracking-widest">
            AI-Driven Urban Planning
          </span>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mt-6 leading-tight">
            Next-Gen Urban <br />
            <span className="bg-gradient-to-r from-primary-500 to-cyan-400 bg-clip-text text-transparent">
              Traffic Optimization
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
            Harness the power of machine learning, automated cleaning pipelines, and predictive algorithms to solve road congestion and optimize city transit times.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/register" className="px-8 py-4 bg-gradient-to-r from-primary-500 to-cyan-400 hover:from-primary-600 hover:to-cyan-500 rounded-2xl font-bold flex items-center space-x-2 shadow-xl shadow-primary-500/20 group transition-all">
              <span>Initialize System</span>
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="px-8 py-4 bg-slate-900 border border-slate-800 rounded-2xl font-semibold hover:bg-slate-800 transition-colors">
              Explore Features
            </a>
          </div>
        </motion.div>

        {/* Animated Background Graphics */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative flex justify-center lg:justify-end"
        >
          <div className="w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-primary-500 to-cyan-400 opacity-20 blur-[120px] absolute" />
          <div className="relative border border-slate-800 bg-slate-900/60 p-8 rounded-3xl backdrop-blur-xl w-full max-w-md shadow-2xl glass animate-float">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <span className="text-xs font-bold text-slate-400">TRAFFIC SIMULATION CENTER</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>CONGESTION LEVEL</span>
                  <span className="text-rose-400">HIGH</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-rose-500 h-full w-[85%] rounded-full" />
                </div>
              </div>
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>OPTIMIZATION PLAN</span>
                  <span className="text-cyan-400">ACTIVE</span>
                </div>
                <p className="text-xs mt-2 text-slate-300">
                  "Increase Green Light duration by 25s at Crossing B."
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl font-extrabold">Advanced Core Engines</h2>
          <p className="mt-4 text-slate-400">
            SmartCity AI hosts multiple state-of-the-art pipelines to clean records and train machine learning models.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: <FaBrain className="text-cyan-400" />, title: "Predictive Models", desc: "Train XGBoost, Random Forest, and Decision Tree classifiers to forecast road blockages." },
            { icon: <FaCogs className="text-primary-500" />, title: "Automated Cleaner", desc: "Auto-detect duplicate records, compute median imputations, and handle extreme outliers." },
            { icon: <FaMapMarkedAlt className="text-teal-400" />, title: "Hotspot Leaflet Map", desc: "Interactive road markers, coordinate plots, alternative routing, and geographic density filters." },
            { icon: <FaFileInvoiceDollar className="text-violet-400" />, title: "Executive Reports", desc: "Export clean CSV logs, spreadsheet charts, and customized PDF analysis sheets." }
          ].map((feat, idx) => (
            <div key={idx} className="p-6 bg-slate-900/40 border border-slate-850 rounded-2xl hover:border-slate-800 transition-all hover:translate-y-[-4px]">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-2xl mb-6 shadow-inner">
                {feat.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{feat.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-slate-900/20 py-20 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-slate-500 font-bold uppercase tracking-widest text-xs">Built with Enterprise Frameworks</h3>
          <div className="flex flex-wrap justify-center items-center gap-12 mt-10 text-slate-400 text-lg font-bold">
            <span className="flex items-center space-x-2 hover:text-white transition-colors">
              <FaReact className="text-primary-500" />
              <span>React 18</span>
            </span>
            <span className="flex items-center space-x-2 hover:text-white transition-colors">
              <FaPython className="text-yellow-500" />
              <span>FastAPI</span>
            </span>
            <span className="flex items-center space-x-2 hover:text-white transition-colors">
              <FaServer className="text-emerald-400" />
              <span>XGBoost / Scikit-learn</span>
            </span>
            <span className="flex items-center space-x-2 hover:text-white transition-colors">
              <FaDatabase className="text-cyan-400" />
              <span>PostgreSQL</span>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-600 text-sm border-t border-slate-900">
        <p>&copy; 2026 SmartCity AI B.Tech Project. All Rights Reserved.</p>
        <p className="mt-2 text-slate-500">Designed for final year engineering demonstration.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
