/**
 * Presentation-only measurement conversions.
 * OpenSky observations, filter thresholds, alerts, replay and exports stay in SI.
 * 1 kt = 1 nautical mile/hour = 1852/3600 m/s exactly.
 */
export const AVIATION_UNITS = Object.freeze({ speed: 'kt', altitude: 'ft', vertical: 'ft/min' });
export const METRIC_UNITS = Object.freeze({ speed: 'km/h', altitude: 'm', vertical: 'm/s' });
export const UNIT_OPTIONS = Object.freeze({
  speed: ['kt', 'km/h', 'm/s'],
  altitude: ['ft', 'm'],
  vertical: ['ft/min', 'm/s'],
});
const MULTIPLIERS = Object.freeze({
  speed: { kt: 3600 / 1852, 'km/h': 3.6, 'm/s': 1 },
  altitude: { ft: 1 / 0.3048, m: 1 },
  vertical: { 'ft/min': 60 / 0.3048, 'm/s': 1 },
});
export const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

/** Ignore invalid persisted preferences rather than trusting localStorage. */
export function normalizeUnits(value) {
  return Object.fromEntries(Object.keys(AVIATION_UNITS).map(kind => [kind,
    UNIT_OPTIONS[kind].includes(value?.[kind]) ? value[kind] : AVIATION_UNITS[kind],
  ]));
}
export function fromSI(value, kind, units = AVIATION_UNITS) {
  if (!isFiniteNumber(value)) return null;
  const choice = normalizeUnits(units)[kind];
  if (!choice || !MULTIPLIERS[kind]) return null;
  return value * MULTIPLIERS[kind][choice];
}
export function toSI(value, kind, units = AVIATION_UNITS) {
  if (!isFiniteNumber(value)) return null;
  const choice = normalizeUnits(units)[kind];
  if (!choice || !MULTIPLIERS[kind]) return null;
  return value / MULTIPLIERS[kind][choice];
}
export const unitSymbol = (kind, units = AVIATION_UNITS) => normalizeUnits(units)[kind];
export const numberOrDash = (v, decimals = 0) =>
  isFiniteNumber(v) ? v.toLocaleString(undefined, { maximumFractionDigits: decimals }) : '—';

export const altitudeText = (value, units = AVIATION_UNITS) =>
  isFiniteNumber(value) ? `${numberOrDash(fromSI(value, 'altitude', units))} ${unitSymbol('altitude', units)}` : 'Not available';
export const speedText = (value, units = AVIATION_UNITS) =>
  isFiniteNumber(value) ? `${numberOrDash(fromSI(value, 'speed', units))} ${unitSymbol('speed', units)}` : 'Not available';
export const verticalSpeedText = (value, units = AVIATION_UNITS) => {
  if (!isFiniteNumber(value)) return 'Not available';
  const converted = fromSI(value, 'vertical', units);
  const decimals = unitSymbol('vertical', units) === 'm/s' ? 1 : 0;
  const rounded = Number(converted.toFixed(decimals));
  return `${rounded > 0 ? '+' : ''}${numberOrDash(rounded, decimals)} ${unitSymbol('vertical', units)}`;
};
export const verticalDirection = value => !isFiniteNumber(value) ? 'Unknown' :
  Math.abs(value) < 0.05 ? 'Level' : value > 0 ? 'Climbing' : 'Descending';

/** Used only to populate number inputs; underlying model values remain SI. */
export function inputValueFromSI(siValue, kind, units) {
  if (siValue === '' || siValue === null || siValue === undefined) return '';
  const result = fromSI(Number(siValue), kind, units);
  return result === null ? '' : String(Math.round(result * 100) / 100);
}
export function inputValueToSI(displayValue, kind, units) {
  if (displayValue === '') return '';
  const n = Number(displayValue);
  return Number.isFinite(n) ? String(toSI(n, kind, units)) : '';
}

export const timeText = s => isFiniteNumber(s) ? new Date(s * 1000).toLocaleTimeString() : '—';
export const ageText = sec => sec == null ? 'Unknown' :
  sec < 60 ? `${Math.round(sec)}s ago` : `${Math.floor(sec / 60)}m ago`;

/** Present notices derived from SI thresholds without altering their logic. */
export function alertMessageForUnits(alert, units = AVIATION_UNITS) {
  if (alert.metric === 'altitude' && isFiniteNumber(alert.siValue))
    return `Low altitude · ${altitudeText(alert.siValue, units)}`;
  if (alert.metric === 'speed' && isFiniteNumber(alert.siValue))
    return `High ground speed · ${speedText(alert.siValue, units)}`;
  return alert.message;
}
export function attentionNoteForUnits(note, units = AVIATION_UNITS) {
  const altitude = /^Below (\d+(?:\.\d+)?) m watch threshold$/.exec(note);
  if (altitude) return `Below ${altitudeText(Number(altitude[1]), units)} watch threshold`;
  const speed = /^Above (\d+(?:\.\d+)?) m\/s watch threshold$/.exec(note);
  if (speed) return `Above ${speedText(Number(speed[1]), units)} ground-speed threshold`;
  return note;
}
