# D.O.M. Hazard Observatory — Realism Safe Build Contract

Branch: `hazard-realism-safe-build-20260915`

This branch is isolated rendering work. Do not merge to `main` until qualified. Existing authoritative ingestion, normalization, source/event IDs, coordinates, quarantine, counters, reconciliation, and evidence semantics remain authoritative.

## Truth states
`OBSERVED` · `WARNING` · `MODELED` · `BACKGROUND` · `COVERAGE_GAP`

Never invent a hazard to fill a gap. Warning geometry is not observed event geometry. Modeled consequences must be labeled. Building damage, tornado funnels, floodwater, fire, lightning, and physical effects require evidence at the corresponding specificity.

## Continuous Earth LOD
`orbit -> atmosphere -> regional terrain -> city/buildings -> neighborhood -> walkable ground`

Load high-detail geometry locally. Prefer real geometry. Footprint/height extrusion must not masquerade as surveyed/photogrammetric geometry.

## Physical layers
- Earthquake: epicenter, magnitude, depth and distance drive close-range shake/rumble. Giant rings are optional scientific overlays, not default realism.
- Flood: observed inundation uses supplied geometry; derived inundation is labeled `MODELED FLOOD EXTENT`.
- Weather: source-qualified geographic scale/structure.
- Tropical cyclone: center/wind field/rain bands/eye only where supported.
- Tornado: funnel only for observed/source-qualified tornado; warnings retain warning polygons without inventing funnels.
- Ground: close zoom transitions to WALK / LOOK / INTERACT and returns continuously to globe navigation.

## Qualification
Verify iPhone interaction/frame stability; renderer failure cannot break feeds; totals reconcile rendered + filtered + quarantined; effects expire with source records; audio requires user gesture and respects mute/reduced-motion; rendering never mutates upstream evidence records.
