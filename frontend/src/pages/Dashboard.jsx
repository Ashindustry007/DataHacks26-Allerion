
import React, { useState } from 'react';
import { ArrowUp, X } from 'lucide-react';

// Mock data reflecting the new API contract
const mockForecast = {
  location: { lat: 32.71, lng: -117.16, city: "San Diego" },
  daily: [
    {
      date: "2026-04-18",
      composite_index: 4.1,
      severity: "high",
      top_species: [
        { name: "White oak", current_stage: "PEAK_BLOOM", pollen_prob: 0.82 }
      ]
    }
  ],
  narrative: {
    headline: "Oak pollen peaks this weekend",
    today_summary: "Tree pollen is high in your area today, driven primarily by white oak. Keep windows closed during morning hours (5-10 AM)."
  }
};

// Helper to get severity color for accents
const getSeverityColor = (value, type = 'text') => {
    const intensity = typeof value === 'string' ? { 'low': 1, 'moderate': 2.5, 'high': 4, 'severe': 5 }[value] : value;
    if (intensity <= 1.5) return type === 'bg' ? 'bg-teal-400' : 'text-teal-400';
    if (intensity <= 3.0) return type === 'bg' ? 'bg-yellow-400' : 'text-yellow-400';
    if (intensity <= 4.5) return type === 'bg' ? 'bg-orange-400' : 'text-orange-400';
    return type === 'bg' ? 'bg-red-600' : 'text-red-600';
};

const textGlowStyle = (severity) => {
    const colorMap = {
        'low': 'rgb(74 222 128 / 0.7)', // teal-400
        'moderate': 'rgb(250 204 21 / 0.7)', // yellow-400
        'high': 'rgb(251 146 60 / 0.7)', // orange-400
        'severe': 'rgb(220 38 38 / 0.7)', // red-600
    };
    return { textShadow: `0 0 12px ${colorMap[severity] || 'rgb(255 255 255 / 0.7)'}` };
};

// Sub-components for clarity
const SpeciesProgressBar = ({ name, stage, progress, subtext }) => {
    const color = getSeverityColor(progress * 5, 'bg');
    const formattedStage = stage.replace(/_/g, ' ').toLowerCase();

    return (
        <div>
            <div className="flex justify-between items-baseline">
                <p className="text-sm font-medium capitalize">{name} <span className="text-xs text-slate-400">{formattedStage}</span></p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 my-1">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${progress * 100}%` }}></div>
            </div>
            {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
        </div>
    );
};

const ProfileDrawer = ({ onClose }) => (
    <div className="absolute top-0 right-0 h-full w-full md:w-1/3 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700 p-6 z-30 animate-slide-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
        <h2 className="text-xl font-bold mb-6 text-white" style={textGlowStyle()}>User Reactivity Profile</h2>
        
        <div className="space-y-4">
            <h3 className="font-semibold text-slate-300">Known Triggers (Prick Test Results)</h3>
            <SpeciesProgressBar name="Grass (Timothy/Ryegrass)" stage="High Sensitivity" progress={0.9} />
            <SpeciesProgressBar name="Trees (Oak/Birch)" stage="Moderate Sensitivity" progress={0.6} />
            <SpeciesProgressBar name="Weeds (Ragweed)" stage="Low Sensitivity" progress={0.2} />
        </div>

        <div className="mt-8">
            <h3 className="font-semibold text-slate-300">Personalized Alert Settings</h3>
            <div className="flex items-center justify-between mt-4 bg-slate-900/50 p-3 rounded-lg">
                <label htmlFor="oak-alert" className="text-sm">Push notifications when Oak &gt; 3.0</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="oak-alert" id="oak-alert" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                    <label htmlFor="oak-alert" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                </div>
            </div>
             <div className="flex items-center justify-between mt-2 bg-slate-900/50 p-3 rounded-lg">
                <label htmlFor="weekly-email" className="text-sm">Email weekly forecast</label>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="weekly-email" id="weekly-email" defaultChecked className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
                    <label htmlFor="weekly-email" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                </div>
            </div>
        </div>
    </div>
);


const Dashboard = () => {
    const [forecast, setForecast] = useState(mockForecast);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    if (!forecast) {
        return <div className="bg-slate-900 min-h-screen flex items-center justify-center text-white">Loading Forecast...</div>;
    }

    const { location, daily, narrative } = forecast;
    const today = daily[0];
    const severity = today.severity;
    const heroMetric = today.composite_index;

    return (
        <main className="bg-slate-900 min-h-screen font-sans text-white relative overflow-hidden">
            {/* Map Background & Pins */}
            <div className="absolute inset-0 z-0">
                <div className="h-full w-full bg-slate-800 flex items-center justify-center">
                    <p className="text-4xl text-slate-700 font-bold">[Interactive Heatmap Placeholder]</p>
                    {/* Mock City Pins */}
                     <div className="absolute top-1/2 left-1/3 p-2 bg-slate-900/50 backdrop-blur-sm rounded-lg border border-teal-500/50">
                        <p className="font-bold text-sm">San Diego (Downtown)</p>
                        <p className="text-xs text-slate-300">Composite Index: <span className="text-teal-400">2.1/5</span></p>
                    </div>
                     <div className="absolute top-1/3 left-2/3 p-2 bg-slate-900/50 backdrop-blur-sm rounded-lg border border-red-500/50">
                        <p className="font-bold text-sm">El Cajon</p>
                        <p className="text-xs text-slate-300">Composite Index: <span className="text-red-500">4.8/5</span>. Top: White Oak</p>
                    </div>
                </div>
            </div>
            
            {/* Top Search Bar */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 w-full max-w-md z-20">
                <input 
                    type="text" 
                    placeholder="Enter Pincode or City to scan local H3 cells"
                    className="w-full bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 text-center text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
            </div>

            {/* Floating UI Panels */}
            <div className="relative z-10 p-4 md:p-6 h-screen w-screen pointer-events-none grid grid-rows-[auto_1fr_auto] grid-cols-1 md:grid-cols-3 gap-6">

                {/* Top-Left Panel: Daily Forecast */}
                <div className="md:col-span-1 pointer-events-auto bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
                    <h2 className="font-semibold text-slate-300">Current Pollen Index</h2>
                    <div className="flex items-baseline gap-3">
                        <span className={`text-6xl font-bold ${getSeverityColor(severity)}`} style={textGlowStyle(severity)}>{heroMetric}</span>
                        <span className="text-3xl text-slate-400">/ 5</span>
                        <div className="flex items-center text-red-500">
                           <ArrowUp size={20} />
                           <span className="font-semibold text-sm">+12% vs yesterday</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <SpeciesProgressBar name={today.top_species[0].name} stage={today.top_species[0].current_stage} progress={today.top_species[0].pollen_prob} subtext="Based on 12 local iNat observations." />
                        <SpeciesProgressBar name="Timothy grass" stage="EARLY_BLOOM" progress={0.45} />
                        <SpeciesProgressBar name="Common ragweed" stage="DORMANT" progress={0.05} />
                    </div>
                </div>

                {/* Top-Right Panel: AI Advisory */}
                <div className="md:col-start-3 md:col-span-1 pointer-events-auto bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl p-4 flex flex-col">
                    <h2 className="font-semibold text-slate-300">AI Advisory</h2>
                    <div className="flex-grow flex flex-col justify-center gap-3">
                        <h3 className="text-xl font-bold text-white" style={{textShadow: '0 0 8px rgba(255,255,255,0.7)'}}>{narrative.headline}</h3>
                        <p className="text-sm text-slate-300">{narrative.today_summary}</p>
                    </div>
                    <button onClick={() => setIsDrawerOpen(true)} className="w-full font-semibold bg-teal-500/20 text-teal-300 border border-teal-500 rounded-lg py-2 hover:bg-teal-500/40 transition-all duration-300" style={{textShadow: '0 0 8px rgb(74 222 128 / 0.5)'}}>
                        Open Health Profile / Prick Test Data
                    </button>
                </div>

                {/* Bottom Bar: 14-Day Timeline */}
                <div className="md:col-span-3 self-end pointer-events-auto bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-xl p-4 flex items-center justify-center gap-1 h-28">
                    {/* Mock 14-day bars */}
                    {[...Array(14)].map((_, i) => {
                        const isEstimate = i >= 5;
                        const barHeight = Math.random() * 80 + 10;
                        const color = getSeverityColor(Math.random() * 5, 'bg');

                        return (
                            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center">
                                {i === 5 && <span className="absolute -translate-x-1/2 text-xs text-slate-500 transform bottom-[100px]">Estimation Threshold</span>}
                                {i === 4 && <div className="absolute h-full border-l border-dashed border-slate-600 ml-[-2px]"></div>}
                                <div 
                                    className={`w-full rounded-t-sm ${color}`}
                                    style={{ height: `${barHeight}%`, opacity: isEstimate ? 0.5 : 1 }}
                                ></div>
                                <span className="text-xs text-slate-400 mt-1">{new Date(new Date().setDate(new Date().getDate() + i)).getDate()}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {/* Slide-Out Drawer */}
            {isDrawerOpen && <ProfileDrawer onClose={() => setIsDrawerOpen(false)} />}
        </main>
    );
};

export default Dashboard;

