# Start Here: SkyScope Daylight Atlas v3 on Windows 10/11

This guide assumes you are not already comfortable with React or FastAPI. **Follow the steps in order.** You need **two terminal windows** while developing: one for Python, one for React.

## 1. Install the tools (one time)

**Python:** Install Python 3.11 or newer from https://www.python.org/downloads/. On the Windows installer, check **Add python.exe to PATH**.

**Node.js:** Install Node.js 22 LTS from https://nodejs.org/. npm comes with Node.

**Code editor:** VS Code from https://code.visualstudio.com/ is convenient but optional.

Open **PowerShell** and check:

```powershell
py --version
node --version
npm --version
```

If Windows says a command is not recognized, install it and reopen PowerShell.

## 2. Extract the project

Extract the zip into a folder such as `C:\Projects\SkyScope`. Open VS Code, choose **File > Open Folder**, and select that folder. In VS Code choose **Terminal > New Terminal**. Verify the working directory contains `package.json` and the `server` folder:

```powershell
Get-ChildItem package.json
Get-ChildItem server
```

## 3. Get your own OpenSky API credentials

1. Sign in at https://opensky-network.org/.
2. Open the **Account** page and create an **API client** (OAuth2 client credentials).
3. Note the `client_id` and `client_secret`. These are **not your OpenSky account username/password**.
4. In the project terminal, copy the template:

   ```powershell
   Copy-Item .env.example .env
   ```
5. Open the new `.env` file and replace the blanks. Example format:

   ```dotenv
   OPENSKY_CLIENT_ID=your_actual_client_id
   OPENSKY_CLIENT_SECRET=your_actual_client_secret
   OPENSKY_DAILY_CREDIT_BUDGET=3800
   ```

The displayed strings above are placeholders, not real credentials. Never share `.env`, put it in screenshots, or commit it to GitHub. Use credentials for authenticated access to your **4,000-credit/day** standard account. If credentials are blank, the server uses the lower-credit anonymous tier.

## 4. Run the Python backend (Terminal 1)

From the SkyScope project folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r server/requirements.txt
python -m uvicorn server.main:app --host 127.0.0.1 --port 8001
```

You should see a message similar to `Uvicorn running on http://127.0.0.1:8001`. **Leave Terminal 1 running.**

If PowerShell blocks `Activate.ps1`, you do not need to change system policy. Use:

```powershell
.\.venv\Scripts\python.exe -m pip install -r server/requirements.txt
.\.venv\Scripts\python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8001
```

Open in browser:

- http://localhost:8001/api/health — expect `"ok":true` and `"hasCredentials":true` if configured.
- http://localhost:8001/api/credits — expect `"authMode":"oauth2"` when credentials were loaded.

`/api/health` working does **not** prove credentials are valid. The first actual Live request verifies authentication with OpenSky.

## 5. Run the React frontend (Terminal 2)

Create a second PowerShell terminal. Make sure you are still in the folder with `package.json`:

```powershell
npm install
npm run dev
```

Wait for `Local: http://localhost:5173/` and open **http://localhost:5173**.

If you only open `index.html` by double-clicking it, React will **not** run: Vite must serve the files.

## 6. First check: demo without spending any credits

1. Choose **Demo** under Data Source.
2. The map should display synthetic `SIM001`, `SIM002`, etc. flights.
3. Click an aircraft circle. The right side shows its six main reported details; other fields are under **All reported fields**.
4. Use the search box to filter to `SIM001`.
5. Clear the search. Expand **Custom observation alerts** on the right to enable a sample threshold or view matches.
6. Keep the page open for at least 16 seconds. Select a flight, expand **Flight trail and replay**, and try **Play**. (A trail needs at least two distinct generated positions.)
7. Click **Export JSON** to save the selected flight's trail. It will be labeled as simulated.

## 6A. Understand the redesigned Daylight Atlas interface (v3)

1. At the top, choose **Region** and **Demo**. The badge must clearly say **Simulated demo**.
2. The **large map is the main workspace**. Its four compact counters describe currently tracked flights, airborne reports, recent positions, and review suggestions. They are not certified safety measurements.
3. Click a marker or a flight in **Find an aircraft** on the left. On the right, **Aircraft details** opens with six useful values. Open **All reported fields** for the less-frequently needed details.
4. Click ☆ next to a flight to add it to **My watchlist** (inside the left panel). Use the watchlist's **Focus on pinned aircraft** checkbox to filter the map/list.
5. The first three **Worth a second look** items appear below the aircraft details. These are suggestions based on observation quality or user-defined rules, not emergency priorities. Expand the remaining suggestions if needed.
6. Open **Airspace Pulse · data quality** only when you want coverage, changes between new observations, map density, or compass distribution. An aircraft missing from an observation does **not** imply an accident or landing.
7. Open **Map options** to turn on estimated positions or a density grid. Position estimation is **off by default**, so the map starts with reported positions rather than projections.
8. Click **Focus map** to hide the long browsing list while retaining the inspector. Click **Show panels** to restore it.
9. Optional tools are intentionally tucked away: **More filters**, **Flight trail and replay**, **Custom observation alerts**, and **Understanding the data and API credits**.
10. On a phone-width browser, the app displays the map first, then the flight list, then the aircraft inspector. See [`docs/INTERFACE_GUIDE.md`](docs/INTERFACE_GUIDE.md) for pictures-as-text, colors and source files.

## 7. Live mode: verify real OpenSky data

1. Choose **Live**. Watch the data-source badge at the top.
2. Pick a region with active coverage, such as London or Singapore. Empty data is possible at any moment.
3. Confirm that the sample time and last-retrieved timestamp appear under the map.
4. Expand **Understanding the data and API credits** below the map. The project counter should increase when the Python backend actually sends a new OpenSky states request.
5. Wait about 2 minutes for a second refresh. A new sample may change aircraft positions, and the trail for an aircraft you select can grow.
6. Open the Python terminal if an error appears. The app displays a warning rather than pretending old positions are live.
7. Switch to **Saved**. It should display the most recent successful real observation for the region you used. This is an offline fallback, **not a new real-time measurement**.

The back end caches a matching region for 115 seconds, even if the Refresh button is clicked more frequently.

## 8. Test the complete project

Open another terminal in the project folder (stop the frontend first if needed):

```powershell
npm test
npm run build
python -m pytest -q server/tests
```

If the last command says `No module named pytest`, install it: `python -m pip install pytest`.

**If a prior copy of v2 failed with five Python `OpenSky authentication failed` errors:**
this v2.1 archive already contains the test isolation fix. Keep your `.env` intact.
Do not remove your real OpenSky credentials to run tests. See
[`docs/TEST_AUTH_FIX.md`](docs/TEST_AUTH_FIX.md) for the cause and verification.

`npm run build` creates a `dist` folder. You can then stop the Vite terminal and open the **production build** from FastAPI alone:

```powershell
python -m uvicorn server.main:app --host 127.0.0.1 --port 8001
```

Open **http://localhost:8001/**.

## 9. Run with Docker (optional)

Install Docker Desktop; from the project folder run:

```powershell
docker compose up --build
```

Browse **http://localhost:8001/**. The API and frontend are served together. Stop with `Ctrl+C`, then optionally run `docker compose down`.

## 10. What to submit to CodeChef-VIT

- Upload your **source code** to GitHub, with `README.md`, `START_HERE.md`, `docs`, `src`, `server`, tests and Docker files.
- **Never commit `.env`**, tokens, passwords, or `node_modules`. `.gitignore` already excludes them.
- Include screenshots/video showing Live, Demo, filters, selecting an aircraft, replay, alerts, and your test results. Capture these on your machine after the app is running; no real screenshots are bundled as proof.
- Explain which features are simulated, locally cached, or genuinely driven by live OpenSky data.
- See [docs/FEATURE_CHECKLIST.md](docs/FEATURE_CHECKLIST.md) for the required and bonus mapping.

## Learn how the app works

Start with `src/App.jsx` (layout), `src/hooks/useAirTraffic.js` (data loading), `src/lib/aircraft.js` (pure logic), `server/main.py` (API endpoints), and `server/opensky.py` (actual OpenSky request logic). Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before editing.
