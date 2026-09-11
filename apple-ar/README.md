# DOMS Apple AR

Native RealityKit client for D.O.M. — Diverse Observation Machine.

## Canonical path

`public sensors / hazards / satellite observations -> D.O.M. broker -> dom.observation.v1 -> /v1/ar/state + /v1/ar/stream -> RealityKit Earth`

The native client never invents observations. Located records render at their canonical source coordinates. Unlocated products remain visible in network/evidence state but are not pinned to a fake point.

## Data truth

- `/v1/ar/state` is the complete current AR projection.
- `/v1/ar/stream` is the server-sent event stream for continuous refresh.
- Sensor invocation colors use the same activation equation and thresholds as `dom-sensor-activation.js`.
- Official alerts remain visually distinct.
- Satellite imagery/catalog entries expose source and timing class. A catalog entry is not counted as live unless a connected adapter emits a canonical observation.
- `registered-not-ingesting`, `stale`, and `error` source families remain visible as unavailable/unknown.
- “All sensors” means all lawfully and technically connected public networks, not literally every private or inaccessible instrument on Earth.

## iPhone build

The source target lives in `apple-ar/DOMSAppleAR/` and requires iOS 17+ with ARKit support.

`project.yml` is an XcodeGen manifest. Generate the project on macOS with Xcode/XcodeGen, open the generated project, choose an Apple signing team, and run on a physical iPhone/iPad. Camera permission is already declared in `Info.plist`.

The app requires the same public HTTPS D.O.M. broker used by the website. Enter that HTTPS base URL in the app. Plain HTTP is rejected except localhost for development.

## Current planetary scope

The AR projection is generic across every canonical D.O.M. observation family. The current broker registry includes seismic, hydrology, ocean/buoy, tsunami, weather warnings, fire/thermal, global event aggregation, space weather, forests, reefs, sea level and climate/ocean systems. The AR satellite catalog includes NASA Worldview/Earthdata, FIRMS, NOAA GOES, JPSS/VIIRS, Landsat, Copernicus Sentinel, GPM, SMAP and ICESat-2 families.

Not every registered family currently has an active adapter. The AR client shows that distinction rather than pretending unavailable networks are live.
