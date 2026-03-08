from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class LeadScoreWeights:
    acv: float = 0.30
    close_probability: float = 0.25
    fit: float = 0.20
    sales_cycle: float = 0.10
    confidence: float = 0.10
    risk_penalty: float = 0.15


def _clamp01(value: object, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))
    return default


def _to_int(value: object, default: int = 0) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return default


def _normalize_acv(acv_usd: int) -> float:
    # Saturate around 50k ACV for hackathon-scale B2B ranking.
    return max(0.0, min(1.0, acv_usd / 50000.0))


def _normalize_cycle(days: int) -> float:
    # Shorter cycle is better. 180+ days = worst bucket.
    return 1.0 - max(0.0, min(1.0, days / 180.0))


def score_enriched_leads(
    enriched_leads: list[dict],
    *,
    weights: LeadScoreWeights | None = None,
) -> list[dict]:
    w = weights or LeadScoreWeights()
    scored: list[dict] = []

    for lead in enriched_leads:
        acv = max(0, _to_int(lead.get("estimated_acv_usd"), 0))
        close_prob = _clamp01(lead.get("estimated_close_probability"), 0.0)
        fit = _clamp01(lead.get("fit_score"), 0.0)
        risk = _clamp01(lead.get("risk_score"), 0.5)
        confidence = _clamp01(lead.get("confidence"), 0.0)
        cycle_days = max(1, _to_int(lead.get("estimated_sales_cycle_days"), 90))

        acv_norm = _normalize_acv(acv)
        cycle_norm = _normalize_cycle(cycle_days)

        profitability_score = 100.0 * (
            (w.acv * acv_norm)
            + (w.close_probability * close_prob)
            + (w.fit * fit)
            + (w.sales_cycle * cycle_norm)
            + (w.confidence * confidence)
            - (w.risk_penalty * risk)
        )
        profitability_score = max(0.0, min(100.0, profitability_score))

        expected_value_usd = int(round(acv * close_prob))

        enriched = dict(lead)
        enriched["profitability_score"] = round(profitability_score, 2)
        enriched["expected_value_usd"] = expected_value_usd
        enriched["score_breakdown"] = {
            "acv_norm": round(acv_norm, 3),
            "close_probability": round(close_prob, 3),
            "fit_score": round(fit, 3),
            "sales_cycle_norm": round(cycle_norm, 3),
            "confidence": round(confidence, 3),
            "risk_score": round(risk, 3),
        }
        scored.append(enriched)

    scored.sort(
        key=lambda item: (
            item.get("profitability_score", 0.0),
            item.get("expected_value_usd", 0),
            item.get("confidence", 0.0),
        ),
        reverse=True,
    )

    for idx, item in enumerate(scored, start=1):
        item["priority"] = idx

    return scored
