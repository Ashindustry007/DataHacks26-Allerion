import React, { useState } from 'react';

const AdvisoryPanel = ({ advisory }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!advisory) return null;

  const {
    general_measures = [],
    species_tips = [],
    timing_advice,
  } = advisory;

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* Collapsible header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2dd4bf" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="font-semibold text-white text-sm">Prevention Advisory</span>
        </div>
        <svg
          width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#64748b" strokeWidth="2.5"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {/* General measures */}
          {general_measures.length > 0 && (
            <ul className="space-y-1.5">
              {general_measures.map((measure, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-teal-400 flex-shrink-0 mt-0.5">•</span>
                  <span>{measure}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Species-specific tips */}
          {species_tips.length > 0 && (
            <div className="space-y-2">
              {species_tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-900/25 border border-amber-700/40 rounded-lg p-2.5">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#fbbf24" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <p className="text-sm text-amber-200">{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Timing advice */}
          {timing_advice && (
            <div className="flex items-start gap-2 bg-blue-900/25 border border-blue-700/40 rounded-lg p-2.5">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-200 italic">{timing_advice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvisoryPanel;
