import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer } from '@react-google-maps/api';
import { getForecast, getHeatmap, toGoogleHeatmapData } from '../api/client';

const GOOGLE_MAPS_LIBRARIES = ['visualization'];
const SD_CENTER = { lat: 32.7157, lng: -117.1611 };

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
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
];

function colorFromCompositeIndex(v) {
  const x = Math.max(0, Math.min(5, v));
  const stops = [
    { t: 0, c: [0x4a, 0xde, 0x80] },
    { t: 1.66, c: [0xfa, 0xcc, 0x15] },
    { t: 3.33, c: [0xfb, 0x92, 0x3c] },
    { t: 5, c: [0xdc, 0x26, 0x26] },
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const { t: t0, c: c0 } = stops[i];
    const { t: t1, c: c1 } = stops[i + 1];
    if (x <= t1) {
      const u = (x - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * u);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * u);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * u);
      return `rgb(${r},${g},${b})`;
    }
  }
  return '#dc2626';
}

function severityLabel(sev) {
  const s = String(sev || 'moderate').replace('_', ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function classifySeverity(v) {
  if (v >= 4) return 'very_high';
  if (v >= 3) return 'high';
  if (v >= 2) return 'moderate';
  return 'low';
}

const Heatmap = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [center, setCenter] = useState(SD_CENTER);
  const [forecast, setForecast] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getForecast(center.lat, center.lng),
      getHeatmap(center.lat, center.lng, 1),
    ])
      .then(([fc, hm]) => {
        setForecast(fc);
        if (isLoaded && window.google) {
          setHeatmapData(toGoogleHeatmapData(hm));
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
  }, [center, isLoaded]);

  const heatmapOptions = useMemo(() => ({
    radius: 60,
    opacity: 0.7,
    dissipating: true,
    gradient: [
      'rgba(0, 0, 0, 0)',
      'rgba(74, 222, 128, 0.4)',
      'rgba(250, 204, 21, 0.6)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(220, 38, 38, 0.9)',
    ],
  }), []);

  const daily = forecast?.daily || [];
  const today = daily[0];
  const narrative = forecast?.narrative || {};

  const breakdown = useMemo(() => {
    const top = today?.top_species || [];
    const groups = { tree: [], weed: [], grass: [] };
    for (const sp of top) {
      const t = sp.pollen_type;
      if (groups[t]) groups[t].push(sp);
    }
    const maxIndex = (arr) => arr.reduce((m, s) => Math.max(m, Number(s.pollen_index || 0)), 0);
    const toRow = (label, type) => {
      const v = maxIndex(groups[type]);
      return { label, severity: classifySeverity(v), value: v };
    };
    return [
      toRow('Tree Pollen', 'tree'),
      toRow('Weed Pollen', 'weed'),
      toRow('Grass Pollen', 'grass'),
    ];
  }, [today]);

  const glassStyle = "bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-2xl p-4";

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] text-indigo-400 flex items-center justify-center font-mono">
        INITIALIZING SURVEILLANCE FEED...
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100vw', height: '100vh' }}
        center={center}
        zoom={15}
        options={{
          disableDefaultUI: true,
          styles: darkMapStyles,
          backgroundColor: '#0f172a',
        }}
      >
        {heatmapData.length > 0 && (
          <HeatmapLayer data={heatmapData} options={heatmapOptions} />
        )}
      </GoogleMap>

      {loading && (
        <div className="absolute inset-0 z-[500] bg-[#0f172a]/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-11 h-11 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 tracking-wide font-mono">Loading pollen data...</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="absolute inset-x-0 top-24 z-[500] mx-auto max-w-md px-4">
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-200 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* ── Left Sidebar Info Overlay ─────────────────────────────────────── */}
      <div className={`absolute top-24 left-6 z-[1000] flex flex-col w-[300px] md:w-[340px] max-h-[calc(100vh-8rem)] pointer-events-auto overflow-y-auto scrollbar-none ${glassStyle}`}>

        {/* ── Current Pollen Index ────────────────────────────────────────── */}
        <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6">
          <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em] mb-3">
            ▸ Current Pollen Index
          </p>

          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-bold text-red-500 tracking-tighter">
              {today?.composite_index?.toFixed?.(1) ?? '—'}
            </span>
            <span className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
              {today ? severityLabel(today.severity) : '—'}
            </span>
          </div>

          <div
            className="h-2 rounded-full mb-3 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            style={{ background: 'linear-gradient(90deg, #4ade80, #facc15, #fb923c, #dc2626)' }}
          />

          <div className="space-y-2 mt-4 pt-4 border-t border-slate-700/50">
            {breakdown.map(row => {
              const sev = row.severity;
              const color =
                sev === 'very_high' ? 'text-red-400' :
                sev === 'high' ? 'text-amber-400' :
                sev === 'moderate' ? 'text-yellow-300' :
                'text-emerald-400';
              return (
                <div key={row.label} className="flex justify-between">
                  <span className="text-[10px] text-slate-500 font-medium uppercase">{row.label}</span>
                  <span className={`text-[10px] font-bold ${color}`}>{severityLabel(sev)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 14-Day Timeline ─────────────────────────────────────────────── */}
        <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6">
          <div className="flex justify-between items-center mb-3">
            <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em]">
              ▸ 14-Day Timeline
            </p>
            <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 font-mono">
              T-MINUS
            </span>
          </div>

          <div className="flex items-end gap-1 h-12 mt-2">
            {(daily.length ? daily : Array.from({ length: 14 }, () => ({ composite_index: 0 }))).slice(0, 14).map((d, i) => {
              const v = Number(d.composite_index || 0);
              const h = Math.max(0.08, Math.min(1, v / 5));
              const fill = colorFromCompositeIndex(v);
              return (
                <div
                  key={i}
                  className="w-full rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${h * 100}%`,
                    backgroundColor: fill,
                    opacity: i === 0 ? 1 : 0.6,
                    boxShadow: i === 0 ? `0 0 10px ${fill}66` : 'none',
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[8px] text-slate-500 font-mono">
            <span>NOW</span>
            <span>+7D</span>
            <span>+14D</span>
          </div>
        </div>

        {/* ── AI Advisory ─────────────────────────────────────────────────── */}
        <div className="shrink-0">
          <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            AI Advisory
          </p>
          <p className="text-xs text-slate-300 leading-relaxed font-light">
            {narrative.headline
              ? `${narrative.headline}${narrative.today_summary ? ` ${narrative.today_summary}` : ''}`
              : '—'}
          </p>
        </div>

      </div>
    </div>
  );
};

export default Heatmap;
