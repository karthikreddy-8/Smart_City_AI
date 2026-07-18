import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issues in Webpack/Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapComponent = ({ markers = [], filterLevel = 'All' }) => {
  const defaultPosition = [28.6139, 77.2090]; // Center on Delhi NCR

  const filteredMarkers = markers.filter(m => {
    if (filterLevel === 'All') return true;
    return m.congestion_level === filterLevel;
  });

  const getMarkerColor = (level) => {
    switch (level) {
      case 'High': return '#f43f5e';     // Rose 500
      case 'Moderate': return '#f59e0b'; // Amber 500
      default: return '#10b981';         // Emerald 500
    }
  };

  return (
    <div className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg relative z-0">
      <MapContainer 
        center={defaultPosition} 
        zoom={12} 
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filteredMarkers.map((marker, idx) => (
          <React.Fragment key={idx}>
            {/* Standard Marker */}
            <Marker position={[marker.latitude, marker.longitude]}>
              <Popup>
                <div className="p-1 min-w-[180px] text-slate-800">
                  <h4 className="font-bold text-sm mb-1">{marker.road_name}</h4>
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2">{marker.road_type}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Avg Vehicles:</span>
                      <strong className="text-slate-700">{marker.avg_vehicles}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Speed:</span>
                      <strong className="text-slate-700">{marker.avg_speed} km/h</strong>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Congestion:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                        marker.congestion_level === 'High' ? 'bg-rose-500' :
                        marker.congestion_level === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}>
                        {marker.congestion_level}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Glowing Radius for Congestion Hotspot Visuals */}
            <CircleMarker 
              center={[marker.latitude, marker.longitude]}
              pathOptions={{
                color: getMarkerColor(marker.congestion_level),
                fillColor: getMarkerColor(marker.congestion_level),
                fillOpacity: 0.25,
                weight: 1
              }}
              radius={marker.congestion_level === 'High' ? 30 : marker.congestion_level === 'Moderate' ? 18 : 10}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
