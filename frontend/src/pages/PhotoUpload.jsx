import React, { useState, useRef, useEffect } from 'react';
import { classifyPhoto, fileToBase64 } from '../api/client';
import PollenIndex from '../components/PollenIndex';
import AdvisoryPanel from '../components/AdvisoryPanel';

const STAGES = ['DORMANT', 'BUDDING', 'EARLY_BLOOM', 'PEAK_BLOOM', 'LATE_BLOOM', 'POST_BLOOM'];
const STAGE_LABELS = {
  DORMANT: 'Dormant', BUDDING: 'Budding', EARLY_BLOOM: 'Early Bloom',
  PEAK_BLOOM: 'Peak Bloom', LATE_BLOOM: 'Late Bloom', POST_BLOOM: 'Post Bloom',
};

function StageBar({ stage }) {
  const idx = STAGES.indexOf(stage);
  const progress = idx >= 0 ? idx / (STAGES.length - 1) : 0;
  const isActive = idx >= 2 && idx <= 4;
  const color = isActive ? '#ef4444' : idx > 4 ? '#94a3b8' : '#64748b';
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>Dormant</span>
        <span className="text-white font-medium">{STAGE_LABELS[stage] || stage}</span>
        <span>Post</span>
      </div>
      <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="absolute h-2 rounded-full" style={{ width: `${Math.max(2, progress * 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ClassificationResult({ result, previewUrl }) {
  const isReleasing = result.pollen_releasing;
  return (
    <div className="space-y-4">
      {/* Photo + identity */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
        {previewUrl && (
          <img src={previewUrl} alt="Uploaded plant" className="w-full h-48 object-cover" />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-lg font-bold text-white">{result.species_name}</h2>
              <p className="text-xs text-slate-400">
                {Math.round(result.confidence * 100)}% confidence
                {result.is_allergen
                  ? <span className="ml-2 text-orange-400 font-medium">⚠ Allergen</span>
                  : <span className="ml-2 text-green-400">✓ Non-allergen</span>}
              </p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold flex-shrink-0 ${
                isReleasing
                  ? 'bg-red-900/50 text-red-300 border border-red-700/60'
                  : 'bg-green-900/50 text-green-300 border border-green-700/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isReleasing ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
              {isReleasing ? 'Pollen: YES' : 'Pollen: NO'}
            </div>
          </div>

          <StageBar stage={result.phenology_stage} />
        </div>
      </div>

      {/* Explanation */}
      {result.explanation && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2">About This Plant</p>
          <p className="text-sm text-slate-300 leading-relaxed">{result.explanation}</p>
        </div>
      )}

      {/* Action card */}
      {result.action && (
        <div className={`rounded-xl p-4 border ${
          isReleasing
            ? 'bg-red-900/20 border-red-700/50'
            : 'bg-green-900/20 border-green-700/50'
        }`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: isReleasing ? '#f87171' : '#4ade80' }}>
            What to do now
          </p>
          <p className="text-sm text-white leading-relaxed">{result.action}</p>
        </div>
      )}

      {/* Local forecast snippet */}
      {result.local_forecast && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">Local Pollen Today</p>
          <div className="flex items-center gap-4">
            <PollenIndex
              index={result.local_forecast.daily?.[0]?.composite_index || 0}
              severity={result.local_forecast.daily?.[0]?.severity || 'low'}
              size={80}
            />
            <div>
              {result.local_forecast.narrative?.headline && (
                <p className="text-sm font-semibold text-white">{result.local_forecast.narrative.headline}</p>
              )}
              <AdvisoryPanel advisory={result.local_forecast.advisory} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main PhotoUpload page
// ---------------------------------------------------------------------------

const PhotoUpload = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [userPos, setUserPos] = useState([32.71, -117.16]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
      );
    }
  }, []);

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large — please use a photo under 10 MB.');
      return;
    }

    setError(null);
    setResult(null);
    setPreviewUrl(URL.createObjectURL(file));
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);
      const [lat, lng] = userPos;
      const classification = await classifyPhoto(base64, lat, lng);
      setResult(classification);
    } catch (err) {
      setError(err.message || 'Classification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setResult(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <main className="bg-slate-900 min-h-screen text-white px-4 pt-5 pb-24 font-sans">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Identify a Plant</h1>
            <p className="text-xs text-slate-400">Photo → species + pollen stage + local forecast</p>
          </div>
          {(result || previewUrl) && (
            <button
              onClick={reset}
              className="text-xs text-slate-400 border border-slate-700 rounded-lg px-3 py-1.5 hover:border-slate-500 transition-colors"
            >
              New photo
            </button>
          )}
        </div>

        {/* Upload area */}
        {!previewUrl && (
          <div
            className="border-2 border-dashed border-slate-600 rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-teal-500/60 hover:bg-teal-900/10 transition-all"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#2dd4bf" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-semibold text-white">Take or upload a photo</p>
              <p className="text-sm text-slate-400 mt-1">Tap to open camera or browse files</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {/* Preview + loading */}
        {previewUrl && !result && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
            <img src={previewUrl} alt="Uploaded" className="w-full h-56 object-cover" />
            {loading && (
              <div className="p-5 flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Identifying plant…</p>
                  <p className="text-xs text-slate-400">Gemini Vision is analyzing your photo</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && <ClassificationResult result={result} previewUrl={previewUrl} />}

        {/* Empty hint */}
        {!previewUrl && !error && (
          <div className="text-center space-y-1 pt-2">
            <p className="text-xs text-slate-500">Works best with clear photos of flowers, catkins, or seed pods</p>
            <p className="text-xs text-slate-600">Powered by Gemini Vision · 15 allergen species tracked</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default PhotoUpload;
