/** Deterministic synthetic samples. NEVER label these as real flights. */
const COUNTRY = ['India', 'United Kingdom', 'United States', 'Singapore', 'United Arab Emirates', 'Japan'];
export function demoSnapshot(region, frame = 0) {
  const [south, west, north, east] = region.bounds;
  const now = Math.floor(Date.now() / 1000);
  const aircraft = Array.from({ length: 48 }, (_, i) => {
    const seed = (i * 31 + 17) % 101;
    const shift = frame * (0.004 + (i % 6) * 0.0008);
    const latRange = north - south, lonRange = east - west;
    const lat = south + ((seed / 101 * .85 + .075 + Math.sin(frame * 0.1 + i) * .007) % 1) * latRange;
    const lon = west + (((i * 0.6180339887 + .1 + shift) % .88) + .05) * lonRange;
    return {
      icao24: `de${(1000 + i).toString(16).padStart(4, '0')}`,
      callsign: `SIM${String(i + 1).padStart(3, '0')}`,
      country: COUNTRY[i % COUNTRY.length],
      latitude: lat, longitude: lon,
      geoAltitude: i % 9 === 0 ? 850 : 2300 + (i * 467) % 10100,
      baroAltitude: i % 9 === 0 ? 810 : 2250 + (i * 467) % 10000,
      onGround: i % 17 === 0,
      velocity: 110 + (i * 19) % 210,
      heading: (i * 59 + frame * 3) % 360,
      verticalRate: ((i % 7) - 3) * 1.5,
      timePosition: now, lastContact: now, squawk: null, positionSource: 0,
    };
  }).filter((_, i) => frame % 5 !== 4 || i % 11 !== 0);
  return { aircraft, sampleTime: now, fetchedAt: now, source: 'demo', ageSeconds: 0, retryAfter: 0 };
}
