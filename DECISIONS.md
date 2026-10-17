# v3 design update — 2026-10-17

The old dark dashboard spread situational analytics across the right panel and pushed essential aircraft details far down. I selected a warm light **Daylight Atlas** direction instead of a familiar navy control-room theme. The map now dominates the middle (or full first row on smaller screens). Search is on the left, essential flight details stay at the top of the right column, and the review queue follows them. Technical diagnostics remain available within an expandable section, preserving functionality without making the first view busy. The Focus map action hides the long list but not the inspector. Reported positions are the default; optional projections require an explicit user click. UI styling is plain CSS so another student can explain and alter it.

---

# Implementation decisions, reasoning and limits

This file is an example of the decisions you should understand and rewrite in your own words for the recruitment submission.

**Most challenging part:** Distinguishing freshness of aircraft positions from freshness of an HTTP response. A successful cached request may contain an older position. We track sample/fetch time separately, classify position timestamp age, and avoid creating trail points from reloaded stale/saved responses.

**Why JavaScript React, not TypeScript or Streamlit?** The task is a frontend challenge and asks for an interactive map. Small React components, plain JavaScript, Leaflet and CSS keep the implementation familiar without a difficult typed build or state library. Python is used strictly as a small secret-hiding API proxy.

**Why Airspace Pulse?** Simple marker maps show raw data without explaining its quality. Summary percentages, visible data gaps, entry/absence comparisons, region distribution and a user-pinned review queue help users understand *what they see and what they do not know*.

**Why not implement collision alerts or danger scores?** Public, potentially delayed, incomplete OpenSky snapshots do not justify a safety-critical classification. The queue scores are explanatory review order, not emergencies.

**Current limitations:** Python local cache/credit ledger is process-memory-only; a restart forgets spent budget. Browser local storage is limited and per device. Replay is collected only during app use, not historical OpenSky retrieval. Background polling stops to conserve credits. OSM basemap is not guaranteed offline. Production CDN/capacity performance not benchmarked. No public HTTPS/authentication and no public deployment has been attempted.

**If given another week:** 1) make backend cache, quota ledger and trail storage persistent with SQLite/Redis; 2) add live-browser Playwright tests and mobile accessibility audit; 3) implement an exportable multi-session change log; 4) test map performance with thousands of genuine upstream aircraft.
