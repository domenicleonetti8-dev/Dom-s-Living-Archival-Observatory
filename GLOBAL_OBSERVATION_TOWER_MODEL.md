# D.O.M. — Diverse Observation Machine

## Global Observation Tower Model

D.O.M. is an experimental global disaster-observation and situational-awareness system. It is designed to fuse diverse, independent measurements into transparent evidence, confidence, severity, location, trend, and impact estimates.

It is **not** an official emergency-warning service and must not present unvalidated model outputs as certainty.

## Scope

D.O.M. may evaluate natural and civilian/public-safety hazards including:

- earthquakes and aftershock sequences
- tsunamis and official tsunami advisories/warnings
- tropical cyclones, severe storms, tornado warnings, lightning and extreme weather
- wildfire and thermal anomalies
- volcanic unrest and eruptions
- floods, river gauges, storm surge and coastal inundation
- landslides and other geologic hazards when authoritative feeds exist
- near-Earth objects, bolides/fireballs and atmospheric-entry observations from authoritative astronomy networks
- public civil-aviation position/status data where lawful and appropriate
- industrial accidents, chemical releases, infrastructure failures and other public emergency events when sourced from public authorities

D.O.M. must not provide operational military targeting, weapon guidance, live missile trajectory optimization, or exact weapon-impact prediction. For armed-conflict hazards it may display public official civil-defense warnings, already-public incident reports, and coarse affected regions for civilian safety.

## Evidence lineage

Every normalized observation carries:

- `event_id`
- `hazard_class`
- `source_agency`
- `sensor_or_feed`
- `observation_mode`
- `observed_at`
- `received_at`
- latitude / longitude / geometry
- measured quantities with units
- source quality metadata
- upstream lineage identifier
- official-alert status
- update/version identifier

Two websites repeating the same upstream observation count as **one evidence lineage**, not two confirmations.

## Quantitative state vector

For an event or regional cluster, normalize each component to 0..1 unless an original physical unit is shown alongside it:

- `S`: physical severity
- `Q`: measurement/source quality
- `F`: freshness
- `G`: geospatial precision
- `C`: independent corroboration
- `T`: temporal persistence / trend strength
- `A`: official-alert strength
- `P`: local exposure / proximity
- `U`: uncertainty quality (higher means less uncertainty)

No component may be called a probability unless it has been empirically calibrated against held-out historical outcomes.

## Evidence strength

Initial transparent engineering score:

`E = 0.24Q + 0.18F + 0.16G + 0.18C + 0.14U + 0.10T`

Displayed as `Evidence strength = round(100E)%`.

This percentage is a normalized evidence-strength score, **not** the probability that a disaster will occur.

## Hazard intensity

Initial hazard-class-specific intensity uses:

`H = wS*S + wT*T + wA*A + wP*P + wC*C`

where the weights sum to 1 and are separately defined and back-tested for earthquakes, storms, fires, volcanoes, floods, tsunamis, and astronomical events.

A universal hazard formula must not be used after hazard-specific models are available.

## Observation confidence grade

Until probability calibration exists:

- 90–100: very strong evidence
- 75–89: strong evidence
- 55–74: moderate evidence
- 35–54: limited evidence
- 0–34: weak / insufficient evidence

These are evidence grades, not occurrence probabilities.

## Location model

D.O.M. stores the original source geometry whenever available. It must distinguish:

- sensor point
- event epicenter / centroid
- forecast track
- warning polygon
- uncertainty ellipse/cone
- affected-area polygon
- inferred regional cluster

The interface must never show false pinpoint precision. A point estimate is accompanied by the source's uncertainty radius/geometry when known. If uncertainty is not supplied, D.O.M. labels precision as unresolved rather than inventing it.

## Trend and spike detection

For each hazard class and spatial cell, D.O.M. may compute standardized deviations from a historical/local baseline:

`z = (x - median_baseline) / (1.4826 * MAD)`

using median absolute deviation where appropriate for robustness.

A regional spike requires both:

1. statistically unusual change relative to baseline, and
2. sufficient data quality / independent evidence.

An anomaly is an attention signal, not proof of a future disaster.

## Multi-sensor corroboration

Independent-evidence corroboration is based on lineage classes rather than site count. Example evidence modes include:

- seismic
- radar
- satellite optical/infrared
- lightning
- river/gauge
- meteorological station
- aircraft/public-transponder
- astronomical optical/radar
- official CAP warning

Corroboration increases when independent modalities agree in space and time. Mirrored feeds do not increase it.

## Impact assessment

D.O.M. separates observation from impact modeling.

Observed state → physical hazard model → exposure geometry → confidence/uncertainty → bounded impact statement.

Examples of acceptable output:

- “Three independent observation modes indicate severe storm conditions moving northeast across this region.”
- “The current official warning polygon overlaps these counties.”
- “A thermal anomaly persists across successive satellite passes; wildfire extent remains uncertain.”
- “The reported near-Earth object trajectory does not imply atmospheric impact unless an authoritative orbit solution says so.”

Never convert an observation anomaly into “this will happen” without a validated forecast product and its uncertainty.

## Voice contract

When D.O.M. speaks, the exact evidence backing the statement must simultaneously appear in a visible text block.

Spoken output is assembled deterministically from:

- source agency and sensor/feed
- measured values
- location/geometry
- age/freshness
- independent evidence count
- evidence-strength percentage
- hazard intensity / official severity
- uncertainty
- bounded possible impacts
- source link

D.O.M. may say “sensors indicate,” “evidence suggests,” “official forecasts project,” or “could affect.” It may say “will” only when quoting or faithfully summarizing an authoritative issued warning/forecast whose wording supports that level of certainty.

## Validation statistics

Each hazard-specific model must be back-tested on temporally held-out data. Track at minimum:

- precision / positive predictive value
- recall / sensitivity
- false alarms per user-day
- missed severe-event rate
- lead-time distribution
- spatial error distribution
- calibration error
- Brier score for calibrated probabilities
- log loss for probabilistic forecasts
- reliability curves
- data-source uptime and staleness

Training/tuning data and evaluation data must be separated in time to reduce leakage.

## Fail-safe principles

- Missing feed = unknown, never safe.
- Disagreeing sources remain visible and lower confidence.
- Stale measurements decay in weight.
- A single high-quality official warning can be urgent even without sensor corroboration.
- Research literature supplies context; it does not directly increase a live alert score.
- Human-readable evidence always accompanies automated scoring.
