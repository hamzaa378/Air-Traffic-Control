import { useCallback, useEffect, useRef, useState } from 'react';
import { appendObservation, mergeAircraft } from '../lib/aircraft.js';
import { compareSnapshots } from '../lib/insights.js';
import { demoSnapshot } from '../lib/demo.js';
import { MAX_HISTORY_POINTS, REFRESH_MS } from '../lib/regions.js';

const MAX_LOCAL_AIRCRAFT = 1300;
const snapshotKey = regionId => `skyscope:snapshot:${regionId}`;
const historyKey = (regionId, icao24, mode) =>
  `skyscope:track:${mode === 'demo' ? 'demo' : 'observed'}:${regionId}:${icao24}`;

function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage disabled/full */ }
}

/** Owns all network requests and history. UI components never call OpenSky. */
export default function useAirTraffic(region, mode, selectedId) {
  const [flights, setFlights] = useState([]);
  const [meta, setMeta] = useState({ source: 'connecting', fetchedAt: null, sampleTime: null,
    warning: '', retryAfter: 0, ageSeconds: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [change, setChange] = useState(null);
  const lastSampleRef = useRef(null);
  const trackRef = useRef(new Map());
  const planeRef = useRef(new Map());
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const nextAllowedRef = useRef(0);

  // Region changes reset the current airspace and in-memory movement history.
  useEffect(() => {
    planeRef.current = new Map();
    trackRef.current = new Map();
    nextAllowedRef.current = 0;
    lastSampleRef.current = null;
    setChange(null);
    setFlights([]);
    setMeta({ source: 'connecting', fetchedAt: null, sampleTime: null,
      warning: '', retryAfter: 0, ageSeconds: 0 });
  }, [region.id, mode]);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    let frame = 0;

    function accept(payload) {
      if (disposed || !payload || !Array.isArray(payload.aircraft)) return;
      const observedAt = Date.now() / 1000;
      // A stale fallback may be older than the newest observation already in memory.
      if (payload.source !== 'stale' || planeRef.current.size === 0) {
        planeRef.current = mergeAircraft(planeRef.current, payload.aircraft, observedAt);
        setFlights(Array.from(planeRef.current.values()));
      }
      const sampleKey = `${payload.sampleTime ?? 'unknown'}:${payload.fetchedAt ?? 'unknown'}`;
      const isNewSample = payload.source === 'live' || payload.source === 'demo';
      const identities = payload.aircraft.map(p => p.icao24).filter(Boolean);
      if (isNewSample && lastSampleRef.current?.key !== sampleKey) {
        setChange(compareSnapshots(lastSampleRef.current?.ids ?? null, identities, payload.sampleTime ?? observedAt));
        lastSampleRef.current = { key: sampleKey, ids: identities };
      } else if (payload.source === 'cache' && lastSampleRef.current === null) {
        // Start with the cached baseline, but don't call it a new live observation.
        lastSampleRef.current = { key: sampleKey, ids: identities };
      }
      // A saved or stale response is not a newly observed track position.
      // Replaying cached coordinates as new observations would fabricate history.
      if (['live', 'cache', 'demo'].includes(payload.source)) for (const plane of payload.aircraft) {
        if (!plane?.icao24 || !Number.isFinite(plane.latitude) || !Number.isFinite(plane.longitude)) continue;
        let history = trackRef.current.get(plane.icao24);
        if (!history) {
          history = readStored(historyKey(region.id, plane.icao24, mode)) || [];
        }
        const updated = appendObservation(history, plane, observedAt, MAX_HISTORY_POINTS);
        trackRef.current.set(plane.icao24, updated);
        if (plane.icao24 === selectedRef.current && updated !== history) {
          writeStored(historyKey(region.id, plane.icao24, mode), updated);
        }
      }
      // Prevent unlimited history growth if the page stays open all day.
      if (trackRef.current.size > 1500) {
        for (const key of trackRef.current.keys()) {
          if (!planeRef.current.has(key) && key !== selectedRef.current) trackRef.current.delete(key);
          if (trackRef.current.size <= 1200) break;
        }
      }
      setMeta({ source: payload.source, fetchedAt: payload.fetchedAt,
        sampleTime: payload.sampleTime, warning: payload.warning || '',
        retryAfter: payload.retryAfter || 0, ageSeconds: payload.ageSeconds || 0,
        credits: payload.credits || null });
      if (payload.retryAfter) {
        nextAllowedRef.current = Date.now() + payload.retryAfter * 1000;
      }
      if (mode === 'live' && (payload.source === 'live' || payload.source === 'cache')) {
        writeStored(snapshotKey(region.id), {
          aircraft: payload.aircraft.slice(0, MAX_LOCAL_AIRCRAFT),
          sampleTime: payload.sampleTime, fetchedAt: payload.fetchedAt,
          source: 'saved', ageSeconds: 0,
        });
      }
    }

    function loadSaved(message = '') {
      const stored = readStored(snapshotKey(region.id));
      if (stored && Array.isArray(stored.aircraft)) {
        accept({ ...stored, source: 'saved', warning: message || 'Showing saved OpenSky observations',
          ageSeconds: Math.max(0, Math.round(Date.now() / 1000 - stored.fetchedAt)) });
        return true;
      }
      return false;
    }

    async function loadLive() {
      if (disposed || document.hidden || Date.now() < nextAllowedRef.current) return;
      if (!navigator.onLine) {
        if (!loadSaved('Network is offline; showing the latest saved observations.')) {
          setMeta(m => ({ ...m, source: 'error', warning: 'You are offline. Use Demo mode.' }));
        }
        return;
      }
      setLoading(true);
      try {
        const [south, west, north, east] = region.bounds;
        const query = new URLSearchParams({ south, west, north, east });
        const response = await fetch(`/api/aircraft?${query}`, { signal: controller.signal, cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) {
          if (json.retryAfter) nextAllowedRef.current = Date.now() + json.retryAfter * 1000;
          if (json.credits) setMeta(old => ({ ...old, credits: json.credits }));
          throw new Error(json.detail || `Server error ${response.status}`);
        }
        accept(json);
      } catch (error) {
        if (disposed || error?.name === 'AbortError') return;
        if (!flights.length && planeRef.current.size === 0) {
          if (!loadSaved(`Live feed unavailable: ${error.message}`)) {
            setMeta(m => ({ ...m, source: 'error', warning: `${error.message}. Try Demo mode.` }));
          }
        } else {
          setMeta(m => ({ ...m, source: 'stale', warning: error.message }));
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    let timer;
    if (mode === 'demo') {
      const step = () => accept(demoSnapshot(region, frame++));
      step();
      timer = setInterval(step, 8000);
    } else if (mode === 'saved') {
      if (!loadSaved()) {
        setMeta(m => ({ ...m, source: 'empty', warning: 'No saved observations yet. Open Live once online or use Demo.' }));
      }
    } else {
      // Show previous observations while the real API request is being made.
      if (planeRef.current.size === 0) loadSaved('Connecting to the live feed…');
      loadLive();
      timer = setInterval(loadLive, REFRESH_MS);
      window.addEventListener('online', loadLive);
      document.addEventListener('visibilitychange', loadLive);
    }
    return () => {
      disposed = true;
      controller.abort();
      if (timer) clearInterval(timer);
      window.removeEventListener('online', loadLive);
      document.removeEventListener('visibilitychange', loadLive);
    };
  }, [region.id, mode, refreshNonce]);

  // Persist the selected flight immediately, even if the user closes the tab
  // before the next periodic refresh. Only the selected track uses disk space.
  useEffect(() => {
    if (!selectedId) return;
    const track = trackRef.current.get(selectedId);
    if (track?.length) writeStored(historyKey(region.id, selectedId, mode), track);
  }, [selectedId, region.id, mode, flights]);

  const getHistory = useCallback((icao24) => {
    if (!icao24) return [];
    return trackRef.current.get(icao24) || readStored(historyKey(region.id, icao24, mode)) || [];
  }, [region.id, mode]);

  const refresh = useCallback(() => {
    nextAllowedRef.current = 0;
    setRefreshNonce(value => value + 1);
  }, []);

  return { flights, meta, loading, getHistory, refresh, change };
}
