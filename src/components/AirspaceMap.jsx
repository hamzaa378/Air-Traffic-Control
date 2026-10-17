import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { estimatePosition } from '../lib/aircraft.js';
import { densityGrid, observationState } from '../lib/insights.js';

const MAP_OPTIONS = { preferCanvas: true, zoomControl: false, attributionControl: true };

function colorFor(aircraft, now) {
  const quality = observationState(aircraft, now);
  if (quality === 'left' || quality === 'unknown') return '#738096';
  if (quality === 'delayed' || quality === 'old') return '#c48832';
  if (aircraft.onGround) return '#7d8a9b';
  return '#148574';
}

export default function AirspaceMap({ region, aircraft, selected, selectFlight,
  history, replayPoint, estimate, now, alertZoneKm, watched = [], showDensity = false }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const layerRef = useRef(null);
  const trailRef = useRef(null);
  const replayRef = useRef(null);
  const zoneRef = useRef(null);
  const densityRef = useRef(null);
  const estimateRef = useRef(null);
  const selectRef = useRef(selectFlight);
  selectRef.current = selectFlight;

  useEffect(() => {
    const map = L.map(elementRef.current, MAP_OPTIONS);
    map.fitBounds([[region.bounds[0], region.bounds[1]], [region.bounds[2], region.bounds[3]]]);
    // The markers use a Leaflet canvas renderer, rather than one DOM element per aircraft.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 17, attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
    densityRef.current = L.layerGroup().addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(elementRef.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.fitBounds([[region.bounds[0], region.bounds[1]], [region.bounds[2], region.bounds[3]]]);
    markersRef.current.clear();
    layerRef.current.clearLayers();
  }, [region.id]);

  useEffect(() => {
    if (!densityRef.current) return;
    densityRef.current.clearLayers();
    if (!showDensity) return;
    const { rows, cols, cells, max } = densityGrid(aircraft, region.bounds);
    const [south, west, north, east] = region.bounds;
    const height = (north - south) / rows;
    const width = (east - west) / cols;
    cells.forEach((count, index) => {
      if (!count) return;
      const r = Math.floor(index / cols), c = index % cols;
      const corners = [[north - (r + 1) * height, west + c * width],
        [north - r * height, west + (c + 1) * width]];
      L.rectangle(corners, { stroke: false, fillColor: '#8262a1',
        fillOpacity: .07 + .29 * count / max, interactive: false }).addTo(densityRef.current);
    });
  }, [aircraft, showDensity, region.id]);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    const old = markersRef.current;
    const seen = new Set();
    const pins = new Set(watched);
    for (const plane of aircraft.slice(0, 3000)) {
      seen.add(plane.icao24);
      const position = estimate ? estimatePosition(plane, now) : plane;
      const color = colorFor(plane, now);
      const chosen = plane.icao24 === selected;
      const pinned = pins.has(plane.icao24);
      const options = { radius: chosen ? 9 : pinned ? 7.5 : 5.5, weight: chosen ? 2.5 : pinned ? 2 : 1,
        color: chosen ? '#4b3976' : pinned ? '#b76331' : color, fillColor: color, fillOpacity: chosen ? 1 : .78,
        dashArray: position.estimated ? '2 3' : undefined,
        opacity: plane.status === 'left' ? .35 : 1,
        interactive: true };
      let marker = old.get(plane.icao24);
      if (marker) {
        marker.setLatLng([position.latitude, position.longitude]);
        marker.setStyle(options);
      } else {
        marker = L.circleMarker([position.latitude, position.longitude], options);
        marker.bindTooltip(plane.callsign || plane.icao24.toUpperCase(), {
          direction: 'top', className: 'flight-tooltip', opacity: .92,
        });
        marker.on('click', () => selectRef.current(plane.icao24));
        marker.addTo(layerRef.current);
        old.set(plane.icao24, marker);
      }
      marker.setTooltipContent(`${plane.callsign || plane.icao24.toUpperCase()}${position.estimated ? ' · estimated' : ''}${pinned ? ' · pinned' : ''}`);
    }
    for (const [id, marker] of old) {
      if (!seen.has(id)) {
        layerRef.current.removeLayer(marker);
        old.delete(id);
      }
    }
  }, [aircraft, now, selected, estimate, watched]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    trailRef.current?.remove();
    replayRef.current?.remove();
    const points = history.filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (points.length >= 2) {
      trailRef.current = L.polyline(points.map(p => [p.latitude, p.longitude]), {
        color: '#ad583b', weight: 3, opacity: .95, dashArray: '7 7',
      }).addTo(map);
    }
    if (replayPoint) {
      replayRef.current = L.circleMarker([replayPoint.latitude, replayPoint.longitude], {
        radius: 10, color: '#fff', fillColor: '#bf6e42', fillOpacity: 1, weight: 2,
      }).addTo(map).bindTooltip('Replay observation', { permanent: false });
    }
    return () => { trailRef.current?.remove(); replayRef.current?.remove(); };
  }, [history, replayPoint]);

  useEffect(() => {
    if (!mapRef.current) return;
    zoneRef.current?.remove();
    if (alertZoneKm) {
      zoneRef.current = L.circle(region.center, { radius: alertZoneKm * 1000,
        color: '#b76b48', fillColor: '#b76b48', fillOpacity: .04, weight: 1, dashArray: '5 6',
      }).addTo(mapRef.current);
    }
    return () => zoneRef.current?.remove();
  }, [region.id, alertZoneKm]);

  const selectedPlane = useMemo(() => aircraft.find(a => a.icao24 === selected), [aircraft, selected]);
  useEffect(() => {
    estimateRef.current?.remove();
    if (!mapRef.current || !estimate || !selectedPlane) return;
    const projection = estimatePosition(selectedPlane, now);
    if (!projection.estimated) return;
    // A dashed connector marks the gap between last REPORTED and EXTRAPOLATED position.
    estimateRef.current = L.polyline([
      [selectedPlane.latitude, selectedPlane.longitude],
      [projection.latitude, projection.longitude],
    ], { color: '#b4603a', dashArray: '4 5', weight: 2, opacity: .9 }).addTo(mapRef.current);
    return () => estimateRef.current?.remove();
  }, [selectedPlane, now, estimate]);
  useEffect(() => {
    const map = mapRef.current;
    if (selectedPlane && map) map.panTo([selectedPlane.latitude, selectedPlane.longitude], { animate: true });
  }, [selected]);

  return <div className="airspace-map" ref={elementRef} aria-label="Interactive aircraft tracking map" />;
}
