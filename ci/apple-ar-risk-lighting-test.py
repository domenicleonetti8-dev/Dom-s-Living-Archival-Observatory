from pathlib import Path
import random
import re

swift = Path('apple-ar/DOMSAppleAR/ARGlobeView.swift').read_text(encoding='utf-8')

# Source-contract checks: native RealityKit Earth must animate from the scene clock,
# honor accessibility, preserve the canonical band mapping, and stop ended/expired signals.
required = [
    'SceneEvents.Update.self',
    'UIAccessibility.isReduceMotionEnabled',
    'activation == "critical"',
    'activation == "heavy"',
    'activation == "elevated"',
    'activation == "active"',
    'activation == "watching"',
    'expiresAt <= now',
    'marker.entity.isEnabled = false',
    'id: "unknown"',
    'id: "high"',
    'id: "medium"',
    'id: "low"',
    'id: "steady"',
]
for token in required:
    assert token in swift, f'missing Apple AR lighting contract token: {token}'

assert re.search(r'period:\s*1\.05', swift), 'high-risk pulse period changed unexpectedly'
assert re.search(r'period:\s*1\.8', swift), 'medium-risk pulse period changed unexpectedly'

bands = ['critical', 'heavy', 'elevated', 'active', 'watching', 'idle']
statuses = ['reported', 'active', 'stale', 'unknown', 'unavailable', 'resolved', 'cancelled', 'ended']
expected_band = {
    'critical': ('high', True),
    'heavy': ('high', True),
    'elevated': ('medium', True),
    'active': ('low', False),
    'watching': ('steady', False),
    'idle': ('steady', False),
}

def classify(band, status, expired=False, reduce_motion=False):
    stopped = any(word in status.lower() for word in ('cancel', 'ended', 'expired', 'inactive', 'closed', 'resolved', 'cleared'))
    if stopped or expired:
        return 'off', False
    if any(word in status.lower() for word in ('stale', 'unknown', 'unavailable')):
        return 'unknown', False
    profile, animate = expected_band[band]
    return profile, animate and not reduce_motion

rng = random.Random(0xD0A5C0DE)
for i in range(10_000):
    band = rng.choice(bands)
    status = rng.choice(statuses)
    expired = rng.randrange(13) == 0
    reduce_motion = rng.randrange(17) == 0
    profile, animate = classify(band, status, expired, reduce_motion)
    assert profile in {'off', 'unknown', 'high', 'medium', 'low', 'steady'}
    if profile in {'off', 'unknown', 'low', 'steady'}:
        assert not animate, f'case {i}: non-alert state animated'
    if profile in {'high', 'medium'} and not reduce_motion:
        assert animate, f'case {i}: live elevated state failed to animate'

print('APPLE_AR_RISK_LIGHTING_10000=PASS')
