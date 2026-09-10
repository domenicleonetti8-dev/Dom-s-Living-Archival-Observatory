# D.O.M. Geographic Sensor Activation Model

Status: isolated prototype contract. This does not change official warning authority.

## Goal
Render each public instrument or station at its real published geographic coordinate when that coordinate is available. Never replace an event epicenter, warning polygon, forecast cone, or aggregator centroid with a fake sensor location.

## Marker classes
- Sensor/instrument point: published station/instrument coordinate.
- Event point: measured epicenter, centroid, hotspot, impact observation, or source-provided event coordinate.
- Forecast geometry: source-provided track, cone, polygon, plume, perimeter, or uncertainty envelope.

These classes must remain visually and semantically distinct.

## Activation color
Sensor glow represents how strongly that instrument is currently contributing to an active D.O.M. assessment, not disaster probability.

Activation score A is normalized 0..1 from:

A = 0.18 freshness + 0.18 quality + 0.24 anomaly + 0.14 persistence + 0.14 corroboration + 0.12 hazard coupling

Color bands:
- 90-100: red — critical invocation
- 72-89: orange — heavy invocation
- 52-71: yellow — elevated invocation
- 30-51: green — active
- 1-29: cyan — watching
- 0: gray — idle / no qualified signal

Red means the sensor is heavily invoked in the evidence chain. It does not mean a catastrophic event is certain.

## Spatial behavior
At global altitude, cluster sensors by tile/network and retain only severe/high-priority invoked groups. As the user zooms in, progressively reveal individual stations. At surface scale, show the precise published coordinate and measurement metadata. Never load all global station graphics simultaneously.

## Storm identity and strength
Storm markers must carry both type and strength. Preserve the official issuing agency's category whenever one exists. If an official category is unavailable but sustained wind is available, D.O.M. may derive the standard tropical-cyclone threshold band from wind speed while clearly labeling it as wind-threshold derived. If neither exists, display `strength unresolved`.

For tropical systems, wind-threshold bands use sustained wind in knots:
- <34 kt: disturbance/depression
- 34-63 kt: tropical storm
- 64-82 kt: Category 1 range
- 83-95 kt: Category 2 range
- 96-112 kt: Category 3 range
- 113-136 kt: Category 4 range
- >=137 kt: Category 5 range

D.O.M. must not apply hurricane categories to tornadoes, severe thunderstorms, winter storms, floods, or other hazards. Each hazard retains its own official scale.

## Required sensor popup
Every visible sensor should expose:
- sensor/station ID
- network and agency
- instrument/modality
- latitude/longitude
- coordinate precision/source
- latest observed time
- received time / latency
- raw measurement and unit
- quality flag
- anomaly/baseline evidence where available
- activation score and color reason
- correlated event IDs
- lineage ID
- authoritative source link

## AR/web consistency
The Apple AR globe and browser globe consume the same sensor packet and the same activation calculation. A sensor must not be red in AR and green on the web for the same timestamped observation.

## Missing or stale data
Missing location means do not draw a sensor point. Missing measurement means unknown, not safe. Stale measurements decay activation and should visibly identify age. A failed feed must not leave its previous markers looking live indefinitely.
