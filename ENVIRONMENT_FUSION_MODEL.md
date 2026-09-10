# D.O.M. Compound Environment & Evacuation-Timing Model

Experimental isolated design. This is not an evacuation authority and does not replace emergency management, NWS/NHC, tsunami centers, fire agencies, volcanic observatories, or local officials.

## Goal
For a specific place on Earth, combine atmosphere, ocean, ground, fire/dryness, cryosphere, water/flood and cross-system interactions into one evidence-backed assessment that explains **why** conditions are becoming dangerous, **what** could happen, **where** the supported impact zone is, and **when** a threshold may be crossed when an official forecast or defensible physics/trend estimate exists.

## Environmental domains
D.O.M. keeps domain scores separate before fusion:

- Atmosphere: wind, pressure anomaly, convective energy, precipitation rate, lightning, visibility, temperature extremes.
- Ocean: storm surge, wave height, sea-surface-temperature anomaly, tide, currents.
- Ground: soil saturation, river stage, slope instability, seismic observations, subsidence and ground temperature.
- Fire / dryness: fuel dryness, fire radiative power, humidity deficit, wind and lightning.
- Ice / snow: snow-water equivalent, snowfall rate, ice instability, freeze-thaw and avalanche observations.
- Water / flood: precipitation, soil saturation, river stage, surge and snowmelt.
- Coupling: atmosphere-ocean, atmosphere-water, atmosphere-fire, water-ground, cryosphere-water and fire-ground interactions.

Missing measurements stay missing. They are never silently replaced with favorable values and never described as evidence.

## Compound load
Each domain is a weighted normalized 0..1 index from actual available measurements. A compound environmental load is then built from the domain indices plus a smaller cross-system coupling term.

The current weights are engineering priors only. They are intentionally explicit and must later be calibrated per hazard, region and season using historical observations.

## Timing / threshold horizon
D.O.M. may display a relative hazard horizon only from one of these evidence classes:

1. **Official ETA / forecast:** preferred when an authoritative agency provides arrival or onset timing.
2. **Physics estimate:** distance divided by measured/forecast motion speed, with track uncertainty propagated into a time range.
3. **Trend estimate:** time-to-threshold from a measured rate of change only when the time series is sufficiently sampled and stable for that calculation.
4. **Unknown:** if those conditions are not met, D.O.M. says timing cannot be resolved from current evidence.

A time estimate must always expose its class, uncertainty and source lineage. D.O.M. must never convert an imprecise trend into a fake exact clock time.

## Evacuation reasoning
D.O.M. separates four states:

- monitor
- prepare
- consider early voluntary departure
- official evacuation

Only an authorized public agency can create the **official evacuation** state. D.O.M. can surface the order and explain the measurements supporting concern, but cannot manufacture an evacuation order.

A research-layer suggestion to consider early voluntary departure requires both high local-impact evidence and high evidence strength; it is explicitly labeled non-official and must defer to local authorities, road conditions, shelter instructions and accessibility constraints.

## Impact-zone geometry
A point coordinate is not the same as an impact footprint. The UI must distinguish:

- observation point
- forecast track / cone
- warning polygon
- fire perimeter
- flood inundation polygon
- surge zone
- ashfall plume / dispersion region
- tsunami arrival zone
- uncertainty envelope

"Exact location" means exact coordinates or polygon supplied by the source. It must never imply exact future impact when the underlying forecast has spatial uncertainty.

## Explanation contract
For every serious recommendation, D.O.M. should show:

- strongest contributing domains and their scores
- raw measurements and units behind those scores
- source agency / sensor lineage
- observation age and trend
- independent corroboration
- spatial uncertainty / forecast cone or polygon
- timing class and range
- local exposure and vulnerability inputs if used
- current action stage
- explicit uncertainty / missing-data statement

DOM voice must speak from the same structured explanation object visible on screen.

## Calibration targets
Per hazard and region: reliability diagrams, Brier score for true probabilities, lead-time distribution, spatial error, false alarms per user-day, missed severe events, precision-recall, threshold stability, seasonal drift and source-outage behavior.
