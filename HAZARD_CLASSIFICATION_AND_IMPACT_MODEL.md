# D.O.M. Hazard Classification, Early-Warning and Impact Model

Status: isolated prototype design. Not an official warning system.

## 1. Canonical hazard taxonomy
D.O.M. classifies each event by primary hazard, secondary hazards, compound hazards, observed/forecast status, and official-warning status.

Primary natural-hazard families:
- Atmospheric: tropical cyclone/hurricane/typhoon, severe thunderstorm, tornado, hail, extreme wind, atmospheric river, heat, cold, blizzard, ice storm.
- Hydrologic: flash flood, river flood, coastal flood, storm surge, dam/levee-related public warning, drought.
- Oceanic: tsunami, rogue/extreme wave, dangerous surf, sea-level anomaly, marine storm.
- Geologic: earthquake, aftershock sequence, volcanic unrest/eruption, landslide, debris flow, sinkhole where authoritative data exists.
- Fire: wildfire, fire weather, smoke transport.
- Cryosphere: heavy snow, avalanche where authoritative public bulletins exist, glacier/ice hazards, sea-ice hazards.
- Space/atmospheric entry: near-Earth object, bolide/fireball, confirmed atmospheric-entry observations.

Secondary and compound hazards are first-class. Example: tropical cyclone -> wind + surge + rainfall + river flooding + landslide + tornado + infrastructure exposure.

## 2. Strength categories
D.O.M. preserves the official scale whenever one exists instead of inventing a replacement scale.

Examples:
- Tropical cyclones: official agency classification plus Saffir-Simpson category where officially applicable.
- Tornadoes: warning/radar/observed status live; EF rating only after post-event survey, never guessed in real time.
- Earthquakes: magnitude, depth, shaking products/intensity where available; no deterministic earthquake prediction.
- Tsunami: official information statement/watch/advisory/warning levels and forecast/travel-time products.
- Volcanoes: observatory aviation/volcano alert levels where available.
- Wildfire: measured fire detections, confidence, FRP, growth/persistence and official incident/fire-weather products.
- Flood: official watch/warning/emergency, gauge stage, rate of rise, forecast crest and exceedance where available.

DOM also computes an internal 0..100 evidence-backed severity index, but it must always remain separate from the official category.

## 3. Early-warning precursor engine
A precursor is never treated as proof that a disaster will occur. It is a measurable condition that raises concern when it departs from its historical baseline or combines with other physically related signals.

For observation x at time t, robust anomaly uses median/MAD z-score when sufficient baseline exists.
Qualified precursor condition:
- |robust_z| >= configured hazard-specific threshold,
- freshness within source-specific latency budget,
- acceptable sensor quality,
- geospatial association with the candidate hazard,
- and either persistence over time or independent corroboration.

Each precursor carries:
- value + unit,
- baseline distribution,
- robust z-score / percentile,
- direction and rate of change,
- persistence duration,
- sensor/network lineage,
- source latency,
- confidence/quality,
- physical relevance to the hazard.

Examples of useful early signals include falling pressure + increasing winds + increasing ocean heat content for tropical systems; increasing rainfall + soil saturation + river rise for flooding; low humidity + dry fuels + high wind + thermal detections for wildfire escalation; official volcano deformation/seismic/gas/thermal observations for volcanic unrest; and official tsunami center products plus sea-level observations for tsunami hazards.

## 4. Bad-combination / compound-risk mathematics
Individual signals are not simply added. DOM uses interaction terms because dangerous combinations can be more important than any single variable.

Let normalized domain intensities be A(atmosphere), O(ocean), H(hydrology), L(land/soil), F(fire/dryness), C(cryosphere), G(geologic), E(exposure).

Base coupled score:
C0 = weighted_sum(domain intensities)

Interaction multiplier:
I = 1 + sum(beta_ij * Xi * Xj) + sum(gamma_ijk * Xi * Xj * Xk)

Compound hazard index:
CHI = clamp(C0 * I, 0, 1)

Interaction coefficients must be hazard-specific and calibrated against historical events. They are not probabilities until validated.

Examples:
- rainfall x saturated soil x steep terrain -> debris-flow/landslide concern,
- surge x high tide x onshore wind x low pressure -> coastal inundation concern,
- drought/fuel dryness x low humidity x wind x active thermal detections -> wildfire escalation concern,
- snowpack x warming x rain-on-snow -> rapid runoff/flood concern,
- cyclone wind x saturated soil -> treefall/power-infrastructure concern.

## 5. Escalation flag levels
- GREEN / Background: no qualified precursor cluster.
- CYAN / Signal: one qualified anomaly or official low-level advisory.
- YELLOW / Compound Watch: >=2 physically related precursors, or one strong persistent precursor with growing trend.
- ORANGE / Escalating: strong multi-domain coupling, increasing trend, independent corroboration and plausible local impact.
- RED / Critical: official severe warning or very strong measured/forecast impact evidence. Official instructions always outrank DOM guidance.

DOM must display exactly which terms produced the escalation.

## 6. Impact/destruction simulation
For natural hazards, DOM estimates impact footprints rather than pretending there is one universal circular destruction radius.

Preferred geometry by hazard:
- cyclone/storm: forecast wind-field + rain + surge polygons/rasters,
- flood: inundation/river-basin geometry,
- wildfire: observed perimeter/hotspots + spread envelope,
- earthquake: shaking/intensity field,
- tsunami: official coastal forecast/travel-time/inundation products,
- volcano: official hazard zones + ash/wind plume models,
- tornado/severe storm: warning polygons + track/envelope where authoritative products exist,
- landslide/debris flow: terrain/runout susceptibility footprint.

Impact field for grid cell p:
Impact(p) = HazardIntensity(p) * Exposure(p) * Vulnerability(p)

Uncertainty-aware output should include lower / central / upper plausible footprints, not a fake exact edge.

## 7. Destruction severity bands
DOM can estimate expected impact class by location:
- 0-20 Minimal/limited expected impact
- 20-40 Minor
- 40-60 Moderate
- 60-75 Major
- 75-90 Severe
- 90-100 Extreme/Catastrophic potential

These are model indices, not guaranteed loss percentages. Monetary loss, structural damage fraction, casualty estimates or infrastructure outage probabilities must only be shown when the needed exposure/vulnerability models are available and historically calibrated.

## 8. Time-to-threshold
For evolving hazards DOM should calculate a time window to important thresholds when the science supports it:
- official forecast arrival / landfall / crest / surge timing,
- motion vector crossing a forecast polygon,
- measured trend reaching a physical threshold,
- ensemble probability crossing a calibrated action threshold.

Output format:
- earliest plausible threshold time,
- central estimate/window,
- latest plausible threshold time,
- method,
- confidence grade,
- variables driving the estimate.

Never report a precise deterministic time when the source science only supports a range.

## 9. Evidence explanation contract
Every flagged event must answer:
1. What is happening?
2. What category/strength is officially assigned?
3. Which measurements are abnormal?
4. How abnormal are they versus baseline?
5. Which independent instruments agree?
6. Which bad combinations are active?
7. Is the signal strengthening or weakening?
8. What geographic footprint is supported?
9. What impact classes fall inside that footprint?
10. What relative time window is supported?
11. What could make the situation worse or better?
12. What is unknown/stale/missing?
13. What official authority currently says.

## 10. Hard scientific boundaries
- Early-warning precursor does not equal deterministic prediction.
- Earthquake exact time/place/magnitude prediction is not scientifically established.
- A model score is not automatically a calibrated probability.
- Missing telemetry is UNKNOWN, never SAFE.
- A mapped point is not automatically an exact damage location.
- An impact radius/footprint must be physics/source driven and uncertainty-bounded.
- Official evacuation/warning instructions outrank DOM.
- This impact model is for natural/civilian public-safety hazards, not weapon targeting or weapon-effect estimation.
