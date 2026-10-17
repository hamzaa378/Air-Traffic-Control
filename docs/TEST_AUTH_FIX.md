# Fix: OpenSky credentials broke five backend integration tests

## The symptom

On a machine with an OpenSky OAuth client configured, the original v2 tests
reported `5 failed, 12 passed` and repeated `OpenSky authentication failed. Check server credentials.`.
The React JavaScript tests and Vite production build were already passing.

## Why it happened

`server/main.py` calls `load_dotenv()` so the real server can obtain its
credentials from the project's `.env` file. Some backend integration tests use
`httpx.MockTransport` to return simulated OpenSky `/states/all` responses. The
tests implicitly assumed that no OAuth client credentials were set.

On the user's computer, those variables *were* set. The production
`OpenSkyService._token()` correctly tried an OAuth token POST before fetching
aircraft state. The mock handlers were not built to simulate token requests,
so the artificial response had no `access_token`. Five unrelated tests then
failed on the same authentication exception, hiding what they meant to test.

This was a **test isolation defect**. It does not show that the real API
credentials are invalid. These mock tests never need to contact OpenSky.

## What was changed (v2.1)

1. **New `server/tests/conftest.py`:** An autouse pytest fixture temporarily
   unsets `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`, and
   `OPENSKY_DAILY_CREDIT_BUDGET` for each test. Pytest's `monkeypatch` restores
   the caller's process environment at the end of each test; it never edits
   `.env` or the user's credentials.
2. **`server/tests/test_opensky_integration.py`:** Adds a regression test that
   verifies the mock environment starts in anonymous mode. Existing tests for
   the OAuth token exchange and token retry explicitly configure *fake*
   credentials for their duration and continue to verify the real auth logic.
3. **CI:** Run the Python test suite a second time with fake OpenSky credential
   variables, so the failure cannot silently return.
4. **Docs:** Record the exact failure and expected test outputs.

Production `server/opensky.py`, `server/main.py`, the React code, the API credit
budget and `.env.example` were **not changed**.

## Verify in Windows PowerShell

Open PowerShell at the folder that contains `package.json` and `server`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q server/tests
npm test
npm run build
```

Expected Python result in v2.1: `18 passed` with no test failures. Expected
JavaScript result: `19 passed`. The Vite build should finish with `built in ...s`
(on the user's original v2 run it already succeeded).

You **must not** delete or share `.env` to fix these tests. The test fixture
removes environment variables only inside the test process.

## Distinguish real runtime errors

To check the real account, keep `.env` configured and run the API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn server.main:app --host 127.0.0.1 --port 8001
```

`http://127.0.0.1:8001/api/health` tells you whether the app found credentials,
but **does not authenticate** the account. A real Live request from the UI
is needed to test OpenSky access; that may consume credits. If the live request
fails with an authentication error, verify OAuth `client_id` and
`client_secret` in `.env` (not your normal account password). Do not paste
those secrets or access tokens into ChatGPT or GitHub.

## Regression proof

The authoring environment reproduced the five original failures using dummy
credentials. After the fix, identical dummy variables produced `18 passed`.
The same tests passed with a fake `.env` file in place, and the 19 frontend
logic tests passed. No real OpenSky API requests were needed.
