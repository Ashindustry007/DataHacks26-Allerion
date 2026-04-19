import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { getForecast, getINaturalistObservations } from '../api/client';

const GOOGLE_MAPS_LIBRARIES = ['visualization', 'places'];
const DEFAULT_CENTER = { lat: 32.7157, lng: -117.1611 };

// Cyperbunk tech noir base map styling
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

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD4aUoax3vID5wTcGyH1OLzyCebwclWsQ4";

const LAYER_OPTIONS = [
  { 
    id: 'ALL_POLLEN', 
    label: 'All Pollen', 
    color: 'border-purple-400 text-purple-400', 
    endpoints: [
      'https://pollen.googleapis.com/v1/mapTypes/TREE_UPI/heatmapTiles',
      'https://pollen.googleapis.com/v1/mapTypes/GRASS_UPI/heatmapTiles',
      'https://pollen.googleapis.com/v1/mapTypes/WEED_UPI/heatmapTiles'
    ] 
  },
  { id: 'TREE_UPI', label: 'Trees', color: 'border-emerald-500 text-emerald-400', endpoints: ['https://pollen.googleapis.com/v1/mapTypes/TREE_UPI/heatmapTiles'] },
  { id: 'GRASS_UPI', label: 'Grass', color: 'border-yellow-400 text-yellow-500', endpoints: ['https://pollen.googleapis.com/v1/mapTypes/GRASS_UPI/heatmapTiles'] },
  { id: 'WEED_UPI', label: 'Weeds', color: 'border-red-400 text-red-500', endpoints: ['https://pollen.googleapis.com/v1/mapTypes/WEED_UPI/heatmapTiles'] },
  { id: 'UAQI_RED_GREEN', label: 'Air Quality', color: 'border-cyan-400 text-cyan-400', endpoints: ['https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles'] }
];

const SEVERITY_COLOR = {
  low: 'text-emerald-400',
  moderate: 'text-yellow-400',
  high: 'text-amber-400',
  very_high: 'text-red-400',
};

// Derive tree/grass/weed severity labels from top_species list
function typeBreakdown(topSpecies = []) {
  const best = {};
  for (const sp of topSpecies) {
    const t = sp.pollen_type;
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

const Heatmap = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  
  const [activeLayerId, setActiveLayerId] = useState('ALL_POLLEN');

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zipCode, setZipCode] = useState('');
  
  // Community iNaturalist state
  const [showObservations, setShowObservations] = useState(false);
  const [observations, setObservations] = useState([]);
  const [selectedObs, setSelectedObs] = useState(null);
  const [isFetchingObs, setIsFetchingObs] = useState(false);
  const [filterWater, setFilterWater] = useState(true);
  const fetchTimeoutRef = useRef(null);

  const fetchObservations = async () => {
    if (!map || !showObservations) return;
    setIsFetchingObs(true);
    try {
      const gCenter = map.getCenter();
      // Fetch within a 15km radius of the current map center
      let data = await getINaturalistObservations(gCenter.lat(), gCenter.lng(), 15);
      
      // Land-Lock Protection: Verify all markers via Google Elevation API
      if (window.google && window.google.maps.ElevationService) {
          const elevator = new window.google.maps.ElevationService();
          const locations = data.map(o => ({ lat: o.lat, lng: o.lng }));
          
          await new Promise((resolve) => {
              elevator.getElevationForLocations({ locations }, (results, status) => {
                  if (status === 'OK' && results) {
                      data = data.map((o, idx) => ({
                          ...o,
                          elevation: results[idx].elevation,
                          isOnLand: results[idx].elevation > 0.1
                      }));
                  }
                  resolve();
              });
          });
      }

      // Merge results to prevent markers from 'flickering' or disappearing
      setObservations(prev => {
        const obsMap = new Map();
        prev.forEach(o => obsMap.set(o.id, o));
        data.forEach(o => obsMap.set(o.id, o));
        return Array.from(obsMap.values());
      });
    } catch (e) {
      console.warn("Could not fetch observations:", e);
    } finally {
      setIsFetchingObs(false);
    }
  };

  const debouncedFetch = () => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(fetchObservations, 400);
  };

  // Fetch observations whenever toggle is flipped or map settles
  useEffect(() => {
    if (showObservations) fetchObservations();
    else {
        setObservations([]);
        setSelectedObs(null);
    }
  }, [showObservations]);

  const handleZipSearch = () => {
    if (!zipCode || zipCode.trim().length === 0) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: zipCode }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setCenter({ lat: loc.lat(), lng: loc.lng() });
        setZipCode('');
      } else {
        setError('Location not found.');
      }
    });
  };

  // Resolve user location once
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  // Fetch forecast when center is known
  useEffect(() => {
    setLoading(true);
    setError(null);
    getForecast(center.lat, center.lng)
      .then((fc) => {
        setForecast(fc);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      });
  }, [center]);

  // Insert Native Image Tiles into Google Map
  useEffect(() => {
    if (!map || !isLoaded) return;
    
    map.overlayMapTypes.clear();

    const layerConf = LAYER_OPTIONS.find(l => l.id === activeLayerId);
    if (!layerConf || layerConf.endpoints.length === 0) return;

    layerConf.endpoints.forEach(endpoint => {
      const imageMapType = new window.google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
          return `${endpoint}/${zoom}/${coord.x}/${coord.y}?key=${API_KEY}`;
        },
        tileSize: new window.google.maps.Size(256, 256),
        maxZoom: 16,
        minZoom: 0,
        opacity: 0.7,
        name: layerConf.label
      });

      map.overlayMapTypes.push(imageMapType);
    });
  }, [map, isLoaded, activeLayerId]);

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
      
      {/* ── Native Google Maps Layer ── */}
      <GoogleMap
        mapContainerStyle={{ width: '100vw', height: '100vh' }}
        center={center}
        zoom={11}
        options={{ disableDefaultUI: true, styles: darkMapStyles, backgroundColor: '#0f172a' }}
        onLoad={m => setMap(m)}
        onIdle={() => { if (showObservations) debouncedFetch(); }}
      >
        {showObservations && observations
          .filter(obs => !filterWater || (obs.isOnLand !== false)) // Filter if land-lock is active
          .map(obs => (
          <Marker
            key={obs.id}
            position={{ lat: obs.lat, lng: obs.lng }}
            onClick={() => setSelectedObs(obs)}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
              scaledSize: new window.google.maps.Size(20, 20),
              anchor: new window.google.maps.Point(10, 10), // Correctly anchor the center of the dot
              origin: new window.google.maps.Point(0, 0)
            }}
          />
        ))}

        {selectedObs && (
          <InfoWindow
            position={{ lat: selectedObs.lat, lng: selectedObs.lng }}
            onCloseClick={() => setSelectedObs(null)}
          >
            <div className="p-1 max-w-[200px] bg-slate-900 border border-slate-700 text-white rounded-lg">
              {selectedObs.photoUrl && (
                <img 
                  src={selectedObs.photoUrl} 
                  alt={selectedObs.speciesName} 
                  className="w-full h-24 object-cover rounded mb-2 border border-slate-700" 
                />
              )}
              {selectedObs.isOnLand === false && (
                <div className="mb-2 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-[9px] font-bold text-red-400 flex items-center gap-1">
                  <span>⚓</span> AQUATIC DETECTED: AUTO-MASKING
                </div>
              )}
              {selectedObs.obscured && !selectedObs.isOnLand === false && (
                <div className="mb-2 px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded text-[9px] font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                  <span>⚠️</span> SIGNAL JITTER: GPS OBSCURED
                </div>
              )}
              <h3 className="text-xs font-bold text-indigo-300 mb-1">{selectedObs.speciesName}</h3>
              <p className="text-[10px] text-slate-400 font-mono mb-1 capitalize"> Spotted: {selectedObs.observedOn}</p>
              {selectedObs.wikiUrl && (
                <a 
                  href={selectedObs.wikiUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[9px] text-teal-400 underline hover:text-teal-300 transition-colors uppercase font-bold"
                >
                  Wiki Reference
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* ── Left sidebar ── */}
      <div className={`absolute top-24 left-6 z-[1000] flex flex-col w-[300px] md:w-[340px] max-h-[calc(100vh-8rem)] pointer-events-auto overflow-y-auto scrollbar-none ${glassStyle}`}>

        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span className="text-xs text-slate-400 font-mono">Calibrating regional sensors…</span>
          </div>
        )}

        {error && (
          <div className="py-4 text-xs text-red-400">{error}</div>
        )}
        {/* Dynamic Tile Layer Selector */}
        <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6 flex flex-col gap-3 relative">
            <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em]">
              <span className="w-2 h-2 inline-block rounded-full bg-indigo-400 animate-pulse mr-2"></span>
              Live Feed Options
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LAYER_OPTIONS.map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayerId(activeLayerId === layer.id ? null : layer.id)}
                  className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                     activeLayerId === layer.id 
                       ? `bg-slate-800 ${layer.color} shadow-[0_0_15px_rgba(255,255,255,0.1)]` 
                       : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300 bg-transparent'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
        </div>
        {/* Community Insights Toggle */}
        <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6 flex flex-col gap-3 relative">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-[0.2em]">
                ▸ Community Insights
              </p>
              {isFetchingObs && (
                <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <button
              onClick={() => setShowObservations(!showObservations)}
              className={`w-full py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center justify-between ${
                 showObservations 
                   ? 'bg-teal-500/10 border-teal-500/50 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                   : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300 bg-transparent'
              }`}
            >
              <span>Botanical Sightings</span>
              <div className={`w-3 h-3 rounded-full border transition-all ${
                showObservations ? 'bg-teal-400 border-teal-300 scale-110' : 'border-slate-600'
              }`} />
            </button>
            
            {showObservations && (
                <div 
                  onClick={() => setFilterWater(!filterWater)}
                  className="flex items-center gap-2 mt-2 cursor-pointer group"
                >
                  <div className={`w-3 h-3 rounded border transition-colors ${
                    filterWater ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600 group-hover:border-slate-500'
                  }`} />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-300">
                    Filter Aquatic Anomalies
                  </span>
                </div>
            )}

            <p className="text-[9px] text-slate-500 italic mt-1 leading-[1.2]">
              Sourcing research-grade observations from iNaturalist.
            </p>
        </div>

        {/* ZipCode Input */}
        <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6 flex flex-col gap-2 relative">
            <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em]">
              ▸ Sector Scan
            </p>
            <div className="flex gap-2">
               <input 
                 value={zipCode} 
                 onChange={(e)=>setZipCode(e.target.value)} 
                 onKeyDown={(e) => { if (e.key === 'Enter') handleZipSearch(); }}
                 placeholder="Enter Zip Code or City"
                 className="flex-1 min-w-0 bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500/50 focus:bg-slate-800 transition-colors"
               />
               <button 
                 onClick={handleZipSearch}
                 className="shrink-0 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-500/40 transition-colors"
               >
                 Scan
               </button>
            </div>
        </div>

        {/* Current Pollen Index */}
        {!loading && today && (
          <div className="shrink-0 pb-6 border-b border-slate-700/50 mb-6">
            <p className="text-[10px] font-bold text-indigo-400/90 uppercase tracking-[0.2em] mb-3">
              ▸ Current Exposure
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
