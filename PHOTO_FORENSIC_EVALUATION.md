# D.O.M. 20-photo forensic evaluation

This isolated repair branch was built from the 20 supplied iPhone screenshots and the current repository state.

## Confirmed faults

- Apple Earth and Global Hazard Observatory were not separate user journeys. The home Apple Earth control routed into `hazards.html#apple-ar`, and the in-page Apple AR button linked to itself.
- The hazard globe is an abstract 2D canvas sphere with latitude/longitude grid lines and risk lights, not a recognizable geographic Earth. Continents, coastlines, roads, place labels and map/satellite context are absent.
- The working yellow/green/orange/red hazard-lighting lifecycle must be preserved. It is evidence/risk visualization, not the geographic basemap.
- The browser display showed roughly 118 current records from three responding hazard feeds while the registry listed 20 source families. Registration is metadata, not live ingestion.
- Multiple planetary-health domains correctly remained UNKNOWN because qualified health-data coverage was 0%. That truth boundary must not be weakened or replaced with feed-uptime claims.
- Public runtime states included `Persistent broker not configured · browser feeds only`, so the public page cannot truthfully claim the complete registered fabric is live.
- Sensor/event markers must use validated latitude/longitude and stay surface-anchored. Random scatter, arbitrary depth/altitude or decorative floating points are not acceptable.
- Unlocated products such as broad space-weather products must remain unlocated rather than receive invented Earth coordinates.
- Safari Reader/content transformation can flatten the visual interface. Reader output is not treated as the canonical D.O.M. presentation.
- Native room-scale Apple AR is not equivalent to a web canvas. A signed RealityKit client or qualified USDZ/Quick Look asset remains a separate delivery gate.

## Isolated repair in this branch

- Adds `earth.html`, `earth.css`, and `earth.js` as a distinct geographic Earth experience.
- Uses MapLibre globe projection and a real geographic basemap for recognizable continents, coastlines, roads and place labels.
- Adds validated GeoJSON surface overlays instead of decorative floating sensor positions.
- Wires five browser adapters independently: USGS earthquakes, NASA EONET, NOAA NDBC active stations, NOAA CO-OPS water-level stations, and NOAA/NWS active alerts. Each adapter reports success/failure separately and failed/CORS-blocked sources are not counted as live.
- Adds clustering so hundreds/thousands of points can remain usable on iPhone.
- Adds globe-to-surface navigation, local-area navigation, current-coordinate display and Google Maps deep-linking.
- Adds an optional Google Maps API overlay path controlled by `window.DOMS_GOOGLE_MAPS_API_KEY`; no Google imagery is scraped or copied.
- Separates home routing: Global Hazard Observatory -> `hazards.html`; Apple Earth -> `earth.html`.
- Changes the hazard-page Apple Earth entry to leave the hazard dashboard and open the geographic Earth.
- Leaves the existing hazard evidence semantics and yellow/green risk-lighting implementation intact.
- Adds CI assertions for route separation, geographic globe projection, validated lon/lat anchoring, multi-source adapters, and absence of random sensor scattering.

## Explicitly not claimed complete

This branch does **not** claim that every public sensor on Earth is connected. The repository has 20 registered source families but many need broker-side adapters, credentials, specialized formats, or cross-origin-safe services. The new source-health panel makes that incompleteness visible instead of hiding it.

This branch also does not claim native iPhone room-scale AR is complete. It fixes the routing and geographic Earth foundation without pretending a normal webpage is RealityKit.
