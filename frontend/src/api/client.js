// Set MOCK=true for independent frontend dev without a running backend
const MOCK = true;

// ---------------------------------------------------------------------------
// Mock data — matches the ForecastResponse API contract exactly
// ---------------------------------------------------------------------------

function buildMockForecast(lat, lng) {
  return {
    location: { lat, lng, h3_cell: "842a100ffffffff", city: "San Diego" },
    generated_at: new Date().toISOString(),
    daily: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
      day_offset: i,
      confidence_tier: i < 5 ? "high" : "estimated",
      composite_index: Math.round((2.5 + Math.sin(i / 3) * 1.5) * 10) / 10,
      severity: ["low", "moderate", "high", "moderate"][i % 4],
      top_species: [
        {
          species_id: 56928, name: "White oak", pollen_type: "tree",
          current_stage: "PEAK_BLOOM", pollen_prob: 0.82, pollen_index: 4.1,
          days_to_peak: 0, peak_date_est: null, confidence: 0.85,
          sources: ["inat", "google", "base"], seasonal_shift_days: -8,
          inat_obs_count: 12, google_upi: 4,
        },
        {
          species_id: 48678, name: "Common ragweed", pollen_type: "weed",
          current_stage: "DORMANT", pollen_prob: 0.0, pollen_index: 0,
          days_to_peak: 119, peak_date_est: null, confidence: 0.9,
          sources: ["base"], seasonal_shift_days: 0,
          inat_obs_count: 0, google_upi: 0,
        },
        {
          species_id: 64727, name: "Timothy grass", pollen_type: "grass",
          current_stage: "EARLY_BLOOM", pollen_prob: 0.45, pollen_index: 1.8,
          days_to_peak: 14, peak_date_est: null, confidence: 0.7,
          sources: ["base"], seasonal_shift_days: 0,
          inat_obs_count: 3, google_upi: null,
        },
      ],
    })),
    narrative: {
      headline: "Oak pollen peaks this weekend",
      today_summary: "Tree pollen is high in your area today, driven primarily by white oak. Keep windows closed during morning hours (5–10 AM) and shower after being outside.",
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

// Pre-generated approximate hexagonal GeoJSON cells around San Diego
function buildMockHeatmap(lat, lng) {
  const r = 0.18; // approximate hex radius in degrees at resolution 4
  const centers = [
    [lat, lng, "high", 3.8, "White oak"],
    [lat + r * 1.5, lng, "moderate", 2.3, "White oak"],
    [lat - r * 1.5, lng, "very_high", 4.6, "White oak"],
    [lat + r * 0.75, lng + r * 1.3, "high", 3.2, "Timothy grass"],
    [lat - r * 0.75, lng + r * 1.3, "moderate", 2.1, "Eastern red cedar"],
    [lat + r * 0.75, lng - r * 1.3, "low", 1.1, "Common ragweed"],
    [lat - r * 0.75, lng - r * 1.3, "high", 3.5, "White oak"],
    [lat + r * 1.5, lng - r * 2.6, "moderate", 2.7, "Paper birch"],
    [lat - r * 1.5, lng + r * 2.6, "very_high", 4.2, "White oak"],
    [lat, lng + r * 2.6, "low", 0.9, "Kentucky bluegrass"],
    [lat, lng - r * 2.6, "high", 3.9, "White oak"],
    [lat + r * 3, lng, "moderate", 2.0, "Timothy grass"],
    [lat - r * 3, lng, "moderate", 2.5, "Paper birch"],
  ];

  const features = centers.map(([cLat, cLng, severity, composite_index, top_species_name], idx) => {
    // Approximate hexagon polygon
    const coords = Array.from({ length: 6 }, (_, k) => {
      const angle = (Math.PI / 3) * k;
      return [cLng + r * 0.65 * Math.cos(angle), cLat + r * 0.65 * Math.sin(angle)];
    });
    coords.push(coords[0]); // close polygon

    return {
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
      properties: {
        h3_cell: `mock_cell_${idx}`,
        lat: parseFloat(cLat.toFixed(4)),
        lng: parseFloat(cLng.toFixed(4)),
        composite_index,
        severity,
        top_species_name,
        top_species_prob: parseFloat((Math.random() * 0.5 + 0.4).toFixed(2)),
      },
    };
  });

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
