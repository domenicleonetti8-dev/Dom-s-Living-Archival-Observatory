# D.O.M. Apple AR Geospatial Lazy Rendering / LOD Architecture

Branch: global-hazard-observatory-isolated
Status: isolated design contract, not merged to main.

## Goal
Render only the geographic detail required for the user's current view and selected hazard. Never load the full planet at surface resolution.

## Multi-resolution globe
Use hierarchical geospatial tiles and progressive level of detail (LOD):

1. **Orbital view** — coarse Earth mesh, coastlines, country outlines, aggregated hazard clusters only.
2. **Continental view** — regional terrain/ocean tiles, major hazard footprints, weather systems, tectonic/seismic fields.
3. **Regional view** — higher-resolution terrain, coastlines, rivers, warning polygons, storm tracks, flood/fire/ash/shaking layers.
4. **Local view** — city/county-scale imagery or terrain where lawfully/publicly available, localized sensor stations, impact contours.
5. **Surface / pinpoint view** — only the small tile neighborhood around the selected event coordinate, with the source-provided point/geometry, uncertainty footprint, sensor locations and exact reported coordinates.

## Lazy-loading rule
The renderer maintains a camera-dependent working set. It requests only tiles intersecting the current camera frustum plus a small predictive ring around the direction of travel.

Priority score per tile:

`priority = visible_weight + selected_event_weight + hazard_severity_weight + proximity_to_camera_weight + motion_prediction_weight - stale_penalty`

Tiles outside the working set are evicted from GPU memory by least-recently-used policy, except pinned tiles needed for the currently selected hazard/evidence panel.

## Geospatial indexing
Preferred hierarchy:
- S2 cells or H3 for event/sensor indexing
- quadtree / XYZ tiles for raster and terrain
- vector tiles for boundaries, roads and hazard polygons
- event R-tree / spatial index for visible-event queries

No event is rendered from a guessed position. The marker geometry must come from the source observation/event packet.

## Direct pinpoint semantics
`pinpoint` means the most precise location justified by evidence, not false centimeter accuracy.

Each visible marker carries:
- source latitude/longitude
- source geometry type
- source-reported spatial accuracy if available
- uncertainty radius / ellipse / polygon when available
- `precision_status`: exact_source_point | source_centroid | warning_polygon | forecast_track | inferred_region | unresolved

If a source supplies only a polygon or broad region, D.O.M. must render the polygon/region rather than fabricate an exact point.

## Zoom behavior
- pinch / scroll: continuous scale transition
- tap hazard: focus camera on hazard geometry
- double-tap selected hazard: descend one semantic LOD tier
- `Surface` action: descend until the maximum evidence-supported LOD is reached
- smooth cross-fade between parent and child tiles
- parent tile remains visible until child tile is ready to prevent blank frames

## Hazard-specific detail
At closer LODs, activate only relevant layers:
- earthquake: epicenter, depth, stations, shaking contours, fault context where available
- tsunami: source region, forecast/travel-time zones, coastal warning/inundation polygons from authorities
- cyclone/storm: center, track, cone, wind radii, rainfall, surge/warning polygons
- wildfire: thermal detections, perimeter, spread/wind context
- volcano: vent/volcano location, ash/advisory polygons, thermal/SO2/seismic context
- flood: gauge locations, river network, warning/inundation polygons
- meteor/bolide: observation/entry geometry and uncertainty from authoritative sources
- public-safety incident: only publicly reported geometry and uncertainty

## Streaming budgets
Initial engineering targets for iPhone class hardware; these are performance budgets, not guaranteed device limits:
- coarse globe visible immediately
- <= 200 event markers before clustering
- <= 64 actively rendered high-detail vector/raster tiles at once
- <= 16 highest-detail terrain tiles at once
- decode and stage off the render loop where possible
- keep animation at device-appropriate frame pacing
- degrade gracefully by dropping decorative effects before dropping hazard/evidence geometry

## Event clustering
At orbital/continental levels, geographically close events are clustered. Cluster expands as the camera descends. Severe/critical events may remain individually visible above the cluster threshold.

## Sensor rendering
Do not draw millions of instruments globally. Sensor stations are indexed but become visible only when:
- inside the current high-detail tile set,
- explicitly requested,
- relevant to selected hazard evidence, or
- contributing to an active anomaly/alert.

## Shared web + Apple AR contract
The web globe and RealityKit AR globe consume the same normalized geospatial packet and LOD decisions. Rendering backends differ; location/evidence semantics do not.

## Apple AR
For the native Apple path, RealityKit/Metal should maintain the tile working set. The AR Earth can be scaled from tabletop globe to room-scale sectional inspection. Surface descent changes map/terrain LOD rather than physically expanding an entire full-resolution Earth asset in memory.

## Cache
Cache immutable or versioned tiles opportunistically, obeying provider terms. Live hazard overlays have short TTLs keyed to source latency. Stale overlays must visibly display age and cannot silently masquerade as current.

## Safety and uncertainty
Never use graphical precision beyond source precision. Operational military tracking/guidance remains excluded. Publicly reported incidents may be shown only at evidence-supported public coordinates/regions.
