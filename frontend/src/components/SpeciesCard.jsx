import React from 'react';

const STAGES = ['DORMANT', 'BUDDING', 'EARLY_BLOOM', 'PEAK_BLOOM', 'LATE_BLOOM', 'POST_BLOOM'];
const STAGE_LABELS = {
  DORMANT: 'Dormant', BUDDING: 'Budding', EARLY_BLOOM: 'Early',
  PEAK_BLOOM: 'Peak', LATE_BLOOM: 'Late', POST_BLOOM: 'Post',
};

const TYPE_STYLE = {
  tree: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
  grass: 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50',
  weed: 'bg-orange-900/60 text-orange-300 border-orange-700/50',
};

const INDEX_COLOR = (idx) => {
  if (idx <= 1) return '#4ade80';
  if (idx <= 2.5) return '#facc15';
  if (idx <= 3.5) return '#fb923c';
  return '#ef4444';
};

const SpeciesCard = ({ species }) => {
  const {
    name, pollen_type, current_stage, pollen_index, pollen_prob,
    days_to_peak, confidence, inat_obs_count, sources = [],
  } = species;

  const stageIdx = STAGES.indexOf(current_stage);
  const progress = stageIdx >= 0 ? stageIdx / (STAGES.length - 1) : 0;
  const color = INDEX_COLOR(pollen_index);

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-semibold text-white text-sm leading-tight">{name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${TYPE_STYLE[pollen_type] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
          {pollen_type}
        </span>
      </div>

      {/* Stage progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Dormant</span>
          <span className="text-white font-medium text-[11px]">{STAGE_LABELS[current_stage] || current_stage}</span>
          <span>Post</span>
        </div>
        <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          {/* Stage tick marks */}
          {STAGES.map((_, idx) => (
            <div
              key={idx}
              className="absolute top-0 w-px h-full bg-slate-600 z-10"
              style={{ left: `${(idx / (STAGES.length - 1)) * 100}%` }}
            />
          ))}
          {/* Fill bar */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, backgroundColor: color }}
          />
          {/* Current position dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-slate-900 transition-all duration-500 z-20"
            style={{ left: `calc(${progress * 100}% - 6px)`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Index</p>
          <p className="font-bold text-sm" style={{ color }}>{pollen_index?.toFixed(1)}<span className="text-slate-500 font-normal">/5</span></p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Peak</p>
          <p className="font-bold text-sm text-white">
            {days_to_peak === 0 ? <span style={{ color }}>Today</span> : `${days_to_peak}d`}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Conf.</p>
          <p className="font-bold text-sm text-white">{Math.round((confidence || 0) * 100)}%</p>
        </div>
      </div>

      {/* Source & observation footer */}
      {inat_obs_count > 0 && (
        <p className="mt-2 text-[10px] text-slate-500 text-center">
          Based on {inat_obs_count} local iNat observation{inat_obs_count !== 1 ? 's' : ''}
          {sources.includes('google') && ' · Google Pollen confirmed'}
        </p>
      )}
    </div>
  );
};

export default SpeciesCard;
