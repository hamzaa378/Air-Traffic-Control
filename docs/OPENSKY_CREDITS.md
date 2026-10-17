# OpenSky: 4,000-credit account setup and budget

## Credentials

Use the **OAuth2 API client ID/secret**, not your website username/password. Sign in at https://opensky-network.org, create API credentials from your account page, then set in project-root `.env`:

```dotenv
OPENSKY_CLIENT_ID=your_client_id_here
OPENSKY_CLIENT_SECRET=your_client_secret_here
OPENSKY_DAILY_CREDIT_BUDGET=3800
```

**Never commit `.env`.** Vite does not need the credentials. Python gets the token and calls OpenSky. A successful `GET /api/health` indicates the server runs; it does not authenticate the credentials. Use Live mode for the actual end-to-end test.

## Calculation

For a request to `/api/states/all` within **25 square degrees** OpenSky's reported pricing is normally **one API credit** per request. Our preset regions are smaller than this. The JavaScript frontend checks every **120 seconds** while open and visible. For one region continuously refreshing for 24 hours:

`24 hours × 60 minutes / 2 minutes = 720 requests ≈ 720 credits`

This is only an estimate. Multiple simultaneous browsers, rapid switching between distinct regions, manual requests, authentication retry on 401, and uses from other programs can change actual usage. Browser hidden-tab pausing reduces requests. The 115-second backend cache coalesces repeat requests for the *same* box.

## Safety budget vs account balance

The configurable `OPENSKY_DAILY_CREDIT_BUDGET` defaults to **3,800** for authenticated mode (200 credits below a 4,000-credit account allowance). The project refuses to exceed that *local rolling 24-hour estimate*. It also displays OpenSky's **last reported remaining credits**, if present in response headers. This account balance is not guaranteed to appear on every response.

**Important limitation:** The project's counter is held **in one Python process's memory**. Restarting the server resets it. It cannot see credits spent in other tools, machines or API clients. The upstream OpenSky account remains the ultimate rate-limit authority. For public deployment, use one shared persistent counter and authenticated request limits, not the current in-memory accounting.

## Test without spending credits

- Choose Demo; generated aircraft never trigger live API calls.
- Choose Saved after you have one real snapshot, even while offline.
- `npm test` and `python -m pytest -q server/tests` use synthetic/mocked responses, not your OpenSky account.

## Diagnose 401 or 429

- `401`: check actual OAuth2 client ID and secret, token endpoint network connectivity, and that you did **not** use your website password. The proxy can retry once with a new token when OpenSky rejects one.
- `429`: OpenSky or project credits are exhausted. The backend sets a retry-after/cooldown and the frontend retains old observations, visually marked as stale. Do not disable cooldown or repeatedly restart to bypass limits.
- `503`: OpenSky unreachable, invalid upstream JSON or missing credentials/token service. Reproduce with demo to isolate the UI.
