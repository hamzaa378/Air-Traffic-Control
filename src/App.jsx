import { useEffect, useMemo, useRef, useState } from 'react';
import AirspaceMap from './components/AirspaceMap.jsx';
import FlightList from './components/FlightList.jsx';
import FlightDetails from './components/FlightDetails.jsx';
import ReplayPanel from './components/ReplayPanel.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';
import SituationPanel from './components/SituationPanel.jsx';
import WatchlistPanel from './components/WatchlistPanel.jsx';
import UnitsControl from './components/UnitsControl.jsx';
import useAirTraffic from './hooks/useAirTraffic.js';
import { REGIONS, INITIAL_FILTERS, DEFAULT_ALERTS, REFRESH_MS } from './lib/regions.js';
import { evaluateAlerts, filterAircraft } from './lib/aircraft.js';
import { timeText, normalizeUnits, inputValueFromSI, inputValueToSI, unitSymbol } from './lib/format.js';
import { attentionQueue, signalSummary } from './lib/insights.js';

function storedUnits() {
  try { return normalizeUnits(JSON.parse(localStorage.getItem('skyscope:units') || '{}')); }
  catch { return normalizeUnits({}); }
}
function storedMode() {
  try { return localStorage.getItem('skyscope:mode') || 'live'; } catch { return 'live'; }
}
function storedWatchlists() {
  try { return JSON.parse(localStorage.getItem('skyscope:watchlists') || '{}') || {}; }
  catch { return {}; }
}
function storedAlerts() {
  try { return { ...DEFAULT_ALERTS, ...JSON.parse(localStorage.getItem('skyscope:alerts') || '{}') }; }
  catch { return DEFAULT_ALERTS; }
}
const STATUS_TEXT = {
  live: 'Live observations', cache: 'Server cached', stale: 'Stale observations',
  saved: 'Saved observations', demo: 'Simulated demo', error: 'Feed unavailable',
  empty: 'No saved data', connecting: 'Connecting',
};
const MODE_DESCRIPTIONS = {
  live: 'OpenSky observations, updated when the API permits',
  saved: 'The last successfully saved OpenSky response',
  demo: 'Simulated examples, not real aircraft',
};

export default function App() {
  // Keep all data and data-source behavior from v2.1; this release changes presentation.
  const [regionId, setRegionId] = useState('chennai');
  const [mode, setMode] = useState(storedMode);
  const [units, setUnits] = useState(storedUnits);
  const [selectedId, setSelectedId] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [alertsConfig, setAlertsConfig] = useState(storedAlerts);
  const [estimate, setEstimate] = useState(false); // Reported observations are shown by default.
  const [showDensity, setShowDensity] = useState(false);
  const [watchlists, setWatchlists] = useState(storedWatchlists);
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [focusMap, setFocusMap] = useState(false); // Hide the browsing column while keeping aircraft details available.
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [replayCursor, setReplayCursor] = useState(-1);
  const inspectorRef = useRef(null);

  const region = REGIONS.find(r => r.id === regionId) || REGIONS[0];
  const { flights, meta, loading, getHistory, refresh, change } = useAirTraffic(region, mode, selectedId);
  const watchKey = `${mode}:${regionId}`; // A demo pin cannot accidentally refer to a real aircraft.
  const watched = watchlists[watchKey] || [];
  const toggleWatch = id => setWatchlists(current => {
    const entries = current[watchKey] || [];
    const next = entries.includes(id) ? entries.filter(x => x !== id) : [...entries, id].slice(-100);
    return { ...current, [watchKey]: next };
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { try { localStorage.setItem('skyscope:mode', mode); } catch { /* browser may block storage */ } }, [mode]);
  useEffect(() => { try { localStorage.setItem('skyscope:units', JSON.stringify(units)); } catch { /* browser may block storage */ } }, [units]);
  useEffect(() => { try { localStorage.setItem('skyscope:alerts', JSON.stringify(alertsConfig)); } catch { /* ignore */ } }, [alertsConfig]);
  useEffect(() => { try { localStorage.setItem('skyscope:watchlists', JSON.stringify(watchlists)); } catch { /* ignore */ } }, [watchlists]);
  useEffect(() => {
    setSelectedId(null); setReplayCursor(-1); setFilters(INITIAL_FILTERS); setWatchedOnly(false);
  }, [regionId, mode]);
  useEffect(() => {
    if (selectedId && inspectorRef.current) inspectorRef.current.scrollTop = 0;
  }, [selectedId]);

  const filtered = useMemo(() => filterAircraft(flights, filters)
    .filter(p => !watchedOnly || watched.includes(p.icao24))
    .sort((a, b) => (a.status === 'left') - (b.status === 'left') ||
      (b.geoAltitude ?? b.baroAltitude ?? 0) - (a.geoAltitude ?? a.baroAltitude ?? 0)),
    [flights, filters, watchedOnly, watched]);
  const countries = useMemo(() => [...new Set(flights.map(p => p.country))].sort(), [flights]);
  const selected = flights.find(f => f.icao24 === selectedId) || null;
  const signal = useMemo(() => signalSummary(flights, now), [flights, now]);
  const history = useMemo(() => selectedId ? getHistory(selectedId) : [], [selectedId, flights, getHistory]);
  const replayPoint = replayCursor >= 0 ? history[replayCursor] : null;
  const currentAlerts = useMemo(() => evaluateAlerts(flights, alertsConfig, region.center, now),
    [flights, alertsConfig, regionId, now]);
  const reviewQueue = useMemo(() => attentionQueue(flights, now, watched, alertsConfig),
    [flights, now, watched, alertsConfig]);
  const airborne = flights.filter(a => a.onGround === false && a.status !== 'left').length;

  const setFilter = (name, value) => setFilters(f => ({ ...f, [name]: value }));
  const chooseFlight = id => { setSelectedId(id); setReplayCursor(-1); };
  const sourceKind = meta.source || 'connecting';
  const isRealTime = sourceKind === 'live' || sourceKind === 'cache';
  const sinceRefresh = meta.fetchedAt ? Math.max(0, now - meta.fetchedAt) : null;
  const clock = new Date(now * 1000).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false });

  return <div className={`app-shell simplified-shell ${focusMap ? 'focus-map' : ''}`}> 
    <header className="topbar">
      <div className="brand"><div className="brand-logo" aria-hidden="true">◎</div>
        <div><strong>Sky<span>Scope</span></strong><small>AIRSPACE PULSE</small></div></div>
      <div className="top-center"><span className="title-separator" /><span className="top-current">Observe clearly. Understand confidently.</span></div>
      <div className="top-actions">
        <span className={`live-indicator status-${sourceKind}`} role="status"><span className="status-dot" />{STATUS_TEXT[sourceKind] || sourceKind}</span>
        <span className="utc-clock">{clock} UTC</span>
      </div>
    </header>

    {/* Primary controls stay visible even when the side panels scroll or collapse on mobile. */}
    <div className="context-bar" aria-label="Monitoring settings">
      <div className="context-field"><label htmlFor="region">Region</label>
        <select id="region" className="dark-select" value={regionId} onChange={e => setRegionId(e.target.value)}>
          {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select></div>
      <div className="context-field mode-field"><span className="context-caption" id="source-label">Data source</span>
        <div className="mode-tabs" role="group" aria-labelledby="source-label">
          {[['live', 'Live'], ['saved', 'Saved'], ['demo', 'Demo']].map(([key, label]) =>
            <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}
              aria-pressed={mode === key}>{label}</button>)}</div>
      </div>
      <div className="source-explainer" aria-live="polite">{MODE_DESCRIPTIONS[mode]}</div>
      <UnitsControl units={units} onChange={setUnits} />
      <button className="focus-button" onClick={() => setFocusMap(v => !v)} aria-pressed={focusMap}
        title={focusMap ? "Restore the aircraft browsing list" : "Hide the list for a larger map"}>
        <span aria-hidden="true">{focusMap ? "▣" : "⛶"}</span> {focusMap ? "Show panels" : "Focus map"}</button>
      <button className="refresh-button" onClick={refresh} disabled={loading}
        title="Refresh the view (server caching and credit safeguards still apply)">
        <span className={loading ? 'spin' : ''} aria-hidden="true">↻</span>{loading ? 'Updating…' : 'Refresh'}</button>
    </div>

    <div className="workspace">
      <aside className="left-sidebar" aria-label="Find aircraft">
        <div className="side-title"><div><span className="eyebrow">STEP 1 / BROWSE</span><h2>Find an aircraft</h2></div>
          <span className="count-pill">{filtered.length} shown</span></div>
        <section className="discovery-controls" aria-label="Aircraft filters">
          <label className="sr-only" htmlFor="flight-search">Search callsign, ICAO or country</label>
          <div className="search-field"><span aria-hidden="true">⌕</span>
            <input id="flight-search" placeholder="Search callsign or country" value={filters.search}
              onChange={e => setFilter('search', e.target.value)} /></div>
          <div className="quick-filter">
            <label className="mini-label" htmlFor="flight-state">Show</label>
            <select id="flight-state" className="dark-select small" value={filters.airborne}
              onChange={e => setFilter('airborne', e.target.value)}>
              <option value="all">All aircraft</option><option value="air">Airborne only</option><option value="ground">On ground only</option>
            </select>
            <button className="reset-link" onClick={() => { setFilters(INITIAL_FILTERS); setWatchedOnly(false); }}>Reset</button>
          </div>
          <details className="expandable filters-details">
            <summary>More filters <span className="summary-hint">Country, speed, altitude</span></summary>
            <div className="expanded-content">
              <label className="mini-label" htmlFor="flight-country">Country</label>
              <select id="flight-country" className="dark-select small" value={filters.country}
                onChange={e => setFilter('country', e.target.value)}>
                <option value="all">Any country</option>{countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="filter-two">
                <div><label className="mini-label" htmlFor="min-alt">Minimum altitude ({unitSymbol('altitude', units)})</label>
                  <input id="min-alt" className="filter-input" type="number" min="0" value={inputValueFromSI(filters.minAltitude, 'altitude', units)}
                    placeholder="Any" onChange={e => setFilter('minAltitude', inputValueToSI(e.target.value, 'altitude', units))} /></div>
                <div><label className="mini-label" htmlFor="max-alt">Maximum altitude ({unitSymbol('altitude', units)})</label>
                  <input id="max-alt" className="filter-input" type="number" min="0" value={inputValueFromSI(filters.maxAltitude, 'altitude', units)}
                    placeholder="Any" onChange={e => setFilter('maxAltitude', inputValueToSI(e.target.value, 'altitude', units))} /></div>
              </div>
              <label className="mini-label" htmlFor="min-speed">Minimum ground speed ({unitSymbol('speed', units)})</label>
              <input id="min-speed" className="filter-input" type="number" min="0" value={inputValueFromSI(filters.minSpeed, 'speed', units)}
                placeholder="Any" onChange={e => setFilter('minSpeed', inputValueToSI(e.target.value, 'speed', units))} />
            </div>
          </details>
          <details className="expandable watch-details">
            <summary>★ My watchlist <span className="count-pill">{watched.length}</span></summary>
            <WatchlistPanel flights={flights} watched={watched} onSelect={chooseFlight}
              toggleWatch={toggleWatch} watchedOnly={watchedOnly} setWatchedOnly={setWatchedOnly} />
          </details>
        </section>
        <section className="flight-section" aria-label="Aircraft list">
          <div className="list-guide">Choose an aircraft to see its details <span aria-hidden="true">↗</span></div>
          <FlightList flights={filtered} selected={selectedId} onSelect={chooseFlight}
            watched={watched} toggleWatch={toggleWatch} now={now} units={units} />
        </section>
      </aside>

      <main className="map-main">
        <div className="map-heading">
          <div><span className="eyebrow">MONITORING / {region.name.toUpperCase()}</span>
            <h1>See the whole picture.</h1><p>Explore the map, choose a marker, then inspect the latest report.</p></div>
          <details className="expandable map-options"><summary>Map options</summary>
            <div className="expanded-content">
              <label className="estimate-checkbox"><input type="checkbox" checked={estimate}
                onChange={e => setEstimate(e.target.checked)} /> Estimate movement</label>
              <label className="estimate-checkbox"><input type="checkbox" checked={showDensity}
                onChange={e => setShowDensity(e.target.checked)} /> Show density grid</label>
              <p className="muted-caption">Estimates are visual projections, not observed positions.</p>
            </div></details>
        </div>
        <div className="quick-stats" aria-label="Region summary">
          <div><span>Currently tracked</span><strong>{signal.total.toLocaleString()}</strong><small>in the selected region</small></div>
          <div><span>Airborne</span><strong>{airborne.toLocaleString()}</strong><small>reported in flight</small></div>
          <div><span>Recent positions</span><strong>{signal.freshPercent}%</strong><small>reported within 90 s</small></div>
          <div><span>Review suggestions</span><strong>{reviewQueue.length}</strong><small>not emergency alerts</small></div>
        </div>
        <div className="map-wrap">
          <div className="map-floating top-left"><span className={`floating-dot ${isRealTime ? 'bright' : ''}`} />
            <span>{STATUS_TEXT[sourceKind] || sourceKind}</span><span className="floating-separator" />
            <span>{meta.sampleTime ? `Sample ${timeText(meta.sampleTime)}` : 'No sample yet'}</span></div>
          <AirspaceMap region={region} aircraft={filtered} selected={selectedId} selectFlight={chooseFlight}
            history={history} replayPoint={replayPoint} estimate={estimate} now={now}
            alertZoneKm={alertsConfig.enabled && alertsConfig.zone ? alertsConfig.zoneKm : 0}
            watched={watched} showDensity={showDensity} />
          <div className="map-legend"><span><i className="legend-dot green" /> Recent</span>
            <span><i className="legend-dot amber" /> Delayed</span>
            <span><i className="legend-dot gray" /> Ground / unknown</span>
            <span>◌ Estimated (dashed)</span></div>
          <div className="map-corner-note">{mode === 'demo' ? 'SIMULATED · NOT LIVE' :
            estimate ? 'Projected positions are estimates' : 'Reported positions only'}</div>
        </div>
        {meta.warning && <div className="warning-bar" role="status"><span>!</span><p>{meta.warning}</p>
          {(sourceKind === 'error' || sourceKind === 'empty') &&
            <button onClick={() => setMode('demo')}>View demo →</button>}</div>}
        <div className="map-bottom-info"><span>Last retrieved: {meta.fetchedAt ? timeText(meta.fetchedAt) : '—'}
          {sinceRefresh !== null && ` · ${Math.round(sinceRefresh)}s ago`}</span>
          <span>Refresh interval: {REFRESH_MS / 1000}s · hidden tabs pause updates</span></div>
        <details className="expandable data-details"><summary>Understanding the data and API credits <span aria-hidden="true">ⓘ</span></summary>
          <div className="expanded-content">
            <p>{MODE_DESCRIPTIONS[mode]}. Recent position does not guarantee complete regional coverage or real-time safety information.</p>
            <div className="credit-info" aria-label="OpenSky API credit usage">
              <span>Project usage</span><strong>{meta.credits
                ? `${meta.credits.usedLast24h} / ${meta.credits.dailyBudget} credits in the last 24h`
                : 'Waiting for a live API response'}</strong>
              <small>{meta.credits?.upstreamRemaining != null
                ? `OpenSky reported ${meta.credits.upstreamRemaining.toLocaleString()} account credits remaining`
                : 'OpenSky account balance not available yet'}</small></div>
          </div></details>
      </main>

      <aside className="right-sidebar" aria-label="Inspect and review" ref={inspectorRef}>
        <div className="inspector-top"><span className="eyebrow">STEP 2 / INSPECT</span><h2>Aircraft details</h2>
          <p>{selected ? 'Latest reported details for your selection' : 'Select a marker or a flight from the list'}</p></div>
        <section className="panel-section selected-panel" aria-label="Selected aircraft">
          <FlightDetails flight={selected} now={now} units={units} /></section>
        <details className="expandable sidebar-expand" key={`trail-${selectedId || 'none'}`}>
          <summary>Flight trail and replay <span className="count-pill">{history.length} points</span></summary>
          <ReplayPanel flight={selected} history={history} cursor={replayCursor}
            setCursor={setReplayCursor} mode={mode} units={units} />
        </details>
        <SituationPanel aircraft={flights} region={region} now={now} change={change}
          watched={watched} alertsConfig={alertsConfig} onSelect={chooseFlight} source={sourceKind} units={units} />
        <details className="expandable sidebar-expand alerts-expand"><summary>Custom observation alerts <span className="count-pill">{currentAlerts.length}</span></summary>
          <AlertsPanel config={alertsConfig} onChange={setAlertsConfig} alerts={currentAlerts} onSelect={chooseFlight} units={units} />
        </details>
        <div className="sidebar-footer">Informational tracking only. Not for navigation, separation, or safety decisions.</div>
      </aside>
    </div>
  </div>;
}
