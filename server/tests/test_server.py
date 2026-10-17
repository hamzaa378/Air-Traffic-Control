"""API validation, data parsing, cache behavior and graceful degradation."""
import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from server.main import app
from server.opensky import OpenSkyService, UpstreamError, normalize_vector


class AircraftAPITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health(self):
        r = self.client.get('/api/health')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['ok'])

    def test_invalid_bounds(self):
        r = self.client.get('/api/aircraft', params=dict(south=20, west=30, north=10, east=40))
        self.assertEqual(r.status_code, 422)

    def test_region_limit(self):
        r = self.client.get('/api/aircraft', params=dict(south=0, west=0, north=20, east=20))
        self.assertEqual(r.status_code, 422)

    def test_normalize_missing_location(self):
        sample = ['abc123', 'F1', 'India', 1, 2, None, None, None, False, None, None, None, [], None, None, False, 0]
        self.assertIsNone(normalize_vector(sample))

    def test_normalize_valid_vector(self):
        vec = ['abc123', 'TEST01 ', 'India', 100, 101, 80.5, 13.2, 10000, False, 220, 90, -1, [], 10001, '1234', False, 0]
        got = normalize_vector(vec)
        self.assertEqual(got['callsign'], 'TEST01')
        self.assertEqual(got['latitude'], 13.2)

    def test_cache_and_stale_fallback(self):
        svc = OpenSkyService()
        bounds = (12, 80, 13, 81)
        with patch.object(svc, '_fetch', return_value={'sampleTime': 100, 'aircraft': []}) as mocked:
            self.assertEqual(svc.get(bounds)['source'], 'live')
            self.assertEqual(svc.get(bounds)['source'], 'cache')
            self.assertEqual(mocked.call_count, 1)
        svc.cache['12.0000:80.0000:13.0000:81.0000'].fetched_at -= 120
        with patch.object(svc, '_fetch', side_effect=UpstreamError('unavailable')):
            result = svc.get(bounds)
        self.assertEqual(result['source'], 'stale')
        self.assertIn('unavailable', result['warning'])

    def test_upstream_error(self):
        svc = OpenSkyService()
        with patch.object(svc, '_fetch', side_effect=UpstreamError('offline')):
            with self.assertRaises(UpstreamError):
                svc.get((0, 0, 1, 1))


if __name__ == '__main__':
    unittest.main()
