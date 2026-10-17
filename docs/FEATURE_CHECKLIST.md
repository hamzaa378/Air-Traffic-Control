# CodeChef-VIT challenge coverage

Source: promotional cycle task sheet, **Frontend Development: Air Traffic Control**, pages 8–9. This is an implementation checklist, not a claim that a live demo was verified on the user's network.

| Task-sheet requirement | Implemented in source | How to demonstrate |
|---|---|---|
| 1. Retrieve live OpenSky aircraft | Yes: `server/opensky.py` and `/api/aircraft` | Configure OAuth2 in `.env`, choose Live, inspect response |
| 2. Interactive map | Yes: `AirspaceMap.jsx` | Pan/zoom and click circles |
| 3. Altitude/speed/heading/last position | Yes: `FlightDetails.jsx` | Select flight in list/map |
| 4. Periodic updates and efficient API usage | Yes: 120s timer, 115s cache, hidden-tab pause | Observe sample time and credits |
| 5. Regions and aircraft filters | Yes: `regions.js`, `App.jsx` | Change region/airborne/country/search/altitude/speed |
| 6. Maintain presence across updates | Yes: `mergeAircraft`, `compareSnapshots` | Use Demo to see temporarily missing aircraft |
| 7. Failures, missing data, limits and age | Yes: normalization, fallback, provenance and ages | API mock tests and Saved mode |
| 8. Recent movement observations | Yes: local trail/replay/JSON export | Select aircraft and wait for two changed positions |

## Bonus checklist

| Bonus | Status and implementation |
|---|---|
| Estimate between API updates | Implemented: great-circle extrapolation (at most 120s), optional and labeled |
| Historical movement visualization/replay | Implemented for *locally collected* positions; not full OpenSky history |
| Efficient large-aircraft rendering | Implemented: Leaflet canvas markers with identity-based updates and 3,000 marker cap; not benchmarked at production scale |
| Offline mode | Partial: saved snapshots and synthetic demo available offline; online OSM basemap tiles may be unavailable |
| Configurable alerts | Implemented as non-operational user-set altitude/speed/center-zone watch conditions |
| Caching and recovery | Implemented in-memory 115s proxy cache, `stale` response, rate cooldown, token renewal, local snapshot fallback |
| Deploy app | Dockerfile, Compose and CI checks provided; public deployment not performed |

## Additional features that stand out

- **Airspace Pulse**: freshness percentages and heading/speed completeness.
- **What changed?**: detects new and missing ICAO identifiers between truly different live samples.
- **Spatial awareness**: compass quadrant counts and a grid with binned aircraft density.
- **Transparent attention queue**: sortable review list with explicit criteria and readable reasons.
- **Persistent watchlist**: ☆ pins, separate by source and region, and watchlist-only focus.
- **Source integrity**: visibly distinct live/server-cache/stale/saved/demo data, plus dashed position extrapolations.
- **4,000-credit account workflow**: budget display and auth secrets server-side.

## Submission bundle

GitHub repository with source, this README and guides, non-secret `.env.example`, API proxy, tests, workflow, Docker configuration, a screenshot/demo showing real Live mode on the user's machine, and clear limitations. Never submit `.env` or claim a demo view is real OpenSky traffic.
