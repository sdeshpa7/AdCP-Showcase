"""
Delivery Simulator — generates realistic performance data for active media buys.

Simulates impressions, clicks, and spend based on the buy's budget, CPM,
and ad-format-specific CTR benchmarks. Adds controlled randomness for realism.
"""

from __future__ import annotations

import random
from typing import Any

from .store import MediaBuyRecord


# ── CTR & ROAS Benchmarks (India digital advertising, 2024-2025) ─────────────

CTR_BENCHMARKS = {
    "video_preroll": (0.008, 0.015),   # 0.8% – 1.5%
    "video_midroll": (0.006, 0.012),   # 0.6% – 1.2%
    "billboard": (0.003, 0.006),       # 0.3% – 0.6%
    "display": (0.002, 0.005),         # 0.2% – 0.5%
}

ROAS_BENCHMARKS = {
    "jiohotstar": (3.5, 6.5),
    "amazon_in": (5.0, 9.0),
    "myntra": (4.0, 7.0),
    "cricinfo": (2.0, 4.0),
    "ndtv": (2.0, 3.5),
}

# Delivery efficiency factor
DELIVERY_FACTOR_RANGE = (0.90, 1.05)


def _infer_format_from_slot_id(slot_id: str) -> str:
    slot_lower = slot_id.lower()
    if "midroll" in slot_lower: return "video_midroll"
    if "preroll" in slot_lower: return "video_preroll"
    if "billboard" in slot_lower: return "billboard"
    return "display"


def simulate_delivery(
    record: MediaBuyRecord,
    publisher_id: str,
    floor_cpm: float | None = None,
) -> dict[str, Any]:
    """
    Simulate realistic delivery metrics for a single media buy.
    """
    cpm = floor_cpm or 100.0
    budget = record.budget

    # 1. Impressions (Pacing)
    max_impressions = int((budget / cpm) * 1000) if cpm > 0 else 0
    delivery_factor = random.uniform(*DELIVERY_FACTOR_RANGE)
    actual_impressions = int(max_impressions * delivery_factor)

    # 2. Clicks (Engagement)
    ad_format = _infer_format_from_slot_id(record.product_id)
    slot_id = record.product_id.lower()
    
    # CTV specific: User instruction - CTV should lead to zero clicks
    if "ctv" in slot_id:
        ctr = 0.0
    # Search specific: Amazon search display has high intent
    elif publisher_id == "amazon_in" and "search" in slot_id:
        ctr = random.uniform(0.025, 0.045)
    else:
        ctr_range = CTR_BENCHMARKS.get(ad_format, (0.003, 0.006))
        ctr = random.uniform(*ctr_range)
    
    clicks = int(actual_impressions * ctr)

    # 3. ROAS (Performance)
    roas_range = ROAS_BENCHMARKS.get(publisher_id, (2.0, 4.0))
    # CTV and Search are more efficient
    if "ctv" in slot_id:
        roas = random.uniform(roas_range[0] * 1.2, roas_range[1] * 1.5)
    elif "search" in slot_id:
        roas = random.uniform(roas_range[0] * 1.3, roas_range[1] * 1.4)
    else:
        roas = random.uniform(*roas_range)

    # 4. Financials
    actual_spend = (actual_impressions / 1000) * cpm
    actual_spend = min(actual_spend, budget)
    completion_rate = (actual_spend / budget * 100) if budget > 0 else 0.0

    return {
        "impressions": actual_impressions,
        "clicks": clicks,
        "spend": {
            "amount": round(actual_spend, 2),
            "currency": "INR",
        },
        "roas": round(roas, 2),
        "completion_rate": round(completion_rate, 1),
        "ctr": round(ctr * 100, 2),
    }


def simulate_all_deliveries(
    records: list[MediaBuyRecord],
    publisher_id: str,
    cpm_lookup: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Simulate delivery for multiple media buys."""
    cpm_lookup = cpm_lookup or {}
    deliveries = []

    for record in records:
        cpm = cpm_lookup.get(record.product_id)
        delivery = simulate_delivery(record, publisher_id, floor_cpm=cpm)
        delivery["media_buy_id"] = record.media_buy_id
        delivery["product_id"] = record.product_id
        deliveries.append(delivery)

    return deliveries
