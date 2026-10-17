export const numberOrDash = (v, decimals = 0) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString(undefined, { maximumFractionDigits: decimals }) : '—';
export const altitudeText = v => typeof v === 'number' ? `${numberOrDash(v)} m` : 'Unknown';
export const speedText = v => typeof v === 'number' ? `${numberOrDash(v * 3.6)} km/h` : 'Unknown';
export const timeText = s => typeof s === 'number' ? new Date(s * 1000).toLocaleTimeString() : '—';
export const ageText = sec => sec == null ? 'Unknown' :
  sec < 60 ? `${Math.round(sec)}s ago` : `${Math.floor(sec / 60)}m ago`;
