import React, { useState } from 'react';

const SEVERITY_COLORS = {
  low: '#4ade80',
  moderate: '#facc15',
  high: '#fb923c',
  very_high: '#ef4444',
};

const SEVERITY_BG = {
  low: 'rgba(74,222,128,0.15)',
  moderate: 'rgba(250,204,21,0.15)',
  high: 'rgba(251,146,60,0.15)',
  very_high: 'rgba(239,68,68,0.15)',
};

function shortDay(dateStr) {
  // dateStr is YYYY-MM-DD; avoid timezone shift by appending T12:00:00
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

const ForecastTimeline = ({ data = [], onDaySelect }) => {
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!data.length) return null;

  const maxIndex = 5;

  function handleClick(day, idx) {
    setSelectedIdx(idx === selectedIdx ? null : idx);
    onDaySelect?.(idx === selectedIdx ? null : day);
  }

  const selectedDay = selectedIdx !== null ? data[selectedIdx] : null;

  return (
    <div className="w-full">
      {/* Bar chart */}
      <div className="flex items-end gap-0.5 h-24 relative">
        {/* Confidence boundary marker */}
        <div
          className="absolute top-0 bottom-0 border-l border-dashed border-slate-500 z-10"
          style={{ left: `${(5 / data.length) * 100}%` }}
        />

        {data.map((day, i) => {
          const heightPct = Math.max(4, (day.composite_index / maxIndex) * 100);
          const color = SEVERITY_COLORS[day.severity] || '#8884d8';
          const isEstimated = day.confidence_tier === 'estimated';
          const isSelected = selectedIdx === i;

          return (
            <button
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
              onClick={() => handleClick(day, i)}
              title={`${day.date}: ${day.composite_index}/5 (${day.severity})`}
            >
              <div
                className="w-full rounded-t-sm transition-all duration-150"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: color,
                  opacity: isEstimated ? 0.5 : 1,
                  outline: isSelected ? `2px solid ${color}` : 'none',
                  outlineOffset: '1px',
                }}
              />
              <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">
                {shortDay(day.date)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend row */}
      <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
        <span>Today</span>
        <span className="text-slate-600">← High confidence · Estimated →</span>
        <span>Day 14</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div
          className="mt-3 p-3 rounded-xl border border-slate-600 text-sm"
          style={{ background: SEVERITY_BG[selectedDay.severity] || 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white">{selectedDay.date}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ color: SEVERITY_COLORS[selectedDay.severity], border: `1px solid ${SEVERITY_COLORS[selectedDay.severity]}` }}
            >
              {selectedDay.severity.replace('_', ' ').toUpperCase()} · {selectedDay.composite_index}/5
            </span>
          </div>
          <div className="space-y-1">
            {(selectedDay.top_species || []).slice(0, 3).map((sp, j) => (
              <div key={j} className="flex items-center gap-2 text-xs text-slate-300">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: SEVERITY_COLORS[selectedDay.severity] }}
                />
                <span className="font-medium">{sp.name}</span>
                <span className="text-slate-500">({sp.current_stage.replace(/_/g, ' ')})</span>
                <span className="ml-auto text-slate-400">{sp.pollen_index?.toFixed(1)}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastTimeline;
