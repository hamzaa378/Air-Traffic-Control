# v3 Daylight Atlas verification — 2026-10-17

- **Node.js data/logic tests:** `npm test` — **19 passed**, **0 failed**.
- **Python API tests:** `python -m pytest -q server/tests` — **18 passed**, **0 failed**, in the project's working directory.
- **Static JavaScript imports and Markdown references:** `python scripts/verify_source.py` — **PASS**.
- **JSX syntax:** TypeScript's local `transpileModule` parser accepted all 9 JSX files, including the modified App, FlightDetails and SituationPanel.
- **CSS:** local PostCSS parser accepted the complete new `src/styles.css` (257 top-level nodes).
- **Not verified here:** `npm run build` fails with `vite: not found` because `node_modules` are not installed in this authoring environment. The user's earlier successful Vite build applies to **v2**, not to the **modified v3** frontend. Full browser/mobile/keyboard interaction, real OpenSky credentials, map tiles and deployment must be checked on the user's Windows system. Do not report them as passing until they are run.
- The backend runtime and API credit logic are **unchanged from v2.1**. No OpenSky credits were used by these tests. The first actual authenticated fetch must be tested separately.

[Frontend walkthrough and manual smoke test](INTERFACE_GUIDE.md)

---

# v2.1 regression verification — 2026-10-17

- User's Windows execution of **v2**: `npm test` **19/19**, `npm run build` **PASS** (Vite 6.4.4), `pytest` **12 passed and 5 failed**.
- Cause of those five failures: configured OpenSky credentials from the process environment / loaded `.env` caused mocked HTTP response handlers to receive an OAuth token request instead of the mocked states request.
- **Reproduced on authoring machine**: fake `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` produced the exact same five failures.
- **Fix**: `server/tests/conftest.py` contains an autouse `monkeypatch.delenv()` fixture for the three OpenSky configuration variables; OAuth tests still supply deliberately fake credentials.
- **Fixed code, with deliberately populated credentials**: `python -m pytest -q server/tests` **18 passed**. Existing 19 Node logic tests also passed. Source-reference validation passed.
- **Fixed code, with `.env` configured**: also tested; the same backend suite passed without account requests.
- v2.1 **production Python OpenSky service and frontend sources were not changed**. The original v2 frontend build passed on the user's Windows system; v2.1's unchanged frontend was not rebuilt in the authoring container because `node_modules` is not installed there.
- Real OpenSky OAuth login, real flight retrieval, browser interactions and Docker operation **are not proven by these unit tests**. Validate them separately using the manual checklist.

---

# Verification report — 2026-10-17

This report distinguishes static/source-level checks performed in the authoring container from end-to-end checks the applicant must do with npm, a browser, and OpenSky credentials.

## Passed in the authoring environment

1. **19 Node pure JavaScript tests** — `npm test`: PASS. Includes 6 new Airspace Pulse calculations and 2 additional filter/alert safety checks.
2. **17 backend Python tests** — `python -m pytest -q server/tests`: PASS. OpenSky OAuth2, 429 handling, caching, vector normalization, concurrency and proxy metadata tested with mocks.
3. **JSX syntax parser** — all React `.jsx` files parsed successfully with the locally installed TypeScript parser. This is syntax validation only, not a production bundle or real browser rendering test.
4. **Project references** — check relative JavaScript imports and Markdown links with the verification script in `scripts/verify_source.py`.
5. **Python source import/bytecode validation** — checks all local `.py` modules.

## Not performed in the authoring environment

- React `npm run build`: **not executed successfully** because npm dependencies (React, Leaflet, Vite) could not be fetched. Offline npm install failed with `ENOTCACHED` for the Vite React plugin; no dependency registry access was available.
- Real OpenSky OAuth2 login/live REST response: no user credentials were entered or tested; mock tests only. No actual credit spend was generated.
- Browser layout, responsiveness, click interactions, keyboard accessibility and map tiles: not directly executed here because dependencies are unavailable. Run manual checklist in `docs/TESTING.md`.
- Docker Compose build / a publicly reachable deployment / full-scale 3,000-aircraft performance: not tested or claimed.

## How to finish validation on Windows

```powershell
# First PowerShell: in project root
Copy-Item .env.example .env
# Add your *own* OAuth2 client ID and secret to .env
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server/requirements.txt pytest
.\.venv\Scripts\python.exe -m pytest -q server/tests
.\.venv\Scripts\python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8001

# Second PowerShell: project root
npm install
npm test
npm run build
npm run dev
# Open http://localhost:5173
```

Once the app loads, follow all of `docs/TESTING.md`; capture your own real browser screenshots as evidence. **Do not present mocked response tests as proof of real live OpenSky availability.**
