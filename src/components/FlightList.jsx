import { altitudeText, speedText } from '../lib/format.js';
import { observationState } from '../lib/insights.js';

export default function FlightList({ flights, selected, onSelect, watched, toggleWatch, now }) {
  const pinned = new Set(watched);
  return <div className="flight-list" role="list" aria-label="Aircraft in selected region">
    {flights.length === 0 && <div className="empty-small">No matching aircraft. Change the filters or try Demo.</div>}
    {flights.slice(0, 160).map(plane => <div role="listitem" className={`flight-row ${plane.icao24 === selected ? 'is-selected' : ''}`}
      key={plane.icao24}>
      <button className="flight-select" onClick={() => onSelect(plane.icao24)} aria-label={`Inspect ${plane.callsign || plane.icao24}`}>
        <span className="aircraft-icon" aria-hidden="true">✈</span>
        <span className="flight-primary"><b>{plane.callsign || plane.icao24.toUpperCase()}</b>
          <small><i className={`pill-dot ${observationState(plane, now)}`}/>{plane.country} {plane.status === 'left' ? '· Not in sample' : ''}</small></span>
        <span className="flight-metrics"><b>{altitudeText(plane.geoAltitude ?? plane.baroAltitude)}</b>
          <small>{speedText(plane.velocity)}</small></span>
      </button>
      <button className={`star-button ${pinned.has(plane.icao24) ? 'active' : ''}`}
        aria-label={`${pinned.has(plane.icao24) ? 'Unpin' : 'Pin'} ${plane.callsign || plane.icao24}`}
        title={pinned.has(plane.icao24) ? 'Remove from watchlist' : 'Add to watchlist'}
        onClick={() => toggleWatch(plane.icao24)}>{pinned.has(plane.icao24) ? '★' : '☆'}</button>
    </div>)}
    {flights.length > 160 && <div className="small-hint">Showing the first 160 results. Use filters to narrow the list.</div>}
  </div>;
}
