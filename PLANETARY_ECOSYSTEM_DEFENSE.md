# D.O.M. Planetary Ecosystem Defense

Status: isolated on `global-hazard-observatory-isolated`; not merged to `main`.

## Scope

Add three environmental-defense layers to the same sensor/globe/AR evidence fabric:

1. Copernicus/ECMWF global temperature reference fields
2. Planetary forest/vegetation disturbance monitoring
3. Global coral heat-stress and bleaching-risk monitoring

These layers inform D.O.M.'s environmental situational awareness. They do not turn delayed products into instantaneous measurements and they do not invent precision that the source does not support.

## Copernicus / ECMWF temperature backbone

D.O.M. treats Copernicus Climate Change Service / ECMWF ERA5-family fields as a global reference/reanalysis layer, separate from direct station, buoy, radiosonde and satellite retrieval observations.

Required packet fields:
- provider/product
- variable (for example 2 m air temperature)
- latitude/longitude or grid geometry
- value in Celsius after normalized conversion
- observation/valid time
- received time
- spatial resolution
- uncertainty where published/derived defensibly
- data mode (`reanalysis`, `preliminary-reanalysis`, `forecast`, `observation`)
- source lineage

D.O.M. must never label a reanalysis field as an instantaneous local thermometer reading.

Temperature fusion should compare, not blindly average, physically different variables such as:
- 2 m air temperature
- land-surface temperature
- sea-surface temperature
- upper-air temperature
- satellite skin temperature

## Forest and vegetation disturbance

Primary environmental-defense source family: Global Forest Watch / WRI integrated disturbance alerts and supporting GLAD, GLAD-S2, RADD and DIST-ALERT products where accessible and licensed.

Required fields:
- alert system
- observation time
- alert confidence/source confidence
- alert geometry or source coordinate
- affected-area estimate when supported
- forest/vegetation class
- protected-area overlap when available
- primary-forest/intact-landscape overlap when available
- repeat-disturbance indicator
- source imagery/acquisition time

The system must use `forest-disturbance` language by default. A satellite disturbance alert is evidence of vegetation change and does not by itself prove illegal logging or intentional deforestation.

The AR/globe layer should render disturbance cells/polygons over the exact source geometry available and progressively reveal higher-resolution alerts as the user zooms toward the surface.

## Coral reef defense

Primary environmental-defense source family: NOAA Coral Reef Watch.

Use available near-real-time global 5 km products including:
- CoralTemp sea-surface temperature
- SST anomaly
- SST trend
- Coral Bleaching HotSpot
- Degree Heating Week (DHW)
- Bleaching Alert Area / level
- Virtual Stations where available

Required packet fields:
- source/product
- valid/acquisition time
- location/grid cell/reef geometry
- SST
- SST anomaly
- HotSpot
- DHW
- Bleaching Alert Level
- product resolution
- quality/method metadata

D.O.M. must distinguish `heat stress / bleaching risk` from confirmed coral mortality or destruction. Confirmed reef damage requires in-water surveys, validated remote-sensing products, or another authoritative observation supporting that conclusion.

## Shared mathematical rules

Every ecosystem signal must carry freshness, uncertainty/quality, source lineage, spatial support and time truth.

No-data stays UNKNOWN. Different physical variables remain separate. Stale values decay. Independent observations may corroborate each other; mirrors of the same upstream product do not.

Environmental activation colors follow the same D.O.M. contribution scale:
- gray: no qualified current signal
- cyan: watching
- green: active
- yellow: elevated
- orange: heavy contribution
- red: strongest contribution

Red means strongest current evidence contribution, not certainty of irreversible damage.

## AR and satellite imagery

The Apple/Safari Earth view should expose toggleable layers for temperature, vegetation disturbance and coral heat stress. When an area is selected, D.O.M. should request only the freshest relevant imagery/data tiles for that viewport/event, with source and acquisition timestamp always visible.

The planet remains lazy-rendered: global overview at coarse resolution, progressively higher resolution only around the camera viewport and selected environmental signals.
