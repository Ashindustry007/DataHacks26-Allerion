import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, HeatmapLayer } from '@react-google-maps/api';
import { getHeatmap, getForecast } from '../api/client';

const GOOGLE_MAPS_LIBRARIES = ['visualization'];
const DEFAULT_CENTER = { lat: 32.7157, lng: -117.1611 };

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

// Extract polygon centroid from GeoJSON coordinates [[[lng, lat], ...]]
function polygonCentroid(coords) {
  const ring = coords[0];
  const n = ring.length - 1; // last point closes the ring, skip it
  let lng = 0, lat = 0;
  for (let i = 0; i < n; i++) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return { lat: lat / n, lng: lng / n };
}

// Convert backend GeoJSON FeatureCollection to Google Maps weighted LatLng points
function geojsonToHeatmapPoints(geojson) {
  if (!window.google?.maps || !geojson?.features) return [];
  return geojson.features
    .filter(f => f.geometry?.type === 'Polygon')
    .map(f => {
      const { lat, lng } = polygonCentroid(f.geometry.coordinates);
      const weight = Math.max(0.05, (f.properties.composite_index || 0) / 5);
      return { location: new window.google.maps.LatLng(lat, lng), weight };
    });
}

// Derive tree/grass/weed severity from top_species list
function typeBreakdown(topSpecies = []) {
  const best = {};
  for (const sp of topSpecies) {
    const t = sp.pollen_type; // 'tree' | 'grass' | 'weed'
    if (!best[t] || sp.pollen_index > best[t]) best[t] = sp.pollen_index;
  }
  const label = (idx) => {
    if (!idx) return 'Low';
    if (idx < 1.5) return 'Low';
    if (idx < 2.5) return 'Moderate';
    if (idx < 3.5) return 'High';
    return 'Severe';
  };
  const color = (idx) => {
    if (!idx) return 'text-emerald-400';
    if (idx < 1.5) return 'text-emerald-400';
    if (idx < 2.5) return 'text-yellow-400';
    if (idx < 3.5) return 'text-amber-400';
    return 'text-red-400';
  };
  return [
    { label: 'Tree Pollen',  value: label(best['tree']),  color: color(best['tree'])  },
    { label: 'Weed Pollen',  value: label(best['weed']),  color: color(best['weed'])  },
    { label: 'Grass Pollen', value: label(best['grass']), color: color(best['grass']) },
  ];
}

const SEVERITY_COLOR = {
  low: 'text-emerald-400',
  moderate: 'text-yellow-400',
  high: 'text-amber-400',
  very_high: 'text-red-400',
};

const Heatmap = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Track whether isLoaded changed so we can convert after Maps SDK is ready
  const geojsonRef = useRef(null);

  // Resolve user location once
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // Fetch heatmap GeoJSON + forecast when center is known
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getHeatmap(center.lat, center.lng, 30),
      getForecast(center.lat, center.lng),
    ])
      .then(([geojson, fc]) => {
        geojsonRef.current = geojson;
        setForecast(fc);
        setLoading(false);
        // Convert immediately if Maps SDK already loaded
        if (isLoaded) {
          setHeatmapPoints(geojsonToHeatmapPoints(geojson));
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, [center]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert GeoJSON once Maps SDK becomes ready (may lag behind fetch)
  useEffect(() => {
    if (isLoaded && geojsonRef.current) {
      setHeatmapPoints(geojsonToHeatmapPoints(geojsonRef.current));
    }
  }, [isLoaded]);

  const heatmapOptions = useMemo(() => ({
    radius: 35,
    opacity: 0.82,
    gradient: [
      'rgba(0,0,0,0)',
      '#4ade80',
      '#facc15',
      '#fb923c',
      '#dc2626',
    ],
  }), []);

  const today = forecast?.daily?.[0];
  const narrative = forecast?.narrative || {};
  const pollenIndex = today?.composite_index ?? null;
  const severityLabel = today?.severity
    ? today.severity.replace('_', ' ').toUpperCase()
    : '—';
  const severityClass = SEVERITY_COLOR[today?.severity] || 'text-slate-300';
  const breakdown = typeBreakdown(today?.top_species);
  const timelineData = forecast?.daily || [];

  const glassStyle = 'bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-2xl p-4';

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
        zoom={11}
        options={{ disableDefaultUI: true, styles: darkMapStyles, backgroundColor: '#0f172a' }}
      >
        {heatmapPoints.length > 0 && (
          <HeatmapLayer data={heatmapPoints} options={heatmapOptions} />
        )}
      </GoogleMap>

      {/* Left sidebar */}
      <div className={`absolute top-24 left-6 z-[1000] flex flex-col w-[300px] md:w-[340px] max-h-[calc(100vh-8rem)] pointer-events-auto overflow-y-auto scrollbar-none ${glassStyle}`}>

        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-xs text-slate-400 font-mono">Fetching pollen mesh…</span>
          </div>
        )}

        {error && (
          <div className="py-4 text-xs text-red-400">{error}</div>
        )}

        {/* Current Pollen Index */}
        {!loading && today && (
          <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6">
            <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em] mb-3">
              ▸ Current Pollen Index
            </p>

            <div className="flex items-end gap-3 mb-2">
              <span className={`text-4xl font-bold tracking-tighter ${severityClass}`}>
                {pollenIndex !== null ? pollenIndex.toFixed(1) : '—'}
              </span>
              <span className={`text-xs font-medium mb-1 uppercase tracking-wider ${severityClass}`}>
                {severityLabel}
              </span>
            </div>

            <div
              className="h-2 rounded-full mb-3 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              style={{ background: 'linear-gradient(90deg, #4ade80, #facc15, #fb923c, #dc2626)' }}
            />

            <div className="space-y-2 mt-4 pt-4 border-t border-slate-700/50">
              {breakdown.map(({ label, value, color }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[10px] text-slate-500 font-medium uppercase">{label}</span>
                  <span className={`text-[10px] font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 14-Day Timeline */}
        {!loading && timelineData.length > 0 && (
          <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em]">
                ▸ 14-Day Timeline
              </p>
              <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 font-mono">
                T-MINUS
              </span>
            </div>

            <div className="flex items-end gap-0.5 h-12 mt-2">
              {timelineData.map((day, i) => {
                const h = Math.max(6, (day.composite_index / 5) * 100);
                const isEstimated = day.confidence_tier === 'estimated';
                const barColor =
                  day.composite_index >= 3.5 ? '#dc2626' :
                  day.composite_index >= 2.5 ? '#fb923c' :
                  day.composite_index >= 1.5 ? '#facc15' : '#4ade80';
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-300"
                    style={{
                      height: `${h}%`,
                      backgroundColor: barColor,
                      opacity: isEstimated ? 0.5 : 0.85,
                      boxShadow: !isEstimated ? `0 0 6px ${barColor}66` : 'none',
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
        )}

        {/* AI Advisory */}
        {!loading && narrative.headline && (
          <div className="shrink-0">
            <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              AI Advisory
            </p>
            <p className="text-sm font-semibold text-white mb-1">{narrative.headline}</p>
            {narrative.today_summary && (
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                {narrative.today_summary}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Heatmap;
