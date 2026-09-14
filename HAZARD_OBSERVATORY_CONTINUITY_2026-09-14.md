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
Latest workflow run `34896380062`: SUCCESS. Syntax check and the 50,000-case qualification both completed successfully.

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

## Popup/provenance
Hazard popup provenance layer includes History / Source / Physics controls and truth labels for exact source points versus source-area centroids. Do not invent direct source links or exact locations.

## Important earlier visual/data requirements
- Earthquakes: authoritative exact epicenter, pink origin dot + magnitude-scaled rings, unresolved magnitude stays unresolved rather than 0.0.
- Tsunami: zero issued products means zero issued products, not zero evaluations. Never infer tsunami from earthquake alone.
- Wildfire: exact source point when available, no geographic jitter, flame marker layer, legacy duplicate wildfire visuals suppressed.
- Active/event counters must reconcile rendered + intentionally filtered + quarantined exactly.
- Bad geometry gets quarantined, not plotted.
- Sensors/stations remain a separate semantic layer from hazards.

## Next action after continuity transfer
1. Re-fetch current source and workflow state before any edit; never assume no intervening commit.
2. Continue adversarial review rather than repeating identical random cases forever. Highest-value next targets: source lineage, timestamp/validity semantics, dimensional/unit declarations, scale/resolution suitability, and observed-vs-modeled separation.
3. Verify Hazard Observatory truth-specific CI after production physics changes; keep it Hazard-only and do not invoke Geographic Earth qualification.
4. Continue bringing real public environmental measurements into the evidence fabric; never fake unavailable measurements or claim inaccessible/private feeds are connected.
5. Keep this file current whenever a real issue/fix changes the resume point.

## Canonical repository / live page
Repository: `domenicleonetti8-dev/Dom-s-Living-Archival-Observatory`
Live Hazard Observatory: `https://domenicleonetti8-dev.github.io/Dom-s-Living-Archival-Observatory/hazards.html`

This file exists specifically so the next chat can resume from verified repository state without relying on conversational memory alone.
