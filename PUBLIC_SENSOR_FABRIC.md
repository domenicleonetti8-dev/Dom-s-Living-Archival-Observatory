# D.O.M. Public Sensor Fabric — isolated build

D.O.M. (Diverse Observation Machine) should ingest the broadest practical set of lawful public instrument feeds while preserving provenance, latency, units, geometry, uncertainty and source lineage. "Live" is source-defined: some feeds update every minute, some every 6–15 minutes, some hourly, and satellite products can be near-real-time rather than instantaneous.

## Verified first-wave public instrument families

### Seismic
- USGS Earthquake GeoJSON real-time feeds — global earthquakes; summary feeds update every minute.
- Preserve magnitude, depth, coordinates, time, status, alert/significance products when available.

### Hydrology
- USGS Water Services / Water Data APIs — near-real-time streamflow, gage height, water temperature and many additional parameters at thousands of U.S. sites. Typical field readings are often 15-minute observations transmitted on an operational cadence.
- This source is U.S.-focused and should never be mislabeled global.

### Ocean / buoy / tsunami instrumentation
- NOAA NDBC DODS/OPeNDAP — standard meteorological, oceanographic, water-level, wave, peak-wind, current and DART tsunami buoy data.
- NOAA National and Pacific Tsunami Warning Center Atom/CAP products — authoritative tsunami warning/watch/advisory and information messages.

### Weather / warnings
- NWS API — U.S. active warnings plus station/grid observation and forecast products.
- Global atmospheric coverage requires additional national meteorological agencies, WMO-linked public feeds, ECMWF/Copernicus products and satellite data through the broker layer.

### Fire / thermal anomaly
- NASA FIRMS — MODIS, VIIRS and Landsat active-fire / thermal-anomaly products. Global NRT is generally available within hours of satellite observation; some U.S./Canada RT/URT products are much faster.
- Preserve satellite/instrument identity so MODIS, VIIRS NOAA-20, VIIRS NOAA-21 and Landsat are independent modalities only when scientifically justified.

### Global event aggregation
- NASA EONET — open natural-event catalog and geometry. Context/aggregation only; do not count it as an independent physical sensor when its upstream evidence overlaps another feed.
- GDACS — global multi-hazard feeds/API for earthquakes, tropical cyclones, floods and related disaster products; common feeds update about every 6 minutes.

### Space weather
- NOAA SWPC JSON services — operational solar/geomagnetic data including K-index, solar regions, radio flux, auroral products and related space-weather observations/forecasts.

## Canonical measurement record
Every ingested measurement should normalize to this contract:

```text
measurement_id
source_agency
network
station_or_platform
instrument
modality
lineage_id
observed_at
received_at
lat
lon
altitude_or_depth
geometry
parameter
value
unit
quality_flag
uncertainty
latency_seconds
provenance_url
license_or_terms
```

No source gets flattened to a naked number. D.O.M. must retain the instrument, units, timestamp, geometry and quality metadata used to create every derived score.

## Broker rule
GitHub Pages cannot safely or reliably ingest the entire global public sensor ecosystem directly because of CORS, authentication, rate limits, XML/NetCDF/GRIB formats and differing refresh cadences. Production architecture therefore requires a server-side broker that:

1. polls each source at a respectful source-specific cadence;
2. validates schemas and timestamps;
3. normalizes units without deleting raw values;
4. records source lineage and upstream dependencies;
5. detects stale feeds and marks them UNKNOWN rather than SAFE;
6. stores short rolling history for trend/spike mathematics;
7. emits compact regional/event snapshots to the browser;
8. keeps research literature separate from live sensor corroboration;
9. applies hazard-specific models only after sufficient evidence is present;
10. never upgrades an inferred condition into an official warning.

## Expansion target
The registry should continue to grow across national meteorological agencies, ocean observing systems, river gauges, radar, satellites, volcano observatories, snow/ice networks, soil-moisture systems, air-quality sensors, lightning networks where openly licensed, tsunami buoys, GNSS/geodesy, atmospheric soundings, tropical-cyclone centers, wildfire networks, Earth-observation products, bolide/meteor observations and other lawful public instruments.

The goal is maximal useful coverage, not the false claim that every instrument on Earth is publicly accessible or technically ingestible.
