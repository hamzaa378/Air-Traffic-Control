// Each small region stays well below OpenSky's 25-square-degree, 1-credit tier.
export const REGIONS = [
  { id: 'chennai', name: 'Chennai, India', center: [13.08, 80.27], bounds: [11.8, 78.7, 14.4, 81.8] },
  { id: 'mumbai', name: 'Mumbai, India', center: [19.08, 72.87], bounds: [17.8, 71.4, 20.4, 74.4] },
  { id: 'delhi', name: 'Delhi, India', center: [28.61, 77.21], bounds: [27.2, 75.8, 30.0, 78.7] },
  { id: 'london', name: 'London, UK', center: [51.51, -0.13], bounds: [50.5, -1.9, 52.6, 1.7] },
  { id: 'dubai', name: 'Dubai, UAE', center: [25.20, 55.27], bounds: [23.9, 53.7, 26.4, 56.8] },
  { id: 'singapore', name: 'Singapore', center: [1.35, 103.82], bounds: [0.2, 102.3, 2.6, 105.3] },
  { id: 'tokyo', name: 'Tokyo, Japan', center: [35.68, 139.69], bounds: [34.5, 138.0, 37.0, 141.2] },
  { id: 'new-york', name: 'New York, USA', center: [40.71, -74.0], bounds: [39.3, -75.5, 42.1, -72.6] },
];

export const INITIAL_FILTERS = { search: '', airborne: 'all', minAltitude: '',
  maxAltitude: '', country: 'all', minSpeed: '' };
export const DEFAULT_ALERTS = { enabled: true, lowAltitude: true, lowAltitudeValue: 1500,
  highSpeed: true, highSpeedValue: 285, zone: false, zoneKm: 35 };
export const REFRESH_MS = 120_000;
export const MAX_HISTORY_POINTS = 100;
