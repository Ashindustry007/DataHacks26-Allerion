import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LeafIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

const Navbar = () => {
  const navigate = useNavigate();
  const glassPanel = "bg-slate-900/40 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[1000] w-full px-6 py-4 flex items-center justify-between ${glassPanel}`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)] hover:shadow-[0_0_25px_rgba(74,222,128,0.4)] transition-shadow">
          <LeafIcon className="w-5 h-5 text-teal-400" />
        </div>
        <span className="text-xl font-extrabold tracking-widest uppercase text-white hover:text-teal-400 transition-colors">
          Allerion
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-[0.15em] uppercase text-slate-400">
        <Link to="/heatmap" className="hover:text-teal-400 transition-colors">Live Map</Link>
        <Link to="/forecast" className="hover:text-cyan-400 transition-colors">Forecast</Link>
        <Link to="/dashboard" className="hover:text-orange-400 transition-colors">My Profile</Link>
        <Link to="/photo" className="hover:text-teal-300 transition-colors">Identify Plant</Link>
        <Link to="/consultant" className="hover:text-yellow-400 transition-colors">AI Consultant</Link>
      </div>

      <button onClick={() => navigate('/dashboard')} className="md:hidden relative group px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-teal-400 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 transition-all">
        Menu
      </button>

    </nav>
  );
};

export default Navbar;
