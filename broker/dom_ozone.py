"""Ozone state/trend helpers for D.O.M.

These functions describe observed ozone state and statistically supported trend.
They do not turn short-term variability into a claim of long-term depletion.
"""
from __future__ import annotations

import math
from statistics import median
from typing import Iterable, Optional


def _finite(value) -> Optional[float]:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if math.isfinite(n) else None


def ozone_anomaly(total_column_du, baseline_du):
    value, baseline = _finite(total_column_du), _finite(baseline_du)
    if value is None or baseline is None or baseline <= 0:
        return None
    delta = value - baseline
    return {
        "deltaDU": delta,
        "percent": 100.0 * delta / baseline,
        "baselineDU": baseline,
    }


def linear_trend(samples: Iterable[dict], *, min_samples: int = 12, min_span_years: float = 2.0):
    """Estimate a simple least-squares ozone trend.

    Each sample requires decimalYear and totalColumnDU. The result is descriptive,
    not a calibrated atmospheric forecast. Sparse/short series return unresolved.
    """
    rows = []
    for sample in samples or []:
        x = _finite((sample or {}).get("decimalYear"))
        y = _finite((sample or {}).get("totalColumnDU"))
        if x is not None and y is not None and y >= 0:
            rows.append((x, y))
    rows.sort()
    if len(rows) < max(3, int(min_samples)):
        return {"resolved": False, "reason": "insufficient-samples", "samples": len(rows)}
    span = rows[-1][0] - rows[0][0]
    if span < float(min_span_years):
        return {"resolved": False, "reason": "insufficient-time-span", "samples": len(rows), "spanYears": span}
    xbar = sum(x for x, _ in rows) / len(rows)
    ybar = sum(y for _, y in rows) / len(rows)
    denom = sum((x - xbar) ** 2 for x, _ in rows)
    if denom <= 0:
        return {"resolved": False, "reason": "degenerate-time-axis", "samples": len(rows), "spanYears": span}
    slope = sum((x - xbar) * (y - ybar) for x, y in rows) / denom
    intercept = ybar - slope * xbar
    residuals = [y - (intercept + slope * x) for x, y in rows]
    dof = max(1, len(rows) - 2)
    mse = sum(r * r for r in residuals) / dof
    slope_se = math.sqrt(mse / denom) if denom > 0 else None
    baseline = median(y for _, y in rows)
    pct_decade = (slope * 10.0 / baseline * 100.0) if baseline > 0 else None
    return {
        "resolved": True,
        "samples": len(rows),
        "spanYears": span,
        "slopeDUPerYear": slope,
        "slopeUncertaintyDUPerYear": slope_se,
        "percentPerDecade": pct_decade,
        "direction": "depletion" if slope < 0 else "recovery" if slope > 0 else "stable",
        "method": "ordinary-least-squares descriptive trend",
        "forecast": False,
    }


def ozone_packet(*, total_column_du=None, baseline_du=None, trend=None, uncertainty_du=None, layer="total-column"):
    value = _finite(total_column_du)
    uncertainty = _finite(uncertainty_du)
    anomaly = ozone_anomaly(value, baseline_du) if value is not None else None
    trend = trend if isinstance(trend, dict) else None
    return {
        "layer": str(layer),
        "totalColumnDU": value,
        "uncertaintyDU": uncertainty,
        "anomaly": anomaly,
        "trend": trend,
        "depletionRateDUPerYear": trend.get("slopeDUPerYear") if trend and trend.get("resolved") and trend.get("slopeDUPerYear", 0) < 0 else None,
        "recoveryRateDUPerYear": trend.get("slopeDUPerYear") if trend and trend.get("resolved") and trend.get("slopeDUPerYear", 0) > 0 else None,
        "percentPerDecade": trend.get("percentPerDecade") if trend and trend.get("resolved") else None,
        "truth": "trend is descriptive and requires adequate time coverage; short-term ozone variability is not long-term depletion",
    }


__all__ = ["ozone_anomaly", "linear_trend", "ozone_packet"]
