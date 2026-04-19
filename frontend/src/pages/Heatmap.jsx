import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES = ['visualization'];
const MAP_CENTER = { lat: 32.7157, lng: -117.1611 };

// Tech-noir dark mode map styles
const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#0f172a' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] }
];

const Heatmap = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyD4aUoax3vID5wTcGyH1OLzyCebwclWsQ4',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [heatmapData, setHeatmapData] = useState([]);

  // Generate 50 mock data points around San Diego
  useEffect(() => {
    if (!isLoaded || !window.google) return;

    const data = [];
    for (let i = 0; i < 50; i++) {
      // Small random offsets around San Diego
      const latOffset = (Math.random() - 0.5) * 0.15;
      const lngOffset = (Math.random() - 0.5) * 0.15;
      
      data.push({
        location: new window.google.maps.LatLng(MAP_CENTER.lat + latOffset, MAP_CENTER.lng + lngOffset),
        weight: Math.random(), // 0 to 1 intensity
      });
    }
    setHeatmapData(data);
  }, [isLoaded]);

  const heatmapOptions = useMemo(() => ({
    radius: 40,
    opacity: 0.8,
    gradient: [
      'rgba(0, 0, 0, 0)',   // Transparent core base
      '#4ade80',            // Teal
      '#facc15',            // Yellow
      '#fb923c',            // Orange
      '#dc2626'             // Red
    ]
  }), []);

  const glassStyle = "bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-2xl p-4";

  if (!isLoaded) return <div className="h-screen w-screen bg-[#0f172a] text-indigo-400 flex items-center justify-center font-mono">INITIALIZING SURVEILLANCE FEED...</div>;

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden">
      
      <GoogleMap
        mapContainerStyle={{ width: '100vw', height: '100vh' }}
        center={MAP_CENTER}
        zoom={11}
        options={{
          disableDefaultUI: true,
          styles: darkMapStyles,
          backgroundColor: '#0f172a'
        }}
      >
        {heatmapData.length > 0 && (
          <HeatmapLayer
            data={heatmapData}
            options={heatmapOptions}
          />
        )}
      </GoogleMap>

      {/* ── Top-Right: Current Pollen Index ───────────────────────────────── */}
      <div className={`absolute top-6 right-6 z-[1000] ${glassStyle} min-w-[240px]`}>
        <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em] mb-3">
          ▸ Current Pollen Index
        </p>

        <div className="flex items-end gap-3 mb-2">
          <span className="text-4xl font-bold text-red-500 tracking-tighter">8.4</span>
          <span className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">Critical</span>
        </div>

        <div
          className="h-2 rounded-full mb-3 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
          style={{ background: 'linear-gradient(90deg, #4ade80, #facc15, #fb923c, #dc2626)' }}
        />

        <div className="space-y-2 mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Tree Pollen</span>
            <span className="text-[10px] text-red-400 font-bold">Severe</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Weed Pollen</span>
            <span className="text-[10px] text-amber-400 font-bold">High</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-slate-500 font-medium uppercase">Grass Pollen</span>
            <span className="text-[10px] text-emerald-400 font-bold">Low</span>
          </div>
        </div>
      </div>

      {/* ── Bottom-Left: AI Advisory ──────────────────────────────────────── */}
      <div className={`absolute bottom-6 left-6 z-[1000] ${glassStyle} max-w-[320px]`}>
        <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          AI Advisory
        </p>
        <p className="text-xs text-slate-300 leading-relaxed font-light">
          Extreme atmospheric pollen concentration detected in the downtown sector. Immediate respiratory filtration protocols are heavily advised. Exposure without a mask will result in severe allergenic shock.
        </p>
      </div>

      {/* ── Bottom-Right: 14-Day Timeline ─────────────────────────────────── */}
      <div className={`absolute bottom-6 right-6 z-[1000] ${glassStyle} min-w-[280px]`}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em]">
            ▸ 14-Day Timeline
          </p>
          <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 font-mono">
            T-MINUS
          </span>
        </div>
        
        <div className="flex items-end gap-1 h-12 mt-2">
          {[3,4,6,8,9,10,9,7,5,4,2,2,3,4].map((h, i) => (
            <div 
              key={i} 
              className={`w-full rounded-t-sm transition-all duration-300 ${
                h >= 8 ? 'bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 
                h >= 6 ? 'bg-orange-500' : 
                h >= 4 ? 'bg-yellow-500' : 'bg-teal-500/60'
              }`}
              style={{ height: `${h * 10}%`, opacity: i === 5 ? 1 : 0.6 }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[8px] text-slate-500 font-mono">
          <span>NOW</span>
          <span>+7D</span>
          <span>+14D</span>
        </div>
      </div>
      
    </div>
  );
};

export default Heatmap;
