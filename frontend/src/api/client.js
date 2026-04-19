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

// GeoJSON world-scale hex grid — pollen spread across all landmasses
function buildMockHeatmap(_lat, _lng) {
  // Large hexagons visible at world zoom (~1.5° edge ≈ 165km)
  const r = 1.5;

  // Seeded pseudo-random — deterministic, position-based
  function seededRandom(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  // Smooth 2D value noise
  function noise2D(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const a = seededRandom(ix, iy),     b = seededRandom(ix + 1, iy);
    const c = seededRandom(ix, iy + 1), d = seededRandom(ix + 1, iy + 1);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  function hexRing(cLat, cLng, rad) {
    const coords = Array.from({ length: 6 }, (_, k) => {
      const angle = (Math.PI / 3) * k - Math.PI / 6;
      // Compensate for longitude compression at latitude
      const lngScale = 1 / Math.max(0.1, Math.cos(cLat * Math.PI / 180));
      return [cLng + rad * lngScale * Math.cos(angle), cLat + rad * Math.sin(angle)];
    });
    coords.push(coords[0]);
    return coords;
  }

  function classify(ci) {
    if (ci >= 4.0) return "very_high";
    if (ci >= 3.0) return "high";
    if (ci >= 2.0) return "moderate";
    return "low";
  }

  // ── Land regions: [centerLat, centerLng, halfH, halfW, dominantSpecies, baseSeverity]
  // Covers all major continents/landmasses with ecologically correct pollen species
  const LAND_REGIONS = [
    // ── North America ─────────────────────────────────────────
    [48,  -100, 12, 22, "Paper birch",         3.2], // Canadian prairies + Great Plains
    [43,   -80, 10, 12, "White oak",            4.1], // Eastern US / Great Lakes
    [38,   -95, 10, 18, "Common ragweed",       4.5], // US Midwest
    [35,  -119,  8, 10, "Perennial ryegrass",   3.8], // California
    [31,  -100,  8, 14, "Timothy grass",        3.0], // Texas / SW US
    [54,  -110, 10, 18, "Paper birch",          2.8], // Northern Canada
    [62,  -140,  8, 18, "Paper birch",          2.0], // Alaska / Yukon
    [20,   -95,  8, 10, "Common ragweed",       3.5], // Mexico
    [18,   -75,  5,  8, "Timothy grass",        3.0], // Caribbean landmass

    // ── South America ─────────────────────────────────────────
    [-8,   -56, 12, 16, "Timothy grass",        2.5], // Amazon basin
    [-15,  -47,  8, 12, "Common ragweed",       3.0], // Brazilian plateau
    [-32,  -65, 10, 12, "Perennial ryegrass",   4.0], // Argentina / Pampas
    [-12,  -75,  8,  6, "Timothy grass",        2.8], // Andes slopes
    [5,    -74,  6,  8, "Common ragweed",       2.5], // Colombia / Venezuela

    // ── Europe ───────────────────────────────────────────────
    [50,    10, 10, 18, "Common mugwort",       3.8], // Central Europe
    [58,    15,  8, 12, "Paper birch",          3.5], // Scandinavia
    [47,     2,  8, 10, "Olive",                3.2], // France / Iberia
    [40,    -5,  7,  8, "Olive",                4.2], // Spain
    [45,    15,  7, 10, "White oak",            3.6], // Balkans
    [55,    30,  8, 14, "Paper birch",          3.0], // Eastern Europe
    [37,    23,  5,  8, "Olive",                4.3], // Greece / Turkey
    [52,     0,  5,  8, "Common ragweed",       3.1], // UK / Ireland

    // ── Africa ───────────────────────────────────────────────
    [30,     2, 10, 18, "Common mugwort",       2.0], // North Africa / Maghreb
    [14,    16, 10, 20, "Timothy grass",        2.5], // Sahel belt
    [8,     30,  8, 14, "Timothy grass",        3.5], // East Africa highlands
    [-5,    25,  8, 16, "Timothy grass",        2.8], // Congo basin
    [-25,   28, 10, 12, "Perennial ryegrass",   3.8], // Southern Africa
    [-33,   25,  6,  8, "Olive",                3.2], // Cape region
    [0,     38,  6,  8, "Timothy grass",        3.0], // Horn of Africa

    // ── Asia ─────────────────────────────────────────────────
    [55,    80, 12, 20, "Paper birch",          3.0], // Western Siberia
    [65,   120, 10, 24, "Paper birch",          2.5], // Eastern Siberia
    [50,    90, 10, 18, "Perennial ryegrass",   2.8], // Central Asian steppe
    [35,    80, 10, 18, "Common mugwort",       3.5], // Central Asia / Xinjiang
    [30,   100, 10, 16, "Common mugwort",       3.8], // China interior
    [23,   110,  8, 12, "Timothy grass",        3.3], // South China
    [36,   138,  8, 10, "Northern red oak",     4.0], // Japan
    [37,   127,  6,  8, "Northern red oak",     3.5], // Korean peninsula
    [20,    80, 10, 14, "Common ragweed",       4.0], // Indian subcontinent
    [24,    55,  6,  8, "Common mugwort",       2.5], // Arabian peninsula (partial)
    [38,    35, 10, 16, "Common mugwort",       3.2], // Middle East / Anatolia
    [15,    45,  5,  8, "Timothy grass",        2.0], // Yemen
    [60,    50,  8, 14, "Paper birch",          2.5], // Ural region
    [13,   104,  6,  8, "Timothy grass",        3.0], // Southeast Asia mainland
    [-2,   117,  6,  8, "Timothy grass",        2.8], // Borneo
    [-7,   112,  5,  8, "Timothy grass",        2.5], // Java / Indonesia

    // ── Oceania ──────────────────────────────────────────────
    [-25,  135, 10, 18, "Perennial ryegrass",   3.5], // Australian interior
    [-33,  150,  8, 10, "Perennial ryegrass",   4.0], // SE Australia
    [-37,  175,  5,  6, "Perennial ryegrass",   3.8], // New Zealand
    [-20,  166,  4,  4, "Timothy grass",        2.5], // Pacific islands

    // ── Greenland / Arctic fringe ─────────────────────────────
    [72,   -40,  6, 14, "Paper birch",          1.5], // Greenland coast
    [71,    25,  5, 12, "Paper birch",          1.8], // Svalbard / Norway coast
  ];

  // Global pollen hotspots (absolute world coords)
  const GLOBAL_HOTSPOTS = [
    { lat: 41,  lng: -87,  str: 5.0, rad: 4,  species: "Common ragweed"    }, // Chicago
    { lat: 51,  lng:  0,   str: 4.5, rad: 3,  species: "Common mugwort"    }, // London
    { lat: 35,  lng: 139,  str: 4.8, rad: 3,  species: "Northern red oak"  }, // Tokyo
    { lat: 28,  lng:  77,  str: 4.6, rad: 4,  species: "Common ragweed"    }, // Delhi
    { lat: 30,  lng: 121,  str: 4.3, rad: 3,  species: "Common mugwort"    }, // Shanghai
    { lat:-33,  lng: 151,  str: 4.5, rad: 3,  species: "Perennial ryegrass"}, // Sydney
    { lat: 52,  lng:  13,  str: 4.0, rad: 3,  species: "Common mugwort"    }, // Berlin
    { lat: 40,  lng: -74,  str: 4.8, rad: 4,  species: "Common ragweed"    }, // New York
    { lat: 55,  lng:  37,  str: 3.8, rad: 3,  species: "Paper birch"       }, // Moscow
    { lat: 37,  lng: -122, str: 4.2, rad: 3,  species: "Perennial ryegrass"}, // San Francisco
    { lat: 48,  lng:   2,  str: 3.9, rad: 3,  species: "Olive"             }, // Paris
    { lat:-23,  lng: -46,  str: 3.7, rad: 3,  species: "Common ragweed"    }, // São Paulo
    { lat: 19,  lng:  73,  str: 4.1, rad: 3,  species: "Common ragweed"    }, // Mumbai
    { lat: 31,  lng:  35,  str: 3.5, rad: 2,  species: "Olive"             }, // Tel Aviv
    { lat: -6,  lng: 107,  str: 3.3, rad: 3,  species: "Timothy grass"     }, // Jakarta
    { lat: 59,  lng:  18,  str: 3.6, rad: 2,  species: "Paper birch"       }, // Stockholm
    { lat: 45,  lng: -73,  str: 4.0, rad: 3,  species: "Paper birch"       }, // Montreal
    { lat: 33,  lng:-118,  str: 4.3, rad: 3,  species: "Perennial ryegrass"}, // Los Angeles
    { lat: 43,  lng:  -79, str: 4.1, rad: 3,  species: "White oak"         }, // Toronto
    { lat: 39,  lng: -77,  str: 4.6, rad: 3,  species: "Common ragweed"    }, // Washington DC
    { lat: 50,  lng:   4,  str: 3.8, rad: 2,  species: "Common mugwort"    }, // Brussels
    { lat: 47,  lng:   8,  str: 3.5, rad: 2,  species: "Common mugwort"    }, // Zurich
    { lat: 40,  lng: -4,   str: 4.2, rad: 3,  species: "Olive"             }, // Madrid
    { lat:-34,  lng: -58,  str: 3.6, rad: 3,  species: "Perennial ryegrass"}, // Buenos Aires
    { lat:-26,  lng:  28,  str: 3.9, rad: 3,  species: "Perennial ryegrass"}, // Johannesburg
  ];

  const features = [];
  let idx = 0;
  const HEX_STEP_LAT = r * 1.54;
  const HEX_STEP_LNG = r * 1.78;

  for (const [regLat, regLng, halfH, halfW, regionSpecies, baseSeverity] of LAND_REGIONS) {
    // Generate hex grid rows/cols covering this region's bounding box
    const rowCount = Math.ceil((halfH * 2) / HEX_STEP_LAT);
    const colCount = Math.ceil((halfW * 2) / HEX_STEP_LNG);
    const startRow = -Math.floor(rowCount / 2);
    const startCol = -Math.floor(colCount / 2);

    for (let row = startRow; row <= -startRow; row++) {
      for (let col = startCol; col <= -startCol; col++) {
        const cLat = regLat + row * HEX_STEP_LAT;
        const cLng = regLng + col * HEX_STEP_LNG + (row % 2) * r * 0.89;

        // Bounds check
        if (Math.abs(cLat - regLat) > halfH || Math.abs(cLng - regLng) > halfW) continue;
        // Globe bounds
        if (cLat < -85 || cLat > 85 || cLng < -180 || cLng > 180) continue;

        // Organic noise on coarse grid
        const n1 = noise2D(cLat * 0.15, cLng * 0.15);
        const n2 = noise2D(cLat * 0.30 + 7, cLng * 0.30 + 7) * 0.5;
        const terrainNoise = (n1 + n2) * 0.8; // 0–1.2

        // Skip ~15% of cells randomly for irregular/organic edges
        const skipRng = seededRandom(cLat * 91 + 3, cLng * 137 + 5);
        if (skipRng < 0.15) continue;

        // Global hotspot contribution
        let hotspotVal = 0;
        let dominantSpecies = null;
        let bestContrib = 0;
        for (const hs of GLOBAL_HOTSPOTS) {
          const dlat = cLat - hs.lat, dlng = cLng - hs.lng;
          const hdist = Math.hypot(dlat, dlng);
          const contrib = hs.str * Math.exp(-(hdist * hdist) / (2 * hs.rad * hs.rad));
          hotspotVal += contrib;
          if (contrib > bestContrib) { bestContrib = contrib; dominantSpecies = hs.species; }
        }

        // Random accent spike — ~4% of cells
        const spikeRng = seededRandom(cLat * 53 + 11, cLng * 97 + 17);
        const spike = spikeRng > 0.96 ? (spikeRng - 0.96) * 40 : 0;

        // Final index: regional base + terrain + hotspot + spike
        let ci = baseSeverity * 0.55 + terrainNoise * 1.2 + hotspotVal * 0.4 + spike;
        ci = Math.round(Math.max(0.2, Math.min(5.0, ci)) * 10) / 10;

        const severity = classify(ci);
        const top_species_name = dominantSpecies || regionSpecies;
        const top_species_prob = Math.min(0.95, 0.2 + ci * 0.14 + seededRandom(cLat, cLng) * 0.1);

        // Object for Leaflet Circle: { lat, lng, intensity 0-1, radiusInMeters }
        features.push({
          lat: parseFloat(cLat.toFixed(3)),
          lng: parseFloat(cLng.toFixed(3)),
          intensity: parseFloat((ci / 5).toFixed(3)),   // normalize to 0–1
          radiusInMeters: 80000,
        });
        idx += 1;
      }
    }
  }

  return {
    points: features,             // [[lat, lng, intensity], ...]
    metadata: {
      kernel: 'gaussian',
      radius_km: 165,
      total_points: features.length,
      center: { lat: 20, lng: 0 },
    },
  };
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
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD4aUoax3vID5wTcGyH1OLzyCebwclWsQ4"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  
  const systemInstruction = "You are a botanical expert. Identify the plant in this image, determine its phenology stage (e.g. PEAK_BLOOM, EARLY_BLOOM), and say if it's currently releasing pollen. Return JSON strictly in this schema: {\"success\": true, \"species_name\": string, \"current_stage\": string, \"pollen_releasing\": boolean, \"explanation\": string, \"action\": string}";
  
  try {
     const resp = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         systemInstruction: { parts: [{ text: systemInstruction }] },
         contents: [{ 
            parts: [
              { text: "Analyze this plant image." },
              { inlineData: { mimeType: "image/jpeg", data: image_base64 } }
            ] 
         }],
         generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
       })
     });
     
     const data = await resp.json();
     if (data.error) throw new Error(data.error.message);
     
     return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch(e) {
     // Fallback to mock block if API failed entirely
     if (MOCK) {
       await new Promise(r => setTimeout(r, 1500));
       return MOCK_PHOTO_RESULT;
     }
     throw new Error(`Photo classify failed: ${e.message}`);
  }
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

export async function consultantQuery(text, lat, lng) {
  const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyD4aUoax3vID5wTcGyH1OLzyCebwclWsQ4"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  
  const systemInstruction = `You are an expert AI allergy consultant. You have access to real-time pollen data for the user's location (${lat}, ${lng}). Answer the user's question conversationally but precisely. Keep it 3-6 sentences. Use plain language.`;

  try {
     const resp = await fetch(url, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         systemInstruction: { parts: [{ text: systemInstruction }] },
         contents: [{ parts: [{ text: `User Question: ${text}` }] }],
         generationConfig: { temperature: 0.4 }
       })
     });
     
     const data = await resp.json();
     if (data.error) throw new Error(data.error.message);
     
     return data.candidates[0].content.parts[0].text;
  } catch(e) {
     // MOCK fallback if API fails or is blocked
     if (MOCK) {
       await new Promise(r => setTimeout(r, 800));
       return "Based on recent atmospheric satellite scans near your sector, the local Universal Pollen Index is currently elevated. The primary instigators are White Oak and Perennial Ryegrass. I strongly recommend running a HEPA air filtration system indoors and minimizing outdoor exposure during the mid-day biological peak.";
     }
     throw new Error(`Consultant query failed: ${e.message}`);
  }
}

// Convert backend heatmap response {points: [{lat, lng, weight}]} to Google Maps format.
export function toGoogleHeatmapData(heatmapResponse) {
  const pts = heatmapResponse?.points;
  if (!pts?.length || !window.google) return [];
  return pts.map(p => ({
    location: new window.google.maps.LatLng(p.lat, p.lng),
    weight: p.weight,
  }));
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
