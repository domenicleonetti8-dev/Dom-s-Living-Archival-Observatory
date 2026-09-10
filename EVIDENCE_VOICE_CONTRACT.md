# DOMS Evidence-Locked Voice Contract

This applies only to the isolated Global Hazard Observatory prototype.

## Rule
DOMS voice must never speak a stronger claim than the evidence block visible beside the same event.

The spoken narrative and visible text are generated from the same event evidence object.

## Required evidence fields
Every spoken event should expose, when available:
- authoritative source or sensor network
- event type and title
- measured magnitude or official severity
- official certainty and urgency
- observation freshness
- independent corroboration score
- latitude and longitude
- distance from an opted-in user
- decision score
- evidence confidence
- uncertainty / safety boundary

## Allowed language
Use observational and conditional language:
- sensors indicate
- observed signal
- elevated hazard conditions
- could affect the region if the event develops or persists
- current evidence does not support a stronger outcome claim

## Prohibited language
Do not say:
- this disaster will happen
- DOMS predicted this earthquake
- authorities are wrong
- guaranteed safe
- guaranteed impact

unless a future validated source explicitly provides such a statement and the product policy later permits displaying it verbatim with provenance.

## Research boundary
Research papers, datasets, and prior-event studies may provide context and model features, but they do not count as live independent sensor corroboration by themselves.

## Alert boundary
Automatic speech remains downstream of the same notification eligibility gate as vibration/notifications. Manual Speak Evidence may read any displayed event, but must still use the same evidence object and uncertainty language.

## Calibration
Decision score and evidence confidence are engineering quantities until validated by historical replay. They must not be presented as calibrated event-occurrence probabilities until per-hazard back-testing demonstrates calibration.
