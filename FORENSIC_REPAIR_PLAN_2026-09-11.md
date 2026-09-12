# D.O.M. isolated observatory forensic repair

Branch-only repair target. Main remains untouched until visual qualification.

Confirmed faults from the current iPhone state:

1. Geographic Earth observation ingestion is coupled to the MapLibre style `load` event. If the renderer/style/CDN path never reaches `load`, no Earth adapters run, leaving both a blank render area and `0 geographic points loaded`.
2. The geographic Earth module has no independent renderer-failure recovery path.
3. Planetary health initializes from an empty input object and waits for `dom:planet-health-input`; no current producer is verified on the public path, so the gauge remains 0%/UNKNOWN even while reference cards render.
4. Population and GISTEMP are fetched directly from third-party origins in the browser, so CORS/network policy can leave those fields UNAVAILABLE.

Repair discipline:

- Fix each fault independently.
- Keep UNKNOWN when qualified health evidence is insufficient.
- Never convert feed uptime or registry metadata into planetary health.
- Decouple source ingestion from renderer success.
- Provide a deterministic Earth-render fallback rather than a blank canvas.
- Add focused regression tests before any promotion.
