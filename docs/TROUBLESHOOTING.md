**`pytest` says `OpenSky authentication failed` in five mocked integration tests (v2)?** This is a test isolation issue, not a React build failure or evidence that the live OpenSky credentials are wrong. Version 2.1 adds `server/tests/conftest.py` to temporarily remove `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, and `OPENSKY_DAILY_CREDIT_BUDGET` during mocked tests. The OAuth-specific tests deliberately supply fake credentials. Your real `.env` is kept unchanged. Run `python -m pytest -q server/tests` and expect **18 passed**. See [TEST_AUTH_FIX.md](TEST_AUTH_FIX.md).

# Windows troubleshooting

**Double-clicked `index.html` and got a blank screen?** React is compiled and served by Vite, not a standalone HTML file. Run `npm install` once, then `npm run dev`, and open http://localhost:5173.

**`node` or `npm` not found?** Install Node 22 LTS from https://nodejs.org and reopen PowerShell.

**`py` not found?** Install Python 3.11+ from python.org; check Add Python to PATH.

**PowerShell says `Activate.ps1` is disabled?** Run Python from `\.venv\Scripts\python.exe` without activation (commands shown in START_HERE.md).

**`ModuleNotFoundError: fastapi`?** `python -m pip install -r server/requirements.txt` within the active venv, and rerun server with that Python.

**`npm install` fails `ENOTCACHED` or DNS?** First installation must reach npm registry. Check connectivity/firewall then retry; an offline machine cannot install dependencies from this source archive alone.

**`npm run build` says Vite is missing?** Run `npm install` from the folder containing `package.json` first.

**Vite reports `Network Error`?** Start FastAPI on localhost port 8001 in a separate terminal. Check http://localhost:8001/api/health before reopening the UI.

**`hasCredentials: true` but Live fails?** Loaded variables may be incorrect credentials. Use OpenSky API *client ID and secret*, not account password. Check Python terminal and compare to `.env` with no extraneous quotes or spaces.

**OpenSky 429?** Account or project credits/rate limits hit. Wait for the provider's window; do not repeatedly restart the server to bypass its own process-local meter.

**Aircraft aren't moving?** Most real updates arrive at two-minute intervals. Local interpolation is optional and works only with speed/heading, valid timestamps and an airborne state. The simulator updates every 8 seconds.

**A flight vanished?** It may have left the region, been absent from an upstream sample, or been lost from tracking coverage; no conclusion about landing or aircraft safety follows.

**Map tiles blank but aircraft circles appear?** Tiles require access to OpenStreetMap. Offline snapshots save aircraft JSON, not all global basemap tiles. Check Internet or a cache.

**Few or no aircraft in Chennai?** OpenSky is not guaranteed to cover all aircraft equally in every country/region at every time. Try London or Singapore as a check; this changes which bounding box is requested.

**Dashboard is narrow on a laptop?** Use browser zoom 90% or the responsive layout, which moves the right analysis column below the map.
