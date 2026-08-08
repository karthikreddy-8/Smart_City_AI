import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Safely configure Leaflet default marker icons inside try-catch block
try {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
} catch (err) {
  console.warn('[WARN] Leaflet default icon override failed:', err);
}

/* ── Camera Icon Factory ─────────────────────────────────────────────────── */
const makeCameraIcon = (bgColor, glowColor, ring = false) => {
  try {
    return L.divIcon({
      className: '',
      html: `
        <div style="
          background:${bgColor};
          width:34px;height:34px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          border:${ring ? '3px solid white' : '2px solid rgba(255,255,255,0.7)'};
          box-shadow:0 0 ${ring ? '14px 4px' : '8px 2px'} ${glowColor};
          position:relative;
        ">
          <svg stroke="#fff" fill="#fff" strokeWidth="0" viewBox="0 0 512 512"
            height="17" width="17" xmlns="http://www.w3.org/2000/svg">
            <path d="M512 144v224c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V144
              c0-26.5 21.5-48 48-48h96l16-32h192l16 32h96c26.5 0 48 21.5 48 48z
              M256 352c61.9 0 112-50.1 112-112s-50.1-112-112-112-112 50.1-112 112
              50.1 112 112 112zm0-176c35.3 0 64 28.7 64 64s-28.7 64-64 64
              -64-28.7-64-64 28.7-64 64-64z"/>
          </svg>
          ${ring ? '<div style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#06b6d4;border-radius:50%;border:2px solid white;"></div>' : ''}
        </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20],
    });
  } catch {
    return new L.Icon.Default();
  }
};

const ICON_ONLINE   = makeCameraIcon('#10b981', 'rgba(16,185,129,0.6)');
const ICON_OFFLINE  = makeCameraIcon('#ef4444', 'rgba(239,68,68,0.5)');
const ICON_SELECTED = makeCameraIcon('#0284c7', 'rgba(2,132,199,0.8)', true);

const UserGpsIcon = (() => {
  try {
    return L.divIcon({
      className: '',
      html: `
        <div style="
          background:#ec4899;width:28px;height:28px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          border:3px solid white;box-shadow:0 0 14px rgba(236,72,153,0.9);
        ">
          <div style="width:9px;height:9px;background:white;border-radius:50%;"></div>
        </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  } catch {
    return new L.Icon.Default();
  }
})();

/* ── Re-centering helper ──────────────────────────────────────────────────── */
function MapController({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        map.flyTo(center, 14, { animate: true, duration: 1.2 });
      } catch (err) {
        console.warn('Map flyTo error:', err);
      }
    }
  }, [center, map]);
  return null;
}

/* ── Error Boundary for Map Component ───────────────────────────────────── */
class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Map rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[300px] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2">
          <span className="text-3xl">🗺️</span>
          <p className="text-sm font-bold text-slate-300">Map temporarily unavailable.</p>
          <p className="text-xs text-slate-500">Interactive map rendering encountered a minor issue, but overall traffic data remains fully accessible.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Map Component ──────────────────────────────────────────────────────── */
const LiveTrafficMapInner = ({
  userLocation   = null,
  userLocationAddress = null,
  cameras        = [],
  selectedCamera = null,
  onSelectCamera = () => {},
}) => {
  const defaultCenter = [17.4486, 78.3908]; // Default fallback center
  const mapCenter = (userLocation && userLocation.lat && userLocation.lng)
    ? [userLocation.lat, userLocation.lng]
    : ((selectedCamera && selectedCamera.latitude && selectedCamera.longitude)
        ? [selectedCamera.latitude, selectedCamera.longitude]
        : ((cameras && cameras.length > 0 && cameras[0].latitude && cameras[0].longitude)
            ? [cameras[0].latitude, cameras[0].longitude]
            : defaultCenter));

  const flyTarget = (userLocation && userLocation.lat && userLocation.lng)
    ? [userLocation.lat, userLocation.lng]
    : ((selectedCamera && selectedCamera.latitude && selectedCamera.longitude)
        ? [selectedCamera.latitude, selectedCamera.longitude]
        : null);

  return (
    <div className="w-full h-full min-h-[360px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {flyTarget && <MapController center={flyTarget} />}

        {/* ── User GPS Marker ─────────────────────────────────────── */}
        {userLocation && userLocation.lat && userLocation.lng && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={UserGpsIcon}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <b style={{ color: '#db2777' }}>📍 Your Real GPS Location</b><br />
                {userLocationAddress && (
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
                    <b>{userLocationAddress.road_name || 'Your Location'}</b><br />
                    <span>{userLocationAddress.area}, {userLocationAddress.city}</span><br />
                    <span>{userLocationAddress.state}, {userLocationAddress.country || 'India'}</span>
                  </div>
                )}
                <span style={{ fontSize: 10, color: '#64748b', marginTop: 2, display: 'block' }}>
                  Lat: {Number(userLocation.lat).toFixed(5)}, Lng: {Number(userLocation.lng).toFixed(5)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Camera Markers ──────────────────────────────────────── */}
        {Array.isArray(cameras) && cameras.map((cam) => {
          if (!cam || !cam.latitude || !cam.longitude) return null;
          const isSelected = selectedCamera && (selectedCamera.id === cam.id || selectedCamera.camera_id === cam.id);
          const isOffline  = (cam.status || '').toUpperCase() === 'OFFLINE';
          const icon = isSelected ? ICON_SELECTED : (isOffline ? ICON_OFFLINE : ICON_ONLINE);

          return (
            <Marker
              key={cam.id || cam.camera_id || Math.random()}
              position={[cam.latitude, cam.longitude]}
              icon={icon}
              eventHandlers={{ click: () => !isOffline && onSelectCamera(cam) }}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{
                    display: 'inline-block',
                    background: isOffline ? '#fee2e2' : (isSelected ? '#dbeafe' : '#dcfce7'),
                    color: isOffline ? '#991b1b' : (isSelected ? '#1e40af' : '#166534'),
                    borderRadius: 4, fontSize: 10, padding: '2px 6px',
                    fontWeight: 700, marginBottom: 4,
                  }}>
                    {isOffline ? '🔴 OFFLINE' : (isSelected ? '🔵 CONNECTED' : '🟢 ONLINE')}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 2 }}>{cam.name || cam.camera_name}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 1 }}>
                    📍 {cam.area || cam.road_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 1 }}>
                    🏙️ {cam.city}, {cam.state}
                  </div>
                  {cam.distance_km > 0 && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
                      📏 {cam.distance_km} km away
                    </div>
                  )}
                  {!isOffline && (
                    <button
                      onClick={() => onSelectCamera(cam)}
                      style={{
                        width: '100%', background: isSelected ? '#1d4ed8' : '#0f172a',
                        color: 'white', fontSize: 11, fontWeight: 700,
                        padding: '5px 8px', borderRadius: 6, cursor: 'pointer',
                        border: 'none', marginTop: 2,
                      }}
                    >
                      {isSelected ? '✅ Connected' : '🔗 Connect Live Feed'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const LiveTrafficMap = (props) => (
  <MapErrorBoundary>
    <LiveTrafficMapInner {...props} />
  </MapErrorBoundary>
);

export default LiveTrafficMap;
