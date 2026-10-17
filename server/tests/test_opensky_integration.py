"""Integration-level tests with mocked HTTP: no OpenSky credentials or credits needed."""
import math
import os
import threading
import time
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

from server import main
from server.opensky import OpenSkyService, UpstreamError, normalize_vector


VECTOR = ['abc123', 'MOCK123 ', 'India', 123, 124, 80.1, 13.1, 3200.0, False,
          220, 92, 1.2, None, 3220.0, '1200', False, 0]
BOUNDS = (12.0, 79.0, 14.0, 81.0)


def service_with(handler):
    return OpenSkyService(client=httpx.Client(transport=httpx.MockTransport(handler)))


def test_mock_tests_do_not_inherit_real_opensky_credentials():
    """The test suite must remain isolated with a populated project .env file."""
    assert not OpenSkyService.has_credentials()
    assert OpenSkyService().daily_budget() == 350


def test_authenticated_oauth_and_rate_headers():
    calls = []
    def handler(request):
        calls.append(request)
        if 'token' in str(request.url):
            assert b'grant_type=client_credentials' in request.content
            return httpx.Response(200, json={'access_token': 'sample-token', 'expires_in': 1800})
        assert request.headers['Authorization'] == 'Bearer sample-token'
        assert request.url.params['lamin'] == '12.0'
        return httpx.Response(200, json={'time': 120, 'states': [VECTOR]},
                              headers={'X-Rate-Limit-Remaining': '3999'})
    with patch.dict(os.environ, {'OPENSKY_CLIENT_ID': 'test-client',
                                 'OPENSKY_CLIENT_SECRET': 'not-a-real-secret'}, clear=False):
        svc = service_with(handler)
        result = svc.get(BOUNDS)
        assert result['source'] == 'live'
        assert len(result['aircraft']) == 1
        assert result['credits']['upstreamRemaining'] == 3999
        assert result['credits']['usedLast24h'] == 1
        assert result['credits']['dailyBudget'] == 3800
        assert svc.get(BOUNDS)['source'] == 'cache'
        assert len(calls) == 2  # one token POST and one states GET


def test_token_is_refreshed_on_unauthorized():
    sent_tokens = []
    def handler(request):
        if 'token' in str(request.url):
            return httpx.Response(200, json={'access_token': f'token-{len(sent_tokens)+1}', 'expires_in': 1800})
        sent_tokens.append(request.headers.get('Authorization'))
        if len(sent_tokens) == 1:
            return httpx.Response(401)
        return httpx.Response(200, json={'time': 400, 'states': []})
    with patch.dict(os.environ, {'OPENSKY_CLIENT_ID': 'id', 'OPENSKY_CLIENT_SECRET': 'secret'}):
        svc = service_with(handler)
        assert svc.get(BOUNDS)['source'] == 'live'
        assert sent_tokens == ['Bearer token-1', 'Bearer token-2']
        assert svc.credit_info()['usedLast24h'] == 2


def test_anonymous_does_not_send_authorization():
    def handler(request):
        assert 'Authorization' not in request.headers
        return httpx.Response(200, json={'time': 400, 'states': [VECTOR]})
    with patch.dict(os.environ, {'OPENSKY_CLIENT_ID': '', 'OPENSKY_CLIENT_SECRET': '',
                                 'OPENSKY_DAILY_CREDIT_BUDGET': ''}):
        svc = service_with(handler)
        assert svc.get(BOUNDS)['credits']['dailyBudget'] == 350


def test_project_budget_stops_extra_requests():
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(200, json={'time': 400, 'states': []})
    with patch.dict(os.environ, {'OPENSKY_CLIENT_ID': '', 'OPENSKY_CLIENT_SECRET': '',
                                 'OPENSKY_DAILY_CREDIT_BUDGET': '1'}):
        svc = service_with(handler)
        svc.get(BOUNDS)
        with pytest.raises(UpstreamError, match='budget') as error:
            svc.get((13.0, 79.0, 15.0, 81.0))
        assert error.value.status_code == 429
        assert error.value.retry_after > 0
        assert len(calls) == 1


def test_outside_app_credit_usage_honors_authoritative_header():
    def handler(request):
        return httpx.Response(200, json={'time': 400, 'states': []},
                              headers={'X-Rate-Limit-Remaining': '0'})
    svc = service_with(handler)
    svc.get(BOUNDS)
    with pytest.raises(UpstreamError, match='account credits'):
        svc.get((13.0, 79.0, 15.0, 81.0))


def test_rate_limit_with_stale_fallback():
    calls = 0
    def handler(request):
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(200, json={'time': 400, 'states': [VECTOR]})
        return httpx.Response(429, headers={'X-Rate-Limit-Retry-After-Seconds': '230'})
    svc = service_with(handler)
    assert svc.get(BOUNDS)['source'] == 'live'
    entry = next(iter(svc.cache.values()))
    entry.fetched_at -= 120
    result = svc.get(BOUNDS)
    assert result['source'] == 'stale'
    assert result['retryAfter'] == 230
    assert result['ageSeconds'] >= 120
    assert svc.get(BOUNDS)['source'] == 'stale'
    assert calls == 2  # cooldown prevents repeated upstream 429 requests


def test_bad_payload_gets_clear_error():
    svc = service_with(lambda _: httpx.Response(200, json={'unexpected': 'shape'}))
    with pytest.raises(UpstreamError, match='Unexpected'):
        svc.get(BOUNDS)


def test_missing_and_invalid_float_fields_are_excluded():
    bad = VECTOR.copy()
    bad[5] = float('nan')
    assert normalize_vector(bad) is None
    bad[5] = True
    assert normalize_vector(bad) is None
    unknown = VECTOR.copy()
    unknown[8] = None
    assert normalize_vector(unknown)['onGround'] is None


def test_simultaneous_refreshes_coalesce_into_one_upstream_request():
    import concurrent.futures
    lock = threading.Lock()
    calls = [0]
    def handler(request):
        with lock:
            calls[0] += 1
        time.sleep(.03)
        return httpx.Response(200, json={'time': 400, 'states': []})
    svc = service_with(handler)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: svc.get(BOUNDS), range(8)))
    assert calls[0] == 1
    assert sum(r['source'] == 'live' for r in results) == 1
    assert sum(r['source'] == 'cache' for r in results) == 7


def test_api_proxy_emits_credit_metadata_and_rate_errors(monkeypatch):
    svc = service_with(lambda _: httpx.Response(200, json={'time': 1, 'states': [VECTOR]}))
    monkeypatch.setattr(main, 'service', svc)
    client = TestClient(main.app)
    response = client.get('/api/aircraft', params=dict(south=12, west=79, north=14, east=81))
    assert response.status_code == 200
    assert response.json()['credits']['usedLast24h'] == 1
    assert client.get('/api/credits').json()['credits']['usedLast24h'] == 1
    assert client.get('/api/aircraft', params=dict(south=12, west=79, north=14, east=100)).status_code == 422
