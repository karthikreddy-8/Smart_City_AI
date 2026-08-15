import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
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

const ICON_ONLINE = makeCameraIcon('#10b981', 'rgba(16,185,129,0.6)');
const ICON_OFFLINE = makeCameraIcon('#ef4444', 'rgba(239,68,68,0.5)');
const ICON_SELECTED = makeCameraIcon('#0284c7', 'rgba(2,132,199,0.8)', true);

const SelectedLocationPinIcon = (() => {
  try {
    return L.divIcon({
      className: '',
      html: `
        <div style="
          background:#0284c7;width:34px;height:34px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          border:3px solid white;box-shadow:0 0 18px rgba(2,132,199,0.9);
          color:white;font-size:18px;font-weight:bold;
        ">📍</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20],
    });
  } catch {
    return new L.Icon.Default();
  }
})();

/* ── Re-centering & Mobile Resizing helper ─────────────────────────────────── */
function MapController({ center, zoom = 14 }) {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (err) {
        console.warn('Map invalidateSize notice:', err);
      }
    }, 200);

    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        map.flyTo(center, zoom, { animate: true, duration: 1.2 });
      } catch (err) {
        console.warn('Map flyTo error:', err);
      }
    }
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
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
        <div className="w-full h-full min-h-[360px] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2">
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
  userLocation = null,
  userLocationAddress = null,
  selectedLocation = null,
  cameras = [],
  selectedCamera = null,
  onSelectCamera = () => { },
  trafficSegments = [],
  onRoadClick = () => { },
}) => {
  const defaultCenter = [20.5937, 78.9629]; // Neutral India-wide fallback
  
  const targetLat = selectedLocation?.latitude || selectedLocation?.lat || userLocation?.lat;
  const targetLng = selectedLocation?.longitude || selectedLocation?.lng || userLocation?.lng;

  const mapCenter = (targetLat && targetLng)
    ? [targetLat, targetLng]
    : ((selectedCamera && selectedCamera.latitude && selectedCamera.longitude)
      ? [selectedCamera.latitude, selectedCamera.longitude]
      : ((cameras && cameras.length > 0 && cameras[0].latitude && cameras[0].longitude)
        ? [cameras[0].latitude, cameras[0].longitude]
        : defaultCenter));

  const flyTarget = (targetLat && targetLng)
    ? [targetLat, targetLng]
    : ((selectedCamera && selectedCamera.latitude && selectedCamera.longitude)
      ? [selectedCamera.latitude, selectedCamera.longitude]
      : null);

  // Generate synthetic nearby roads around target location for visual highlighting
  const nearbyRoads = React.useMemo(() => {
    if (!targetLat || !targetLng) return [];
    return [
      {
        name: selectedLocation?.address?.road_name || 'Primary Selected Road Corridor',
        type: 'Primary Arterial',
        points: [
          [targetLat - 0.006, targetLng - 0.008],
          [targetLat, targetLng],
          [targetLat + 0.006, targetLng + 0.008]
        ],
        level: 'HIGH',
        congestion: 78,
        speed: 24,
      },
      {
        name: 'Connecting Inner Ring Bypass',
        type: 'Secondary Road',
        points: [
          [targetLat + 0.004, targetLng - 0.007],
          [targetLat, targetLng],
          [targetLat - 0.004, targetLng + 0.007]
        ],
        level: 'MODERATE',
        congestion: 42,
        speed: 38,
      }
    ];
  }, [targetLat, targetLng, selectedLocation]);

  return (
    <div className="w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {flyTarget && <MapController center={flyTarget} zoom={14} />}

        {/* ── Highlighted Selected Road & Nearby Roads ─────────────────────── */}
        {nearbyRoads.map((rd, i) => (
          <Polyline
            key={`nearby-road-${i}`}
            positions={rd.points}
            pathOptions={{
              color: rd.level === 'HIGH' ? '#f97316' : '#38bdf8',
              weight: i === 0 ? 8 : 5,
              opacity: 0.85,
              dashArray: i === 1 ? '6, 6' : undefined
            }}
            eventHandlers={{ click: () => onRoadClick(rd) }}
          >
            <Popup>
              <div style={{ minWidth: 180, color: '#0f172a' }}>
                <b style={{ color: '#0284c7' }}>🛣️ {rd.name}</b>
                <div style={{ fontSize: 11, marginTop: 4 }}>Type: <b>{rd.type}</b></div>
                <div style={{ fontSize: 11 }}>Traffic Density: <b>{rd.congestion}%</b></div>
                <div style={{ fontSize: 11 }}>Current Speed: <b>{rd.speed} km/h</b></div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Click road for full details</div>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* ── Live traffic road segments from location-based provider ───── */}
        {Array.isArray(trafficSegments) && trafficSegments.map((seg, idx) => {
          const points = Array.isArray(seg?.points) ? seg.points : [];
          if (points.length < 2) return null;
          const level = (seg.traffic_level || '').toUpperCase();
          const color = level === 'VERY HIGH' || level === 'BLOCKED' ? '#ef4444'
            : level === 'HIGH' ? '#f97316'
              : level === 'MODERATE' ? '#f59e0b'
                : '#22c55e';
          return (
            <Polyline
              key={`traffic-segment-${idx}`}
              positions={points}
              pathOptions={{ color, weight: 7, opacity: 0.9 }}
              eventHandlers={{ click: () => onRoadClick(seg) }}
            >
              <Popup>
                <div style={{ minWidth: 170, color: '#0f172a' }}>
                  <b>Live Traffic Segment</b>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Traffic Level: {seg.traffic_level || 'UNKNOWN'}</div>
                  <div style={{ fontSize: 11 }}>Congestion %: {seg.congestion_pct ?? 0}%</div>
                  <div style={{ fontSize: 11 }}>Current Speed: {seg.current_speed_kmh ?? 0} km/h</div>
                  <div style={{ fontSize: 11 }}>Confidence: {seg.confidence_pct ?? 0}%</div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* ── Selected Location Pin Marker ──────────────────────────────────── */}
        {targetLat && targetLng && (
          <Marker position={[targetLat, targetLng]} icon={SelectedLocationPinIcon}>
            <Popup>
              <div style={{ minWidth: 180, color: '#0f172a' }}>
                <b style={{ color: '#0284c7', fontSize: 13 }}>📍 Selected Location</b><br />
                {selectedLocation?.name && <div style={{ fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>{selectedLocation.name}</div>}
                {userLocationAddress && (
                  <div style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>
                    <span>{userLocationAddress.road_name || 'Road'}, {userLocationAddress.area}</span><br />
                    <span>{userLocationAddress.city}, {userLocationAddress.state}</span>
                  </div>
                )}
                <span style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Lat: {Number(targetLat).toFixed(5)}, Lng: {Number(targetLng).toFixed(5)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── Traffic Camera Markers ──────────────────────────────────────── */}
        {Array.isArray(cameras) && cameras.map((cam) => {
          if (!cam || !cam.latitude || !cam.longitude) return null;
          const isSelected = selectedCamera && (selectedCamera.id === cam.id || selectedCamera.camera_id === cam.id);
          const isOffline = (cam.status || '').toUpperCase() === 'OFFLINE';
          const icon = isSelected ? ICON_SELECTED : (isOffline ? ICON_OFFLINE : ICON_ONLINE);

          return (
            <Marker
              key={cam.id || cam.camera_id || Math.random()}
              position={[cam.latitude, cam.longitude]}
              icon={icon}
              eventHandlers={{ click: () => !isOffline && onSelectCamera(cam) }}
            >
              <Popup>
                <div style={{ minWidth: 180, color: '#0f172a' }}>
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
