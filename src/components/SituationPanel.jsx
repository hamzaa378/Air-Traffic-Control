import { attentionNoteForUnits } from '../lib/format.js';
import { attentionQueue, compassActivity, densityGrid, signalSummary } from '../lib/insights.js';
import { timeText } from '../lib/format.js';

/** Show the review queue first; data diagnostics are available on demand. */
export default function SituationPanel({ aircraft, region, now, change, watched,
  alertsConfig, onSelect, source, units }) {
  const signal = signalSummary(aircraft, now);
  const density = densityGrid(aircraft, region.bounds);
  const compass = compassActivity(aircraft, region.center);
  const queue = attentionQueue(aircraft, now, watched, alertsConfig);
  const isObservation = source === 'live' || source === 'cache';
  const row = (item, index) => <button className="attention-row" key={item.icao24}
    onClick={() => onSelect(item.icao24)} title={`Inspect ${item.label}`}>
    <span className="queue-index">{String(index + 1).padStart(2, '0')}</span>
    <span className="queue-content"><b>{item.label}</b><small>{attentionNoteForUnits(item.notes[0], units)}</small></span>
    <span className={`quality-chip quality-${item.quality}`}>{item.quality}</span>
  </button>;

  return <section className="situation-panel" aria-label="Situational overview">
    <div className="situation-heading">
      <div><span className="eyebrow">STEP 3 / UNDERSTAND</span><h3>Worth a second look</h3></div>
      <span className="signal-identifier">{queue.length} suggestions</span>
    </div>
    <div className="queue-section">
      {queue.length === 0 ? <p className="situational-note queue-note">No aircraft match your current review rules.</p> : <>
        {queue.slice(0, 3).map(row)}
        {queue.length > 3 && <details className="expandable queue-extra"><summary>See {queue.length - 3} more suggestions</summary>
          <div>{queue.slice(3).map((item, i) => row(item, i + 3))}</div></details>}
      </>}
      <p className="situational-note queue-note">Based on missing, delayed or watched observations. This is <strong>not</strong> a safety ranking.</p>
    </div>
    <details className="expandable pulse-details">
      <summary>Airspace Pulse · data quality <span className="count-pill">{signal.freshPercent}% recent</span></summary>
      <div className="signal-meters">
        <div className="signal-summary">
          <div className="signal-score">{signal.freshPercent}<small>%</small></div>
          <div><strong>Recently reported positions</strong><span>{signal.fresh} of {signal.total} active reports are within 90 seconds</span></div>
        </div>
        <div className="signal-bar" role="img" aria-label={`${signal.freshPercent}% of tracked aircraft have recently reported positions`}>
          <span style={{ width: `${signal.freshPercent}%` }} /></div>
        <div className="signal-labels"><span><i className="pill-dot fresh"/> {signal.fresh} recent</span>
          <span><i className="pill-dot delayed"/> {signal.delayed} delayed</span>
          <span><i className="pill-dot old"/> {signal.old + signal.unknown} older / unknown</span></div>
      </div>
      <div className="pulse-subgrid">
        <div className="pulse-metric"><span>Heading available</span><strong>{signal.headingPercent}%</strong></div>
        <div className="pulse-metric"><span>Speed available</span><strong>{signal.speedPercent}%</strong></div>
      </div>
      <div className="situation-subsection">
        <div className="section-header"><h4>Changes between samples</h4><span className="pill-muted">Genuine updates only</span></div>
        {change ? change.initial ? <p className="situational-note">First sample received. Changes appear after a different new sample.</p> : <>
          <div className="change-row"><div><strong>+{change.entered.length}</strong><span>Newly observed</span></div>
            <div><strong>{change.missing.length}</strong><span>Not in next sample</span></div></div>
          <p className="situational-note">Compared at {timeText(change.at)}. Missing does not mean landed or in danger.</p>
        </> : <p className="situational-note">Waiting for two different live samples. Saved and cached responses do not count as new changes.</p>}
      </div>
      <div className="situation-subsection">
        <div className="section-header"><h4>Where aircraft were observed</h4><span className="pill-muted">Distribution only</span></div>
        <div className="mini-scan">
          <div className="density-mini" role="img" aria-label={`Density cells; up to ${density.max} observed aircraft per grid cell`}>
            {density.cells.map((count, index) => <span key={index} className="density-cell"
              style={{ '--density': density.max ? Math.max(.07, count / density.max) : .03 }}
              title={`Grid cell ${index + 1}: ${count} observed aircraft`} />)}
          </div>
          <div className="compass-grid">{Object.entries(compass).map(([direction, count]) =>
            <div key={direction}><span>{direction}</span><b>{count}</b></div>)}</div>
        </div>
        <p className="situational-note">{density.occupied}/{density.rows * density.cols} cells occupied. Density is not collision risk.</p>
      </div>
      <p className="situational-note footer-note">{isObservation ? 'OpenSky feed' : `${source} mode`} · descriptive observation quality, not operational guidance.</p>
    </details>
  </section>;
}
