import test from 'node:test';
import assert from 'node:assert/strict';
import {
  observationState, signalSummary, compareSnapshots,
  densityGrid, attentionQueue, compassActivity,
} from '../src/lib/insights.js';

const plane = (icao24, overrides = {}) => ({
  icao24, callsign: icao24.toUpperCase(), country: 'India',
  latitude: 12.5, longitude: 80.5, lastContact: 1000,
  timePosition: 1000, velocity: 230, heading: 90,
  geoAltitude: 8000, status: 'present', onGround: false, ...overrides,
});

test('fresh/delayed/old/unknown/left positions use timestamps, not fetch time', () => {
  assert.equal(observationState(plane('one'), 1050), 'fresh');
  assert.equal(observationState(plane('two'), 1150), 'delayed');
  assert.equal(observationState(plane('three'), 1500), 'old');
  assert.equal(observationState(plane('four', { timePosition: null, lastContact: null }), 1500), 'unknown');
  assert.equal(observationState(plane('five', { status: 'left' }), 1010), 'left');
  assert.equal(observationState(plane('six', { timePosition: 1200, lastContact: 1200 }), 1000), 'unknown');
});

test('signal summary shows honest completeness with no divide by zero', () => {
  assert.deepEqual(signalSummary([], 1000), {
    total: 0, fresh: 0, delayed: 0, old: 0, unknown: 0,
    freshPercent: 0, headingPercent: 0, speedPercent: 0, lastContact: null,
  });
  const result = signalSummary([
    plane('one'), plane('two', { heading: null, timePosition: 950 }),
    plane('three', { status: 'left' }),
  ], 1050);
  assert.equal(result.total, 2);
  assert.equal(result.fresh, 1);
  assert.equal(result.delayed, 1);
  assert.equal(result.headingPercent, 50);
});

test('changes reflect presence/absence only, not landing or causation', () => {
  assert.deepEqual(compareSnapshots(null, ['x'], 100).entered, []);
  const change = compareSnapshots(['a','b','c'], ['b','d'], 200);
  assert.deepEqual(change.entered, ['d']);
  assert.deepEqual(change.missing, ['a','c']);
  assert.equal(change.at, 200);
});

test('density cells do not count departed or out-of-bounds planes', () => {
  const grid = densityGrid([
    plane('a'), plane('b', {latitude: 13.5,longitude: 81.5}),
    plane('c', {status:'left'}), plane('d', {latitude: 50}),
  ], [10, 78, 15, 83], 5, 5);
  assert.equal(grid.total, 2);
  assert.equal(grid.occupied, 2);
  assert.equal(grid.cells.length, 25);
  assert.equal(grid.max, 1);
});

test('watchlist and configured alerts explain queue ranking', () => {
  const configs = { enabled: true, lowAltitude: true, lowAltitudeValue: 1500,
    highSpeed: true, highSpeedValue: 260 };
  const alerts = attentionQueue([
    plane('a', {geoAltitude:1000}),
    plane('b', {timePosition: 600, lastContact: 600}),
    plane('c', {velocity:300}),
    plane('d'),
  ], 1000, ['d'], configs);
  assert.equal(alerts[0].icao24, 'b');
  assert(alerts.find(a => a.icao24 === 'a').notes.some(n => n.includes('1500')));
  assert(alerts.find(a => a.icao24 === 'd').notes.includes('Pinned to watchlist'));
  assert.equal(attentionQueue([plane('a')], 1000, [], {enabled:false}).length, 0);
});

test('compass view is based on reported coordinates and excludes missing planes', () => {
  const compass = compassActivity([
    plane('nw', {latitude:13,longitude:79}),
    plane('ne', {latitude:13,longitude:81}),
    plane('sw', {latitude:11,longitude:79}),
    plane('se', {latitude:11,longitude:81}),
    plane('left', {status:'left'}),
  ], [12,80]);
  assert.deepEqual(compass, {NW:1, NE:1, SW:1, SE:1});
});
