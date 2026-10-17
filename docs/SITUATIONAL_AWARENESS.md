# Airspace Pulse: situational-awareness design

The standout feature is **an observation-awareness layer**. Most beginner flight maps put dots on a map. Airspace Pulse answers four questions: *How recent is this information? What changed? Which areas are busy in this sample? Which aircraft should I inspect next?*

## 1. Freshness and data quality

`src/lib/insights.js` calculates position age from the state vector's `timePosition` (fallback `lastContact`) and the current browser time. It does **not** assume that receiving a response makes its data current.

| Label | Rule |
|---|---|
| Fresh | A position time within the past 90 seconds |
| Delayed | Position time over 90 and up to 300 seconds old |
| Old | Position time more than 300 seconds old |
| Unknown | Position time unavailable or significantly in the future |
| Left | ICAO absent from a later response and temporarily retained by local state |

The **Recent positions** percentage is `fresh / active aircraft × 100`, excluding locally retained missing aircraft. Heading and speed reporting percentages are separate data-completeness indicators. If there are no aircraft, percentages show 0%, not 100%.

## 2. What changed?

`compareSnapshots` compares sets of ICAO identifiers between two distinct *live or demo* samples. It shows:

- **Newly observed:** an ICAO present in the new response but not the comparison sample.
- **Not in new sample:** an ICAO that was present before but is now missing.

A missing aircraft might have left the region, lost tracking coverage, or just not appeared in that response. **Missing never means landed, crashed, or endangered.** Cached, saved, and stale responses do not claim a new update or create a change event.

## 3. Spatial awareness

`densityGrid` bins observed coordinates into a fixed **8 columns × 5 rows**. The mini heat grid on the right displays all tracked aircraft in the region. The optional semi-transparent rectangles on the map apply to currently visible/filtered aircraft. **Density is not a collision likelihood or separation metric.** The compass summary separately counts NW, NE, SW and SE of the region center.

## 4. Explainable attention queue

`attentionQueue` ranks aircraft for convenient review using explicit point weights:

| Criterion | Review weight |
|---|---:|
| Pinned to watchlist | +30 |
| Old or no longer in latest sample | +35 |
| Delayed or unknown position time | +15 |
| Below user-set altitude watch threshold (airborne only) | +20 |
| Above user-set speed watch threshold (airborne only) | +10 |
| Missing speed or heading field | +8 |

The first reason appears in the UI; `notes` in the code contains all explanations. The panel shows up to eight ranked results. Weights are **UI review rules**, not severity of aviation incidents. The threshold checks activate only if the user enables the corresponding alert rules.

## 5. Watchlists, focus and provenance

- Click ☆ by an aircraft to pin it. The watchlist is isolated by region **and source mode** so demo aircraft never become real-aircraft pins.
- Focus on pinned aircraft filters the map and list; summaries on the right continue to describe the whole monitored region.
- Watchlists, thresholds and mode live in browser localStorage; they are not sent to OpenSky.
- Dotted predicted positions, `saved`/`demo`/`stale` badges and cache information expose uncertainty rather than hiding it.

## Demo walkthrough for reviewers

1. Start in Demo mode; all aircraft are explicitly simulated.
2. Click ☆ next to `SIM001`, then enable **Focus on pinned aircraft**.
3. Turn on **Density grid** and inspect the visible region's binned positions.
4. Disable focus to return to the full map. Inspect **Airspace pulse**, freshness bars and quadrant distribution.
5. After two different demo refreshes (~8 seconds each), check the **What changed?** counts.
6. Adjust the custom low-altitude/high-speed thresholds and inspect the transparent attention queue.
7. Click a queue result, inspect observed position age, follow the trail and export JSON.
8. In Live mode, verify the badge displays **live/cache** and that provider samples/credits appear. Do not present demo screenshots as live evidence.

## Limitations and responsible interpretation

No conflict-detection logic, surveillance-grade guarantees, runway status, flight plans, altitude terrain adjustment, ATC instructions, or live safety alerts are implemented. The user has incomplete, delayed and sometimes unavailable public data. The app intentionally uses the wording *watch*, *review*, *not observed* rather than *danger*, *collision*, *emergency*. External users must never rely on it for flying or air traffic control.
