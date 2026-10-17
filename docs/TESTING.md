> **v3 additional browser checks:** Open the app at desktop ~1440px, laptop ~1024px, tablet ~768px and phone ~390px. Confirm the map stays above secondary panels on narrower screens; switch Live/Saved/Demo; click markers; expand All reported fields; open/close Pulse diagnostics and replay; test Focus map hides only the browser list; check every button with Tab/Enter; check reduced-motion preference. Run `npm run build` locally. Full walkthrough: [`INTERFACE_GUIDE.md`](INTERFACE_GUIDE.md).

# Verification and manual testing checklist

## Zero-credit automated tests

From project root in a terminal with Python and Node installed:

```powershell
npm install
npm test
npm run build
python -m pip install -r server/requirements.txt pytest
python -m pytest -q server/tests
```

`npm install` needs internet access on the **first** install. `npm run build` needs React, Vite, and Leaflet installed locally. Node's built-in tests exercise pure logic and do not require browser packages. Backend tests mock HTTP and do not request OpenSky credits. With v2.1,
`server/tests/conftest.py` temporarily clears any OpenSky credentials in your
process environment, so `python -m pytest -q server/tests` works even after
configuring a real account in `.env`. OAuth flow tests opt back in with fake credentials.
Expected result: **18 Python tests passed and 19 JavaScript tests passed**.

To reproduce the original issue safely without account access, set dummy
`OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` in your test environment. No real
upstream requests are made. Do not paste real secrets into terminal transcripts.

### What the automated tests cover

- Backend input bounds, missing/invalid vector fields, OAuth2 token flow, cache TTL, rate limiting, insufficient project/account credits, retries on 401, stale fallback, concurrent identical queries and API metadata.
- Frontend no duplicate trail points, cap on trail size, movement extrapolation conditions, entry/removal of aircraft, filters/threshold rules, data-age categories, distribution bins, compass counts and attention queue ordering.

## Manual browser smoke test (must run on your computer)

| Action | Expected behavior |
|---|---|
| Open `http://localhost:5173` | Dashboard, map, side panels and source mode buttons appear |
| Choose Demo | `SIM` aircraft appear and source explicitly says simulated |
| Click one marker | Details panel displays aircraft and age |
| Search `SIM001` | Left list/map focus one matching aircraft |
| Click ☆ | Flight becomes pinned and visible under MY WATCHLIST |
| Enable Focus on pinned aircraft | All unpinned aircraft hidden from list/map; region overview remains unfiltered |
| Switch live, back to demo | Watchlists separated so fake and real pins do not mix |
| Toggle Density grid | Binned shading appears behind displayed markers; no network call needed |
| Observe Airspace pulse | Freshness and quadrant counts appear, without indicating safety risk |
| Keep Demo open ≥16 seconds | What changed updates after distinct snapshots; click flight for trail/replay |
| Change low-altitude threshold | Attention queue and custom alerts change in explainable way |
| Toggle Estimate movement | Selected aircraft has clearly labeled projected point/connector where applicable |
| Export JSON | Browser downloads locally recorded points with source label |
| Choose Live with credentials | Server `source` becomes live/cache; sampled timestamp is displayed |
| Disconnect network, use Saved | Latest successfully saved real snapshot loads, clearly marked saved/old |
| Reload browser | Per-region/mode pins and thresholds persist on same browser |
| Resize to phone width | Main controls, map and insight sections remain accessible |

## Error simulation

- Stop the backend while the UI runs; after refresh it must show a warning, not invent live data.
- With `.env` credentials unset, demo remains usable. Live may be restricted by OpenSky's anonymous allowance.
- Test `/api/aircraft?south=10&west=10&north=0&east=20`; HTTP 422 expected.
- Run `python -m pytest -q server/tests`; the rate-limit mocks verify 429 cooldown without using real credits.

## Honesty requirements for evidence

Do not claim the displayed current position is guaranteed or that the tool can detect hazardous aircraft proximity. Capture any required screenshots or recordings on your own browser, with the actual source label visible. Online OpenSky and map-tile access were not verified in the source-development environment.
