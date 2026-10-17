/**
 * Situational-awareness calculations. No API calls or UI dependencies.
 * These indicators describe the quality and density of PUBLIC observations.
 * They are not safety, separation, or collision assessments.
 */
import { isNumber, secondsSinceContact } from './aircraft.js';

export const FRESH_SECONDS = 90;
export const OLD_SECONDS = 300;

export function observationState(plane, now) {
  if (plane.status === 'left') return 'left';
  const timestamp = isNumber(plane.timePosition) ? plane.timePosition : plane.lastContact;
  if (!isNumber(timestamp)) return 'unknown';
  const age = now - timestamp;
  if (age < -15) return 'unknown';
  if (age <= FRESH_SECONDS) return 'fresh';
  return age <= OLD_SECONDS ? 'delayed' : 'old';
}

export function signalSummary(aircraft, now) {
  const active = aircraft.filter(p => p.status !== 'left');
  const states = { fresh: 0, delayed: 0, old: 0, unknown: 0 };
  let withHeading = 0;
  let withSpeed = 0;
  let lastContact = null;
  for (const plane of active) {
    states[observationState(plane, now)]++;
    if (isNumber(plane.heading)) withHeading++;
    if (isNumber(plane.velocity)) withSpeed++;
    if (isNumber(plane.lastContact)) lastContact = Math.max(lastContact ?? 0, plane.lastContact);
  }
  const total = active.length;
  return {
    total, ...states,
    freshPercent: total ? Math.round(100 * states.fresh / total) : 0,
    headingPercent: total ? Math.round(100 * withHeading / total) : 0,
    speedPercent: total ? Math.round(100 * withSpeed / total) : 0,
    lastContact,
  };
}

/** Comparing SAMPLE IDs avoids treating a cached/stale response as new aircraft activity. */
export function compareSnapshots(previous, current, timestamp) {
  if (!previous) return { initial: true, entered: [], missing: [], at: timestamp };
  const before = new Set(previous);
  const after = new Set(current);
  return {
    initial: false,
    entered: [...after].filter(id => !before.has(id)),
    missing: [...before].filter(id => !after.has(id)),
    at: timestamp,
  };
}

/** Fixed spatial grid, not an aviation congestion or separation metric. */
export function densityGrid(aircraft, bounds, rows = 5, cols = 8) {
  const [south, west, north, east] = bounds;
  const cells = Array(rows * cols).fill(0);
  for (const plane of aircraft) {
    if (plane.status === 'left' || !isNumber(plane.latitude) || !isNumber(plane.longitude)) continue;
    if (plane.latitude < south || plane.latitude > north || plane.longitude < west || plane.longitude > east) continue;
    const r = Math.min(rows - 1, Math.floor((north - plane.latitude) / (north - south) * rows));
    const c = Math.min(cols - 1, Math.floor((plane.longitude - west) / (east - west) * cols));
    cells[r * cols + c]++;
  }
  const max = Math.max(0, ...cells);
  const busiest = cells.indexOf(max);
  return { rows, cols, cells, max, occupied: cells.filter(n => n > 0).length,
    total: cells.reduce((a, b) => a + b, 0),
    busiest: max ? { row: Math.floor(busiest / cols), col: busiest % cols, count: max } : null };
}

export function attentionQueue(aircraft, now, watched = [], config = {}, limit = 8) {
  const watchSet = watched instanceof Set ? watched : new Set(watched);
  return aircraft.map(plane => {
    const notes = [];
    const quality = observationState(plane, now);
    let rank = 0;
    if (watchSet.has(plane.icao24)) { notes.push('Pinned to watchlist'); rank += 30; }
    if (quality === 'old' || quality === 'left') { notes.push('Position not recently updated'); rank += 35; }
    else if (quality === 'delayed' || quality === 'unknown') { notes.push('Position needs verification'); rank += 15; }
    const altitude = plane.geoAltitude ?? plane.baroAltitude;
    if (config.enabled && plane.onGround === false && quality !== 'left') {
      if (config.lowAltitude && isNumber(altitude) && altitude < config.lowAltitudeValue) {
        notes.push(`Below ${config.lowAltitudeValue} m watch threshold`); rank += 20;
      }
      if (config.highSpeed && isNumber(plane.velocity) && plane.velocity > config.highSpeedValue) {
        notes.push(`Above ${config.highSpeedValue} m/s watch threshold`); rank += 10;
      }
    }
    if (!isNumber(plane.heading) || !isNumber(plane.velocity)) { notes.push('Movement fields incomplete'); rank += 8; }
    return { icao24: plane.icao24, label: plane.callsign || plane.icao24.toUpperCase(),
      country: plane.country || 'Unknown', quality, notes, rank,
      age: secondsSinceContact(plane, now) };
  }).filter(item => item.rank > 0)
    .sort((a, b) => b.rank - a.rank || a.icao24.localeCompare(b.icao24)).slice(0, limit);
}

export function compassActivity(aircraft, center) {
  const quadrants = { NW: 0, NE: 0, SW: 0, SE: 0 };
  for (const a of aircraft) {
    if (a.status === 'left' || !isNumber(a.latitude) || !isNumber(a.longitude)) continue;
    const name = `${a.latitude >= center[0] ? 'N' : 'S'}${a.longitude >= center[1] ? 'E' : 'W'}`;
    quadrants[name]++;
  }
  return quadrants;
}
