# Code walkthrough for new developers — v3

For screen layout and easy edits begin with [`INTERFACE_GUIDE.md`](INTERFACE_GUIDE.md). Then read `src/lib/regions.js` → `src/lib/insights.js` → `src/App.jsx` → `src/hooks/useAirTraffic.js` → `server/main.py` → `server/opensky.py`.

## Backend: Python

**`server/main.py`** initializes FastAPI, loads credentials with python-dotenv, rejects invalid or oversize regions, defines three routes, and serves the built React files if `dist/` exists. `GET /api/health` does not prove credentials work; it only confirms they exist as strings. `/api/credits` exposes estimated project usage. `/api/aircraft` forwards validated bounds into the OpenSky service.

**`server/opensky.py`** exposes `normalize_vector`, `OpenSkyService` and `UpstreamError`.
- `_token`: asks OpenSky OAuth2 server for a server-side Bearer token and reuses it until shortly before expiration.
- `_reserve_credit`: accounts conservatively for each attempted upstream query. A server restart resets this local-only ledger.
- `_fetch`: constructs `lamin/lomin/lamax/lomax` parameters, optionally retries after 401, parses 429 limits, and converts state vectors into friendly objects.
- `get`: coalesces simultaneous requests behind a lock and reuses matching cached data for 115 seconds. Falls back to stale data for up to 3,600 seconds when necessary.

## Frontend: JavaScript + React

**`src/main.jsx`** mounts the React app and imports Leaflet styles.

**`src/App.jsx`** arranges the three desktop columns (flight list, map and inspector), offers Focus map, and owns the selected region, source mode, aircraft selection, filters, watchlists, alert thresholds, toggles, and replay cursor. Data comes from a single `useAirTraffic(...)` hook. It passes the correct props to each small component. Local storage keys keep preferences across refreshes.

**`src/hooks/useAirTraffic.js`** is the only React file that fetches `/api/aircraft`.
- `accept(payload)` labels each response's provenance, merges reported aircraft, optionally adds actually observed trail points, and compares genuine new samples only.
- `loadLive()` checks hidden tab, offline status, server cooldown, and fetch failure, then falls back to saved data or clear errors.
- `loadSaved()` loads browser-saved *real* snapshots; no live request is made.
- `getHistory(id)` returns a trail from memory or browser storage.
- `refresh()` triggers a new attempt, still governed by server-side cache/budget.
- `useEffect` cleanup aborts pending fetches and removes event listeners when a region/mode changes.

**`src/lib/aircraft.js`** pure tested functions:
`mergeAircraft`, `appendObservation`, `shouldRecord`, `estimatePosition`, `filterAircraft`, `evaluateAlerts`, `kmBetween`, `secondsSinceContact`.

**`src/lib/insights.js`** pure tested functions:
`observationState` labels position age; `signalSummary` counts fresh/unknown and field completeness; `compareSnapshots` compares ICAO sets; `densityGrid` counts aircraft by map cell; `compassActivity` counts quadrants; `attentionQueue` orders explainable items for review.

**`src/lib/regions.js`** defines region bounds, filter defaults, watch thresholds and refresh timing. **`src/lib/demo.js`** creates visibly synthetic aircraft. **`src/lib/format.js`** centralizes numbers and display units.

**Components**
- `AirspaceMap.jsx`: Leaflet/OSM map, canvas aircraft circles, observed density rectangles, highlighted pinned aircraft, optional projected locations, selected flight trail, center zone and scale.
- `FlightList.jsx`: searchable/filterable list of the top 160 visible aircraft with a ☆ pin action.
- `WatchlistPanel.jsx`: local pins and a focus filter.
- `SituationPanel.jsx`: three immediate review suggestions, optional complete queue and expandable Airspace Pulse diagnostics (freshness, observed changes, quadrant/density mini-map).
- `FlightDetails.jsx`: six important reported details first; remaining telemetry fields in a native disclosure control.
- `AlertsPanel.jsx`: editable example watch thresholds and matching aircraft list.
- `ReplayPanel.jsx`: replays recorded observations on the map and exports JSON.
- `styles.css`: the consolidated Daylight Atlas stylesheet with warm paper colors, focus-visible controls, map-first mobile layout and media queries. Edit the `:root` color variables at the top.

## One modification example

**Change the default refresh to every three minutes:** Edit `REFRESH_MS = 120_000` in `src/lib/regions.js` to `180_000`. Do not lower the refresh significantly without reviewing the 4,000-credit budget. Save the file: Vite automatically reloads the page.

**Change when a position is considered delayed:** Edit `FRESH_SECONDS = 90` in `src/lib/insights.js`, then run `npm test` and adjust the tests if you intentionally changed the contract. This does not change OpenSky's underlying timestamps.

**Add a region:** Add a small bounding box to `REGIONS` and keep `(north-south)*(east-west) <= 25`. Add it only after checking that the box doesn't unintentionally cross the ±180° meridian and is not unnecessarily large.

**Change the Daylight Atlas appearance:** Edit the `:root` variables and relevant selectors in `src/styles.css`. For Leaflet marker colors also edit `src/components/AirspaceMap.jsx`. No additional CSS framework or build tooling is needed.

## Basic debugging sequence

1. `GET http://localhost:8001/api/health` to check Python is running.
2. `GET http://localhost:8001/api/credits` to inspect OAuth2 config and remaining budget.
3. Visit `http://localhost:5173`, choose Demo; if Demo fails, the issue is frontend-related rather than OpenSky credentials.
4. Open browser developer tools (F12) → Console and Network to inspect `/api/aircraft`.
5. Read PowerShell terminal logs for HTTP 401, 429, 422 or 503.
6. Run `npm test` and `python -m pytest -q server/tests` after changing logic.
