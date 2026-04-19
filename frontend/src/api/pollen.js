const GOOGLE_API_KEY = "AIzaSyD4aUoax3vID5wTcGyH1OLzyCebwclWsQ4";

/**
 * Fetch pollen forecast data for a specific geographic coordinate 
 * returning today's Universal Pollen Index (UPI).
 */
export async function getPollenForLocation(lat, lng) {
  const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${GOOGLE_API_KEY}&location.latitude=${lat}&location.longitude=${lng}&days=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
        console.warn(`Pollen API returned ${response.status} for lat: ${lat}, lng: ${lng}`);
        return null;
    }
    
    const data = await response.json();
    
    // Google API returns dailyInfo[0] for today
    if (!data.dailyInfo || data.dailyInfo.length === 0) return null;
    
    const today = data.dailyInfo[0];
    
    // Get the maximum index out of GRASS, WEED, TREE
    let maxUpi = 0;
    
    if (today.pollenTypeInfo) {
      for (const info of today.pollenTypeInfo) {
        // Universal Pollen Index is found within indexInfo (usually index 0)
        const universalIndex = info.indexInfo?.find(idx => idx.code === 'UPI');
        if (universalIndex && universalIndex.value > maxUpi) {
          maxUpi = universalIndex.value;
        }
      }
    }
    
    return {
      upi: maxUpi,
      raw: data
    };
  } catch (error) {
    console.warn("Pollen API Network error:", error);
    return null;
  }
}

/**
 * Score a route's pollen severity by randomly sampling points along its path.
 * We sample roughly up to 5 points (start, midpoints, end) to avoid hitting rate limits too hard.
 * Returns the average API score across the route.
 */
export async function scoreRoutePollen(routePath) {
    if (!routePath || routePath.length === 0) return { score: 0 };
    
    const maxSamples = 5;
    const pointsToSample = [];
    
    if (routePath.length <= maxSamples) {
        pointsToSample.push(...routePath);
    } else {
        const step = Math.floor(routePath.length / (maxSamples - 1));
        for (let i = 0; i < maxSamples - 1; i++) {
            pointsToSample.push(routePath[i * step]);
        }
        pointsToSample.push(routePath[routePath.length - 1]); // Always grab destination
    }
    
    let totalScore = 0;
    let successfulSamples = 0;
    
    // Optionally fetch in parallel (be careful of rate limits, 5 is generally fine)
    const promises = pointsToSample.map(pt => {
      // routePath objects are usually Google Maps LatLng objects or {lat: fn(), lng: fn()}
      const lat = typeof pt.lat === 'function' ? pt.lat() : pt.lat;
      const lng = typeof pt.lng === 'function' ? pt.lng() : pt.lng;
      return getPollenForLocation(lat, lng);
    });
    
    const results = await Promise.all(promises);
    
    for (const res of results) {
        if (res !== null && res.upi !== undefined) {
            totalScore += res.upi;
            successfulSamples++;
        }
    }
    
    const avgUpi = successfulSamples > 0 ? (totalScore / successfulSamples) : 0;
    
    return {
        score: avgUpi,
        samples: successfulSamples
    };
}
