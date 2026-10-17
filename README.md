> **v2.1 test-fix release (17 October 2026):** Fixes the five backend pytest failures seen when an actual OpenSky `.env` file is configured. The backend test suite now isolates credentials automatically, including a regression test. No frontend or production API behavior was changed. Read [`docs/TEST_AUTH_FIX.md`](docs/TEST_AUTH_FIX.md).

# SkyScope | Air Traffic Control — Daylight Atlas v3

An Airspace Pulse React + Python dashboard for the **CodeChef-VIT 2026–27 promotional cycle**, **Frontend Development: Air Traffic Control** (task sheet pages 8–9). It maps actual OpenSky aircraft state vectors and handles incomplete, late, and unavailable observations. The separate Demo mode uses **synthetic** aircraft, never presents them as real flights, and works without API credentials.

> **Begin with [START_HERE.md](START_HERE.md)** for an exact, beginner-friendly Windows setup. New interface? Read [docs/INTERFACE_GUIDE.md](docs/INTERFACE_GUIDE.md) for a step-by-step tour and customization. See [docs/](docs/) for architecture, every expected/bonus feature, tests, and troubleshooting.

## What it does

- Interactive Leaflet map with reusable canvas-rendered aircraft markers and a legend for outdated information.
- 8 selectable regions and callsign/ICAO/country, airborne, altitude, and velocity filters.
- Aircraft details: latitude, longitude, altitude, velocity, heading, vertical rate, last position, last contact, squawk.
- Real observations refreshed every 120 seconds, with shared server caching (115 seconds) and paused background polling.
- Aircraft entering/leaving the monitored region are tracked briefly; coordinates are never invented for missing positions.
- Visible labels for **live**, **cached**, **stale**, **saved**, and **simulated** data.
- Selected-aircraft trail and local replay; export recorded points to JSON.
- Optional great-circle position estimation limited to 120 seconds, clearly separate from measured coordinates.
- Configurable example alerts (altitude, speed, circle around a region center), stored in the browser.
- Offline Saved mode (recent real snapshot), Demo mode, OAuth2 authentication through FastAPI, credit budgeting and rate-limit recovery.
- **Airspace Pulse v2**: recent-position percentage, heading/speed completeness, transparent observation quality labels.
- **Change intelligence**: new vs missing ICAOs only when genuine new samples arrive (no fictional movements or interpretations).
- **Spatial awareness**: 8×5 observation-density visualization, selectable map overlay, quadrant counts.
- **Explainable attention queue**: review order with clear rules; never treated as aviation hazard prioritization.
- **My Watchlist**: pin ☆ aircraft, separate demo/live pins, focus map/list and retain choices on this device.
- **Daylight Atlas v3 interface:** warm paper theme instead of standard navy, map-led layout, prominent six-field aircraft inspector, three-item review preview, expandable diagnostics, and a Focus map action that hides only the browsing list. Responsive map-first arrangement on phones.

**Important:** This is an educational visualization. It is not air traffic control equipment, an operational safety system, or a continuously complete record of aircraft.

## Technology

| Component | Choice | Reason |
| --- | --- | --- |
| UI | React 18, JavaScript, Vite 6 | Easy components and fast local development |
| Map | Leaflet 1.9, OpenStreetMap tiles | Interactive, open map rendering |
| State | React Hooks + small pure JS helpers | No Redux or complicated boilerplate |
| API proxy | Python 3.12, FastAPI, httpx | Keeps OAuth secrets server-side |
| Local storage | `localStorage` | Last successful region snapshot, selected trail, preferences |
| Tests | Node built-in test runner + pytest | Tests without using OpenSky credits |
| Deployment | Docker Compose | Optional one-command deployment after configuration |

## Quick start

1. Install Python 3.11+ and Node 20.19+ (Node 22 LTS recommended).
2. Copy `.env.example` to `.env`, paste your **OpenSky API client ID and secret**.
3. Open Terminal 1:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r server/requirements.txt
   python -m uvicorn server.main:app --host 127.0.0.1 --port 8001
   ```
4. Open Terminal 2 in the same folder:

   ```powershell
   npm install
   npm run dev
   ```
5. Open **http://localhost:5173** and choose **Live** for real data or **Demo** for simulated data.

> On Windows PowerShell, if venv activation is blocked, skip activation and run `\.venv\Scripts\python.exe -m pip install -r server/requirements.txt` and `\.venv\Scripts\python.exe -m uvicorn server.main:app --port 8001` instead.

## API proxy endpoints

| URL | Meaning |
| --- | --- |
| `GET /api/health` | Backend is running; whether server credentials were loaded |
| `GET /api/credits` | Rolling 24h project budget and latest upstream balance, if provided |
| `GET /api/aircraft?south=12&west=79&north=14&east=81` | Validated OpenSky state-vector sample for an area ≤ 25 square degrees |

These API calls must be made to **http://localhost:8001** in development; the Vite page automatically proxies `/api/*`. In production, FastAPI serves the built UI and API together on port 8001.

No API keys or OAuth tokens should appear in React files or browser requests.

## Tests and build

```powershell
npm test
npm run build
python -m pytest -q server/tests
```

Run `python -m pip install pytest` if needed. The test suite uses mock OpenSky HTTP responses and is **zero-credit**. See [docs/TESTING.md](docs/TESTING.md) for manual verification and expected UI behavior.

## Run the production build locally

```powershell
npm run build
python -m uvicorn server.main:app --host 127.0.0.1 --port 8001
```

Open http://localhost:8001 (not port 5173). The backend serves `dist/` automatically if it exists.

## Run using Docker

With Docker Desktop installed, and after creating `.env`:

```powershell
docker compose up --build
```

Open http://localhost:8001 and stop with `Ctrl+C`, then `docker compose down` if desired. The Compose port is intentionally bound to localhost. For a public deployment, first add authentication, abuse prevention, HTTPS, and suitable persistent or shared budget accounting.

## Project layout

```text
SkyScope/
├── START_HERE.md                 Start here: numbered Windows instructions
├── README.md                     Overview and shortest setup
├── DECISIONS.md                  Trade-offs and limitations
├── .env.example                  Credentials template (never publish .env)
├── src/
│   ├── App.jsx                   Dashboard layout, controls, stats, pins
│   ├── styles.css                Desktop and responsive styling
│   ├── hooks/useAirTraffic.js    Refresh loop, state, offline saves, history
│   ├── lib/aircraft.js           Merge, estimation, filtering and alerts
│   ├── lib/insights.js           Quality, density, changes, attention queue
│   ├── lib/regions.js            Regions, initial filters and thresholds
│   ├── lib/demo.js               Simulated demonstration data
│   ├── lib/format.js             Units and display formatting
│   └── components/               Map, list, situation, pins, details, replay, alerts
├── server/
│   ├── main.py                   FastAPI validation, endpoints, dist serving
│   ├── opensky.py                OAuth2, API adapter, caching, credit guard
│   └── tests/                   Mock network and concurrency tests
├── tests/                        Frontend logic tests
├── docs/                         Guides and feature checklist
├── Dockerfile / compose.yaml     Optional packaged deployment
└── .github/workflows/verify.yml  Run tests and build in GitHub Actions
```

## Documentation

- [START_HERE.md](START_HERE.md) — complete beginner Windows install and first run
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — each module, API contract, source-of-truth, diagrams
- [docs/OPENSKY_CREDITS.md](docs/OPENSKY_CREDITS.md) — OAuth2 and 4,000-credit account calculation
- [docs/FEATURE_CHECKLIST.md](docs/FEATURE_CHECKLIST.md) — required vs bonus coverage
- [docs/TESTING.md](docs/TESTING.md) — automated and manual test checklist
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — common Windows/API mistakes
- [docs/SITUATIONAL_AWARENESS.md](docs/SITUATIONAL_AWARENESS.md) — stand-out Airspace Pulse features
- [docs/CODE_WALKTHROUGH.md](docs/CODE_WALKTHROUGH.md) — code explained for beginners
- [docs/CONTINUE_HERE.md](docs/CONTINUE_HERE.md) — full developer handover
- [docs/VERIFICATION_REPORT.md](docs/VERIFICATION_REPORT.md) — exactly what was tested here
- [DECISIONS.md](DECISIONS.md) — decisions and known limitations

## Attribution

Flight state vectors: [OpenSky Network](https://opensky-network.org/); tiles: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), credited directly on the map. Live aircraft coverage depends on OpenSky receiver coverage and API availability. Static map tiles require an Internet connection even when using saved or simulated flight data; cached tiles may remain visible offline.
