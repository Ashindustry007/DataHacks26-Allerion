import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { getHeatmap, getSpecies } from '../api/client';

const SEVERITY_COLORS = {
  low: '#4ade80',
  moderate: '#facc15',
  high: '#fb923c',
  very_high: '#ef4444',
};

function indexToColor(composite_index) {
  if (composite_index < 1.5) return SEVERITY_COLORS.low;
  if (composite_index < 2.5) return SEVERITY_COLORS.moderate;
  if (composite_index < 3.5) return SEVERITY_COLORS.high;
  return SEVERITY_COLORS.very_high;
}

// Re-fit map bounds when geojson changes
function FitBounds({ geojson }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson || !geojson.features?.length) return;
    try {
      import('leaflet').then(L => {
        const layer = L.default.geoJSON(geojson);
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      }).catch(() => {});
    } catch (_) {}
  }, [geojson, map]);
  return null;
}

const Heatmap = () => {
  const [geojson, setGeojson] = useState(null);
  const [species, setSpecies] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState([32.71, -117.16]);

  useEffect(() => {
    function loadData(lat, lng) {
      setUserPos([lat, lng]);
      Promise.all([
        getHeatmap(lat, lng, 30),
        getSpecies(),
      ]).then(([heatmapData, speciesData]) => {
        setGeojson(heatmapData);
        setSpecies(speciesData);
        setLoading(false);
      }).catch(() => setLoading(false));
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => loadData(pos.coords.latitude, pos.coords.longitude),
        () => loadData(32.71, -117.16),
      );
    } else {
      loadData(32.71, -117.16);
    }
  }, []);

  const styleFeature = (feature) => {
    const props = feature.properties;
    let color;
    if (selectedSpecies === 'all') {
      color = indexToColor(props.composite_index);
    } else {
      // When filtering by species, use top_species_prob if species matches, else grey
      const isMatch = props.top_species_name?.toLowerCase().includes(selectedSpecies.toLowerCase());
      color = isMatch
        ? indexToColor(props.top_species_prob * 5)
        : '#334155';
    }
    return {
      fillColor: color,
      fillOpacity: 0.55,
      color: '#1e293b',
      weight: 0.8,
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(`
      <div style="font-family:sans-serif;min-width:160px">
        <strong style="font-size:14px">Index: ${p.composite_index}/5</strong><br/>
        <span style="text-transform:capitalize;color:#94a3b8">${p.severity?.replace('_', ' ')}</span><br/>
        <hr style="border-color:#334155;margin:6px 0"/>
        <span style="font-size:12px">Top: ${p.top_species_name}</span><br/>
        <span style="font-size:11px;color:#94a3b8">${Math.round((p.top_species_prob || 0) * 100)}% probability</span>
      </div>
    `);
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.8, weight: 1.5 }));
    layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.55, weight: 0.8 }));
  };

  return (
    <div className="relative" style={{ height: '100vh' }}>
      {/* Species filter panel */}
      <div
        className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 min-w-[180px]"
      >
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">Filter by Species</p>
        <select
          value={selectedSpecies}
          onChange={e => setSelectedSpecies(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All species (composite)</option>
          {species.map(sp => (
            <option key={sp.species_id} value={sp.name}>{sp.name}</option>
          ))}
        </select>

        {/* Color legend */}
        <div className="mt-3 space-y-1">
          {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-400 capitalize">{key.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[999] bg-slate-900/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading heatmap…</p>
          </div>
        </div>
      )}

      <MapContainer
        center={userPos}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {geojson && (
          <GeoJSON
            key={selectedSpecies}
            data={geojson}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        )}
        {geojson && <FitBounds geojson={geojson} />}
      </MapContainer>
    </div>
  );
};

export default Heatmap;
