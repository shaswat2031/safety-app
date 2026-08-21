/**
 * Real-world Road Routing Engine using OSRM (Open Source Routing Machine) API
 * Provides exact road geometry, turn-by-turn distance, and driving duration.
 */

export async function fetchRealRoadRoute(startLng, startLat, endLng, endLat) {
  if (!startLng || !startLat || !endLng || !endLat) {
    return null;
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout limit

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM API error: ${res.statusText}`);
    }

    const data = await res.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates; // Array of [lng, lat]
      const distanceMeters = route.distance; // Distance in meters
      const durationSeconds = route.duration; // Estimated driving time in seconds

      return {
        success: true,
        coordinates, // [[lng, lat], ...]
        distanceKm: (distanceMeters / 1000).toFixed(2),
        durationMins: Math.ceil(durationSeconds / 60),
        durationText: `${Math.ceil(durationSeconds / 60)} mins`,
        distanceText: `${(distanceMeters / 1000).toFixed(1)} km`,
      };
    }
  } catch (err) {
    console.warn("Real road route fetch notice (falling back to curved road approximation):", err.message);
  }

  // Graceful Fallback: Generate curved realistic road-like waypoint interpolation
  return generateFallbackRoadPath(startLng, startLat, endLng, endLat);
}

/**
 * Fallback generator for realistic road curve when offline or network fails
 */
function generateFallbackRoadPath(startLng, startLat, endLng, endLat) {
  const steps = 15;
  const coordinates = [];

  const midLng = (startLng + endLng) / 2;
  const midLat = (startLat + endLat) / 2;

  // Add slight offset curve to mimic road turns
  const deltaLng = endLng - startLng;
  const deltaLat = endLat - startLat;
  const perpLng = -deltaLat * 0.15;
  const perpLat = deltaLng * 0.15;

  const control1 = [startLng + deltaLng * 0.25 + perpLng, startLat + deltaLat * 0.25 + perpLat];
  const control2 = [startLng + deltaLng * 0.75 - perpLng, startLat + deltaLat * 0.75 - perpLat];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Cubic Bezier Curve formula
    const lng =
      Math.pow(1 - t, 3) * startLng +
      3 * Math.pow(1 - t, 2) * t * control1[0] +
      3 * (1 - t) * Math.pow(t, 2) * control2[0] +
      Math.pow(t, 3) * endLng;

    const lat =
      Math.pow(1 - t, 3) * startLat +
      3 * Math.pow(1 - t, 2) * t * control1[1] +
      3 * (1 - t) * Math.pow(t, 2) * control2[1] +
      Math.pow(t, 3) * endLat;

    coordinates.push([lng, lat]);
  }

  // Calculate approximate Haversine distance
  const R = 6371; // Earth radius km
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLng = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((endLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = (R * c * 1.3).toFixed(2); // 1.3 road factor

  return {
    success: false,
    isFallback: true,
    coordinates,
    distanceKm: distKm,
    durationMins: Math.max(1, Math.ceil(distKm * 2.5)),
    durationText: `${Math.max(1, Math.ceil(distKm * 2.5))} mins`,
    distanceText: `${distKm} km`,
  };
}
