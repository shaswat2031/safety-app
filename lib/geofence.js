/**
 * High-precision Geofencing & Spatial Calculations
 * Provides ray-casting point-in-polygon checks, Haversine distance, and area estimation.
 */

/**
 * Checks if a [lat, lng] point is inside a polygon defined by an array of [lat, lng] coordinates.
 * Uses the ray-casting algorithm.
 * @param {[number, number]} point - [lat, lng]
 * @param {Array<[number, number]>} polygon - Array of [lat, lng]
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;

  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Computes great-circle distance between two [lat, lng] points using Haversine formula in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in meters
 */
export function getHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates current worker coordinates against all defined geofence zones.
 * @param {[number, number]} coords - [lat, lng]
 * @param {Array<Object>} zones - List of geofence zones
 * @returns {{ currentZone: Object|null, isBreached: boolean, breachType: string|null }}
 */
export function evaluateGeofence(coords, zones) {
  if (!coords || !zones || zones.length === 0) {
    return { currentZone: null, isBreached: false, breachType: null };
  }

  // Find all zones containing the worker
  const activeZones = zones.filter(
    (z) => z.is_active && isPointInPolygon(coords, z.polygon_coordinates)
  );

  if (activeZones.length === 0) {
    return {
      currentZone: null,
      isBreached: false,
      breachType: null,
      zoneName: "Outside Monitored Perimeter",
    };
  }

  // Prioritize highest severity zone (hazard > restricted > no_network > safe)
  const priority = { hazard: 4, restricted: 3, no_network: 2, safe: 1 };
  activeZones.sort(
    (a, b) => (priority[b.zone_type] || 0) - (priority[a.zone_type] || 0)
  );

  const topZone = activeZones[0];
  const isBreached = topZone.zone_type === "hazard" || topZone.zone_type === "restricted";

  return {
    currentZone: topZone,
    isBreached,
    breachType: topZone.zone_type,
    zoneName: topZone.zone_name,
  };
}

/**
 * Calculates approximate polygon area in square meters.
 * @param {Array<[number, number]>} polygon - Array of [lat, lng]
 * @returns {number}
 */
export function calculatePolygonArea(polygon) {
  if (!polygon || polygon.length < 3) return 0;
  const R = 6378137; // Earth equatorial radius
  let area = 0;

  if (polygon.length > 2) {
    for (let i = 0; i < polygon.length; i++) {
      let p1 = polygon[i];
      let p2 = polygon[(i + 1) % polygon.length];
      area +=
        (((p2[1] - p1[1]) * Math.PI) / 180) *
        (2 + Math.sin((p1[0] * Math.PI) / 180) + Math.sin((p2[0] * Math.PI) / 180));
    }
    area = (area * R * R) / 2.0;
  }
  return Math.abs(Math.round(area));
}
