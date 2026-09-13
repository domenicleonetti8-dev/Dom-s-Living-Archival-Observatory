# D.O.M. Earth Health — historical station evidence method

D.O.M. evaluates observations rather than treating station metadata as measurements.

For every indexed observing station, the historical pipeline uses the station's actual available observation span. It does not impose one artificial start year. A station contributes only after its measurement records are successfully retrieved and quality checked.

The pipeline records, separately: indexed stations; stations whose history was attempted; stations with usable historical observations; observation count; first and last usable observation; variables represented; spatial coverage; missingness; and source provenance. The public interface must never substitute the indexed-station count for the evaluated-station count.

For weather and climate, the first bulk source is NOAA/NCEI GHCN-D. Station histories are evaluated locally, then aggregated spatially before global aggregation so regions with dense station networks do not dominate simply because they contain more stations. Temperature and precipitation retain their native baselines and units. Long-term change, recent change, uncertainty, coverage and record length remain separate quantities.

Domain evaluation follows: source observation history -> station-level quality control -> station trend/change -> spatial aggregation -> domain evidence -> D.O.M. domain index. The cross-domain Earth Health result is computed only after its coverage and independence gates are satisfied.

The 40,096 weather/climate locations in the current manifest are an index of station locations. D.O.M. may say all 40,096 were evaluated only after the historical pipeline has actually processed usable observation histories for all 40,096. Otherwise it reports the exact evaluated subset.

Existing non-station evidence remains valid and distinct: NASA GISTEMP, NASA/NOAA sea level, NASA GRACE/GRACE-FO land ice, NOAA/NSIDC sea ice, NOAA Coral Reef Watch, GCRMN coral assessments and FAO forest assessments. Historical publication dates and baselines are preserved rather than relabeled as 2026 observations.
