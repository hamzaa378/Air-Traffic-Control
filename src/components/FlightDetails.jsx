import { altitudeText, ageText, numberOrDash, speedText, timeText, verticalSpeedText, verticalDirection } from '../lib/format.js';
import { secondsSinceContact } from '../lib/aircraft.js';
import { observationState } from '../lib/insights.js';

/** All values arrive in SI. The chosen units change presentation only. */
export default function FlightDetails({ flight, now, units }) {
  if (!flight) return <div className="detail-empty">
    <div className="radar-drawing" aria-hidden="true"><span>✈</span></div>
    <h3>Nothing selected yet</h3>
    <p>Click any aircraft marker on the map, or choose a flight from the list, to see its reported details here.</p>
  </div>;

  const age = secondsSinceContact(flight, now);
  const quality = observationState(flight, now);
  const positionTime = flight.timePosition ?? flight.lastContact;
  const positionAge = positionTime == null ? null : Math.max(0, now - positionTime);
  const altitudeSource = flight.geoAltitude != null ? 'Geometric altitude' :
    flight.baroAltitude != null ? 'Barometric altitude' : 'Altitude';
  const primary = [
    [altitudeSource, altitudeText(flight.geoAltitude ?? flight.baroAltitude, units)],
    ['Ground speed', speedText(flight.velocity, units)],
    ['Vertical speed', verticalSpeedText(flight.verticalRate, units)],
    ['Heading', typeof flight.heading === 'number' ? `${numberOrDash(flight.heading)}°` : 'Not available'],
    ['Vertical trend', verticalDirection(flight.verticalRate)],
    ['Last contact', ageText(age)],
  ];
  const extended = [
    ['Latitude', `${numberOrDash(flight.latitude, 4)}°`],
    ['Longitude', `${numberOrDash(flight.longitude, 4)}°`],
    ['Geometric altitude', altitudeText(flight.geoAltitude, units)],
    ['Barometric altitude', altitudeText(flight.baroAltitude, units)],
    ['Last position', timeText(flight.timePosition)],
    ['Position age', ageText(positionAge)],
    ['Squawk', flight.squawk || '—'],
    ['ICAO24', flight.icao24.toUpperCase()],
  ];
  // OpenSky /states/all.velocity is speed over ground in the horizontal plane.
  // Ground speed and horizontal speed are the SAME measurement, not two sensors.
  const speedSources = [
    ['Horizontal speed', speedText(flight.velocity, units), 'Same OpenSky measurement as ground speed'],
    ['Airspeed (TAS)', speedText(flight.trueAirspeed, units), 'Not supplied by the standard OpenSky state feed'],
    ['Airspeed (IAS)', speedText(flight.indicatedAirspeed, units), 'Not supplied by the standard OpenSky state feed'],
    ['Wind speed', speedText(flight.windSpeed, units), 'Not supplied by the standard OpenSky state feed'],
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
    <details className="speed-sources" aria-label="Different types of aircraft speed">
      <summary>Speed sources <span>Airspeed and wind availability</span></summary>
      {speedSources.map(([name, value, note]) => <div className="speed-source" key={name}>
        <div><span>{name}</span><strong>{value}</strong></div>
        <small>{value === 'Not available' ? note : name === 'Horizontal speed' ? note : 'Reported measurement'}</small>
      </div>)}
      <p>Ground speed measures movement relative to Earth. Airspeed measures movement through the air. Wind speed is a separate weather quantity; one cannot be inferred reliably from the other here.</p>
    </details>
    <details className="expandable detail-more"><summary>Position and additional measurements <span className="summary-hint">{extended.length} fields</span></summary>
      <div className="detail-grid">{extended.map(([name, value]) =>
        <div className="detail-value" key={name}><span>{name}</span><strong>{value}</strong></div>
      )}</div>
    </details>
  </>;
}
