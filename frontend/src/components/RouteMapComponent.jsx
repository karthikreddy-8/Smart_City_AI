import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Green Icon for Origin
const originIcon = L.divIcon({
  className: 'custom-origin-icon',
  html: `<div style="background-color: #10b981; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(16,185,129,0.8); flex; align-items: center; justify-center; text-align: center; color: white; font-weight: bold; font-size: 12px; line-height: 18px;">A</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Custom Red Icon for Destination
const destIcon = L.divIcon({
  className: 'custom-dest-icon',
  html: `<div style="background-color: #f43f5e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(244,63,94,0.8); flex; align-items: center; justify-center; text-align: center; color: white; font-weight: bold; font-size: 12px; line-height: 18px;">B</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const RouteMapComponent = ({ routeData }) => {
  const originLat = routeData?.origin_lat || 28.6139;
  const originLng = routeData?.origin_lng || 77.2090;
  const destLat = routeData?.destination_lat || 28.7041;
  const destLng = routeData?.destination_lng || 77.1025;

  const centerPos = [(originLat + destLat) / 2, (originLng + destLng) / 2];

  const polylineCoords = routeData?.route_coordinates || [
    [originLat, originLng],
    [destLat, destLng]
  ];

  const getCongestionColor = (level) => {
    switch (level) {
      case 'High': return '#f43f5e';
      case 'Moderate': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const routeColor = getCongestionColor(routeData?.overall_congestion || 'Low');

  return (
    <div className="w-full h-full min-h-[450px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative z-0">
      <MapContainer
        center={centerPos}
        zoom={12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Origin Marker A */}
        <Marker position={[originLat, originLng]} icon={originIcon}>
          <Popup>
            <div className="p-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">START (POINT A)</span>
              <h4 className="font-bold text-sm text-slate-800 mt-1">{routeData?.origin || 'Current Location'}</h4>
            </div>
          </Popup>
        </Marker>

        {/* Destination Marker B */}
        <Marker position={[destLat, destLng]} icon={destIcon}>
          <Popup>
            <div className="p-1">
              <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-bold">END (POINT B)</span>
              <h4 className="font-bold text-sm text-slate-800 mt-1">{routeData?.destination || 'Destination'}</h4>
            </div>
          </Popup>
        </Marker>

        {/* Route Polyline */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: routeColor,
            weight: 6,
            opacity: 0.85,
            dashArray: routeData?.overall_congestion === 'High' ? '10, 10' : null
          }}
        />

        {/* Glowing Circle at Midpoint */}
        <CircleMarker
          center={centerPos}
          pathOptions={{
            color: routeColor,
            fillColor: routeColor,
            fillOpacity: 0.3,
            weight: 2
          }}
          radius={22}
        >
          <Popup>
            <div className="p-1 text-slate-800">
              <strong className="text-xs block">AI Predicted Corridor</strong>
              <span className="text-[10px] text-slate-500">Congestion: {routeData?.overall_congestion || 'Low'}</span>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
};

export default RouteMapComponent;
