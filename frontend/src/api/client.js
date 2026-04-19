const API_URL = 'http://localhost:3000';

export const getForecast = async (lat, lon) => {
  // In a real application, you would make a call to a real API
  // For this example, we're returning mock data
  return {
    advisories: ["High pollen levels expected tomorrow. Take precautions."],
    daily: [
      { date: "2024-05-20", composite_index: 4, severity: "High", species: [{ name: "Oak", pollen_index: 3, current_stage: "Flowering", confidence: 0.8 }, { name: "Ragweed", pollen_index: 4, current_stage: "Flowering", confidence: 0.9 }] },
      { date: "2024-05-21", composite_index: 3, severity: "Moderate", species: [{ name: "Oak", pollen_index: 2, current_stage: "Flowering", confidence: 0.8 }, { name: "Ragweed", pollen_index: 3, current_stage: "Flowering", confidence: 0.9 }] },
      // ... more days
    ],
  };
};

export const getPollenCount = async (lat, lon) => {
    // Mock data, in a real app this would be a network request
    return [
        { h3_index: "89283082807ffff", pollen_index: 5 },
        { h3_index: "89283082817ffff", pollen_index: 7 },
        // ... more h3 indexes
    ];
};

export const uploadPhoto = async (file) => {
    // Mock data, in a real app this would be a network request
    return {
        species: "Birch",
        confidence: 0.95
    }
};