import React from 'react';

// ── Icons (Raw SVGs to avoid dependency issues) ─────────────────────────────
const LeafIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
    <path d="M2 12h20"/>
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const CameraIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

const Landing = () => {
  // Deep glassmorphism preset
  const glassPanel = "bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]";
  
  // Tech-noir gradient string
  const cyberGradient = "bg-gradient-to-r from-[#4ade80] via-[#facc15] via-[#fb923c] to-[#dc2626]";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30 overflow-x-hidden">
      
      {/* ── Background Atmos ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-900/10 blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-900/10 blur-[150px]" />
        {/* Subtle grid overlay to sell the dashboard feel */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"/>
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className={`relative z-50 w-full px-6 py-5 flex items-center justify-between ${glassPanel} border-x-0 border-t-0 rounded-none`}>
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <LeafIcon className="w-5 h-5 text-teal-400" />
          </div>
          <span className="text-xl font-extrabold tracking-widest uppercase text-white">
            Allerion
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-[0.15em] uppercase text-slate-400">
          <a href="#" className="hover:text-teal-400 transition-colors">Live Map</a>
          <a href="#" className="hover:text-orange-400 transition-colors">My Profile</a>
          <a href="#" className="hover:text-yellow-400 transition-colors">Plant Scanner</a>
        </div>

        <button className="relative group px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white overflow-hidden">
          <div className={`absolute inset-0 ${cyberGradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
          <div className="absolute inset-[1px] bg-slate-900 rounded-[7px] transition-all group-hover:bg-slate-900/80" />
          <span className="relative flex items-center justify-center gap-2">
            Sign In
          </span>
        </button>
      </nav>

      {/* ── Main Layout Wrapper ──────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        
        {/* ── Hero Section ────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto text-center mb-32">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 mb-8">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Global Coverage Active</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6">
            Ahead of <br className="md:hidden" />
            <span className={`text-transparent bg-clip-text ${cyberGradient} filter drop-shadow-[0_0_20px_rgba(251,146,60,0.4)]`}>
              Every Trigger.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 font-light leading-relaxed max-w-3xl mx-auto mb-12">
            The world's first AI-powered, species-specific pollen forecasting system. 
            Driven by citizen science and real-time environmental data to protect 
            your respiratory health.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button className={`relative px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-[0.1em] text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(251,146,60,0.5)] transition-shadow overflow-hidden group`}>
              <div className={`absolute inset-0 ${cyberGradient} opacity-90 group-hover:opacity-100`} />
              <span className="relative">Explore the Global Heatmap</span>
            </button>
            
            <button className="px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-[0.1em] text-slate-300 border border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:text-white transition-all">
              Create Your Profile
            </button>
          </div>
        </div>

        {/* ── Features Grid (3 Columns) ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: The Radar */}
          <div className={`group flex flex-col p-8 rounded-3xl ${glassPanel} hover:border-teal-500/30 transition-colors`}>
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(74,222,128,0.1)] group-hover:shadow-[0_0_30px_rgba(74,222,128,0.2)] transition-shadow">
              <GlobeIcon className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Live H3 Heatmap</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-grow">
              Explore our WebGL-powered map. See exactly which neighborhoods are experiencing peak blooms for your specific allergy triggers globally.
            </p>
            <button className="w-full py-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-bold uppercase tracking-widest text-teal-400 hover:bg-teal-500/10 transition-colors mt-auto">
              Enter Map
            </button>
          </div>

          {/* Card 2: The Shield */}
          <div className={`group flex flex-col p-8 rounded-3xl ${glassPanel} hover:border-yellow-500/30 transition-colors`}>
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(250,204,21,0.1)] group-hover:shadow-[0_0_30px_rgba(250,204,21,0.2)] transition-shadow">
              <ShieldIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-wide">Personalized Defense</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-grow">
              Upload your clinical prick test results. Allerion monitors the environment and sends you custom alerts only when your specific triggers are airborne.
            </p>
            <button className="w-full py-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-bold uppercase tracking-widest text-yellow-400 hover:bg-yellow-500/10 transition-colors mt-auto">
              Configure Profile
            </button>
          </div>

          {/* Card 3: The Scout */}
          <div className={`group flex flex-col p-8 rounded-3xl ${glassPanel} hover:border-orange-500/30 transition-colors`}>
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(251,146,60,0.1)] group-hover:shadow-[0_0_30px_rgba(251,146,60,0.2)] transition-shadow">
              <CameraIcon className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 tracking-wide">AI Plant Scanner</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-grow">
              Identify threats on the go. Snap a photo of any plant to instantly learn its species, phenology stage, and current pollen-releasing status.
            </p>
            <button className="w-full py-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-bold uppercase tracking-widest text-orange-400 hover:bg-orange-500/10 transition-colors mt-auto">
              Launch Scanner
            </button>
          </div>

        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-white/5 bg-slate-950/80 backdrop-blur-md py-8 text-center">
        <p className="text-[11px] font-mono text-slate-500 tracking-widest uppercase">
          Built with Google Maps API, Gemini AI, and Databricks. Hackathon Build 2026.
        </p>
      </footer>

    </div>
  );
};

export default Landing;
