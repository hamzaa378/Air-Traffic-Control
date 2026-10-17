import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AVIATION_UNITS, METRIC_UNITS, normalizeUnits, fromSI, toSI,
  altitudeText, speedText, verticalSpeedText, verticalDirection,
  inputValueFromSI, inputValueToSI, alertMessageForUnits, attentionNoteForUnits,
} from '../src/lib/format.js';
import { filterAircraft, evaluateAlerts, appendObservation } from '../src/lib/aircraft.js';

const plane = { icao24:'abc123', callsign:'SCOPE1', country:'India',
  geoAltitude:3048, velocity:100, verticalRate:-5.08,
  latitude:13, longitude:80, onGround:false, status:'present',
  timePosition:100, lastContact:100 };

test('aviation profile defaults and corrupt preferences are safely normalized', () => {
  assert.deepEqual(normalizeUnits({}), AVIATION_UNITS);
  assert.deepEqual(normalizeUnits({ speed:'unexpected', altitude:'m', vertical:'ft/min' }),
    {speed:'kt',altitude:'m',vertical:'ft/min'});
});
test('exact knots, feet, and feet/minute conversions', () => {
  assert(Math.abs(fromSI(1852/3600, 'speed', AVIATION_UNITS) - 1) < 1e-10);
  assert(Math.abs(fromSI(304.8, 'altitude', AVIATION_UNITS) - 1000) < 1e-10);
  assert(Math.abs(fromSI(0.3048/60, 'vertical', AVIATION_UNITS) - 1) < 1e-10);
  assert.equal(altitudeText(3048), '10,000 ft');
  assert.equal(speedText(100), '194 kt');
  assert.equal(verticalSpeedText(-5.08), '-1,000 ft/min');
  assert.equal(verticalSpeedText(5.08), '+1,000 ft/min');
  assert.equal(verticalDirection(-5.08), 'Descending');
  assert.equal(verticalDirection(0), 'Level');
});
test('metric profile and independent custom preferences work', () => {
  assert.equal(altitudeText(3048, METRIC_UNITS), '3,048 m');
  assert.equal(speedText(100, METRIC_UNITS), '360 km/h');
  assert.equal(verticalSpeedText(5.08, METRIC_UNITS), '+5.1 m/s');
  assert.equal(speedText(100, { speed:'m/s', altitude:'ft', vertical:'ft/min' }), '100 m/s');
  assert.equal(altitudeText(null), 'Not available');
  assert.equal(speedText(NaN), 'Not available');
  assert.equal(verticalSpeedText(undefined), 'Not available');
});
test('unit round trips do not change underlying physical thresholds', () => {
  for (const units of [AVIATION_UNITS, METRIC_UNITS, {speed:'m/s',altitude:'ft',vertical:'m/s'}]) {
    for (const [kind,value] of [['speed',240], ['altitude',1500], ['vertical',-5]]) {
      assert(Math.abs(toSI(fromSI(value, kind, units), kind, units) - value) < 1e-9);
    }
  }
});
test('filter inputs are converted back to SI and match original aircraft', () => {
  const aviationFilters = {search:'',country:'all',airborne:'all',
    minAltitude:inputValueToSI('9000', 'altitude', AVIATION_UNITS),
    maxAltitude:inputValueToSI('11000', 'altitude', AVIATION_UNITS),
    minSpeed:inputValueToSI('190', 'speed', AVIATION_UNITS)};
  assert.equal(filterAircraft([plane], aviationFilters).length, 1);
  assert.equal(inputValueFromSI(aviationFilters.minAltitude,'altitude', AVIATION_UNITS), '9000');
  assert.equal(filterAircraft([plane], {...aviationFilters,minSpeed:inputValueToSI('220', 'speed', AVIATION_UNITS)}).length, 0);
  assert.equal(inputValueToSI('', 'speed', AVIATION_UNITS), '');
});
test('alert thresholds remain SI, presentation switches units', () => {
  const config = {enabled:true,lowAltitude:true,lowAltitudeValue:4000,
    highSpeed:true,highSpeedValue:90,zone:false};
  const alerts = evaluateAlerts([plane],config,[13,80],110);
  assert.equal(alerts.length,2);
  const [alt,spd] = alerts;
  assert.equal(alt.siValue,3048);
  assert.equal(spd.siValue,100);
  assert.equal(alertMessageForUnits(alt,AVIATION_UNITS),'Low altitude · 10,000 ft');
  assert.equal(alertMessageForUnits(spd,METRIC_UNITS),'High ground speed · 360 km/h');
  assert.equal(attentionNoteForUnits('Below 1500 m watch threshold',AVIATION_UNITS),'Below 4,921 ft watch threshold');
  assert.equal(attentionNoteForUnits('Above 285 m/s watch threshold',AVIATION_UNITS),'Above 554 kt ground-speed threshold');
});
test('saved track points keep SI speed and vertical rate for unit-switching replay', () => {
  const history = appendObservation([],plane,110);
  assert.equal(history[0].velocity,100);
  assert.equal(history[0].verticalRate,-5.08);
  assert.equal(history[0].altitude,3048);
  assert.equal(speedText(history[0].velocity, AVIATION_UNITS),'194 kt');
  assert.equal(speedText(history[0].velocity, METRIC_UNITS),'360 km/h');
});
