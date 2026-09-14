# Hazard Observatory continuity checkpoint — 2026-09-14

## Scope lock
Hazards and environmental coupling only. Do not inspect, alter, test, or use Geographic Earth as justification for changes unless Dom explicitly brings it back.

## Core principle
Treat Earth as one coupled physical system. Earthquake, tsunami, atmosphere, wind, temperature, humidity, rain, storms, hurricanes, tornadoes, flooding, drought, wildfire, ocean/water, icebergs, sea ice, snowfall, hail, cold fronts, air pollution, soil/ground pollution, groundwater contamination, oil spills on land/ocean, waste dumping, landfill/junkyard/garbage fires, smoke/particulates, chemical releases, and related measurable environmental disturbances must be connected through source-backed observations and defensible mathematics/physics.

## Truth rules
- No arbitrary danger/probability score without a validated calibrated model.
- Missing input stays missing; never becomes zero.
- Station/sensor registry presence is coverage only, never a measurement.
- Model guidance remains modeled.
- Inference remains inference and never promotes itself to authoritative fact.
- Every derived quantity must expose its equation/basis and source inputs.
- Exact source Point coordinates remain exact; centroids/areas must be labeled as such.
- Official alerts/products remain authoritative for official warning/confirmation states.
- Malformed geometry must not yield derived physical area/mass.
- A positive-flow stream with missing concentration invalidates conservative mixing; it must not be silently discarded.
- Local environmental gradients must be based on local evidence, not arbitrary array order or distant global cells.
- Existing pinpointed earthquake, wildfire, sensor/station, tsunami, and source geometry must not be altered unless upstream source evidence proves the coordinate is false.
- Runtime/performance repairs must not be used as a reason to rewrite source locations.

## Existing coupled hazard layer
`dom-planetary-coupled-hazard-math.js`
Covers earthquake, tsunami, wildfire, storms/hurricanes/tornadoes, floods, volcanoes, weather context, pressure gradients, wind vectors, VPD and evidence accounting. Earthquake magnitude alone never confirms tsunami. USGS screening, source physics, ocean observations and official tsunami products remain separate evidence states.

## Evidence fabric
`dom-planetary-evidence-fabric.js`
Separates hazard-context, modeled, registry and observed evidence classes. Registry presence has zero measurement weight.

## Environmental physics layer
`dom-environmental-coupled-physics.js`
Equation-gated functions include:
- great-circle distance and bearing
- wind vectors and kinematic advection
- ideal-gas ppb -> ug/m3 conversion
- snow water equivalent / snow load
- hail mass / kinetic energy
- ice mass
- iceberg/spill drift from time-resolved source positions
- Gaussian plume concentration when source/dispersion inputs exist
- soil contaminant concentration
- Darcy flux / pore-water velocity
- oil slick mass
- conservative flow-weighted water mixing
- waste/junkyard/garbage fire heat-release and source-specific emission rate
- validated polygon/MultiPolygon area
- bounded local scalar gradients for fronts

## Real issues found and fixed during repeated re-evaluation

### 1. Antimeridian scalar-gradient error
Near +/-180 degrees a physically nearby point could be interpreted as roughly 360 degrees away in the local planar fit.
Fixed in commit `fd181f9a647a1b50429e3d9199f9cd4a9af9af2c` by wrapping longitude deltas into [-180,180] and rejecting the local-plane gradient arbitrarily close to the pole singularity.

### 2. Weak oil-mass test
After the first 50,000-case pass, the test itself was re-read. The oil-slick assertion partly reconstructed mass from itself instead of independently proving `mass = area * thickness * density`.
Strengthened in commit `4bd8aec68dfff28b081e0e1966dd20069c7901d0`.

### 3. Local front-gradient source-selection error
`scalarGradient()` previously took the first valid model rows. With a globally ordered model array, a local front could be fitted from unrelated cells thousands of kilometers away.
Production fix commit: `06222b57a3ac37f906a65f02e2f78e808a92e113`.
Current behavior:
- physical great-circle distance to target is calculated
- only samples within a declared 2000 km radius are eligible
- eligible samples are sorted by distance
- nearest 16 are used
- fewer than 3 local samples returns missing/null
- result exposes sample count, maximum used distance and declared radius
- antimeridian wrapping and pole rejection remain active

Adversarial locality test commit: `4825da6499a5e34e023528821644fc869b1b2d99`.
The test inserts 40 extreme distant decoy cells ahead of valid local cells and proves that the recovered local x/y gradient is unchanged. Distant-only cells must return null rather than manufacture a local gradient.
Workflow run `34896209652`: SUCCESS.

### 4. Incomplete water-mixing evidence could be silently dropped
Old `flowWeightedMix()` filtered invalid streams and calculated from whatever valid streams remained. That violated the missing-evidence rule.
Fixed in production commit `4a3c59ad4640f958b0e4a38e95a33fd006f50d9e`.
Current behavior:
- every positive-flow stream must have a finite nonnegative concentration
- invalid/missing positive-flow concentration returns null
- invalid/negative flow returns null
- zero-flow streams may be ignored because they contribute no mass or flow
- missing data is surfaced instead of silently omitted
Environmental workflow run for the production fix `34896336963`: SUCCESS.

### 5. Malformed polygon geometry could still create derived physical area
Old polygon-area logic skipped invalid vertices/edges, which could let malformed source geometry feed ice/oil/waste area and mass calculations.
Fixed in production commit `4a3c59ad4640f958b0e4a38e95a33fd006f50d9e`.
Current behavior:
- every ring coordinate must be valid
- rings must contain enough points
- degenerate/zero-area rings return null
- invalid holes return null
- invalid MultiPolygon component invalidates the result
- malformed source geometry cannot silently become physical area

Qualification hardening commit `89880f58bc64e8caf7200853e9dbe1008e02a827` adds explicit failures for malformed polygons, degenerate polygons, missing concentration on positive-flow streams and negative concentrations, while preserving the 50,000 randomized physics checks.
Latest environmental workflow run `34896380062`: SUCCESS. Syntax check and the 50,000-case qualification both completed successfully.

## 50,000-case adversarial qualification history
Test: `ci/dom-environmental-coupled-physics-50000-test.js`
Workflow: `.github/workflows/hazard-environment-physics.yml`

Verified successful runs include:
- `34895559748` — initial 50,000 pass
- `34895734217` — strengthened invariant pass
- `34896209652` — local-gradient decoy/radius pass
- `34896336963` — production mixing/geometry hardening pass
- `34896380062` — explicit malformed-geometry/incomplete-mixing qualification pass

Current adversarial coverage includes:
- antimeridian gradients and polygons
- local-neighbor selection against distant decoys
- bounded local-radius rejection
- malformed geometry rejection
- incomplete positive-flow stream rejection
- boundary inputs
- missing data
- independent mass and flow conservation
- symmetry
- monotonicity
- wind-angle periodicity
- pole singularity rejection
- invalid-input rejection
- cryosphere/ice, snow, hail, air pollution/plume, soil/groundwater, oil spill, water mixing and waste/fire equations

Do not weaken tests to preserve a green result. A green run means the implemented invariants passed; it does not prove all real-world physics or source feeds are complete.

## Map runtime regression and recovery checkpoint
Dom reported the live Hazard Observatory freezing/glitching, the map becoming non-movable on iPhone, and hazard/sensor points disappearing. Treat this as a runtime/rendering regression, not as permission to change source coordinates.

### Verified causes
1. `dom-live-globe-renderer.js` was still byte-identical at blob `ec5f39ba7492e99115ef20ea92b64670c920f03c` to the earlier working sensor build (`55773ccdde308d7d83bb9ae821532fd35d3396e0`). The pinpoint coordinate logic was therefore not the regression source.
2. The renderer destroyed MapLibre on `pagehide` and had no corresponding `pageshow` remount. Safari/iPhone bfcache/background-return behavior could leave the canvas detached or inert.
3. `dom-weather-climate-global-loader.js` loaded the full 1,172-tile / 40,096-station registry starting on `DOMContentLoaded`, redrew a growing full GeoJSON after every small batch, cache-busted each tile, injected twelve supplements immediately, and supplement loads replayed `dom:map-ready`. This produced excessive network/main-thread work and listener wakeups that could starve MapLibre touch/rendering.
4. The runtime loader had grown into a competing startup path. Late intelligence must never block first map paint or touch response.

### Renderer lifecycle/touch repair
Commit `9634206c53f05092f42f72e972ee88f4f4fc652f` — `dom-live-globe-renderer.js`.
- preserves existing event/sensor feature coordinate logic
- enables drag pan, scroll zoom, box zoom, double-click zoom, keyboard and touch zoom
- disables touch rotation only
- forces canvas/container pointer events on and touch handling active
- resizes after restore/orientation changes
- bfcache-safe `pagehide`
- `pageshow` remount/recovery
- no source-location normalization changes

### Progressive exact station fabric repair
Commit `ea97437f38df632ce0aba370213af1a203a5a64e` — `dom-weather-climate-global-loader.js`.
- retains the exact 40,096-record station registry target
- starts only after a real map attachment
- batch size reduced to 4
- full GeoJSON redraws are coalesced (tile/time thresholds) instead of every small batch
- per-tile `Date.now()` cache bust removed; browser caching allowed
- supplements staggered instead of injected simultaneously
- supplement-driven fake `dom:map-ready` redispatch removed
- bfcache-safe lifecycle
- no station moved, jittered or synthesized

### Runtime-loader repair
Commit `95f827e7980a83e1a28d17d4e834766f30e33a7b` — `dom-runtime-config.js`.
- real map-ready is captured once
- no synthetic/replayed map-ready event
- interaction restoration runs on real map
- critical visual/provenance modules load first and are staggered
- science/evidence/physics modules load later and are staggered
- dashboard loads last
- pageshow/orientation recovery supported
- Geographic Earth is untouched

Earlier performance precursor commits were `4ec73c1c3772c33cd13812f6497c7914e2f8334e` and `74463ce894041e581a1d48a3eebdd75f4da20f1a`; the latter also made global GFS enrichment yield between network batches rather than monopolize the main thread.

### Safari cache bust
Commit `8d881ab17f82ef94658bafa5f40f6fd112f75955` updated `hazards.html` references so iPhone/Safari must request the repaired runtime, renderer and station loader.
Hazard Observatory truth qualification run `34900274841`: SUCCESS on that head.

## Canonical planetary organism — current architecture
The existing `dom-organism-runtime.js` was extended rather than creating a second brain. The goal is one canonical Earth organism containing present observations, hazards, bounded history and equation-gated physical context while the visual map remains only a view of that organism.

First integration commit: `8777bb5049465ab86cb5ff47bda248c122049da6`.
Performance-hardened canonical organism commit: `608e1010b5f36e72bcf4145b810104ba3742e036`.
Cache-bust commit for `dom-organism-runtime.js?v=6`: `67e35d37beec69e00e140fa22a3cdf964cb629e7`.

Current organism state contains:
- observations/records
- sensors
- canonical hazards
- bounded per-hazard history
- cached equation-gated physics
- source IDs and source coordinates
- source time/status evolution
- hazard family counts
- explicit truth policy

Canonical hazard identity prefers source + authoritative event ID. If no event ID exists, fallback identity uses source + hazard kind + preserved source coordinates + source time. It never relocates a hazard to make identity easier.

Physics behavior:
- uses existing `DOMPlanetaryCoupledHazardMath.analyze()` and `DOMEnvironmentalCoupledPhysics.analyze()` only
- no arbitrary danger/probability number is introduced by the organism
- missing physics stays null/missing
- physics is cached per canonical hazard
- science is evaluated in small chunks (6 hazards per step) on a delayed background schedule instead of recalculating every hazard during every state emission

Rendering isolation:
- hazard-only updates do not automatically resend the entire sensor population through `dom:organism-state`
- sensor payload is emitted only when sensor state actually changes (`sensorDirty`)
- organism emissions are coalesced so the map is not repainted per individual observation/hazard message
- canonical organism emits separately as `dom:canonical-organism-state` / `window.DOMCanonicalOrganismState`

Latest verified Hazard Observatory truth qualification:
- run `34900510535`
- head `67e35d37beec69e00e140fa22a3cdf964cb629e7`
- conclusion: SUCCESS

Important limitation: CI success verifies implemented truth/code invariants; it is not a visual Safari/iPhone browser proof. Dom must confirm the live device can pan/zoom and that sensors/hazard markers visibly return before this runtime recovery is considered visually closed.

## Popup/provenance
Hazard popup provenance layer includes History / Source / Physics controls and truth labels for exact source points versus source-area centroids. Do not invent direct source links or exact locations.

## Important visual/data requirements
- Earthquakes: authoritative exact epicenter, pink origin dot + magnitude-scaled rings, unresolved magnitude stays unresolved rather than 0.0.
- Tsunami: zero issued products means zero issued products, not zero evaluations. Never infer tsunami from earthquake alone.
- Wildfire: exact source point when available, no geographic jitter, flame marker layer, legacy duplicate wildfire visuals suppressed.
- Active/event counters must reconcile rendered + intentionally filtered + quarantined exactly.
- Bad geometry gets quarantined, not plotted.
- Sensors/stations remain a separate semantic layer from hazards.
- The map must remain pannable/zoomable/touch-responsive even while evidence/physics/global station enrichment loads.

## Next action after continuity transfer
1. Re-fetch current source and workflow state before any edit; never assume no intervening commit.
2. First verify the actual iPhone/live-page behavior after head `67e35d37...`: map visible, pan/touch works, sensors return progressively, earthquake/wildfire/hazard layers visible. Do not call runtime recovery visually complete until Dom verifies it.
3. If mobile freezing remains, do not rewrite coordinates or hazard math. Next isolation target is the full-global station representation: pause/disable its background full-Earth load on memory-constrained mobile and use exact viewport-lazy station tiles plus a low-zoom aggregate/cluster representation. Preserve exact source coordinates when individual stations are shown.
4. If the basemap itself is blank despite an otherwise responsive page, test the external MapLibre CDN/import (`unpkg.com/maplibre-gl@6.6.0`) as a separate failure point.
5. Continue adversarial science review only after the visual map baseline is stable. Highest-value science targets: source lineage, timestamp/validity semantics, dimensional/unit declarations, scale/resolution suitability, observed-vs-modeled separation and physically bounded future pathways.
6. Keep all intelligence non-blocking relative to the map renderer.
7. Keep this continuity file current whenever a real issue/fix changes the resume point.

## Canonical repository / live page
Repository: `domenicleonetti8-dev/Dom-s-Living-Archival-Observatory`
Live Hazard Observatory: `https://domenicleonetti8-dev.github.io/Dom-s-Living-Archival-Observatory/hazards.html`

This file exists specifically so the next chat can resume from verified repository state without relying on conversational memory alone.