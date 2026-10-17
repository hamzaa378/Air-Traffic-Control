# Aviation measurements: user guide and developer notes (v3.1)

## What has changed

SkyScope now opens with **aviation units**:

| Measurement | Aviation display | Metric preset | Other option |
| --- | --- | --- | --- |
| Ground / horizontal speed | knots (`kt`) | `km/h` | `m/s` |
| Geometric / barometric altitude | feet (`ft`) | metres (`m`) | — |
| Vertical speed | feet per minute (`ft/min`) | `m/s` | — |

The control is in the top **Monitoring settings** bar. Open **Units**, choose **Aviation** or **Metric**, or choose units individually. The selection applies immediately to aircraft cards, the inspector, speed/altitude filters, custom alert inputs and messages, attention suggestions, and replay telemetry. Preferences persist in this browser as `localStorage['skyscope:units']` and are independent of region/data source.

**Zero additional OpenSky requests** are made by changing units.

## Meaning of each measurement

- **Ground speed**: rate at which the aircraft moves relative to the Earth. OpenSky `states/all` `velocity`, metres per second.
- **Horizontal speed**: on this data source, the *same* ground-speed measurement. It is shown in Speed explained and labeled as the same source, not an independent measurement.
- **Vertical speed**: OpenSky `verticalRate`, metres per second. Positive is climbing, negative is descending, near zero is level. Conversion uses `ft/min` in aviation mode and preserves the sign.
- **Altitude**: geometric altitude is shown when known; otherwise barometric altitude is used. The primary label states which. Both original reported altitudes are visible under additional measurements.
- **True airspeed (TAS)** and **indicated airspeed (IAS)**: **not supplied** by the OpenSky state-vectors endpoint. SkyScope displays `Not available`, never groundspeed as a substitute. If a future separate, documented source populates `trueAirspeed` or `indicatedAirspeed` in SI (m/s), the same display functions can show them.
- **Wind speed**: **not supplied** by the OpenSky state-vectors endpoint and cannot be calculated accurately from ground speed alone. SkyScope displays `Not available` unless a separate, documented SI source populates `windSpeed`. No weather source has been added in this version.

Speed over ground can differ substantially from true or indicated airspeed due to wind and atmospheric conditions. These distinctions are particularly important to keep clear in a situational-awareness interface.

## Source remains SI

OpenSky normalized API responses, original recordings, UI filtering logic, and threshold calculations **remain SI**:

- `velocity`: m/s
- `verticalRate`: m/s
- `geoAltitude` and `baroAltitude`: m
- Optional explicitly supplied `windSpeed`, `trueAirspeed`, `indicatedAirspeed`: must be m/s
- JSON exports of captured replay data: m/s and m (the exported JSON includes a `measurementUnits` description)

No API routes, backend schema, authentication, caching, credit accounting, or refresh schedule were modified.

Conversions in `src/lib/format.js`:

```text
knots = metres_per_second × (3600 / 1852)
feet = metres / 0.3048
feet_per_minute = metres_per_second × (60 / 0.3048)
kilometres_per_hour = metres_per_second × 3.6
```

The exact inverse is used for user-entered numeric filters and alert thresholds. **Switching units changes the numbers on screen, not the underlying constraints.** For example, a minimum altitude entered as 10,000 ft filters flights below 3,048 metres regardless of whether the user later switches to metric. Rounding only affects display.

## Source-code ownership

| File | Responsibility |
| --- | --- |
| `src/lib/format.js` | Conversions, formatting, option validation, threshold input round-trips |
| `src/components/UnitsControl.jsx` | Aviation/metric presets and three independent unit selectors |
| `src/App.jsx` | Store and persist the user's choice; pass it to presenters; convert filter input |
| `src/components/FlightDetails.jsx` | Main altitude, ground speed, vertical speed, vertical trend; distinguish horizontal/air/wind |
| `src/components/FlightList.jsx` | Compact speed and altitude values in matching units |
| `src/components/AlertsPanel.jsx` | Show user units in alert threshold editing and alert messages |
| `src/components/SituationPanel.jsx` | Render review-queue threshold explanations in selected units |
| `src/components/ReplayPanel.jsx` | Show replay sample speed, altitude and climb rate in user units; export original SI |
| `src/lib/aircraft.js` | Attach SI values to alert metadata and recorded replay points (calculation unchanged) |
| `tests/units.test.js` | Check conversions, non-numeric states, alerts and filters, source recording |

## Manual testing on Windows

From the extracted project root:

```powershell
npm install
npm test
npm run build
.\.venv\Scripts\python.exe -m pytest -q server/tests
npm run dev
```

In **Demo** first, select an aircraft and look at the primary speed and altitude fields. Aviation should display `kt`, `ft`, and `ft/min`. Open **Units**, select Metric: the same flight's readings should change to `km/h`, `m`, and `m/s` without changing the underlying flight or forcing a new OpenSky request. Switch just vertical rate back to `ft/min` as a custom preference, reload the page, and confirm the preference persists.

Try the expanded **More filters** and **Custom observation alerts**: enter a threshold in feet or knots, switch units, and confirm the displayed threshold converts while the matching flights/alerts remain unchanged. Test positive, negative, zero and absent vertical speed. **Flight trail and replay** should show the selected units; previously recorded tracks still load, but older tracks may not include vertical/speed fields and correctly display `Not available` for them. Check narrow phone width as well as laptop width.

Unit tests do not make network requests. Real OpenSky verification requires your already configured local account; no secrets belong in screenshots or submitted logs.

## Known limitations

- The frontend cannot derive true airspeed, indicated airspeed, or wind speed from OpenSky's standard state-vector fields.
- Vertical speed is an observed or reported rate, not a prediction. It should not be used for operational separation decisions.
- Filter and alert input display values are rounded to two decimal places. Filtering and alert evaluation always use their stored SI values.
- Older locally saved replay records lack newly captured `velocity` and `verticalRate`; these display as unavailable until new distinct samples are recorded.
