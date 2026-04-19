import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// ── Icons (Raw SVGs) ────────────────────────────────────────────────────────
const LeafIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);
const UserIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const DnaIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m8 22 8-16" />
    <path d="M15 14v.01" />
    <path d="M14 18v.01" />
    <path d="M16 10v.01" />
    <path d="M10 14v.01" />
    <path d="M9 10v.01" />
    <path d="M8 6v.01" />
    <path d="M21 21a11.026 11.026 0 0 0-4.606-11.45L12 6.64a4 4 0 0 0-4 0l-4.43 2.94A11.026 11.026 0 0 0 3 21" />
  </svg>
);

const CrosshairIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="22" x2="18" y1="12" y2="12"/>
    <line x1="6" x2="2" y1="12" y2="12"/>
    <line x1="12" x2="12" y1="6" y2="2"/>
    <line x1="12" x2="12" y1="22" y2="18"/>
  </svg>
);

const BellIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'allerion_profile';

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const DEFAULT_FORM = {
  fullName: '',
  email: '',
  mobile: '',
  location: '',
  triggers: { trees: 0, grasses: 0, weeds: 0 },
  symptoms: { asthma: false, rhinitis: false, eyes: false, hives: false },
  medications: '',
  alerts: { push: true, email: false, proximity: true },
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(() => loadProfile() || DEFAULT_FORM);
  const [saved, setSaved] = useState(false);

  const updateTrigger = (key, val) => {
    setForm(prev => ({ ...prev, triggers: { ...prev.triggers, [key]: Number(val) } }));
  };

  const toggleSymptom = (key) => {
    setForm(prev => ({ ...prev, symptoms: { ...prev.symptoms, [key]: !prev.symptoms[key] } }));
  };

  const toggleAlert = (key) => {
    setForm(prev => ({ ...prev, alerts: { ...prev.alerts, [key]: !prev.alerts[key] } }));
  };

  // UI styling constants
  const glassPanel = "bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-2xl p-6 md:p-8";
  const cyberGradient = "bg-gradient-to-r from-[#4ade80] via-[#facc15] via-[#fb923c] to-[#dc2626]";
  const inputTheme = "w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/50 transition-all font-mono text-sm";

  // Dynamic slider visuals
  const getSeverityStyle = (val) => {
    if (val <= 1) return { color: "text-teal-400", shadow: "shadow-[0_0_15px_rgba(74,222,128,0.3)]", bg: "bg-teal-500" };
    if (val <= 3) return { color: "text-yellow-400", shadow: "shadow-[0_0_15px_rgba(250,204,21,0.3)]", bg: "bg-yellow-500" };
    return { color: "text-red-400", shadow: "shadow-[0_0_20px_rgba(220,38,38,0.5)]", bg: "bg-red-500" };
  };

  const severityLabels = ["None", "Low", "Mild", "Moderate", "High", "Severe"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30 overflow-x-hidden relative">
      
      {/* ── Background Atmos ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-red-900/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] mix-blend-screen opacity-20"/>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-24">
        
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Configure Your <span className={`text-transparent bg-clip-text ${cyberGradient} filter drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]`}>Defense Profile</span>
          </h1>
          <p className="text-slate-400 font-light tracking-wide">
            Calibrate your environmental sensors and clinical triggers.
          </p>
        </div>

        <div className="space-y-8">
          
          {/* ── Section 1: Operative Details ──────────────────────────────── */}
          <section className={glassPanel}>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
              <UserIcon className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold tracking-widest text-slate-100 uppercase">Operative Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input type="text" placeholder="Citizen Identity" className={inputTheme}
                  value={form.fullName}
                  onChange={(e) => setForm({...form, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input type="email" placeholder="secure.comms@network.com" className={inputTheme}
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center justify-between">
                  <span>Primary Location (Pincode / Address)</span>
                  <span className="text-[9px] text-slate-500 font-mono tracking-normal">*Required to calibrate your local H3 hex grid</span>
                </label>
                <input type="text" placeholder="Sector 4 / Area Code"
                  className={`${inputTheme} border-teal-900/50 focus:ring-teal-400/50 bg-teal-950/20`}
                  value={form.location}
                  onChange={(e) => setForm({...form, location: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* ── Section 2: Clinical Triggers ──────────────────────────────── */}
          <section className={glassPanel}>
             <div className="flex items-center gap-3 mb-8 border-b border-slate-700/50 pb-4">
              <DnaIcon className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold tracking-widest text-slate-100 uppercase">Clinical Triggers</h2>
            </div>
            <p className="text-xs text-slate-400 mb-8 border-l-2 border-yellow-500/50 pl-3">
              Input localized reactivity levels from prick test data (0: None to 5: Severe).
            </p>

            <div className="space-y-8">
              {[
                { id: 'trees', label: 'Trees (e.g., Oak, Birch)' },
                { id: 'grasses', label: 'Grasses (e.g., Timothy, Ryegrass)' },
                { id: 'weeds', label: 'Weeds (e.g., Ragweed, Mugwort)' },
              ].map(trigger => {
                const val = form.triggers[trigger.id];
                const styles = getSeverityStyle(val);
                return (
                  <div key={trigger.id} className="bg-slate-950/50 p-5 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-end mb-4">
                      <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{trigger.label}</label>
                      <span className={`text-xs font-black uppercase tracking-widest ${styles.color}`}>{severityLabels[val]} ({val}/5)</span>
                    </div>
                    <div className="relative pt-2">
                      <input 
                        type="range" min="0" max="5" step="1" 
                        value={val}
                        onChange={(e) => updateTrigger(trigger.id, e.target.value)}
                        className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800/80 outline-none accent-transparent transition-all ${styles.shadow}`}
                        style={{
                          background: `linear-gradient(to right, 
                            ${val <= 1 ? '#4ade80' : val <= 3 ? '#facc15' : '#dc2626'} 0%, 
                            ${val <= 1 ? '#4ade80' : val <= 3 ? '#facc15' : '#dc2626'} ${(val/5)*100}%, 
                            rgba(30, 41, 59, 1) ${(val/5)*100}%, rgba(30, 41, 59, 1) 100%)`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Section 3: Symptom & Mitigation Baseline ─────────────────── */}
          <section className={glassPanel}>
            <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
              <CrosshairIcon className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold tracking-widest text-slate-100 uppercase">Symptom Baseline</h2>
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-4">Observed Reactions</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'asthma', label: 'Asthma' },
                  { id: 'rhinitis', label: 'Allergic Rhinitis' },
                  { id: 'eyes', label: 'Itchy/Watery Eyes' },
                  { id: 'hives', label: 'Hives/Skin Rash' }
                ].map(sym => (
                  <button
                    key={sym.id}
                    onClick={() => toggleSymptom(sym.id)}
                    className={`px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                      form.symptoms[sym.id] 
                        ? 'border-orange-500 bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.3)]' 
                        : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {sym.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                Current Medications
                <span className="text-[9px] text-slate-600 font-mono tracking-normal font-normal normal-case">Customize AI Advisory</span>
              </label>
              <textarea 
                className={`${inputTheme} resize-none h-24`} 
                placeholder="e.g., Antihistamines, Albuterol Inhaler..."
                value={form.medications}
                onChange={(e) => setForm({...form, medications: e.target.value})}
              />
            </div>
          </section>

          {/* ── Section 4: Alert Calibration ──────────────────────────────── */}
          <section className={glassPanel}>
             <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-4">
              <BellIcon className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-bold tracking-widest text-slate-100 uppercase">Alert Calibration</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'push', label: 'Push Notifications', sub: 'For High/Severe triggers in your mapped area.' },
                { id: 'email', label: 'Daily Morning Briefing', sub: 'Automated email sent at 0600 hrs local time.' },
                { id: 'proximity', label: 'Proximity Warnings', sub: 'Geo-fence alerts when traveling into high-pollen pincodes.' }
              ].map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{alert.label}</h4>
                    <p className="text-xs text-slate-500 mt-1">{alert.sub}</p>
                  </div>
                  <button 
                    onClick={() => toggleAlert(alert.id)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-300 flex items-center px-1 ${
                      form.alerts[alert.id] ? 'bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full transition-transform duration-300 bg-white ${
                      form.alerts[alert.id] ? 'transform translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ── Footer Action ─────────────────────────────────────────────── */}
          <div className="pt-8">
            <button 
              onClick={() => {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
                setSaved(true);
                setTimeout(() => navigate('/forecast'), 600);
              }}
              className={`w-full relative px-8 py-5 rounded-2xl text-lg font-black uppercase tracking-[0.15em] text-white shadow-[0_0_40px_rgba(74,222,128,0.3)] hover:shadow-[0_0_60px_rgba(250,204,21,0.5)] transition-all overflow-hidden group border border-teal-400/50 hover:border-yellow-400/50`}
            >
              <div className={`absolute inset-0 ${cyberGradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              <span className="relative flex items-center justify-center gap-3">
                <DnaIcon className="w-5 h-5 animate-pulse" />
                {saved ? 'Profile Saved ✓' : 'Initialize Radar & Save Profile'}
              </span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
