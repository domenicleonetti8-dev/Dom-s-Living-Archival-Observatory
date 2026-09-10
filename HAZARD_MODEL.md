# DOMS Global Hazard Observatory — Decision Model v2

This branch is experimental and is not an official warning system.

## Objective
Fuse multiple authoritative hazard feeds into one transparent decision score without pretending that every hazard can be predicted.

## Core quantities
Every event is normalized to 0..1 components:

- severity: observed physical severity or official warning severity
- reliability: source reliability prior
- freshness: exponential decay with age
- geospatial quality: whether usable coordinates are present
- certainty: official CAP-style certainty where available
- urgency: official CAP-style urgency or recency proxy
- proximity: exponential distance decay relative to an opted-in user location
- corroboration: independent-source confirmation near the same location/time
- momentum: change in observed severity for the same coarse geospatial cell; treated only as an attention signal, never as proof of prediction

## Confidence
`confidence = 0.30*reliability + 0.18*freshness + 0.12*geo_quality + 0.18*certainty + 0.12*corroboration + 0.10*age_quality`

## Hazard evidence
`hazard = 0.55*severity + 0.20*urgency + 0.10*proximity + 0.10*corroboration + 0.05*momentum`

## Decision score
`decision = 0.62*hazard + 0.38*confidence`

Displayed score is `round(100*decision)`.

Current thresholds:

- extreme: >= 86
- high: >= 70
- watch: >= 52
- info: < 52

These values are engineering priors, not calibrated probabilities of disaster occurrence. They must be back-tested against historical event and alert archives before any claim of statistical accuracy.

## Notification gate
A local alert is eligible only when either:

1. an official alert is severe/extreme or observed and immediate/expected, or
2. the event is within 250 km, decision >= 0.82, and confidence >= 0.72.

This intentionally uses a stricter threshold than the display ranking.

## Earthquake boundary
USGS states that major earthquakes cannot currently be predicted at an exact date/time, place, and magnitude. DOMS therefore treats earthquake feeds as detection, situational awareness, aftershock context, and probabilistic hazard information — not deterministic earthquake prediction.

## Calibration work still required
Before production use:

- replay historical earthquakes, tropical cyclones, severe weather alerts, fires, volcano events, floods and tsunamis
- measure precision, recall, false-alert rate, missed-event rate, lead time and calibration error per hazard class
- fit thresholds separately by hazard type and region
- compare against official alert issue times, never just event occurrence times
- use reliability diagrams / Brier score for quantities presented as probabilities
- preserve source provenance and show uncertainty to users
- block any unsupported claim such as “will happen” or “predicted before authorities”
