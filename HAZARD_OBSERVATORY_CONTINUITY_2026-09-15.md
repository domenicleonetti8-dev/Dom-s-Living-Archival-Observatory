# Hazard Observatory continuity checkpoint — 2026-09-15

## Scope lock
Hazard Observatory only. Geographic Earth is out of scope unless Dom explicitly brings it back. Existing source-published pinpoint coordinates are immutable unless authoritative source evidence proves them false.

## Canonical principle
One Earth organism: authoritative observations and registries -> immutable provenance/history -> canonical organism -> equation-gated physical relationships -> current state and bounded potential pathways -> one visual map. Observed, official, modeled, inferred and forecast states must remain distinct. Missing evidence stays missing.

## 2026-09-15 full forensic findings
- The 40,096 NCEI weather/climate station inventory still preserves source-published lat/lon; it was not erased.
- Current manifest now contains 40,096 stations in 264 populated 10-degree tiles (not the older 1,172-tile figure in the previous continuity checkpoint).
- Map runtime had accumulated competing startup paths. The station loader was also responsible for injecting twelve unrelated supplements while the runtime config independently staged other modules.
- That architecture could create network/main-thread contention and inconsistent map readiness on iPhone even while mathematical CI stayed green.
- MapLibre interaction/lifecycle recovery remains required because iOS pagehide/pageshow/bfcache can detach or disable the map.
- Hazard render reconciliation still binds source Point geometry back to exact upstream coordinates and quarantines invalid/title-region conflicts rather than moving them.

## Repairs made
### Map-first runtime
Commit `8019e8bd59f0c5e6e280c027bd50eb0848f8847d` updates `dom-runtime-config.js`.
- map interaction remains first priority
- runtime guard loads immediately after real map-ready
- critical popup/quake/station/motion modules are staggered
- supplemental feeds are deferred to idle time
- physics/evidence/model modules are deferred further
- dashboard loads last
- no synthetic `dom:map-ready` replay
- no coordinate logic changed

### Runtime watchdog
Commit `c55055d010ee1b856136b15154de612c4a112b18` adds `dom-hazard-runtime-guard.js`.
- verifies the MapLibre canvas remains attached
- restores drag/touch/zoom/pointer interaction if disabled
- handles pageshow/orientation recovery
- remounts through the canonical renderer if the canvas is detached
- does not create, move or normalize any hazard/station coordinate

### Exact station-loader isolation
Commit `e1b903aea06d954f666236582804fa08a5a19dfc` rewrites `dom-weather-climate-global-loader.js` runtime behavior while preserving the station coordinate mapping.
- exact source lat/lon -> GeoJSON Point remains unchanged semantically
- station loading starts only after real map attachment
- batches are small and yield through idle scheduling
- GeoJSON redraws are coalesced
- hidden/background tabs stop consuming the loading loop
- station loader no longer injects unrelated hazard/science supplements
- runtime config is the sole owner of staged supplemental startup
- malformed/out-of-range station coordinates are rejected, never synthesized

### CI expansion
Commit `3472e65d27cc70bf3aef09e35a3e06247e9e03b5` expands Hazard Observatory CI to syntax-check runtime config, runtime guard, renderer, organism, station loader and station inspector in addition to existing hazard modules.
Workflow run `34921936558`: SUCCESS.
- runtime/station/hazard syntax: PASS
- coupled Earth 100,000-case qualification: PASS
- hazard semantic execution: PASS

## Truth/performance boundary
CI success is not a visual iPhone proof. A repair is visually closed only when the live device confirms: basemap visible, pan works, pinch zoom works, stations progressively appear, earthquake/wildfire/hazard markers appear, and interaction remains responsive while background intelligence loads.

## Do not regress
- Never change pinpoint coordinates for performance.
- Never let registry presence become a measurement.
- Never let model output become observation.
- Never let a partial/failed feed silently become a zero-event claim.
- Never allow science/background enrichment to block the MapLibre interaction loop.
- Never create a second canonical Earth brain; extend the existing organism/evidence architecture.

## Canonical live target
https://domenicleonetti8-dev.github.io/Dom-s-Living-Archival-Observatory/hazards.html
