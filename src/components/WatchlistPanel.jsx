/** Watchlist is saved per browser and monitoring region. No account is required. */
export default function WatchlistPanel({ flights, watched, onSelect, toggleWatch, watchedOnly, setWatchedOnly }) {
  const pinned = flights.filter(plane => watched.includes(plane.icao24));
  return <section className="watchlist-panel controls-block">
    <div className="section-label-row"><label className="field-title">MY WATCHLIST</label><span className="count-pill">{watched.length}</span></div>
    <p className="source-note">Pin aircraft to find them quickly as the feed changes. Pins stay on this device.</p>
    <label className="watch-only-label"><input type="checkbox" checked={watchedOnly}
      onChange={e => setWatchedOnly(e.target.checked)} /> Focus on pinned aircraft</label>
    {watched.length === 0 && <p className="situational-note">Use ☆ beside an aircraft to pin it.</p>}
    {pinned.slice(0, 5).map(plane => <div className="pinned-row" key={plane.icao24}>
      <button onClick={() => onSelect(plane.icao24)}>{plane.callsign || plane.icao24.toUpperCase()}</button>
      <button className="star-button active" aria-label={`Unpin ${plane.callsign || plane.icao24}`}
        onClick={() => toggleWatch(plane.icao24)}>★</button></div>)}
    {watched.length > pinned.length && <p className="situational-note">{watched.length - pinned.length} pinned aircraft not present in this region's latest data.</p>}
  </section>;
}
