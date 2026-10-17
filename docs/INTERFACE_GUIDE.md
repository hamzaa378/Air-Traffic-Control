# Interface guide — SkyScope v3 Daylight Atlas

This guide explains how to use and modify the redesigned frontend. It is intentionally written for students who are new to React and CSS.

## What changed from v2.1?

The old interface used dark navy panels and presented the technical analytics almost as prominently as the map. The new version uses a **Daylight Atlas** style: a warm, light background, an editorial headline, purple navigation, coral actions and jade aircraft markers. The color choices help distinguish controls, actions and observation status without using color as the only indicator.

The **underlying data flow, backend, credit protections, filters, alerts, map overlays, watchlist, replay and JSON export remain available**. This is a frontend layout and presentation release, not a new OpenSky API implementation.

### Desktop reading order

```text
┌──────────────────────────────────────────────────────────────┐
│  SkyScope                   Feed status              UTC      │
├──────────────────────────────────────────────────────────────┤
│  Region | Live / Saved / Demo | Focus map | Refresh           │
├─────────────┬─────────────────────────────┬──────────────────┤
│ FIND        │ SEE THE WHOLE PICTURE       │ INSPECT          │
│ Search      │ 4 simple regional measures  │ Aircraft details │
│ Quick filter│                             │ and extra fields │
│ More filters│        BIG LIVE MAP         │                  │
│ Watchlist   │                             │ Review shortlist │
│ Flight list │                             │                  │
│             │ Map legend and timestamps   │ Airspace Pulse   │
│             │ More info / API credits     │ Replay / Alerts  │
└─────────────┴─────────────────────────────┴──────────────────┘
```

On medium laptop screens, **the map moves above both panels** instead of becoming too small. On narrow screens, the order is **map → search/list → inspector**. The user can click *Focus map* to temporarily hide the browsing column; aircraft details remain available.

## First-time user flow

1. **Select a region** in the top bar. This changes the geographical area being monitored.
2. **Select a source**: Live retrieves OpenSky through the Python backend; Saved reads the last captured real snapshot; Demo uses clearly marked synthetic examples.
3. **Look at the large map.** Click a dot to select an aircraft. Recent, delayed and unknown states have both labels and a legend; dashed projections are disabled by default.
4. **Read the aircraft details** on the right: altitude, speed, heading, recent contact and coordinates. Click *All reported fields* for squawk, ICAO24, vertical speed and other metadata.
5. **Review suggestions** explains why a flight might be worth checking (pinned or stale). It is *not* an emergency warning or collision risk indicator. Only the first three suggestions display by default.
6. Open *Airspace Pulse · data quality* to see freshness, coverage, what changed between distinct samples, map-cell density and compass distribution. These are descriptive diagnostics.
7. Expand *Flight trail and replay*, *Custom observation alerts*, *Map options*, *More filters*, or *Understanding the data and API credits* only when needed.

## Interface components and source files

| What appears | File | Where to change it |
|---|---|---|
| Header, source switch, primary columns and Focus map | `src/App.jsx` | JSX layout and React state |
| Warm paper theme, responsive layout, focus outlines and colors | `src/styles.css` | The tokens at the very beginning |
| Dot markers, density overlay, replay line and map tiles | `src/components/AirspaceMap.jsx` | `colorFor()`, Leaflet marker options |
| Six key facts and optional full field list | `src/components/FlightDetails.jsx` | `primary` and `extended` arrays |
| Short review queue and expandable data diagnostics | `src/components/SituationPanel.jsx` | queue limit and `<details>` section |
| Search results and pin action | `src/components/FlightList.jsx` | The flight row JSX |
| Saved watchlist panel | `src/components/WatchlistPanel.jsx` | Watchlist toggles |
| Alert rule settings and matching list | `src/components/AlertsPanel.jsx` | Rule controls |
| Replay slider and local JSON export | `src/components/ReplayPanel.jsx` | Replay controls |

## Edit the background color

Open `src/styles.css` and modify the first `:root` variables:

```css
:root {
  --bg: #f5f2ec;       /* page background */
  --surface: #ffffff;  /* white panels */
  --purple: #4b3976;   /* brand and selected controls */
  --coral: #bc5038;    /* primary Refresh action */
  --mint: #147d6e;     /* observation status */
}
```

The aircraft markers are Leaflet canvas objects, not HTML. Change their colors separately in `src/components/AirspaceMap.jsx`, inside `colorFor` and the marker styling block.

## Accessibility and uncertainty principles

- Native `<button>`, `<select>`, `<input>`, `<details>` and `<summary>` controls support keyboard usage.
- Focus outlines are visible, including on native map-adjacent controls.
- Reduced-motion users are not forced to watch extra interface animations.
- Each color carries text meaning too: **Recent**, **Delayed**, **Saved**, **Demo**, or **Stale**.
- Forecast or extrapolation of aircraft position is **off initially**, selectable under Map options. When enabled, estimated positions are dashed and distinct from reported positions.
- We never describe an aircraft missing in a subsequent sample as having landed or crashed.

## Responsive behavior

| Width | Arrangement |
|---|---|
| Above 1200px | Browsing list, large map, inspector as three independent scroll zones |
| 751–1200px | Full-width map, list and inspector below |
| 750px and below | Map first, list second, inspector third; controls wrap |

## Test the redesign on your computer

1. Follow [`../START_HERE.md`](../START_HERE.md) to start both servers.
2. Run `npm test`, `npm run build`, and `python -m pytest -q server/tests`.
3. Open DevTools (F12) → device toolbar and check approximately **390px**, **768px**, **1024px**, and **1440px** widths.
4. Verify no important buttons are offscreen, the map zoom controls work, `Focus map` doesn't hide details, the accordion controls expand, and you can select flights from both map and list.
5. Verify the **Demo** badge is unmistakable and that Live/Saved state labels accurately reflect the data. Live authentication tests require your own private OpenSky credentials and internet connection.
6. Confirm the OpenStreetMap attribution remains visible. Keep screenshots showing the attribution when documenting the map.

The authoring environment passed the pure Node.js/Python suites and syntax parsing of JSX and CSS but did not have installed React/Vite npm dependencies. Therefore **the new production build and real browser screenshot test must still be run on your Windows machine**.
