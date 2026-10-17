# Architecture and data flow

**Purpose:** A browser-based observation dashboard for the CodeChef-VIT *Air Traffic Control* frontend challenge. It is not an operational ATC, aircraft-separation, weather, or collision-detection system.

## Diagram

```text
OpenSky states/all ──OAuth2 Bearer token──> FastAPI server/opensky.py
                                             │
                           normalize missing fields / cache 115s
                           3800-credit project guard / cooldown
                                             │
                          GET /api/aircraft (JSON + provenance)
                                             │
                                   src/hooks/useAirTraffic.js
                                             │
                           merge positions / local storage history
                                             │
                             ┌───────────────┴──────────────┐
                             │                              │
                           App.jsx                   lib/insights.js
                       filters/selection            freshness/change/
                             │                       density/queue
              ┌──────────────┼──────────────────────────────┐
              │              │                              │
         AirspaceMap     FlightList                   SituationPanel
          (Leaflet)     WatchlistPanel               and AlertsPanel
              │              │                              │
          positions      inspection                    explanation
              └──────────────┴──────────────────────────────┘
```

## Data lifecycle

1. Browser selects one of eight predefined regions. Each bounding rectangle has area ≤25 square degrees.
2. The frontend asks the **local FastAPI** proxy `/api/aircraft?south=...&west=...&north=...&east=...`; browser never sees the client secret.
3. Proxy gets an OAuth2 token from OpenSky if configured; requests states only when cache is expired and credit budget/cooldown permits. Failed requests can return up to one-hour-old cached data clearly marked `stale`.
4. Server normalizes OpenSky's positional arrays into named nullable fields. Missing coordinates cause a vector to be omitted.
5. `useAirTraffic` merges fresh samples, briefly retains aircraft not in the latest sample as `left`, stores the last *actual* response per region, and records the selected aircraft trail without repeating identical coordinates.
6. `App` filters the displayed map/list; `SituationPanel` summarizes the **unfiltered** region. The mini-grid covers all active region aircraft. The optional **map density grid** uses currently displayed/filtered aircraft and **last reported**, not estimated, coordinates.
7. The saved and demo modes never call the OpenSky endpoint. Demo aircraft have synthetic callsigns and identifiable fake ICAO addresses.

## API response metadata

- `source`: `live`, `cache`, `stale` (server); `saved` and `demo` are client-only modes.
- `sampleTime`: upstream OpenSky sample time where available; not when the browser rendered it.
- `fetchedAt`: last successful upstream fetch, in seconds since Unix epoch.
- `ageSeconds`: age of the cached server response.
- `warning`: explanation of failure/limited data.
- `retryAfter`: seconds the upstream/proxy requests should wait.
- `credits`: project-side used/budget/remaining counters plus last reported OpenSky account balance when returned in a header.

## State ownership

| State | Stored where | Scope |
|---|---|---|
| Region, filters, selected aircraft | `App.jsx` React state | Current page |
| Mode and threshold rules | `localStorage` via `App.jsx` | Browser/device |
| Watchlists | `localStorage`, key `skyscope:watchlists` | Per mode + region in this browser |
| Airspace positions | `useAirTraffic` `planeRef` and React state | Selected mode+region |
| Recent movement trails | `useAirTraffic` memory, selected trail optionally localStorage | Mode+region+ICAO |
| Latest successful response | `skyscope:snapshot:<region>` | Real data only, per browser region |
| 115s shared cache and 24h spending ledger | FastAPI process memory | One server worker only |

### Important difference: report vs estimate

Observed latitude/longitude comes directly from OpenSky state vectors. Estimation optionally moves the map marker using heading, velocity, and time elapsed for a maximum of 120 seconds; it is *never appended to the stored trail*. Selected aircraft show a dashed connector from original reported position to the estimated map point. Estimated positions are not adequate for navigation or safety-related decisions.

## Performance strategy

- Leaflet `preferCanvas` avoids one complex icon DOM element per aircraft.
- Marker layers are updated by ICAO ID rather than destroying all markers every refresh.
- The map currently renders up to 3,000 aircraft; the list renders up to 160 and prompts the user to filter.
- Density uses a fixed 8×5 bin grid, not a physics simulation or network call.
- Data fetching pauses when a tab is hidden. Refreshing the browser many times generally uses the same cached result until cache expiry.
- The 115-second backend TTL avoids unnecessary 120-second frontend polling overlap.

## Deployment boundaries

- `docker compose up --build` uses one FastAPI worker on `127.0.0.1:8001` by default.
- Project budget ledger/cache **do not persist** across restarts or multiple workers; for public scale, use centralized storage, auth and durable credit tracking.
- `.env` is local only. No credentials belong in React, GitHub, screenshots, or front-end `.env` variables.
- Basemap tiles use OpenStreetMap; no guarantees that the tiles load when disconnected.
