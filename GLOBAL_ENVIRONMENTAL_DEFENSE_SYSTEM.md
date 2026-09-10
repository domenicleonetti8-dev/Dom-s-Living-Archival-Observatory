# D.O.M. Global Environmental Defense System

Status: isolated design/runtime contract on `global-hazard-observatory-isolated`; not merged to `main`.

## Purpose

D.O.M. is an experimental global environmental situational-awareness system that fuses public observations, satellite products, official alerts, temporal baselines and uncertainty into one defensible evidence state for Earth-system hazards and environmental change.

## Precision rule

D.O.M. never manufactures precision. A value may be stored and computed with high numeric precision, but displayed digits must be limited by the source sensor resolution, calibration uncertainty, representativeness uncertainty, model uncertainty and spatial/temporal coverage.

A global temperature value to 0.1 C is only reported as meaningful if the fused data and uncertainty justify that precision. A station reporting 21.37 C does not mean the surrounding region or the whole Earth is known to 0.01 C.

## Temperature architecture

The system separates:
- point sensor air temperature
- sea-surface temperature
- land-surface temperature
- upper-air temperature
- satellite radiometric retrievals
- reanalysis/model fields
- climatological baselines

These are not interchangeable. Each keeps its observation type, altitude/depth, timestamp, footprint, calibration/QC metadata, lineage and uncertainty.

For point fusion, calibrated observations are combined with quality, freshness and inverse-variance weighting. Conflicting independent observations increase spread/uncertainty rather than being averaged silently.

For gridded global means, cells are area weighted. On a latitude/longitude grid the first-order spherical area factor is proportional to `cos(latitude)`. Production gridded products should use actual cell areas where supplied.

## Numerical reliability

The browser reference core uses compensated summation for weighted aggregates to reduce floating-point accumulation error. Production Pi workers should retain IEEE-754 double precision at minimum and may use higher precision for calibration/replay where justified.

Uncertainty terms are propagated rather than hidden. Independent uncertainty components may be combined in quadrature when scientifically appropriate:

`u_total = sqrt(u_measurement^2 + u_model^2 + u_representativeness^2)`

Correlated errors must not be treated as independent merely to shrink uncertainty.

## Real-time meaning

Real-time is source-defined. Every observation carries both `observed_at` and `received_at`. D.O.M. computes latency and freshness from those timestamps. Delayed satellite passes, hourly station uploads and modeled analyses are never presented as instantaneous measurements.

## Environmental state pipeline

Public instrument/satellite feed
→ raw immutable observation
→ schema validation
→ unit normalization
→ source QC/calibration flags
→ duplicate/lineage detection
→ timestamp/latency validation
→ point/gridded fusion
→ temporal baseline comparison
→ robust anomaly detection
→ hazard-specific physical model
→ compound Earth-system fusion
→ exposure/vulnerability layer
→ uncertainty envelope
→ evidence strength
→ DOM voice + Safari globe + Apple AR globe + alerts.

Every downstream product must be traceable back to its contributing observations.

## Anomaly math

For non-Gaussian or contamination-prone streams D.O.M. uses robust median/MAD baselines where appropriate:

`z_robust = (x - median) / (1.4826 * MAD)`

No z-score is emitted when baseline support is insufficient or MAD is zero. An anomaly is an attention signal, not proof of a future disaster.

## Sensor activation

The globe glow state is evidence contribution, not raw danger probability. Activation uses measured anomaly, source quality, freshness, independent corroboration and persistence. Red means strongest current contribution to the evidence chain; it does not mean an event is certain.

## Environmental judgment contract

Every machine judgment exposes:
- exact source/network/instrument lineage
- coordinates or source geometry
- observation timestamp and receive timestamp
- raw measurement and units
- normalized measurement
- QC/calibration state
- sensor resolution
- measurement uncertainty
- model uncertainty where applicable
- coverage/representativeness
- baseline period and baseline support
- trend/anomaly statistic
- independent corroboration
- evidence-strength score
- hazard category/official category where applicable
- lower/central/upper impact envelope when modeled
- missing or stale variables
- explicit statement of what cannot be concluded.

## Global temperature truth

There is no physically meaningful single instantaneous thermometer reading for the whole planet. D.O.M. can estimate a global area-weighted temperature field/mean from observations and analysis products, but must always show coverage, timestamp window, product type and uncertainty. Surface air, land-surface and sea-surface temperatures remain separately identifiable.

## Accuracy gates

D.O.M. refuses strong automated environmental conclusions when:
- measurement coverage is below the configured scientific minimum
- source timestamps are stale beyond the hazard/product-specific limit
- calibration/QC status is invalid or unknown where required
- independent sources materially disagree without resolution
- spatial uncertainty is too large for the claimed location
- baseline support is inadequate
- an impact model lacks exposure/vulnerability inputs
- an official warning contradicts an experimental machine interpretation.

Official warning agencies always take precedence for protective instructions.

## Apple/Safari/Pi end-to-end target

Pi service:
- persistent feed connectors
- normalized observation log
- station registry with published coordinates
- unit/QC normalization
- temporal baselines
- numerical fusion and uncertainty
- hazard classifiers
- imagery metadata/cache
- SSE/WebSocket stream
- alert broker

Safari:
- lazy-rendered globe
- sensor glow and station drilldown
- event geometry and imagery layers
- measurement/uncertainty/evidence panels
- no whole-Earth high-resolution load

Apple AR / RealityKit:
- same canonical sensor/event stream
- free globe rotation/scale
- event and station selection
- viewport-dependent LOD
- source imagery tiles where lawful and timely
- identical evidence state to Safari.

## Validation before production claims

Required validation includes historical replay, temporal holdout, calibration curves, Brier/log loss only for actual probabilistic outputs, spatial error, lead-time distribution, false alarms, missed severe events, source outage tests, stale-data tests, unit-conversion tests, duplicate-lineage tests and numerical regression tests.

D.O.M. should aim for exceptional accuracy, but must never claim accuracy beyond what the observations and calibration demonstrate.
