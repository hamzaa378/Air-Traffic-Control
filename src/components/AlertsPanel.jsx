import { alertMessageForUnits, inputValueFromSI, inputValueToSI, unitSymbol } from '../lib/format.js';
export default function AlertsPanel({ config, onChange, alerts, onSelect, units }) {
  const update = (key, value) => onChange(old => ({ ...old, [key]: value }));
  return <section className="panel-section alerts-panel">
    <div className="section-header"><h3>Custom alerts</h3><label className="toggle" title="Enable or disable alerts">
      <input type="checkbox" checked={config.enabled} onChange={e => update('enabled', e.target.checked)} />
      <span className="toggle-track" /></label></div>
    <div className="alert-settings" aria-disabled={!config.enabled}>
      <label className="setting-line"><input type="checkbox" checked={config.lowAltitude}
        disabled={!config.enabled} onChange={e => update('lowAltitude', e.target.checked)} /> Altitude below
        <input aria-label={`Low altitude threshold in ${unitSymbol('altitude', units)}`} type="number" min="0" step="any"
          value={inputValueFromSI(config.lowAltitudeValue, 'altitude', units)} disabled={!config.enabled || !config.lowAltitude}
          onChange={e => update('lowAltitudeValue', Math.max(0, Number(inputValueToSI(e.target.value, 'altitude', units))))} /><span>{unitSymbol('altitude', units)}</span></label>
      <label className="setting-line"><input type="checkbox" checked={config.highSpeed}
        disabled={!config.enabled} onChange={e => update('highSpeed', e.target.checked)} /> Ground speed above
        <input aria-label={`High ground speed threshold in ${unitSymbol('speed', units)}`} type="number" min="0" step="any"
          value={inputValueFromSI(config.highSpeedValue, 'speed', units)} disabled={!config.enabled || !config.highSpeed}
          onChange={e => update('highSpeedValue', Math.max(0, Number(inputValueToSI(e.target.value, 'speed', units))))} /><span>{unitSymbol('speed', units)}</span></label>
      <label className="setting-line"><input type="checkbox" checked={config.zone}
        disabled={!config.enabled} onChange={e => update('zone', e.target.checked)} /> Within region center
        <input aria-label="Zone radius in kilometres" type="number" min="1" max="400" step="5"
          value={config.zoneKm} disabled={!config.enabled || !config.zone}
          onChange={e => update('zoneKm', Math.max(1, Number(e.target.value)))} /><span>km</span></label>
    </div>
    <div className="alerts-feed">
      {!alerts.length ? <p className="empty-alert">No aircraft currently match the alert rules.</p> :
        alerts.slice(0, 12).map(a => <button className="alert-row" key={a.id} onClick={() => onSelect(a.icao24)}>
          <span className={`alert-indicator ${a.severity}`} /><span><b>{a.label}</b><small>{alertMessageForUnits(a, units)}</small></span><span>↗</span>
        </button>)}
      {alerts.length > 12 && <p className="small-hint">+{alerts.length - 12} additional alerts</p>}
    </div>
    <p className="muted-caption">Learning/demo thresholds only. Not suitable for operational air traffic control.</p>
  </section>;
}
