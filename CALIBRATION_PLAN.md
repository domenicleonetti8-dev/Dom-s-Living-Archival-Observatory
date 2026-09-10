# DOMS Global Hazard Observatory — Calibration Plan

Status: isolated experimental branch. Not an official warning system.

## Goal
Turn the current decision score into a defensible, hazard-specific risk model through repeated historical replay and calibration rather than intuition alone.

## Repeated evaluation loop
For every hazard class and region:
1. collect authoritative historical event records and official alert issue times;
2. replay the feeds in chronological order without access to future data;
3. compute the model score exactly as it would have appeared at that moment;
4. compare against the event outcome and the first official warning timestamp;
5. record false positives, misses, lead time, precision, recall, specificity and alert burden;
6. recalibrate thresholds and weights on training periods only;
7. freeze those values and evaluate on separate holdout periods;
8. repeat with rolling time windows and region holdouts to detect overfitting;
9. keep hazard classes separate unless validation shows that shared parameters improve holdout performance.

## Metrics
- Precision and recall for actionable alerts
- False alerts per user-day
- Missed severe events
- Median and tail lead time relative to official alerts
- Brier score for any quantity eventually labeled as probability
- Reliability/calibration curve
- AUROC and precision-recall AUC for ranking only
- Spatial error in km
- Temporal error in minutes/hours
- Source availability and latency

## Decision mathematics
The current score remains an engineering decision score, not a calibrated probability. During calibration, compare several transparent candidate models rather than tuning only one:

### Candidate A — weighted evidence model
Existing interpretable weighted score.

### Candidate B — logistic calibration layer
Fit a logistic transform to validated historical scores per hazard type:
`p = 1 / (1 + exp(-(a + b*s)))`
where `s` is the frozen evidence score and `a,b` are fit only on training data.

### Candidate C — isotonic calibration
Use monotonic non-parametric calibration when enough historical examples exist. Accept only if holdout Brier score improves and the reliability curve remains stable.

## Subjective judgement policy
Subjective/expert judgement may:
- define which physical variables matter;
- set conservative initial priors;
- choose asymmetric costs for misses versus false alerts;
- identify impossible or misleading outputs.

Subjective judgement must not:
- overwrite contradictory observed data;
- create unsupported probability claims;
- lower official evacuation/warning severity;
- silently change thresholds after seeing holdout outcomes.

## Per-hazard separation
Separate calibration tracks are required for earthquakes, tropical cyclones, severe convective weather, wildfire, volcano, tsunami and flood. A magnitude-6 earthquake and a hurricane cannot share the same physical severity mapping.

## Corroboration safeguards
Multiple feeds are not automatically independent. Two feeds that redistribute the same upstream observation count as one evidence family. Corroboration credit is given only to materially independent sensors/agencies or independent observation modalities.

## Research bridge
Hazard events may query DOMS Research for papers, datasets and Earth-observation collections. Research context is informational and must not directly raise an alert score unless a validated structured variable is explicitly incorporated into the calibrated model.

## Promotion gates
No production probability or early-warning claim until:
- holdout testing exists for the relevant hazard class;
- calibration error is quantified;
- false-alert burden is measured;
- official-source latency is known;
- every score component has provenance;
- the system distinguishes observed, forecast, inferred and experimental signals;
- notification thresholds are tested against historical alert streams.
