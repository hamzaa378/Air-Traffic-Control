"""Keep mocked backend tests independent of the developer's private .env file.

The application deliberately loads .env when server.main is imported. During tests,
pytest must remove inherited OpenSky credentials BEFORE making mocked requests.
Tests exercising OAuth2 can temporarily opt back in with patch.dict/monkeypatch.
The fixture restores the original environment after each test and spends 0 credits.
"""

import pytest


@pytest.fixture(autouse=True)
def isolate_opensky_test_credentials(monkeypatch):
    """Do not route fake state responses through the real OAuth2 token flow."""
    for key in (
        "OPENSKY_CLIENT_ID",
        "OPENSKY_CLIENT_SECRET",
        "OPENSKY_DAILY_CREDIT_BUDGET",
    ):
        monkeypatch.delenv(key, raising=False)
