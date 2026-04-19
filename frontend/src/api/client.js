// Set MOCK=true for independent frontend dev without a running backend
const MOCK = true;

// ---------------------------------------------------------------------------
// Mock data — matches the ForecastResponse API contract exactly
// ---------------------------------------------------------------------------

function buildMockForecast(lat, lng) {
  return {
    location: { lat, lng, h3_cell: "842a100ffffffff", city: "San Diego" },
    generated_at: new Date().toISOString(),
    daily: Array.from({ length: 14 }, (_, i) => {
      const base = i === 0 ? 4.1 : Math.round((2.4 + Math.sin(i / 2.8) * 1.65) * 10) / 10;
      const sev = base >= 4 ? "very_high" : base >= 3 ? "high" : base >= 2 ? "moderate" : "low";
      return {
        date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
        day_offset: i,
        confidence_tier: i < 5 ? "high" : "estimated",
        composite_index: i === 0 ? 4.1 : base,
        severity: i === 0 ? "high" : sev,
        top_species: [
          {
            species_id: 56928, name: "White oak", pollen_type: "tree",
            current_stage: "PEAK_BLOOM", pollen_prob: 0.82, pollen_index: 4.1,
            days_to_peak: 0, peak_date_est: null, confidence: 0.85,
            sources: ["inat", "google", "base"], seasonal_shift_days: -8,
            inat_obs_count: 12, google_upi: 4,
          },
          {
            species_id: 64727, name: "Timothy grass", pollen_type: "grass",
            current_stage: "EARLY_BLOOM", pollen_prob: 0.45, pollen_index: 1.8,
            days_to_peak: 14, peak_date_est: null, confidence: 0.7,
            sources: ["base"], seasonal_shift_days: 0,
            inat_obs_count: 3, google_upi: null,
          },
          {
            species_id: 48678, name: "Common ragweed", pollen_type: "weed",
            current_stage: "DORMANT", pollen_prob: 0.0, pollen_index: 0,
            days_to_peak: 119, peak_date_est: null, confidence: 0.9,
            sources: ["base"], seasonal_shift_days: 0,
            inat_obs_count: 0, google_upi: 0,
          },
        ],
      };
    }),
    narrative: {
      headline: "Oak pollen peaks this weekend",
      today_summary: "Tree pollen is high in your area today, driven primarily by white oak. Keep windows closed during morning hours (5-10 AM).",
      seven_day: "Oak pollen will remain elevated through Thursday before declining. Grass pollen is beginning to rise — watch for Timothy grass by mid-week.",
      fourteen_day: "Grass season begins in approximately 3 weeks. Ragweed remains dormant until late summer.",
    },
    advisory: {
      general_measures: [
        "Keep windows closed during peak pollen hours (5–10 AM)",
        "Shower and change clothes after spending time outdoors",
        "Wear sunglasses outdoors to protect eyes from pollen",
        "Use HEPA air filters indoors",
      ],
      species_tips: [
        "Oak pollen is heavy — visible yellow dust on cars is a sign of high levels",
        "Oak cross-reacts with apple, peach, cherry, and hazelnut allergens",
      ],
      timing_advice: "Best outdoor time today: after 4 PM when pollen counts typically drop",
    },
  };
}

// GeoJSON hex grid — coastal (west) = lower composite_index, inland (east) = higher
function buildMockHeatmap(lat, lng) {
  const r = 0.052;
  const coastLng = -117.32;
  const eastLng = -116.88;

  function hexRing(cLat, cLng, radiusDeg) {
    const coords = Array.from({ length: 6 }, (_, k) => {
      const angle = (Math.PI / 3) * k - Math.PI / 6;
      return [cLng + radiusDeg * Math.cos(angle), cLat + radiusDeg * Math.sin(angle)];
    });
    coords.push(coords[0]);
    return coords;
  }

  function classify(composite_index) {
    if (composite_index >= 4.0) return "very_high";
    if (composite_index >= 3.0) return "high";
    if (composite_index >= 2.0) return "moderate";
    return "low";
  }

  const features = [];
  let idx = 0;
  for (let row = -5; row <= 5; row++) {
    for (let col = -5; col <= 5; col++) {
      const dx = col * r * 1.78 + (row % 2) * r * 0.89;
      const dy = row * r * 1.54;
      const cLat = lat + dy;
      const cLng = lng + dx;
      const dist = Math.hypot(dy * 1.1, dx);
      if (dist > 0.42) continue;

      const inland = Math.max(0, Math.min(1, (cLng - coastLng) / (eastLng - coastLng)));
      const composite_index = Math.round((0.55 + inland * 4.35 + (Math.sin(row + col) * 0.15)) * 10) / 10;
      const severity = classify(composite_index);
      const top_species_name = composite_index > 3.2 ? "White oak" : composite_index > 1.7 ? "Timothy grass" : "Common ragweed";
      const top_species_prob = Math.min(0.95, 0.25 + inland * 0.62 + composite_index * 0.05);

      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [hexRing(cLat, cLng, r * 0.92)] },
        properties: {
          h3_cell: `mock_h3_${idx}`,
          lat: parseFloat(cLat.toFixed(4)),
          lng: parseFloat(cLng.toFixed(4)),
          composite_index,
          severity,
          top_species_name,
          top_species_prob: Math.round(top_species_prob * 100) / 100,
        },
      });
      idx += 1;
    }
  }

  return { type: "FeatureCollection", features };
}

const MOCK_PHOTO_RESULT = {
  species_id: 56928,
  species_name: "White oak",
  is_allergen: true,
  phenology_stage: "PEAK_BLOOM",
  pollen_releasing: true,
  confidence: 0.89,
  explanation: "White oak (Quercus alba) is one of the most significant tree allergens in North America. During peak bloom, it releases massive quantities of light, wind-dispersed pollen grains. Individuals with tree pollen allergies often experience severe symptoms when oak is in peak bloom. The visible yellow-green catkins hanging from branches are actively shedding pollen.",
  action: "This tree is actively releasing pollen — avoid prolonged outdoor exposure today and take your antihistamines if prescribed. Consider wearing a mask if you must be outside.",
  local_forecast: null,
};

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getForecast(lat, lng) {
  if (MOCK) {
    await new Promise(r => setTimeout(r, 400)); // simulate network delay
    return buildMockForecast(lat, lng);
  }
  const resp = await fetch(`/api/forecast?lat=${lat}&lng=${lng}`);
  if (!resp.ok) throw new Error(`Forecast fetch failed: ${resp.status}`);
  return resp.json();
}

export async function getHeatmap(lat, lng, radius_km = 30) {
  if (MOCK) {
    await new Promise(r => setTimeout(r, 300));
    return buildMockHeatmap(lat, lng);
  }
  const resp = await fetch(`/api/heatmap?lat=${lat}&lng=${lng}&radius_km=${radius_km}`);
  if (!resp.ok) throw new Error(`Heatmap fetch failed: ${resp.status}`);
  return resp.json();
}

export async function classifyPhoto(image_base64, lat, lng) {
  if (MOCK) {
    await new Promise(r => setTimeout(r, 1500)); // simulate Gemini Vision latency
    return MOCK_PHOTO_RESULT;
  }
  const resp = await fetch('/api/photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64, lat, lng }),
  });
  if (!resp.ok) throw new Error(`Photo classify failed: ${resp.status}`);
  return resp.json();
}

export async function getSpecies() {
  if (MOCK) {
    return [
      { species_id: 56928, name: "White oak", pollen_type: "tree", allergenicity: 4 },
      { species_id: 48678, name: "Common ragweed", pollen_type: "weed", allergenicity: 5 },
      { species_id: 48734, name: "Paper birch", pollen_type: "tree", allergenicity: 4 },
      { species_id: 49085, name: "Eastern red cedar", pollen_type: "tree", allergenicity: 3 },
      { species_id: 64727, name: "Timothy grass", pollen_type: "grass", allergenicity: 4 },
      { species_id: 56891, name: "Northern red oak", pollen_type: "tree", allergenicity: 4 },
      { species_id: 47602, name: "Perennial ryegrass", pollen_type: "grass", allergenicity: 4 },
    ];
  }
  const resp = await fetch('/api/species');
  if (!resp.ok) throw new Error(`Species fetch failed: ${resp.status}`);
  return resp.json();
}

// Helper: convert a File object to base64 string
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
