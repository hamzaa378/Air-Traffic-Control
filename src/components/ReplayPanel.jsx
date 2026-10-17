import { useEffect, useState } from 'react';
import { timeText, numberOrDash } from '../lib/format.js';

export default function ReplayPanel({ flight, history, cursor, setCursor, mode }) {
  const exportHistory = () => {
    if (!flight || !history.length) return;
    const content = JSON.stringify({ mode, icao24: flight.icao24, callsign: flight.callsign,
      note: mode === 'demo' ? 'Simulated example only' : 'Observations recorded by SkyScope',
      points: history }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyscope-${mode}-${flight.icao24}-history.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const [playing, setPlaying] = useState(false);
  useEffect(() => { setPlaying(false); setCursor(-1); }, [flight?.icao24, setCursor]);
  useEffect(() => {
    if (!playing || history.length < 2) return;
    const handle = setInterval(() => setCursor(current =>
      current < 0 ? 0 : Math.min(history.length - 1, current + 1)), 750);
    return () => clearInterval(handle);
  }, [playing, history.length, setCursor]);
  useEffect(() => { if (cursor >= history.length - 1) setPlaying(false); }, [cursor, history.length]);
  const point = cursor >= 0 ? history[cursor] : history.at(-1);
  return <section className="panel-section replay-panel">
    <div className="section-header"><h3>Flight trail & replay</h3><span className="pill-muted">{history.length} points</span></div>
    <p className="muted-caption">{mode === 'demo' ? 'Simulated demo positions.' :
      'Positions captured by this app, not OpenSky’s historical track endpoint.'}</p>
    {history.length < 2 ? <div className="empty-small compact">Keep this page open for more observations. Recorded positions will appear here as fresh updates arrive.</div> : <>
      <div className="replay-readout"><span>{point && timeText(point.lastContact ?? point.observedAt)}</span>
        <span>{point ? `${numberOrDash(point.latitude, 3)}°, ${numberOrDash(point.longitude, 3)}°` : '—'}</span></div>
      <input aria-label="Replay aircraft observations" className="replay-slider" type="range"
        min={0} max={history.length - 1} value={Math.max(0, cursor)}
        onChange={e => { setCursor(Number(e.target.value)); setPlaying(false); }} />
      <div className="replay-actions">
        <button className="control-button" onClick={() => { setCursor(cursor < 0 || cursor >= history.length - 1 ? 0 : cursor); setPlaying(v => !v); }}>
          {playing ? 'Ⅱ Pause' : '▶ Play'}</button>
        <button className="text-button" onClick={exportHistory} title="Save these points as JSON">Export JSON</button>
        <button className="text-button" onClick={() => { setPlaying(false); setCursor(-1); }}>Latest</button>
      </div>
    </>}
  </section>;
}
