import React, { useState, useEffect, useRef } from 'react';
import { liveTrafficAPI } from '../services/api';
import LiveTrafficMap from '../components/LiveTrafficMap';
import {
  FaVideo, FaCrosshairs, FaCar, FaBus, FaTruck, FaMotorcycle,
  FaBicycle, FaAmbulance, FaTachometerAlt, FaClock,
  FaExclamationTriangle, FaCloudSun, FaChartLine, FaRoute,
  FaShieldAlt, FaLayerGroup, FaSync, FaChevronDown, FaChevronUp,
  FaMapMarkerAlt, FaWifi, FaCamera, FaSpinner, FaInfoCircle,
  FaCarSide, FaSignal, FaThermometerHalf, FaEye, FaExclamationCircle,
  FaFileUpload, FaDesktop, FaFileVideo, FaFileImage, FaStop, FaPlay,
} from 'react-icons/fa';
import { MdLocalPolice, MdFireTruck } from 'react-icons/md';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
);

/* ── Error Boundary ──────────────────────────────────────────────────────── */
class LiveTrafficErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Live Traffic Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-4xl mx-auto my-12 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-700 flex items-center justify-center mx-auto text-rose-400 text-3xl">
            <FaExclamationTriangle />
          </div>
          <h2 className="text-xl font-black text-white">Live Traffic Unavailable</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            The Live Traffic interface encountered a minor loading issue. The rest of the SmartCity AI system remains fully operational.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-lg transition-all"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Connection States ───────────────────────────────────────────────────── */
const STATE = {
  IDLE:       'idle',
  CONNECTING: 'connecting',
  LIVE:       'live',
  ERROR:      'error',
};

/* ── Style Helpers ────────────────────────────────────────────────────────── */
const levelColorClass = (lvl) => {
  switch ((lvl || '').toUpperCase()) {
    case 'LOW':
    case 'FREE FLOW':
      return 'text-emerald-400 bg-emerald-950/80 border-emerald-700';
    case 'MODERATE':
    case 'MEDIUM':
      return 'text-amber-400 bg-amber-950/80 border-amber-700';
    case 'HIGH':
    case 'HEAVY':
      return 'text-orange-400 bg-orange-950/80 border-orange-700';
    case 'VERY HIGH':
    case 'BLOCKED':
      return 'text-rose-400 bg-rose-950/80 border-rose-700';
    default:
      return 'text-slate-400 bg-slate-900 border-slate-700';
  }
};

const levelIcon = (lvl) => {
  switch ((lvl || '').toUpperCase()) {
    case 'LOW':
    case 'FREE FLOW':
      return '🟢';
    case 'MODERATE':
    case 'MEDIUM':
      return '🟡';
    case 'HIGH':
    case 'HEAVY':
      return '🟠';
    case 'VERY HIGH':
    case 'BLOCKED':
      return '🔴';
    default:
      return '⚪';
  }
};

/* ══════════════════════════════════════════════════════════════════════════ */
const LiveTrafficInner = () => {
  /* ── State ─────────────────────────────────────────────────────────────── */
  const [connState,           setConnState]           = useState(STATE.IDLE);
  const [sourceMode,          setSourceMode]          = useState('area');
  const [cameras,             setCameras]             = useState([]);
  const [selectedCamera,      setSelectedCamera]      = useState(null);
  const [detectionData,       setDetectionData]       = useState(null);
  const [areaAnalysis,        setAreaAnalysis]        = useState(null);
  const [historicalData,      setHistoricalData]      = useState([]);
  const [predictions,         setPredictions]         = useState([]);

  // User GPS & Address
  const [userLocation,        setUserLocation]        = useState(null);
  const [userLocationAddress, setUserLocationAddress] = useState(null);
  const [gpsDenied,           setGpsDenied]           = useState(false);
  const [gpsLoading,          setGpsLoading]          = useState(false);
  const [detectionStep,       setDetectionStep]       = useState(0);

  // Collapsible drawers
  const [showMap,             setShowMap]             = useState(false);
  const [showOtherOptions,    setShowOtherOptions]    = useState(false);
  const [showAdvanced,        setShowAdvanced]        = useState(false);

  const [historyTab,          setHistoryTab]          = useState('yesterday');
  const [autoRefresh,         setAutoRefresh]         = useState(true);
  const [errorMsg,            setErrorMsg]            = useState('');
  const [camLoading,          setCamLoading]          = useState(false);

  // Custom Input File & Video states
  const [uploadedVideoUrl,    setUploadedVideoUrl]    = useState(null);
  const [uploadedImageUrl,    setUploadedImageUrl]    = useState(null);
  const [uploadedFileName,    setUploadedFileName]    = useState('');
  const [webcamActive,        setWebcamActive]        = useState(false);

  // Refs
  const refreshInterval = useRef(null);
  const webcamStreamRef = useRef(null);
  const webcamVideoRef  = useRef(null);
  const uploadedVideoRef= useRef(null);
  const canvasRef       = useRef(null);

  /* ── Load initial non-blocking data safely on mount ─────────────────────── */
  useEffect(() => {
    loadCameras();
    fetchPredictions();
    fetchHistorical();
  }, []);

  /* ── Auto-refresh while LIVE for Area Analysis ──────────────────────────── */
  useEffect(() => {
    clearInterval(refreshInterval.current);
    if (autoRefresh && userLocation && sourceMode === 'area' && connState === STATE.LIVE) {
      refreshInterval.current = setInterval(() => {
        runAreaTrafficAnalysis(userLocation.lat, userLocation.lng, userLocation.accuracy, true);
      }, 12000);
    }
    return () => clearInterval(refreshInterval.current);
  }, [autoRefresh, userLocation, sourceMode, connState]);

  /* ── API Calls with Defensive Error Handling ────────────────────────────── */
  const loadCameras = async (lat = null, lng = null) => {
    setCamLoading(true);
    try {
      const res = await liveTrafficAPI.getCameras(lat, lng);
      setCameras(res?.data || []);
    } catch (e) {
      console.warn('[INFO] Camera lookup notice:', e?.message || e);
      setCameras([]);
    } finally {
      setCamLoading(false);
    }
  };

  const runAreaTrafficAnalysis = async (lat, lng, accuracy = 15.0, silent = false) => {
    if (!silent) setConnState(STATE.CONNECTING);
    try {
      const res = await liveTrafficAPI.getAreaAnalysis(lat, lng, accuracy);
      if (res?.data) {
        setAreaAnalysis(res.data);
        if (Array.isArray(res.data.cameras_coverage)) {
          setCameras(res.data.cameras_coverage);
          if (res.data.cameras_coverage.length > 0) {
            setSelectedCamera(res.data.cameras_coverage[0]);
          }
        }
      }
      setConnState(STATE.LIVE);
    } catch (e) {
      console.warn('[INFO] Area traffic analysis error:', e?.message || e);
      if (!silent) {
        setErrorMsg('AI vehicle detection is currently unavailable.');
        setConnState(STATE.ERROR);
      }
    }
  };

  const runCameraDetection = async (cam, silent = false) => {
    if (!cam) return;
    if (!silent) setConnState(STATE.CONNECTING);
    setErrorMsg('');
    try {
      const res = await liveTrafficAPI.detect({
        camera_id: cam.id || cam.camera_id,
        latitude:  cam.latitude || 0,
        longitude: cam.longitude || 0,
        source_type: 'camera',
      });
      setDetectionData(res?.data || null);
      setConnState(STATE.LIVE);
    } catch (e) {
      console.error('Detection error:', e);
      if (!silent) {
        setErrorMsg('Failed to connect to camera feed.');
        setConnState(STATE.ERROR);
      }
    }
  };

  const runFrameDetection = async (frameBase64, sourceType = 'device', silent = true) => {
    if (!silent) setConnState(STATE.CONNECTING);
    try {
      const res = await liveTrafficAPI.detect({
        frame_base64: frameBase64,
        source_type: sourceType,
        latitude: userLocation?.lat || 0,
        longitude: userLocation?.lng || 0,
      });
      setDetectionData(res?.data || null);
      setConnState(STATE.LIVE);
    } catch (e) {
      console.error('Frame detection error:', e);
      if (!silent) setConnState(STATE.ERROR);
    }
  };

  const fetchHistorical = async (cameraId = null) => {
    try {
      const res = await liveTrafficAPI.getHistorical('24h', cameraId);
      setHistoricalData(res?.data || []);
    } catch (e) { console.warn('Historical fetch notice:', e); setHistoricalData([]); }
  };

  const fetchPredictions = async () => {
    try {
      const res = await liveTrafficAPI.getPrediction();
      setPredictions(res?.data || []);
    } catch (e) { console.warn('Predictions fetch notice:', e); setPredictions([]); }
  };

  /* ── Detect My Area Flow (Steps 1, 2, 3, 4) ────────────────────────────── */
  const handleDetectMyArea = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    stopCustomInputSources();
    setSourceMode('area');
    setGpsLoading(true);
    setGpsDenied(false);
    setErrorMsg('');
    setDetectionStep(1); // Step 1: "Detecting your location..."

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 15);
        setUserLocation({ lat, lng, accuracy });

        // Step 2: "Finding traffic cameras in your area..."
        setDetectionStep(2);
        try {
          const geoRes = await liveTrafficAPI.reverseGeocode(lat, lng);
          if (geoRes?.data) {
            setUserLocationAddress({ ...geoRes.data, accuracy_meters: accuracy });
          }
        } catch (e) {
          console.warn('Reverse geocode notice:', e);
          setUserLocationAddress({
            road_name: 'Current Corridor',
            area: 'Local Area',
            city: 'Local City',
            state: 'State',
            country: 'India',
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lng.toFixed(5)),
            accuracy_meters: accuracy,
          });
        }

        // Step 3: "Starting AI traffic analysis..."
        setDetectionStep(3);
        await runAreaTrafficAnalysis(lat, lng, accuracy);

        // Step 4: "Analyzing live traffic..."
        setDetectionStep(4);
        setTimeout(() => {
          setDetectionStep(5); // Complete
          setGpsLoading(false);
        }, 500);
      },
      (err) => {
        console.warn('GPS notice:', err);
        setGpsLoading(false);
        setGpsDenied(true);
        setDetectionStep(0);
        setErrorMsg('Location permission was not provided.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleStartLiveTraffic = async () => {
    if (selectedCamera) {
      await runCameraDetection(selectedCamera);
    } else if (userLocation) {
      await runAreaTrafficAnalysis(userLocation.lat, userLocation.lng, userLocation.accuracy);
    } else {
      handleDetectMyArea();
    }
  };

  /* ── Custom Input Handlers ──────────────────────────────────────────────── */
  const handleStartDeviceCamera = async () => {
    stopCustomInputSources();
    setErrorMsg('');
    setSourceMode('device');
    setConnState(STATE.CONNECTING);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
      });
      webcamStreamRef.current = stream;

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }

      setWebcamActive(true);
      setConnState(STATE.LIVE);

      clearInterval(refreshInterval.current);
      refreshInterval.current = setInterval(() => {
        captureFrameAndProcess('device');
      }, 1000);
    } catch (err) {
      console.warn('Device camera notice:', err);
      setConnState(STATE.ERROR);
      setErrorMsg('Device camera permission denied or unavailable.');
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCustomInputSources();
    setSourceMode('video');
    setUploadedFileName(file.name);
    setConnState(STATE.CONNECTING);

    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);

    setTimeout(() => {
      if (uploadedVideoRef.current) {
        uploadedVideoRef.current.play().catch(console.warn);
      }
      setConnState(STATE.LIVE);

      clearInterval(refreshInterval.current);
      refreshInterval.current = setInterval(() => {
        captureFrameAndProcess('video');
      }, 1000);
    }, 500);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCustomInputSources();
    setSourceMode('image');
    setUploadedFileName(file.name);
    setConnState(STATE.CONNECTING);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target.result;
      setUploadedImageUrl(base64Data);
      await runFrameDetection(base64Data, 'image', false);
    };
    reader.readAsDataURL(file);
  };

  const captureFrameAndProcess = (type) => {
    let videoEl = null;
    if (type === 'device') videoEl = webcamVideoRef.current;
    if (type === 'video')  videoEl = uploadedVideoRef.current;

    if (!videoEl || videoEl.paused || videoEl.ended || videoEl.readyState < 2) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const frameBase64 = canvas.toDataURL('image/jpeg', 0.8);
    runFrameDetection(frameBase64, type, true);
  };

  const stopCustomInputSources = () => {
    clearInterval(refreshInterval.current);
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
      setUploadedVideoUrl(null);
    }
    setWebcamActive(false);
    setUploadedImageUrl(null);
    setUploadedFileName('');
  };

  /* ── Derived Metrics ─────────────────────────────────────────────────────── */
  const vCounts = areaAnalysis?.vehicle_breakdown || detectionData?.vehicle_counts || {};
  const safeCameras = Array.isArray(cameras) ? cameras : [];
  const activeCamsCount = areaAnalysis?.active_cameras_count || safeCameras.filter(c => (c?.status || '').toUpperCase() in { ONLINE:1, ACTIVE:1 }).length;
  const offlineCamsCount = areaAnalysis?.offline_cameras_count || safeCameras.filter(c => (c?.status || '').toUpperCase() === 'OFFLINE').length;

  /* ── Chart configuration ─────────────────────────────────────────────────── */
  const chartLabels = Array.isArray(historicalData) ? historicalData.map(d => d.time_label) : [];
  const compDataset = Array.isArray(historicalData) ? (
    historyTab === 'yesterday'
      ? historicalData.map(d => d.yesterday_count)
      : historyTab === 'last_week'
        ? historicalData.map(d => d.last_week_count)
        : historicalData.map(d => d.last_month_count)
  ) : [];

  const lineData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Today',
        data: Array.isArray(historicalData) ? historicalData.map(d => d.today_count) : [],
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2,132,199,0.12)',
        fill: true, tension: 0.4, borderWidth: 3,
      },
      {
        label: historyTab === 'yesterday' ? 'Yesterday' : historyTab === 'last_week' ? 'Last Week' : 'Last Month',
        data: compDataset,
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.4, borderWidth: 2,
      },
    ],
  };

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51,65,85,0.3)' } },
      y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51,65,85,0.3)' } },
    },
  };

  /* ══════════════════════════════════════════════════════════════════════════
      RENDER (SECTIONS 1 TO 9 WITH SECTION 10 INITIAL STATE)
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      <canvas ref={canvasRef} className="hidden" />
      <video ref={webcamVideoRef} className="hidden" playsInline muted />
      {uploadedVideoUrl && (
        <video ref={uploadedVideoRef} src={uploadedVideoUrl} className="hidden" playsInline muted loop />
      )}

      {/* ── SECTION 1: REAL-TIME AREA TRAFFIC HEADER & PRIMARY BUTTONS ─────── */}
      <div className="bg-slate-900/90 p-6 sm:p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-xl shadow-sky-500/20">
              <FaMapMarkerAlt className="text-2xl animate-bounce" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
                REAL-TIME AREA TRAFFIC
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
                Monitor traffic conditions in your area.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDetectMyArea}
              disabled={gpsLoading}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {gpsLoading ? <FaSpinner className="animate-spin text-base" /> : <FaCrosshairs className="text-base" />}
              <span>{gpsLoading ? 'Detecting Location...' : '📍 Detect My Area'}</span>
            </button>

            <button
              onClick={handleStartLiveTraffic}
              className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <FaWifi className="text-emerald-400" />
              <span>Start Live Traffic</span>
            </button>
          </div>
        </div>

        {/* STEP PROGRESS INDICATORS */}
        {gpsLoading && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-sky-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-extrabold text-sky-400">
              <span>
                {detectionStep === 1 && '📍 Step 1/4: Detecting your location...'}
                {detectionStep === 2 && '🔍 Step 2/4: Finding traffic cameras in your area...'}
                {detectionStep === 3 && '⚡ Step 3/4: Starting AI traffic analysis...'}
                {detectionStep === 4 && '🤖 Step 4/4: Analyzing live traffic...'}
              </span>
              <span>{detectionStep * 25}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${detectionStep * 25}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-600 flex items-center justify-between gap-3 text-rose-200 shadow-xl">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className="text-rose-400 text-xl shrink-0" />
            <p className="text-xs sm:text-sm font-bold">{errorMsg}</p>
          </div>
          <button
            onClick={handleDetectMyArea}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition-all shadow cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── SECTION 2: 📍 YOUR AREA CARD (Section 10 Initial State) ────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaMapMarkerAlt className="text-sky-400 text-lg" />
            <h2 className="text-xs sm:text-sm font-black text-sky-300 uppercase tracking-wider">LOCATION</h2>
          </div>
          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
            {userLocationAddress ? `Accuracy: ${userLocationAddress.accuracy_meters || 15}m` : 'GPS Optional'}
          </span>
        </div>

        {userLocationAddress ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">Area</span>
              <strong className="text-white text-xs sm:text-sm font-extrabold truncate block">{userLocationAddress.area || 'Local Area'}</strong>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">City</span>
              <strong className="text-sky-300 text-xs sm:text-sm font-extrabold truncate block">{userLocationAddress.city || 'Local City'}</strong>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">State</span>
              <strong className="text-white text-xs sm:text-sm font-extrabold truncate block">{userLocationAddress.state || 'State'}</strong>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">Country</span>
              <strong className="text-emerald-400 text-xs sm:text-sm font-extrabold truncate block">{userLocationAddress.country || 'India'}</strong>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-between">
            <span>Location not detected yet. Click "Detect My Area" to find local camera coverage.</span>
            <button onClick={handleDetectMyArea} className="text-sky-400 hover:underline font-extrabold text-xs">
              Detect Now
            </button>
          </div>
        )}
      </div>

      {/* ── SECTION 3: 🚦 AREA TRAFFIC STATUS CARD ────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Live Assessment</span>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>🚦 TRAFFIC STATUS</span>
              {areaAnalysis && <span className="text-slate-400 text-sm font-normal">· {areaAnalysis.area_name}, {areaAnalysis.city}</span>}
            </h2>
          </div>
          {areaAnalysis ? (
            <div className={`px-4 py-2 rounded-2xl border text-sm font-black flex items-center gap-2 ${levelColorClass(areaAnalysis.overall_traffic_level)}`}>
              <span>{levelIcon(areaAnalysis.overall_traffic_level)}</span>
              <span>{areaAnalysis.overall_traffic_level} TRAFFIC</span>
            </div>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-slate-500 border border-slate-800 text-xs font-bold">
              Waiting for live traffic data
            </span>
          )}
        </div>

        {areaAnalysis ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Est. Vehicles</span>
              <p className="text-2xl font-black text-white">{areaAnalysis.estimated_vehicles_in_area?.toLocaleString() || 0}</p>
              <span className="text-[9px] text-slate-500 block">Area-wide estimate</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Density</span>
              <p className="text-2xl font-black text-cyan-400">{areaAnalysis.traffic_density_pct || 0}%</p>
              <span className="text-[9px] text-slate-500 block">Road capacity ratio</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Congestion</span>
              <p className="text-2xl font-black text-amber-400">{areaAnalysis.congestion_pct || 0}%</p>
              <span className="text-[9px] text-slate-500 block">Current delay index</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Avg Speed</span>
              <p className="text-2xl font-black text-emerald-400">{areaAnalysis.average_speed_kmh || 0} <span className="text-xs font-bold">km/h</span></p>
              <span className="text-[9px] text-slate-500 block">Area flow speed</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Waiting Time</span>
              <p className="text-2xl font-black text-orange-400">{areaAnalysis.estimated_waiting_time_mins || 0} <span className="text-xs font-bold">mins</span></p>
              <span className="text-[9px] text-slate-500 block">Estimated delay</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Active Cameras</span>
              <p className="text-2xl font-black text-sky-400">{activeCamsCount}</p>
              <span className="text-[9px] text-slate-500 block">{offlineCamsCount} offline</span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs font-bold border border-slate-800 rounded-2xl bg-slate-950/60">
            Waiting for live traffic data. Click "Detect My Area" or "Start Live Traffic".
          </div>
        )}
      </div>

      {/* ── SECTION 4: 🛣️ TRAFFIC BY ROAD ───────────────────────────────── */}
      {areaAnalysis?.traffic_by_road && areaAnalysis.traffic_by_road.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <FaRoute className="text-sky-400" /> 🛣️ TRAFFIC BY ROAD
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Road Segments in {areaAnalysis.area_name}</span>
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

      {/* ── SECTION 5: 🚗 VEHICLE BREAKDOWN / DETECTION ───────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <FaCar className="text-sky-400" /> VEHICLE DETECTION
          </h2>
          <span className="text-xs font-bold text-sky-400 bg-sky-950 px-3 py-1 rounded-full border border-sky-800">
            Total Detected: {vCounts?.total || 0}
          </span>
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

      {/* ── SECTION 6: 📹 LIVE CAMERA COVERAGE (Simple Summary) ───────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <FaCamera className="text-sky-400" /> 📹 LIVE CAMERA COVERAGE
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
              Active: {activeCamsCount}
            </span>
            <span className="px-3 py-1 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 text-xs font-bold">
              Offline: {offlineCamsCount}
            </span>
          </div>
        </div>

        {safeCameras.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs font-bold border border-slate-800 rounded-2xl bg-slate-950/60">
            Live traffic camera coverage is not available in your area.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {safeCameras.map((cam) => {
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

      {/* ── SECTION 7: 🗺️ VIEW TRAFFIC MAP ──────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <FaMapMarkerAlt className="text-cyan-400" /> TRAFFIC MAP
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {userLocation ? 'Available after location detection.' : 'Available after location detection.'}
            </p>
          </div>
          <button
            onClick={() => setShowMap(v => !v)}
            className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <span>{showMap ? 'Hide Map' : 'View Traffic Map'}</span>
            {showMap ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        {showMap && (
          <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-slate-800 transition-all duration-300">
            <LiveTrafficMap
              userLocation={userLocation}
              userLocationAddress={userLocationAddress}
              cameras={safeCameras}
              selectedCamera={selectedCamera}
              onSelectCamera={(cam) => setSelectedCamera(cam)}
              densityLevel={areaAnalysis?.overall_traffic_level || 'LOW'}
            />
          </div>
        )}
      </div>

      {/* ── SECTION 8: OTHER OPTIONS ▼ (Collapsible Accordion) ─────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <button
          onClick={() => setShowOtherOptions(v => !v)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FaFileUpload className="text-cyan-400 text-lg" />
            <h2 className="text-base sm:text-lg font-black text-white">OTHER DETECTION OPTIONS</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>{showOtherOptions ? 'Hide Options' : 'Expand Options'}</span>
            {showOtherOptions ? <FaChevronUp /> : <FaChevronDown />}
          </div>
        </button>

        {showOtherOptions && (
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <p className="text-xs text-slate-400">
              If area-wide camera feeds are unavailable, you can use local device detection or custom file inputs:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Device Webcam */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-extrabold">
                  <FaDesktop /> Use My Device Camera
                </div>
                <p className="text-[10px] text-slate-400">Local camera view — area-wide coverage unavailable.</p>
                <button
                  onClick={handleStartDeviceCamera}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FaCamera /> Start Local Camera
                </button>
              </div>

              {/* Upload Video */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 text-sm font-extrabold">
                  <FaFileVideo /> Upload Video
                </div>
                <p className="text-[10px] text-slate-400">Process recorded MP4 or WEBM traffic video frames.</p>
                <label className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center block">
                  <FaFileUpload /> Upload Video File
                  <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                </label>
              </div>

              {/* Upload Image */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-extrabold">
                  <FaFileImage /> Upload Image
                </div>
                <p className="text-[10px] text-slate-400">Analyze traffic density in JPG or PNG photos.</p>
                <label className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center block">
                  <FaFileUpload /> Upload Image File
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Custom Input Viewport */}
            {sourceMode !== 'area' && connState === STATE.LIVE && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">Local Camera / File Feed Active</span>
                  <button onClick={stopCustomInputSources} className="text-rose-400 text-xs font-bold hover:underline cursor-pointer">Stop Feed</button>
                </div>
                {detectionData?.annotated_frame_base64 && (
                  <img src={detectionData.annotated_frame_base64} alt="Local Feed Detection" className="w-full max-h-[380px] object-contain rounded-xl" />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION 9: ADVANCED TRAFFIC ANALYTICS ▼ (Collapsible Accordion) ─ */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FaChartLine className="text-sky-400 text-lg" />
            <h2 className="text-base sm:text-lg font-black text-white">ADVANCED TRAFFIC ANALYTICS</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>{showAdvanced ? 'Hide Advanced' : 'Expand Advanced'}</span>
            {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
          </div>
        </button>

        {showAdvanced && (
          <div className="pt-4 border-t border-slate-800 space-y-6">
            {/* Safety & Obstruction Telemetry */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FaShieldAlt className="text-rose-400" /> Safety & Obstruction Telemetry
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Accident Status</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${detectionData?.accident_status === 'Possible Accident Detected' ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                    {detectionData?.accident_status || 'No Accident'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Road Blockage</span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-900 text-slate-400 border border-slate-800">
                    {detectionData?.road_blockage_status || 'Road Open'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Emergency Vehicles</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${detectionData?.emergency_vehicle_detected ? 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                    {detectionData?.emergency_vehicle_detected ? 'Detected' : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Historical Traffic Chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Historical Comparison</h3>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {['yesterday', 'last_week', 'last_month'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${historyTab === tab ? 'bg-sky-500 text-white' : 'text-slate-400'}`}
                    >
                      {tab === 'yesterday' ? 'Yesterday' : tab === 'last_week' ? 'Last Week' : 'Last Month'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[220px] w-full">
                <Line data={lineData} options={chartOpts} />
              </div>
            </div>

            {/* AI Peak Hour Predictions */}
            {Array.isArray(predictions) && predictions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">AI Peak Hour Forecast</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {predictions.map((p, i) => (
                    <div key={i} className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>{p.horizon}</span>
                        <span className="text-cyan-400">{p.predicted_density} · {p.predicted_congestion_pct}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{p.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LiveTrafficPage = () => (
  <LiveTrafficErrorBoundary>
    <LiveTrafficInner />
  </LiveTrafficErrorBoundary>
);

export default LiveTrafficPage;
