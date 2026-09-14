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
- polygon area
- local scalar gradients for fronts

## Real issue found and fixed during 50,000 re-evaluation
Scalar-gradient longitude deltas were not antimeridian-wrapped. Near +/-180 degrees a physically nearby point could be interpreted as roughly 360 degrees away in the local planar fit. Fixed in commit `fd181f9a647a1b50429e3d9199f9cd4a9af9af2c` by wrapping longitude deltas into [-180,180] and refusing the local-plane gradient arbitrarily close to the pole singularity.

## 50,000-case adversarial qualification
Test: `ci/dom-environmental-coupled-physics-50000-test.js`
Originally created in commit `8b97c603d57470e5028f191c47fc33bd9c45facb`.
Workflow `.github/workflows/hazard-environment-physics.yml` was updated in commit `7e56b3db535f205cf4a61f6ab65e97534739a0f5` to run the 50,000-case test on `main`.

First 50,000-case workflow run:
- run id `34895559748`
- head `7e56b3db535f205cf4a61f6ab65e97534739a0f5`
- conclusion: SUCCESS

After that success, the test itself was re-inspected. One weakness was found: the oil-slick mass assertion partly reconstructed mass from itself rather than independently proving the governing relation. The test was strengthened instead of accepting that weak pass.

Strengthened test commit: `4bd8aec68dfff28b081e0e1966dd20069c7901d0`
It now independently checks:
- oil volume = area * thickness
- oil mass = area * thickness * density
- wind-vector 360-degree periodicity
- zero-source Gaussian plume concentration
- inverse ideal-gas concentration response to increasing absolute temperature at fixed ppb/pressure/MW
- antimeridian polygon area remains local/finite/positive
- pole singularity rejection for the local scalar-plane gradient
- previous mass/flow conservation, symmetry, monotonicity, invalid-input, antimeridian-gradient, cryosphere, snow, hail, pollutant, groundwater, mixing, combustion and drift checks

Strengthened 50,000-case workflow run:
- run id `34895734217`
- head `4bd8aec68dfff28b081e0e1966dd20069c7901d0`
- status: completed
- conclusion: SUCCESS

Do not weaken tests to preserve a green result. If a future invariant fails, fix the physics/math or clearly narrow the model's applicability.

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
1. Resume from strengthened test head `4bd8aec68dfff28b081e0e1966dd20069c7901d0` and continuity-file update after it.
2. Re-inspect current source before any edit; do not assume no intervening commits.
3. Continue adversarial review rather than rerunning identical checks forever: prioritize dimensional consistency, coordinate/time boundaries, conservation laws, source lineage, and missing-data behavior.
4. Re-run Hazard Observatory truth qualification after any production-physics change.
5. Continue bringing real public environmental measurements into the evidence fabric; do not fake unavailable measurements or claim inaccessible/private feeds are connected.

## Canonical repository / live page
Repository: `domenicleonetti8-dev/Dom-s-Living-Archival-Observatory`
Live Hazard Observatory: `https://domenicleonetti8-dev.github.io/Dom-s-Living-Archival-Observatory/hazards.html`

This file exists specifically so the next chat can resume without relying on conversational memory alone.
