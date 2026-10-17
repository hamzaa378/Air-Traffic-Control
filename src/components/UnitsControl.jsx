import { AVIATION_UNITS, METRIC_UNITS, UNIT_OPTIONS, unitSymbol } from '../lib/format.js';

/** One compact, keyboard-accessible control for all user-facing measurement units. */
export default function UnitsControl({ units, onChange }) {
  const update = (key, value) => onChange(old => ({ ...old, [key]: value }));
  const preset = (values, name) => Object.keys(values).every(key => values[key] === units[key]);
  return <details className="units-control">
    <summary aria-label="Change displayed measurement units">
      <span className="unit-summary-name">Units</span>
      <strong>{unitSymbol('speed', units)} · {unitSymbol('altitude', units)} · {unitSymbol('vertical', units)}</strong>
    </summary>
    <div className="units-popover" aria-label="Display unit preferences">
      <div className="unit-popover-title">Measurement units</div>
      <p>Change what you see. Raw flight data, calculations and exported history stay in SI units.</p>
      <div className="unit-presets">
        <button type="button" className={preset(AVIATION_UNITS) ? 'active' : ''}
          aria-pressed={preset(AVIATION_UNITS)} onClick={() => onChange({ ...AVIATION_UNITS })}>Aviation</button>
        <button type="button" className={preset(METRIC_UNITS) ? 'active' : ''}
          aria-pressed={preset(METRIC_UNITS)} onClick={() => onChange({ ...METRIC_UNITS })}>Metric</button>
      </div>
      {[
        ['speed', 'Ground speed'], ['altitude', 'Altitude'], ['vertical', 'Vertical speed'],
      ].map(([key, label]) => <label key={key} className="unit-choice">
        <span>{label}</span>
        <select value={units[key]} onChange={e => update(key, e.target.value)}>
          {UNIT_OPTIONS[key].map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>)}
      <small>Preferences are saved in this browser.</small>
    </div>
  </details>;
}
