# D.O.M. scientific fabric — next wave

This document extends the isolated geographic Earth build without promoting anything to main.

## Expansion principles

1. Prefer real public station/platform inventories and observation APIs over decorative or synthetic points.
2. Preserve provenance, freshness, access state, and platform semantics for every object.
3. Keep surface, marine, depth-capable, airborne, orbital, and unlocated products distinct.
4. Never count a registry/network entry as a live sensor until an adapter returns a usable geolocated record.
5. Never invent coordinates for inaccessible, global, or unlocated products.
6. Keep the working hazard-lighting lifecycle independent from scientific-platform presence.

## Adapter priorities

### Highest-value next adapters
- FDSN station services (global seismic stations)
- IGS GNSS station inventory
- Argo float metadata / current positions
- GLOSS sea-level stations
- GTN-P permafrost sites
- FLUXNET / AmeriFlux tower metadata
- NEON observatory sites
- GIRO ionosonde stations
- INTERMAGNET observatories
- NMDB neutron monitors
- Safecast public radiation points
- IOOS glider metadata
- research-vessel station/platform metadata where public feeds permit

### Additional families to pursue
- radiosonde / upper-air networks
- weather radar inventories
- lightning detection networks with lawful public access
- air-quality station inventories
- greenhouse-gas observatories
- river and groundwater station inventories
- snow telemetry / snowpack sites
- soil-moisture networks
- OceanSITES moorings
- ocean-acidification stations
- volcano observatory inventories
- glacier monitoring sites
- ecosystem / biodiversity observatories
- coral monitoring sites
- solar observatories
- astronomical observatory registries
- Earth-observation satellite catalogs and orbit metadata

## UI expectations

The Earth experience should show truthful counters for:

- live instruments/platforms
- stale instruments/platforms
- registered but not yet connected networks
- failed/blocked adapters
- distinct fields covered
- distinct agencies/networks contributing

Clusters should resolve to individual source-backed platforms as the user zooms. Platform-specific icons or glyphs can differentiate station, buoy, float, glider, tower, radar, observatory, vessel, and satellite classes without weakening source provenance.

## Native AR boundary

Web geographic Earth and native iPhone RealityKit remain distinct delivery paths. Native AR should consume the same normalized scientific platform model after the web/broker data fabric is qualified.
