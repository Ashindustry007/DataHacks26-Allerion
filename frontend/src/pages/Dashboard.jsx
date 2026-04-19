import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getForecast } from '../api/client';
import ForecastTimeline from '../components/ForecastTimeline';
import SpeciesCard from '../components/SpeciesCard';
import PollenIndex from '../components/PollenIndex';
import AdvisoryPanel from '../components/AdvisoryPanel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLORS = {
  low: '#4ade80', moderate: '#facc15', high: '#fb923c', very_high: '#ef4444',
};

function severityTextClass(severity) {
  const map = { low: 'text-green-400', moderate: 'text-yellow-400', high: 'text-orange-400', very_high: 'text-red-500' };
  return map[severity] || 'text-white';
}

function glowStyle(severity) {
  const colors = { low: '74,222,128', moderate: '250,204,21', high: '251,146,60', very_high: '239,68,68' };
  const rgb = colors[severity] || '255,255,255';
  return { textShadow: `0 0 14px rgba(${rgb},0.7)` };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SpeciesProgressBar = ({ name, stage, progress, subtext }) => {
  const color = progress > 0.7 ? '#ef4444' : progress > 0.4 ? '#fb923c' : progress > 0.1 ? '#facc15' : '#64748b';
  const stageLabel = stage.replace(/_/g, ' ').toLowerCase();
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <p className="text-sm font-medium capitalize text-white">{name}</p>
        <span className="text-xs text-slate-400">{stageLabel}</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-1.5 my-1">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(2, progress * 100)}%`, backgroundColor: color }} />
      </div>
      {subtext && <p className="text-[10px] text-slate-500">{subtext}</p>}
    </div>
  );
};

const ProfileDrawer = ({ onClose }) => (
  <div className="absolute top-0 right-0 h-full w-full md:w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 p-6 z-30">
    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
      <X size={22} />
    </button>
    <h2 className="text-lg font-bold mb-5 text-white">User Reactivity Profile</h2>

    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Known Triggers</h3>
      <SpeciesProgressBar name="Grass (Timothy / Ryegrass)" stage="HIGH_SENSITIVITY" progress={0.9} />
      <SpeciesProgressBar name="Trees (Oak / Birch)" stage="MODERATE_SENSITIVITY" progress={0.6} />
      <SpeciesProgressBar name="Weeds (Ragweed)" stage="LOW_SENSITIVITY" progress={0.2} />
    </div>

    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Alert Settings</h3>
      {[
        { id: 'oak-alert', label: 'Push notification when Oak > 3.0' },
        { id: 'weekly-email', label: 'Weekly forecast email', defaultOn: true },
      ].map(({ id, label, defaultOn }) => (
        <div key={id} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2.5">
          <label htmlFor={id} className="text-sm text-slate-300">{label}</label>
          <input type="checkbox" id={id} defaultChecked={defaultOn} className="w-4 h-4 accent-teal-400" />
        </div>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

const Dashboard = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeTab, setActiveTab] = useState('species'); // 'species' | 'advisory'

  useEffect(() => {
    function load(lat, lng) {
      getForecast(lat, lng)
        .then(data => { setForecast(data); setLoading(false); })
        .catch(err => { setError(err.message); setLoading(false); });
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => load(pos.coords.latitude, pos.coords.longitude),
        () => load(32.71, -117.16), // fallback: San Diego
      );
    } else {
      load(32.71, -117.16);
    }
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Fetching pollen forecast…</p>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-red-400 font-semibold mb-2">Could not load forecast</p>
          <p className="text-slate-500 text-sm">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const { location, daily, narrative, advisory } = forecast;
  const displayDay = selectedDay || daily[0];
  const today = daily[0];
  const { severity } = displayDay;
  const color = SEVERITY_COLORS[severity] || '#facc15';

  return (
    <main className="bg-slate-900 min-h-screen font-sans text-white relative overflow-hidden pb-20">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `radial-gradient(circle at 30% 50%, ${color} 0%, transparent 60%)` }}
        />
      </div>

      <div className="relative z-10 px-4 pt-5 space-y-4">
        {/* Location header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">PollenCast</h1>
            <p className="text-xs text-slate-400">
              {location.city || `${location.lat?.toFixed(2)}, ${location.lng?.toFixed(2)}`}
            </p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="text-xs text-teal-400 border border-teal-700 rounded-lg px-3 py-1.5 hover:bg-teal-900/40 transition-colors"
          >
            Profile
          </button>
        </div>

        {/* Narrative headline */}
        {narrative?.headline && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-white">{narrative.headline}</p>
            {narrative.today_summary && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{narrative.today_summary}</p>
            )}
          </div>
        )}

        {/* Main pollen index + top species row */}
        <div className="flex gap-4 items-start">
          {/* Circular gauge */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col items-center flex-shrink-0">
            <PollenIndex index={displayDay.composite_index} severity={severity} size={130} />
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              {selectedDay ? selectedDay.date : 'Today'}
            </p>
          </div>

          {/* Top 3 species bars */}
          <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Active Species</p>
            {(displayDay.top_species || [])
              .filter(sp => sp.pollen_prob > 0)
              .slice(0, 3)
              .map((sp, i) => (
                <SpeciesProgressBar
                  key={i}
                  name={sp.name}
                  stage={sp.current_stage}
                  progress={sp.pollen_prob}
                  subtext={sp.inat_obs_count > 0 ? `${sp.inat_obs_count} local iNat obs` : null}
                />
              ))}
            {(displayDay.top_species || []).filter(sp => sp.pollen_prob > 0).length === 0 && (
              <p className="text-sm text-slate-500">No active pollen sources</p>
            )}
          </div>
        </div>

        {/* 14-day timeline */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">14-Day Forecast</p>
          <ForecastTimeline data={daily} onDaySelect={setSelectedDay} />
        </div>

        {/* Tab switch: Species cards / Advisory */}
        <div className="flex gap-2">
          {['species', 'advisory'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                activeTab === tab
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'text-slate-400 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {tab === 'species' ? 'Species Detail' : 'Advisory'}
            </button>
          ))}
        </div>

        {/* Species cards */}
        {activeTab === 'species' && (
          <div className="space-y-3">
            {(displayDay.top_species || [])
              .sort((a, b) => b.pollen_index - a.pollen_index)
              .map((sp, i) => (
                <SpeciesCard key={i} species={sp} />
              ))}
          </div>
        )}

        {/* Advisory panel */}
        {activeTab === 'advisory' && (
          <div className="space-y-3">
            <AdvisoryPanel advisory={advisory} />
            {narrative?.seven_day && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">7-Day Outlook</p>
                <p className="text-sm text-slate-300 leading-relaxed">{narrative.seven_day}</p>
              </div>
            )}
            {narrative?.fourteen_day && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">14-Day Outlook</p>
                <p className="text-sm text-slate-300 leading-relaxed">{narrative.fourteen_day}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile drawer overlay */}
      {isDrawerOpen && <ProfileDrawer onClose={() => setIsDrawerOpen(false)} />}
    </main>
  );
};

export default Dashboard;
