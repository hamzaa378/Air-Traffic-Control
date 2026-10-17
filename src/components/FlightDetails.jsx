import { altitudeText, ageText, numberOrDash, speedText, timeText } from '../lib/format.js';
import { secondsSinceContact } from '../lib/aircraft.js';
import { observationState } from '../lib/insights.js';

/** Put the six most useful facts first; keep every additional field one click away. */
export default function FlightDetails({ flight, now }) {
  if (!flight) return <div className="detail-empty">
    <div className="radar-drawing" aria-hidden="true"><span>✈</span></div>
    <h3>Nothing selected yet</h3>
    <p>Click any aircraft marker on the map, or choose a flight from the list, to see its reported details here.</p>
  </div>;

  const age = secondsSinceContact(flight, now);
  const quality = observationState(flight, now);
  const positionTime = flight.timePosition ?? flight.lastContact;
  const positionAge = positionTime == null ? null : Math.max(0, now - positionTime);
  const primary = [
    ['Altitude', altitudeText(flight.geoAltitude ?? flight.baroAltitude)],
    ['Ground speed', speedText(flight.velocity)],
    ['Heading', typeof flight.heading === 'number' ? `${numberOrDash(flight.heading)}°` : 'Unknown'],
    ['Last contact', ageText(age)],
    ['Latitude', numberOrDash(flight.latitude, 4) + '°'],
    ['Longitude', numberOrDash(flight.longitude, 4) + '°'],
  ];
  const extended = [
    ['Vertical speed', typeof flight.verticalRate === 'number' ? `${numberOrDash(flight.verticalRate, 1)} m/s` : 'Unknown'],
    ['Last position', timeText(flight.timePosition)],
    ['Position age', ageText(positionAge)],
    ['Squawk', flight.squawk || '—'],
    ['ICAO24', flight.icao24.toUpperCase()],
  ];
  return <>
    <div className="selected-head">
      <span className="selected-icon" aria-hidden="true">✈</span>
      <div><span className="eyebrow">SELECTED AIRCRAFT</span><h2>{flight.callsign || flight.icao24.toUpperCase()}</h2>
        <p>{flight.country}</p></div>
    </div>
    <div className="detail-tags"><span className="tag">{flight.onGround === true ? 'On ground' : flight.onGround === false ? 'Airborne' : 'Ground state unknown'}</span>
      <span className={`tag ${quality !== 'fresh' ? 'tag-warn' : ''}`}>{quality === 'fresh' ? 'Recently reported' : quality === 'delayed' ? 'Delayed report' : quality === 'left' ? 'Not in latest sample' : quality === 'unknown' ? 'Age unknown' : 'Older report'}</span></div>
    <div className="detail-grid">{primary.map(([name, value]) =>
      <div className="detail-value" key={name}><span>{name}</span><strong>{value}</strong></div>
    )}</div>
    <details className="expandable detail-more"><summary>All reported fields <span className="summary-hint">5 more</span></summary>
      <div className="detail-grid">{extended.map(([name, value]) =>
        <div className="detail-value" key={name}><span>{name}</span><strong>{value}</strong></div>
      )}</div>
    </details>
  </>;
}
