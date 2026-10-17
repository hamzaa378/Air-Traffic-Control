"""OpenSky OAuth2 proxy, shared response caching and conservative credit accounting.

The browser never receives OpenSky credentials. This intentionally runs as ONE process:
multiple processes would not share the in-memory cache or local credit counter.
"""
from __future__ import annotations

import math
import os
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Any

import httpx

API_URL = "https://opensky-network.org/api/states/all"
TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
CACHE_SECONDS = 115
MAX_STALE_SECONDS = 3600
DAY_SECONDS = 86400


class UpstreamError(Exception):
    def __init__(self, message: str, status_code: int = 503, retry_after: int = 0):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


@dataclass
class CacheEntry:
    payload: dict[str, Any]
    fetched_at: float


def valid_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def normalize_vector(v: list[Any]) -> dict[str, Any] | None:
    """OpenSky state arrays have at least 17 fields. Missing data stays unknown."""
    if not isinstance(v, list) or len(v) < 17:
        return None
    lon, lat = v[5], v[6]
    if not valid_number(lat) or not valid_number(lon):
        return None
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return None
    icao = str(v[0] or "").strip().lower()
    if not icao:
        return None

    def num(value: Any) -> float | int | None:
        return value if valid_number(value) else None

    return {
        "icao24": icao,
        "callsign": str(v[1] or "").strip() or None,
        "country": str(v[2] or "Unknown"),
        "timePosition": num(v[3]),
        "lastContact": num(v[4]),
        "longitude": float(lon),
        "latitude": float(lat),
        "baroAltitude": num(v[7]),
        "onGround": v[8] if isinstance(v[8], bool) else None,
        "velocity": num(v[9]),
        "heading": num(v[10]),
        "verticalRate": num(v[11]),
        "geoAltitude": num(v[13]),
        "squawk": str(v[14]) if v[14] is not None else None,
        "positionSource": num(v[16]),
    }


class OpenSkyService:
    def __init__(self, client: httpx.Client | None = None):
        self.client = client or httpx.Client(timeout=12, follow_redirects=False)
        self.lock = threading.RLock()
        self.cache: dict[str, CacheEntry] = {}
        self.token: str | None = None
        self.token_expires_at = 0.0
        self.cooldown_until = 0.0
        self.request_log: deque[tuple[float, int]] = deque()
        self.remote_remaining: int | None = None
        self.remote_balance_checked_at = 0.0

    @staticmethod
    def has_credentials() -> bool:
        return bool(os.environ.get("OPENSKY_CLIENT_ID", "").strip() and
                    os.environ.get("OPENSKY_CLIENT_SECRET", "").strip())

    def daily_budget(self) -> int:
        # Standard account: 4000/day, anonymous: 400/day (for /states/*).
        # By default leave a buffer for manual use or other applications.
        cap = 4000 if self.has_credentials() else 400
        default = 3800 if self.has_credentials() else 350
        try:
            raw = os.environ.get("OPENSKY_DAILY_CREDIT_BUDGET", "").strip()
            return max(1, min(cap, int(raw))) if raw else default
        except ValueError:
            return default

    def _trim_ledger(self, now: float) -> None:
        while self.request_log and now - self.request_log[0][0] >= DAY_SECONDS:
            self.request_log.popleft()

    def credit_info(self) -> dict[str, int | None]:
        with self.lock:
            self._trim_ledger(time.time())
            spent = sum(cost for _, cost in self.request_log)
            return {
                "dailyBudget": self.daily_budget(),
                "usedLast24h": spent,
                "projectRemaining": max(0, self.daily_budget() - spent),
                "upstreamRemaining": self.remote_remaining,
            }

    def _reserve_credit(self, cost: int) -> None:
        now = time.time()
        self._trim_ledger(now)
        used = sum(amount for _, amount in self.request_log)
        if used + cost > self.daily_budget():
            retry = max(60, math.ceil(DAY_SECONDS - (now - self.request_log[0][0]))) if self.request_log else 300
            raise UpstreamError("Project's 24-hour OpenSky credit safety budget reached.", 429, retry)
        if self.remote_remaining is not None and self.remote_remaining < cost:
            # A balance of zero must not block forever after OpenSky refills.
            wait = max(0, math.ceil(3600 - (now - self.remote_balance_checked_at)))
            if wait:
                raise UpstreamError("OpenSky reports insufficient account credits. Try after its daily refill.", 429, wait)
            self.remote_remaining = None  # allow one recheck after an hour
        # Conservative accounting: count even if the upstream request fails.
        self.request_log.append((now, cost))

    def _read_remaining(self, response: httpx.Response) -> None:
        raw = response.headers.get("X-Rate-Limit-Remaining")
        if raw is not None:
            try:
                self.remote_remaining = max(0, int(raw))
                self.remote_balance_checked_at = time.time()
            except ValueError:
                pass

    def _token(self, force: bool = False) -> str | None:
        client_id = os.environ.get("OPENSKY_CLIENT_ID", "").strip()
        client_secret = os.environ.get("OPENSKY_CLIENT_SECRET", "").strip()
        if not client_id or not client_secret:
            return None  # documented reduced-credit anonymous mode
        if not force and self.token and time.time() < self.token_expires_at - 45:
            return self.token
        try:
            r = self.client.post(TOKEN_URL, data={
                "grant_type": "client_credentials", "client_id": client_id,
                "client_secret": client_secret,
            })
            r.raise_for_status()
            data = r.json()
            if not isinstance(data.get("access_token"), str) or not data["access_token"]:
                raise ValueError("Missing access token")
            self.token = data["access_token"]
            self.token_expires_at = time.time() + max(60, int(data.get("expires_in", 1800)))
            return self.token
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            raise UpstreamError("OpenSky authentication failed. Check server credentials.") from exc

    def _fetch(self, bounds: tuple[float, float, float, float]) -> dict[str, Any]:
        south, west, north, east = bounds
        params = {"lamin": south, "lomin": west, "lamax": north, "lomax": east}
        # /states/all requests of <= 25 square degrees cost 1 credit.
        for attempt in range(2):
            token = self._token(force=bool(attempt))
            self._reserve_credit(1)
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            try:
                response = self.client.get(API_URL, params=params, headers=headers)
            except httpx.RequestError as exc:
                raise UpstreamError("Cannot reach OpenSky right now.") from exc
            self._read_remaining(response)
            if response.status_code == 401 and token and not attempt:
                self.token = None
                continue
            if response.status_code == 429:
                raw = response.headers.get("X-Rate-Limit-Retry-After-Seconds", "")
                try:
                    wait = max(60, min(86400, int(raw)))
                except ValueError:
                    wait = 300
                self.cooldown_until = time.time() + wait
                raise UpstreamError("OpenSky request credits or rate limit exhausted.", 429, wait)
            if response.status_code != 200:
                raise UpstreamError(f"OpenSky returned HTTP {response.status_code}.")
            try:
                raw = response.json()
            except ValueError as exc:
                raise UpstreamError("OpenSky returned invalid JSON.") from exc
            if not isinstance(raw, dict) or "states" not in raw or not isinstance(raw["states"], (list, type(None))):
                raise UpstreamError("Unexpected OpenSky response format.")
            aircraft = [plane for vec in (raw.get("states") or []) if (plane := normalize_vector(vec))]
            return {"sampleTime": raw.get("time"), "aircraft": aircraft}
        raise UpstreamError("OpenSky rejected the authentication token.", 401)

    def get(self, bounds: tuple[float, float, float, float]) -> dict[str, Any]:
        key = ":".join(f"{v:.4f}" for v in bounds)
        with self.lock:  # coalesce simultaneous requests for identical bounds
            now = time.time()
            entry = self.cache.get(key)
            if entry and now - entry.fetched_at < CACHE_SECONDS:
                return {**entry.payload, "source": "cache", "fetchedAt": entry.fetched_at,
                        "ageSeconds": round(now - entry.fetched_at), "retryAfter": 0,
                        "credits": self.credit_info()}
            try:
                if now < self.cooldown_until:
                    raise UpstreamError("OpenSky is temporarily rate limited.", 429,
                                        int(self.cooldown_until - now) + 1)
                fresh = self._fetch(bounds)
                timestamp = time.time()
                self.cache[key] = CacheEntry(fresh, timestamp)
                if len(self.cache) > 60:
                    oldest = min(self.cache, key=lambda k: self.cache[k].fetched_at)
                    self.cache.pop(oldest, None)
                return {**fresh, "source": "live", "fetchedAt": timestamp,
                        "ageSeconds": 0, "retryAfter": 0, "credits": self.credit_info()}
            except UpstreamError as exc:
                if entry and now - entry.fetched_at < MAX_STALE_SECONDS:
                    return {**entry.payload, "source": "stale", "fetchedAt": entry.fetched_at,
                            "ageSeconds": round(now - entry.fetched_at), "warning": str(exc),
                            "retryAfter": exc.retry_after, "credits": self.credit_info()}
                raise
