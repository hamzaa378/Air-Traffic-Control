import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAircraft, appendObservation, estimatePosition, evaluateAlerts, filterAircraft } from '../src/lib/aircraft.js';

const example = { icao24:'abc123', latitude:13, longitude:80, callsign:'TEST1',
  lastContact:100, timePosition:100, velocity:200, heading:90,
  onGround:false, geoAltitude:1000, country:'India' };

test('new positions enter region; departed remain briefly and then expire', () => {
  const now = mergeAircraft(new Map(), [example], 100);
  assert.equal(now.get('abc123').status, 'present');
  const left = mergeAircraft(now, [], 200);
  assert.equal(left.get('abc123').status, 'left');
  assert.equal(mergeAircraft(left, [], 401).size, 0);
});
test('observations are not duplicated by repeated API payloads', () => {
  const history = appendObservation([], example, 100);
  assert.equal(appendObservation(history, example, 120).length, 1);
  assert.equal(appendObservation(history, {...example, lastContact: 110}, 120).length, 2);
});
test('eastbound estimate shifts longitude, never changes original observation', () => {
  const estimated = estimatePosition(example, 110);
  assert(estimated.longitude > example.longitude);
  assert.equal(example.longitude, 80);
  assert.equal(estimated.estimated, true);
  assert.equal(estimatePosition(example, 400).estimated, false);
});
test('no movement is invented for grounded aircraft', () => {
  assert.equal(estimatePosition({...example, onGround:true}, 110).estimated, false);
});
test('alert thresholds and filters are deterministic', () => {
  const config = {enabled:true, lowAltitude:true, lowAltitudeValue:1500,
    highSpeed:true, highSpeedValue:180, zone:false};
  assert.equal(evaluateAlerts([example], config, [13,80]).length, 2);
  assert.equal(filterAircraft([example], { search: 'test', airborne:'air',
    country:'India', minAltitude:'', maxAltitude:'', minSpeed:'' }).length, 1);
});

test('unknown ground state does not invent flight estimates or airborne alerts', () => {
  const unknown = { ...example, onGround: null };
  assert.equal(estimatePosition(unknown, 110).estimated, false);
  assert.equal(evaluateAlerts([unknown], {enabled:true, lowAltitude:true, lowAltitudeValue:2000}, [13,80]).length, 0);
});

test('expired stale positions are not extrapolated', () => {
  const left = { ...example, status:'left' };
  assert.equal(estimatePosition(left, 105).estimated, false);
  assert.equal(estimatePosition(example, 250, 120).estimated, false);
});

test('filter by speed, altitude and country', () => {
  const filters = { search:'', airborne:'all', country:'India',
    minAltitude:'500', maxAltitude:'2000', minSpeed:'150' };
  assert.equal(filterAircraft([example], filters).length, 1);
  assert.equal(filterAircraft([example], { ...filters, maxAltitude:'800' }).length, 0);
  assert.equal(filterAircraft([example], { ...filters, country:'Singapore' }).length, 0);
});

test('history is capped and preserves original chronological observations', () => {
  let trail = [];
  for (let i=0; i<125; i++) trail = appendObservation(trail,
    { ...example, lastContact: 100+i, longitude:80+i/10000 }, 100+i, 100);
  assert.equal(trail.length, 100);
  assert.equal(trail[0].lastContact, 125);
  assert.equal(trail.at(-1).lastContact, 224);
});

test('future observation produces no estimated position', () => {
  assert.equal(estimatePosition({...example, lastContact: 180, timePosition:180}, 100).estimated, false);
});

test('invalid coordinates are ignored when merging API updates', () => {
  const incoming = [{...example, latitude: NaN}, {...example, icao24:'notvalid',longitude:Infinity}];
  assert.equal(mergeAircraft(new Map(), incoming, 100).size, 0);
});


test('unknown ground state never appears in air-only or ground-only filters', () => {
  const base = {search:'', airborne:'air', country:'all', minAltitude:'', maxAltitude:'', minSpeed:''};
  assert.equal(filterAircraft([{...example,onGround:null}], base).length, 0);
  assert.equal(filterAircraft([{...example,onGround:null}], {...base,airborne:'ground'}).length, 0);
});

test('stale aircraft cannot generate current watch alerts', () => {
  const config = {enabled:true, lowAltitude:true, lowAltitudeValue:1500,
    highSpeed:true, highSpeedValue:180, zone:false};
  assert.equal(evaluateAlerts([example], config, [13,80], 110).length, 2);
  assert.equal(evaluateAlerts([example], config, [13,80], 1000).length, 0);
});
