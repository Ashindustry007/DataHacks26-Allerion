import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import L from 'leaflet';
import { X, ArrowUp } from 'lucide-react';
import { getForecast, getHeatmap } from '../api/client';

const SD_FALLBACK = [32.71, -117.16];

// Continuous severity gradient (composite_index 0 → 5)
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

function speciesBarColor(pollen_prob) {
  if (pollen_prob >= 0.7) return '#dc2626';
  if (pollen_prob >= 0.25) return '#facc15';
  return '#4ade80';
}

function makeCityPin({ title, subtext, accent, glow }) {
  return L.divIcon({
    className: 'city-pin-wrapper',
    html: `
      <div style="
        min-width:180px;max-width:220px;padding:10px 12px;
        background:${glow};
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
        border:1px solid ${accent}55;
        border-radius:12px;
        box-shadow:0 0 20px ${accent}44, inset 0 1px 0 rgba(255,255,255,0.06);
        color:#e2e8f0;font-family:Inter,system-ui,sans-serif;
      ">
        <div style="font-weight:700;font-size:13px;color:#f8fafc;text-shadow:0 0 12px ${accent}88;margin-bottom:4px">${title}</div>
        <div style="font-size:11px;line-height:1.35;color:#94a3b8">${subtext}</div>
      </div>`,
    iconSize: [220, 72],
    iconAnchor: [110, 36],
  });
}

const downtownPin = makeCityPin({
  title: 'San Diego (Downtown)',
  subtext: 'Composite Index: 2.1/5',
  accent: '#4ade80',
  glow: 'rgba(15,23,42,0.78)',
});

const elCajonPin = makeCityPin({
  title: 'El Cajon',
  subtext: 'Composite Index: 4.8/5. Top: White Oak',
  accent: '#dc2626',
  glow: 'rgba(15,23,42,0.78)',
});

// ---------------------------------------------------------------------------
// Species forecast rows (SpeciesForecast contract)
// ---------------------------------------------------------------------------

function SpeciesForecastRow({ species }) {
  const { name, current_stage, pollen_prob, inat_obs_count } = species;
  const pct = Math.round((pollen_prob || 0) * 100);
  const color = speciesBarColor(pollen_prob || 0);
  const label = `${name} (${current_stage})`;
  const sub =
    inat_obs_count > 0
      ? `Based on ${inat_obs_count} local iNat observations.`
      : null;

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-baseline gap-2">
        <span className="text-[11px] font-semibold text-slate-100 leading-tight">{label}</span>
        <span className="text-[10px] text-slate-500 tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-1 h-2 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50"
        style={pollen_prob <= 0 ? { boxShadow: 'inset 0 0 0 1px rgba(74,222,128,0.25)' } : undefined}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            minWidth: pollen_prob > 0 && pct < 4 ? 4 : 0,
            backgroundColor: color,
            boxShadow: pollen_prob > 0 ? `0 0 10px ${color}66` : 'none',
          }}
        />
      </div>
      {sub && <p className="mt-1 text-[9px] text-slate-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 14-day timeline (DailyForecast — confidence_tier + composite_index)
// ---------------------------------------------------------------------------

function FourteenDayStrip({ daily }) {
  if (!daily?.length) return null;
  const max = 5;
  const n = daily.length;
  return (
    <div className="relative w-full">
      {/* Vertical dotted line between day 4 and day 5 (indices 4 and 5) */}
      <div
        className="absolute top-0 z-20 pointer-events-none"
        style={{
          left: `calc(${5 / n} * 100%)`,
          height: 'calc(100% - 1.1rem)',
          width: 0,
          borderLeft: '2px dotted rgba(34, 211, 238, 0.85)',
        }}
      />
      <div className="flex items-end justify-center gap-0.5 h-24 px-1">
        {daily.map((day, i) => {
          const h = Math.max(6, (day.composite_index / max) * 100);
          const solid = day.confidence_tier === 'high';
          const fill = colorFromCompositeIndex(day.composite_index);
          const dayLbl = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' });

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <div
                className="w-full rounded-t-sm relative overflow-hidden transition-all"
                style={{
                  height: `${h}%`,
                  backgroundColor: fill,
                  opacity: solid ? 1 : 0.5,
                  filter: solid ? 'none' : 'saturate(0.65)',
                  boxShadow: solid ? `0 0 12px ${fill}55` : 'none',
                }}
              >
                {!solid && <div className="absolute inset-0 pc-bar-hatch pointer-events-none" />}
              </div>
              <span className="text-[8px] text-slate-500 mt-0.5 font-medium">{dayLbl}</span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-1 h-4 w-full">
        <span
          className="absolute text-[9px] uppercase tracking-wider text-cyan-400/90 font-semibold whitespace-nowrap bg-[#0f172a]/90 px-2 py-0.5 rounded border border-cyan-500/20"
          style={{ left: `calc(${5 / n} * 100%)`, transform: 'translateX(-50%)' }}
        >
          Estimation Threshold
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile drawer
// ---------------------------------------------------------------------------

function SensitivityRow({ label, level, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-300 mb-1">
        <span>{label}</span>
        <span className="text-slate-500">{level}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
        <div className="h-full rounded-full" style={{ width: level === 'High' ? '92%' : level === 'Moderate' ? '58%' : '22%', backgroundColor: color, boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  );
}

function ProfileDrawer({ onClose }) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[1990] bg-black/55 backdrop-blur-[2px]"
        aria-label="Close profile"
        onClick={onClose}
      />
      <aside className="pc-drawer-panel fixed top-0 right-0 z-[2000] h-full w-full max-w-md border-l border-cyan-500/20 shadow-[-12px_0_40px_rgba(0,0,0,0.5)] flex flex-col" style={{ background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
          <h2 className="text-lg font-bold text-white" style={{ textShadow: '0 0 20px rgba(45,212,191,0.35)' }}>
            User Reactivity Profile
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80">
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-8">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400/90 mb-4">Known Triggers (Prick Test Results)</h3>
            <div className="space-y-4">
              <SensitivityRow label="Grass (Timothy/Ryegrass)" level="High" color="#dc2626" />
              <SensitivityRow label="Trees (Oak/Birch)" level="Moderate" color="#facc15" />
              <SensitivityRow label="Weeds (Ragweed)" level="Low" color="#4ade80" />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400/90 mb-4">Personalized Alert Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3">
                <label htmlFor="oak-push" className="text-sm text-slate-200 cursor-pointer">Push notifications when Oak &gt; 3.0</label>
                <input id="oak-push" type="checkbox" className="w-5 h-5 accent-cyan-500 rounded cursor-pointer" />
              </div>
              <div className="flex items-center justify-between gap-3 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3">
                <label htmlFor="weekly-email" className="text-sm text-slate-200 cursor-pointer">Email weekly forecast</label>
                <input id="weekly-email" type="checkbox" defaultChecked className="w-5 h-5 accent-cyan-500 rounded cursor-pointer" />
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main landing — map canvas + floating dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [center, setCenter] = useState(SD_FALLBACK);
  const [geolocating, setGeolocating] = useState(true);
  const [forecast, setForecast] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Resolve user position once; fall back to San Diego after 5s
  useEffect(() => {
    if (!navigator.geolocation) { setGeolocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCenter([pos.coords.latitude, pos.coords.longitude]);
        setGeolocating(false);
      },
      () => setGeolocating(false),
      { timeout: 5000 },
    );
  }, []);

  // Fetch when geolocation resolves
  useEffect(() => {
    if (geolocating) return;
    const [lat, lng] = center;
    setLoading(true);
    Promise.all([getForecast(lat, lng), getHeatmap(lat, lng, 30)])
      .then(([fc, hm]) => {
        setForecast(fc);
        setGeojson(hm);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
  }, [geolocating]); // eslint-disable-line react-hooks/exhaustive-deps

  const daily = forecast?.daily || [];
  const today = daily[0];
  const narrative = forecast?.narrative || {};

  const pctVsYesterday = useMemo(() => {
    if (!daily[1] || daily[1].composite_index <= 0) return '+12';
    const p = ((today?.composite_index ?? 0) - daily[1].composite_index) / daily[1].composite_index * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(0)}`;
  }, [daily, today]);

  const speciesRows = useMemo(() => {
    const list = today?.top_species || [];
    const order = ['White oak', 'Timothy grass', 'Common ragweed'];
    return [...list].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }, [today]);

  const geoJsonStyle = feature => ({
    fillColor: colorFromCompositeIndex(feature.properties.composite_index),
    fillOpacity: 0.52,
    color: 'rgba(15,23,42,0.85)',
    weight: 0.6,
  });

  const onEachHex = (feature, layer) => {
    const p = feature.properties;
    layer.bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:140px;color:#0f172a">
        <strong style="font-size:13px">composite_index: ${p.composite_index}</strong><br/>
        <span style="text-transform:capitalize;font-size:11px;color:#475569">severity: ${String(p.severity).replace('_', ' ')}</span><br/>
        <span style="font-size:11px;color:#64748b">Top: ${p.top_species_name}</span>
      </div>
    `);
  };

  if (error && !forecast) {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-300 px-6 pb-24 font-sans">
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-[#0f172a] font-sans text-slate-100">
      {/* Full-bleed map */}
      <div className="absolute inset-0 z-0">
        {!loading && (
          <MapContainer center={center} zoom={10} className="h-full w-full" zoomControl={false} attributionControl={false}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              attribution=""
            />
            {geojson?.type === 'FeatureCollection' && (
              <GeoJSON data={geojson} style={geoJsonStyle} onEachFeature={onEachHex} />
            )}
            <Marker position={[32.715, -117.162]} icon={downtownPin} />
            <Marker position={[32.7947, -116.962]} icon={elCajonPin} />
          </MapContainer>
        )}
        {loading && (
          <div className="h-full w-full flex items-center justify-center bg-[#0f172a]">
            <div className="text-center">
              <div className="w-11 h-11 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 tracking-wide">Calibrating H3 mesh…</p>
            </div>
          </div>
        )}
      </div>

      {/* Vignette + scanlines (subtle tech-noir) */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#0f172a]/40 via-transparent to-[#0f172a]/90" />
      <div className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #000 1px, #000 2px)' }} />

      {/* UI layer */}
      <div className="absolute inset-0 z-[500] pointer-events-none flex flex-col">
        {/* Search — centered top */}
        <div className="pointer-events-auto flex justify-center pt-4 px-4">
          <input
            type="search"
            placeholder="Enter Pincode or City to scan local H3 cells"
            className="w-full max-w-lg rounded-2xl border border-cyan-500/25 bg-slate-950/55 px-5 py-3 text-sm text-slate-100 placeholder:text-slate-500 shadow-[0_0_24px_rgba(45,212,191,0.12)] backdrop-blur-xl outline-none focus:border-cyan-400/50 focus:shadow-[0_0_32px_rgba(45,212,191,0.2)] transition-all"
          />
        </div>

        {/* Floating panels grid */}
        <div className="flex-1 flex flex-col md:flex-row md:items-start md:justify-between gap-3 px-3 md:px-5 pt-3 pb-44 md:pb-48">
          {/* Top-left — Current Pollen Index */}
          <div
            className="pointer-events-auto w-full md:max-w-[320px] rounded-2xl border border-cyan-500/20 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)]"
            style={{ background: 'var(--pc-panel, rgba(15,23,42,0.72))', backdropFilter: 'blur(16px)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/90 mb-3">Current Pollen Index</p>
            {today && (
              <>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className="text-5xl md:text-6xl font-extrabold tabular-nums text-white leading-none"
                    style={{ textShadow: '0 0 28px rgba(251,146,60,0.55), 0 0 60px rgba(220,38,38,0.25)' }}
                  >
                    {today.composite_index?.toFixed(1) ?? '—'}
                  </span>
                  <span className="text-xl text-slate-500 font-medium">/ 5</span>
                  <div className="flex items-center gap-1 text-red-500 ml-auto">
                    <ArrowUp size={18} strokeWidth={2.5} />
                    <span className="text-xs font-bold tracking-tight">{pctVsYesterday}% vs yesterday</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 mb-4">
                  severity: <span className="text-slate-300 capitalize">{String(today.severity).replace('_', ' ')}</span>
                  {' · '}
                  confidence_tier: <span className="text-slate-300">{today.confidence_tier}</span>
                </p>
                <div className="border-t border-slate-700/50 pt-3">
                  {speciesRows.map(sp => (
                    <SpeciesForecastRow key={sp.species_id} species={sp} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top-right — AI Advisory */}
          <div
            className="pointer-events-auto w-full md:max-w-[340px] md:ml-auto rounded-2xl border border-violet-500/20 p-4 shadow-[0_0_40px_rgba(0,0,0,0.45)]"
            style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(16px)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90 mb-3">AI Advisory</p>
            <h2 className="text-base md:text-lg font-bold text-white mb-2 leading-snug" style={{ textShadow: '0 0 18px rgba(255,255,255,0.35)' }}>
              {narrative.headline || '—'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              {narrative.today_summary || ''}
            </p>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-full py-3 rounded-xl text-sm font-bold text-cyan-100 border border-cyan-400/40 bg-gradient-to-r from-cyan-600/25 to-teal-600/20 shadow-[0_0_24px_rgba(45,212,191,0.25)] hover:shadow-[0_0_32px_rgba(45,212,191,0.4)] hover:border-cyan-300/50 transition-all"
            >
              Open Health Profile / Prick Test Data
            </button>
          </div>
        </div>

        {/* Bottom — 14-day strip */}
        <div className="pointer-events-auto mt-auto px-3 md:px-6 pb-24">
          <div
            className="mx-auto max-w-4xl rounded-2xl border border-slate-600/40 px-4 py-3 shadow-[0_-8px_40px_rgba(0,0,0,0.35)]"
            style={{ background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(14px)' }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2 text-center">DailyForecast · composite_index</p>
            <FourteenDayStrip daily={daily} />
          </div>
        </div>
      </div>

      {drawerOpen && <ProfileDrawer onClose={() => setDrawerOpen(false)} />}
    </main>
  );
}
