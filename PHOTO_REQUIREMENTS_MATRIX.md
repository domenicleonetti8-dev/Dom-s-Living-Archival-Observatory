# D.O.M. 20-photo + paragraph repair requirements matrix

Repository: `domenicleonetti8-dev/Dom-s-Living-Archival-Observatory`
Branch: `isolated-earth-geospatial-sensor-fabric-v1`
Main must remain untouched until isolated qualification and iPhone visual inspection.

## Routing and product boundaries
- Global Hazard Observatory must open the hazard/event/planetary-health dashboard only.
- Apple Earth must open a separate geographic Earth experience, never `hazards.html#apple-ar` and never a self-link.
- The hazard dashboard must retain a clear link into Apple Earth without replacing the hazard dashboard.
- Native RealityKit room-scale AR remains a separate delivery gate from the web Earth.

## Geographic Earth
- Replace the abstract blue grid sphere as the Apple Earth destination with a recognizable geographic Earth.
- Continents, coastlines, roads/place labels and surface navigation must be present through a legitimate map provider.
- Google Maps/imagery may only be used through supported Google APIs/licensing or a direct Google Maps handoff; no scraping/copying.
- Globe-to-surface navigation must preserve correct latitude/longitude.
- Surface sensors must remain on the Earth surface. No decorative/random floating sensor positions.
- Unlocated products remain unlocated. No invented coordinates.
- Satellite/orbital objects, when added, must be represented separately from surface stations and require real orbital/location data.

## Sensor and observation fabric
- The screenshots' ~118 records / 3 responding feeds are not sufficient to represent the intended global fabric.
- All 20 registered source families must remain visible as registry state, but registration must never be counted as live ingestion.
- Every adapter must expose its own loading/live/failed/broker-required state.
- Failed, blocked, stale or unconfigured feeds must not increase coverage.
- Live geographic records must be validated before rendering.
- Globe-scale clustering/LOD is required so thousands of records remain usable on iPhone.
- Direct browser ingestion is only one layer; broker-backed adapters remain required for many global networks and specialized datasets.

## Planetary health truth boundary
- `UNKNOWN` is correct when coverage is insufficient.
- Feed availability/network health must never be presented as Earth health.
- Missing data must never be interpreted as safe.
- Existing health qualification gates must not be weakened merely to eliminate UNKNOWN labels.
- Climate, ocean, water/hydrology, forests, coral reefs and cryosphere need real qualified observations before health states become displayable.

## Hazard semantics and rendering
- Preserve the working green/yellow/orange/red evidence/risk lighting.
- Preserve evidence strength, independent lineage, uncertainty and impact-horizon semantics.
- Preserve official-source provenance and source links.
- Do not convert risk-lighting colors into fake geographic basemap information.

## iPhone / Safari presentation
- The canonical experience is the designed dark mobile UI, not Safari Reader's flattened text representation.
- Reader-mode flattening must not be mistaken for runtime state loss.
- Mobile controls must remain touch usable and map navigation must not conflict with page scrolling unnecessarily.

## Public runtime truth
- `Persistent broker not configured · browser feeds only` is a real deployment gap, not a cosmetic warning.
- Public claims must distinguish: registered source family, browser adapter attempted, broker adapter configured, successful live observations, stale observations and failed source.
- The UI must not imply worldwide complete sensor coverage while the broker is absent.

## Qualification gates
- Route separation.
- Geographic globe projection.
- Validated GeoJSON `[longitude, latitude]` anchoring.
- No `Math.random()` sensor placement.
- All 20 registry IDs unique and accounted for.
- 20,000 deterministic geospatial validity/surface-anchor evaluations.
- Existing canonical runtime, hazard semantics, risk-lighting lifecycle, visitor client and broker regression suites remain green.
- No merge to main until isolated branch qualification passes and the iPhone presentation is visually inspected.
