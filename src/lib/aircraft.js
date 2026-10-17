/** Pure functions — easy to test without React or a browser. */
const MAX_MISSING_SECONDS = 300;
export const isNumber = n => typeof n === 'number' && Number.isFinite(n);

export function mergeAircraft(previous, incoming, observedAt) {
  const next = new Map();
  for (const plane of incoming || []) {
    if (!plane?.icao24 || !isNumber(plane.latitude) || !isNumber(plane.longitude)) continue;
    next.set(plane.icao24, { ...plane, status: 'present', seenAt: observedAt });
  }
  for (const [id, plane] of previous) {
    if (next.has(id)) continue;
    if (observedAt - plane.seenAt <= MAX_MISSING_SECONDS) {
      next.set(id, { ...plane, status: 'left' });
    }
  }
  return next;
}

export function shouldRecord(history, plane) {
  const previous = history?.at(-1);
  if (!previous) return true;
  return previous.latitude !== plane.latitude ||
    previous.longitude !== plane.longitude ||
    previous.lastContact !== plane.lastContact;
}

export function appendObservation(history = [], plane, observedAt, cap = 100) {
  if (!shouldRecord(history, plane)) return history;
  return [...history, {
    latitude: plane.latitude, longitude: plane.longitude, lastContact: plane.lastContact,
    heading: plane.heading, altitude: plane.geoAltitude ?? plane.baroAltitude,
    observedAt,
  }].slice(-cap);
}

// Great-circle movement from heading (degrees) and speed (metres per second).
// It is only a visual estimate, NOT an actual ADS-B position.
export function estimatePosition(plane, nowSeconds, maxSeconds = 120) {
  const latest = isNumber(plane.timePosition) ? plane.timePosition : plane.lastContact;
  if (plane.onGround !== false || plane.status === 'left' || !isNumber(latest) ||
      !isNumber(plane.heading) || !isNumber(plane.velocity) ||
      !isNumber(plane.latitude) || !isNumber(plane.longitude)) {
    return { latitude: plane.latitude, longitude: plane.longitude, estimated: false };
  }
  const delta = nowSeconds - latest;
  if (delta <= 0 || delta > maxSeconds) {
    return { latitude: plane.latitude, longitude: plane.longitude, estimated: false };
  }
  const radius = 6_371_000;
  const deg = Math.PI / 180;
  const angle = (plane.velocity * delta) / radius;
  const bearing = plane.heading * deg;
  const lat1 = plane.latitude * deg, lon1 = plane.longitude * deg;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angle) +
    Math.cos(lat1) * Math.sin(angle) * Math.cos(bearing));
  const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(lat1),
    Math.cos(angle) - Math.sin(lat1) * Math.sin(lat2));
  return {
    latitude: lat2 / deg,
    longitude: ((lon2 / deg + 540) % 360) - 180,
    estimated: true,
  };
}

export function secondsSinceContact(plane, nowSeconds) {
  if (!isNumber(plane.lastContact)) return null;
  return Math.max(0, nowSeconds - plane.lastContact);
}

export function filterAircraft(aircraft, filters) {
  const query = filters.search.trim().toLowerCase();
  return aircraft.filter(p => {
    if (query && !`${p.callsign || ''} ${p.icao24} ${p.country}`.toLowerCase().includes(query)) return false;
    if (filters.airborne === 'air' && p.onGround !== false) return false;
    if (filters.airborne === 'ground' && p.onGround !== true) return false;
    if (filters.country !== 'all' && p.country !== filters.country) return false;
    const altitude = p.geoAltitude ?? p.baroAltitude;
    if (filters.minAltitude !== '' && (!isNumber(altitude) || altitude < +filters.minAltitude)) return false;
    if (filters.maxAltitude !== '' && (!isNumber(altitude) || altitude > +filters.maxAltitude)) return false;
    if (filters.minSpeed !== '' && (!isNumber(p.velocity) || p.velocity < +filters.minSpeed)) return false;
    return true;
  });
}

export function kmBetween(a, b) {
  const rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 12_742 * Math.asin(Math.min(1, Math.sqrt(q)));
}

export function evaluateAlerts(aircraft, config, center, nowSeconds = null) {
  if (!config.enabled) return [];
  const alerts = [];
  for (const plane of aircraft) {
    if (plane.status === 'left' || plane.onGround !== false) continue;
    // Do not create *current* threshold notices from very old observations.
    const positionTime = isNumber(plane.timePosition) ? plane.timePosition : plane.lastContact;
    if (isNumber(nowSeconds) && (!isNumber(positionTime) || nowSeconds - positionTime > 300 || positionTime - nowSeconds > 15)) continue;
    const label = plane.callsign || plane.icao24.toUpperCase();
    const altitude = plane.geoAltitude ?? plane.baroAltitude;
    if (config.lowAltitude && isNumber(altitude) && altitude < config.lowAltitudeValue) {
      alerts.push({ id: `${plane.icao24}:alt`, icao24: plane.icao24,
        label, severity: 'warning', message: `Low altitude · ${Math.round(altitude).toLocaleString()} m` });
    }
    if (config.highSpeed && isNumber(plane.velocity) && plane.velocity > config.highSpeedValue) {
      alerts.push({ id: `${plane.icao24}:speed`, icao24: plane.icao24,
        label, severity: 'info', message: `High speed · ${Math.round(plane.velocity)} m/s` });
    }
    if (config.zone && kmBetween(center, [plane.latitude, plane.longitude]) <= config.zoneKm) {
      alerts.push({ id: `${plane.icao24}:zone`, icao24: plane.icao24,
        label, severity: 'zone', message: `Within ${config.zoneKm} km of region center` });
    }
  }
  return alerts.slice(0, 120);
}
