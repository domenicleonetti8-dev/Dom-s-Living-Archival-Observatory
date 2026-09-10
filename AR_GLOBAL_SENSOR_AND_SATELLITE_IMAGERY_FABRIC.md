# D.O.M. Global Sensor + Apple/Safari AR + Satellite Imagery Fabric

Status: isolated architecture on `global-hazard-observatory-isolated`. This is not merged to `main`.

## Goal

Create one global Earth view in Safari and Apple AR where public sensors are rendered at their published geographic coordinates, hazard events are rendered with evidence-supported geometry, the globe can rotate freely up/down/left/right, and zoom progressively from orbital scale to surface scale without loading the whole planet at full resolution.

## Core rule

The globe, AR view, hazard list, and evidence/voice layer must all consume the same normalized event and sensor packets. No visual layer may invent a sensor coordinate, hazard position, official category, or image timestamp.

## Sensor location model

Each station/instrument packet carries:
- agency
- network
- station/instrument ID
- modality
- published latitude/longitude/elevation/depth when supplied
- observation time
- received time
- measurement values + units
- quality/QC flags
- freshness
- lineage ID
- source URL
- activation score

A station point is never substituted with an event coordinate. Mobile sensors/satellites use their observation footprint or most recent published platform position only when the source supplies it.

## Activation visualization

Sensors glow according to contribution to the active evidence chain, not simply because they exist:
- gray: idle / insufficient qualified signal
- cyan: watching
- green: active
- yellow: elevated
- orange: heavily invoked
- red: strongest contribution

Red means strongly invoked in D.O.M.'s current evidence chain. It does **not** mean a disaster is certain.

## Globe + AR controls

Both the Safari globe and Apple AR Earth use the same camera semantics:
- free rotation left/right and up/down
- pinch zoom
- inertial spin with damping
- tap/select event or sensor
- double-tap focus
- zoom-to-event
- zoom-to-sensor
- orbit reset
- surface approach that stops above terrain rather than clipping through Earth

In Apple AR, the globe is a world-anchored 3D object that may be translated, scaled, rotated and walked around. The AR client should use RealityKit/ARKit for persistent animation and streamed updates rather than treating a static USDZ as the live runtime.

## Lazy rendering / LOD

Never load the full-resolution Earth simultaneously.

Orbital scale:
- low-resolution globe shell
- country/continent-scale event clusters
- sensor clusters
- severe/official events kept individually visible where practical

Continental scale:
- medium terrain/imagery tiles
- network clusters
- event polygons/cones where available

Regional scale:
- high-resolution local terrain/imagery
- selected stations
- event footprints
- warning polygons

Local/surface scale:
- maximum available imagery/terrain for the viewport only
- individual published sensor coordinates
- measurements and timestamps
- uncertainty geometry
- event source geometry

Tiles outside a bounded camera ring are evicted from GPU memory. A predictive ring may preload the direction of camera motion.

## Satellite imagery model

Satellite imagery is an evidence layer, not a promise of a continuous live camera feed. Every imagery layer must expose acquisition time and source.

Priority sources:

### NASA Worldview / Earthdata imagery
Use for near-real-time global Earth-observation imagery where supported. Imagery should be requested by visible geographic tile and time, not as a global full-resolution image.

### NASA FIRMS
Use active-fire/thermal-anomaly products and compatible imagery/footprints. Global active-fire observations are commonly near-real-time rather than instantaneous. U.S./Canada products may have faster RT/URT paths when available.

### NOAA GOES / operational meteorological imagery
Use for supported geostationary weather imagery over covered regions, including cloud/storm visualization when a lawful public image/tile service is available.

### Other public EO sources
Copernicus/Sentinel, Landsat, JPSS/VIIRS and other authoritative public products may be added where licensing, access, cadence and browser/backend delivery permit.

## Imagery selection

When an event is selected, D.O.M. requests the freshest scientifically appropriate image layer for the event type and location:
- storm: geostationary/meteorological cloud or IR imagery where coverage exists
- wildfire: FIRMS thermal/hotspot plus optical/IR imagery when available
- flood: optical/radar-derived imagery where timely products exist
- volcano: thermal/ash/cloud products where available
- earthquake: no fake 'live damage' imagery; show latest available scene and acquisition time only
- tsunami: ocean/shoreline products and official forecast geometry; imagery does not replace warning products
- meteor/bolide: authoritative event observation and any public imagery only if actually supplied

If no sufficiently recent image exists, D.O.M. displays `NO RECENT SATELLITE IMAGE AVAILABLE` rather than substituting an old image without warning.

## Time truth

Image labels must show one of:
- LIVE STREAM — only for a genuinely live source
- REAL-TIME / RT — only when source defines it that way
- ULTRA REAL-TIME / URT — source-defined
- NEAR REAL-TIME / NRT — source-defined
- LATEST AVAILABLE — timestamp required
- ARCHIVAL — timestamp required

D.O.M. must never label delayed satellite imagery as live.

## Backend / Pi path

A permanent Raspberry Pi service is the preferred future ingestion broker because Safari alone should not be responsible for polling thousands of feeds, maintaining temporal baselines, caching imagery tiles, or delivering reliable background alerts.

Proposed split:
- Pi: connectors, polling, QC, dedupe, history, imagery metadata/cache, WebSocket/SSE event stream, alert broker
- Safari: globe rendering, interaction, lazy tile requests, evidence UI
- Apple AR client: RealityKit globe rendering, streamed event/sensor updates, same event schema

The Pi should never download the entire planet's high-resolution imagery. It caches bounded tiles around active events and requested viewports with TTL and storage budgets.

## Scope truth

`All global sensors` means every public sensor network D.O.M. can lawfully and technically connect to, not literally every instrument on Earth. Networks may require authentication, licensing, rate limits, backend adapters, or may not expose station coordinates publicly. Coverage must always be shown explicitly.

## Safety boundary

The global view may display public civilian safety information and already-public conflict/incident reports. It must not provide operational weapon tracking, targeting, guidance, interception support, or predictive missile-impact coordinates.
