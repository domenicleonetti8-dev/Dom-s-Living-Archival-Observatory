# D.O.M. — Live Apple AR Global Event Globe

Status: isolated design only. Do not merge to main without explicit approval.

## Goal
Create a live animated world-scale event visualization for iPhone/iPad that can place public, evidence-backed disaster events on a 3D globe and optionally project that globe into Apple AR.

## Important platform distinction
Apple Quick Look / USDZ is excellent for viewing 3D content in AR, but it is not the correct runtime for continuously changing remote data, arbitrary JavaScript, or live map tiles. Therefore the live system should have two coordinated surfaces:

1. **Live web globe** — continuously updated, interactive, animated, data-rich.
2. **Apple AR scene** — a live native ARKit/RealityKit client, or an AR handoff generated from the same event state when native runtime is unavailable.

A static USDZ may still be exported as a snapshot, but it must never be presented as if it is a continuously updating live map.

## Basemap
Preferred options:
- MapKit JS or a licensed Google Maps / Google Maps Platform visualization where terms and API access permit.
- Open geographic layers may be used for globe geometry and coastlines when a proprietary basemap is unnecessary.

The system must preserve provider attribution and licensing requirements.

## Live layers
### Natural hazards
- Earthquakes
- Tsunami warnings and advisories
- Tropical cyclones / hurricanes / typhoons
- Severe thunderstorms
- Tornado warnings
- Floods and river flooding
- Wildfires and thermal anomalies
- Volcanic activity
- Landslides where authoritative public feeds exist
- Snow / ice storms / avalanches where authoritative feeds exist
- Extreme heat / cold
- Drought and fuel dryness
- Lightning where open public feeds permit
- Meteor / bolide / atmospheric-entry events
- Near-Earth-object close approaches where public data exist

### Public-safety / man-made incidents
- Industrial accidents
- Major fires / explosions reported by authoritative public sources
- Chemical / environmental incidents when publicly reported
- Public aviation / maritime incidents where lawful public data are available
- Infrastructure emergencies / major outages where authoritative public feeds exist
- Public civil-defense alerts and already-public conflict incident reports

### Explicit exclusion
Do not provide live operational missile tracking, predicted impact coordinates, targeting support, guidance, interception support, or any capability that materially improves weapon employment. Publicly reported strike locations may be displayed after publication by authoritative sources for civilian situational awareness, with provenance and uncertainty.

## Visual language
Each event appears as a geospatial object, not just a flat marker:
- point pulse for precisely geolocated observations
- radius / uncertainty ring for approximate locations
- polygon for official warning zones
- forecast cone for storms when officially published
- fire perimeter / thermal cluster where available
- tsunami coastal zone / travel-time overlay when officially published
- earthquake intensity field when available
- meteor atmospheric path / observed entry corridor when supported by public observations

Color and animation indicate category and status, not certainty alone. Animation intensity must never imply stronger scientific confidence than the source supports.

## Event packet
Every rendered object must come from one normalized event packet:

- event_id
- category
- subtype
- source
- authoritative
- official_alert
- lineage_id
- modality
- observed_at
- received_at
- freshness_seconds
- latitude
- longitude
- altitude_m / depth_km when relevant
- geometry_type
- geometry
- horizontal_uncertainty_m
- vertical_uncertainty_m
- intensity_measurements
- official_category
- D.O.M._evidence_strength_0_100
- D.O.M._compound_risk_0_100
- D.O.M._trend
- impact_horizon_low
- impact_horizon_central
- impact_horizon_high
- impact_geometry_low
- impact_geometry_central
- impact_geometry_high
- explanation
- missing_evidence
- source_url

## iPhone AR interaction
Native RealityKit path should support:
- place a globe in the room at user-selected scale
- walk around it physically
- pinch scale / rotate
- tap an event to select it
- freeze / resume live updates
- time scrubber for recent event history
- category filters
- evidence-strength filter
- official-alert-only toggle
- tap region to show exact source measurements, timestamps, uncertainty and D.O.M. reasoning
- visible status showing source age and last successful refresh

The AR scene and the normal web globe must consume the same normalized event packets so they cannot disagree.

## Streaming architecture
public feeds -> serverless ingestion broker -> normalize -> lineage dedupe -> event fusion -> D.O.M. scoring -> WebSocket/SSE stream -> web globe + native AR client

Static GitHub Pages alone is not sufficient for robust continuous global ingestion because many feeds require API keys, server-side CORS handling, caching, rate-limit protection, polling, push delivery, or data transformation.

## Safety and scientific integrity
- A dead/stale feed is UNKNOWN, never safe.
- A marker is not an exact location unless the source accuracy supports that claim.
- Forecast cones are uncertainty regions, not deterministic tracks.
- Simulated impact areas are visibly labeled modeled estimates and include lower/central/upper bounds.
- D.O.M. never invents missing sensor readings.
- Official emergency guidance remains visibly distinct from D.O.M. analysis.
