> **Latest checkpoint: v3 Daylight Atlas, 2026-10-17.** Warm ivory/purple/coral visual identity; map-first layout on smaller screens; new Focus map action; six essential flight fields with remaining details collapsible; a visible three-item review queue with Airspace Pulse technical diagnostics inside a disclosure. All existing backend functionality and the v2.1 credentials-test fix are retained. Frontend JS tests **19/19**, backend Python tests **18/18**, JSX and CSS parsing PASS; **Vite bundle not runnable in this authoring container (npm packages missing)**. The user must run `npm install && npm run build` on Windows and verify browser interactions. See [`INTERFACE_GUIDE.md`](INTERFACE_GUIDE.md) and [`VERIFICATION_REPORT.md`](VERIFICATION_REPORT.md).

> **Latest checkpoint: v2.1, 2026-10-17.** Fixed pytest failures when `.env` contains OpenSky client credentials. Changed only `server/tests/conftest.py`, `server/tests/test_opensky_integration.py`, CI test invocation and documentation. The API and UI sources are unchanged. Backend regression **18/18** and frontend logic **19/19** passed; Vite production build was confirmed for v2 by the user's log. See [`TEST_AUTH_FIX.md`](TEST_AUTH_FIX.md).

# Developer handover: SkyScope / Airspace Pulse v2

Read this before modifying the submission. This guide records the source layout, version checkpoint, verified results, dependencies, and unfinished work.

## Current project

- Challenge: CodeChef-VIT 2026–27 frontend Air Traffic Control (task PDF pages 8–9).
- Frontend: React 18 / Vite 6 / plain JavaScript + CSS / Leaflet.
- Backend: Python FastAPI, HTTPX, OAuth2 and OpenSky `/api/states/all` proxy.
- Assets: OpenStreetMap tiles; no AI-generated aviation illustrations or templates required.
- New features in v2: Airspace Pulse, freshness/coverage, changes across **new** samples, mini-density and compass summaries, map density overlay, transparent attention queue, separated regional watchlists, improved visual identity.

## Entry points

1. `START_HERE.md` — new-user Windows and OpenSky credentials setup.
2. `README.md` — quick overview and repo submission info.
3. `docs/CODE_WALKTHROUGH.md` — every source module explained.
4. `docs/ARCHITECTURE.md` — data and state paths, diagrams.
5. `docs/SITUATIONAL_AWARENESS.md` — extra algorithms and non-safety wording.
6. `docs/TESTING.md`, `docs/VERIFICATION_REPORT.md` — tests and their limits.
7. `docs/OPENSKY_CREDITS.md` — 4,000-credit account and budget constraints.

## Expected startup

```powershell
Copy-Item .env.example .env
# Fill your own OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET in .env
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server/requirements.txt pytest
.\.venv\Scripts\python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8001
# Second PowerShell:
npm install
npm run dev
# http://localhost:5173
```

## Tests

Run `npm test`, `npm run build` (after npm install), and `python -m pytest -q server/tests`. Backend tests use mock OpenSky responses. Source-development verification is detailed in `docs/VERIFICATION_REPORT.md` and must not be represented as evidence of actual live API behavior or a finished browser build.

## Design constraints

- Do not put OAuth2 credentials in React or commit `.env`.
- Never silently equate received/cached/saved responses with live aircraft positions.
- Never market the attention queue as a collision/separation/safety alert.
- Keep demo and observed datasets visibly separate.
- If changing the 120-second poll, re-evaluate the user account's 4,000-credit budget.
- Do not use multiple Uvicorn workers with the current in-memory backend budget/cache ledger.
- Mark public cloud deployment as unverified until actually deployed.

## Unfinished external validation

Run the app on a machine with npm registry and OpenSky access to complete `npm run build`, live OAuth requests, browser/mobile smoke tests, Docker Compose and final UI screenshots. Do not claim these were done in this container.


## v3.1 handover (user-facing unit conversion)

Aviation units are the default; browser-level unit selection is saved in `skyscope:units`. All normalized OpenSky/backend SI values and thresholds stay unchanged. The implementation is in `src/lib/format.js` and `src/components/UnitsControl.jsx`, with connected presenters in the flight list, inspector, filter controls, alerts, review queue and replay. `src/lib/aircraft.js` only adds SI speed and vertical rate to newly captured histories and alert metadata; this is backwards-compatible with old histories. No backend/server code or credits changed.

Run `npm test` (now 26 frontend logic tests), `npm run build` and `python -m pytest -q server/tests` (18 backend tests). See `docs/UNITS_AND_SPEED_SOURCES.md` for code responsibilities, manual UI checks, known limitations, and explanations of ground/horizontal speed versus unavailable wind and airspeed fields. The current environment can run the Node and Python tests but cannot install Vite from the network; run the production build on your Windows system.
