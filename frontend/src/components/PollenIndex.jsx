import React from 'react';

const COLOR_MAP = {
  low: '#4ade80',
  moderate: '#facc15',
  high: '#fb923c',
  very_high: '#ef4444',
};

const LABEL_MAP = {
  low: 'Low', moderate: 'Moderate', high: 'High', very_high: 'Very High',
};

const PollenIndex = ({ index = 0, severity = 'low', size = 160 }) => {
  const color = COLOR_MAP[severity] || '#facc15';
  const label = LABEL_MAP[severity] || severity;

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, index / 5));
  const strokeDashoffset = circumference * (1 - pct);
  const cx = 60;
  const cy = 60;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size} height={size}
          viewBox="0 0 120 120"
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none" stroke="#1e293b" strokeWidth="9"
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
          />
        </svg>

        {/* Center text — counter-rotate so it's upright */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: 'rotate(0deg)' }}
        >
          <span
            className="font-bold leading-none"
            style={{ fontSize: size * 0.28, color }}
          >
            {typeof index === 'number' ? index.toFixed(1) : index}
          </span>
          <span className="text-slate-400" style={{ fontSize: size * 0.1 }}>/ 5</span>
        </div>
      </div>

      <span className="font-semibold text-sm" style={{ color }}>{label}</span>
    </div>
  );
};

export default PollenIndex;
