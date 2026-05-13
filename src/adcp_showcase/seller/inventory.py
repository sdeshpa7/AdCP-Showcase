"""
Inventory Engine — converts PublisherConfig into AdCP-compliant product dicts.

Each InventorySlot becomes one product with proper publisher_properties,
pricing_options, forecast, and context signals injected into the description
so buyer LLMs can evaluate relevance.
"""

from __future__ import annotations

import json
from typing import Any

from .models import AdFormat, InventorySlot, Platform, PublisherConfig, PublisherProperty


# ── Platform → AdCP Channel Mapping ─────────────────────────────────────────

_PLATFORM_TO_CHANNEL = {
    Platform.MOBILE_APP: "olv",
    Platform.CTV: "ctv",
    Platform.WEBSITE: "display",
}


def _slot_channels(slot: InventorySlot) -> list[str]:
    """Map a slot's platform to AdCP channel identifiers."""
    base = _PLATFORM_TO_CHANNEL.get(slot.platform, "display")
    # Video formats get 'olv' regardless of platform
    if slot.ad_format in (AdFormat.VIDEO_PREROLL, AdFormat.VIDEO_MIDROLL):
        return ["olv"] if base != "ctv" else ["ctv"]
    return [base]


# ── Product Builder ─────────────────────────────────────────────────────────

def _build_description(
    slot: InventorySlot,
    prop: PublisherProperty,
    publisher: PublisherConfig,
) -> str:
    """
    Build a rich description string that includes context signals.

    This is what the buyer's LLM will read to decide relevance.
    We deliberately include audience and content metadata here
    so the LLM has everything it needs in a single field.
    """
    lines = [
        f"Publisher: {publisher.publisher_name} ({publisher.domain})",
        f"Property: {prop.property_name} ({prop.platform.value})",
        f"Placement: {slot.slot_name}",
        f"Format: {slot.ad_format.value}",
        f"Content Context: {slot.content_context}",
        f"Brand Safety: {slot.brand_safety_tier}",
        f"Category: {publisher.category}",
        f"Audience: {publisher.audience.total_mau:,} MAU",
        f"Gender Split: {publisher.audience.gender_split}",
        f"Age Distribution: {publisher.audience.age_distribution}",
        f"Geo Reach: {publisher.audience.geo_distribution}",
        f"City Tiers: {publisher.audience.tier_distribution}",
    ]

    # Inject content signals as structured context
    if publisher.content_signals:
        lines.append(f"Content Signals: {json.dumps(publisher.content_signals, default=str)}")

    return "\n".join(lines)


def slot_to_product(
    slot: InventorySlot,
    prop: PublisherProperty,
    publisher: PublisherConfig,
) -> dict[str, Any]:
    """
    Convert a single InventorySlot into an AdCP product dict.

    This is the atomic unit served by get_products. Each slot becomes
    one purchasable product with full metadata.
    """
    return {
        "product_id": slot.slot_id,
        "name": f"{publisher.publisher_name} — {slot.slot_name}",
        "description": _build_description(slot, prop, publisher),
        "publisher_properties": [
            {
                "publisher_domain": publisher.domain,
                "selection_type": "by_id",
                "property_ids": [prop.property_id],
            }
        ],
        "channels": _slot_channels(slot),
        "delivery_type": "guaranteed",
        "format_ids": [
            {
                "id": f"fmt-{slot.ad_format.value}",
                "agent_url": f"https://{publisher.domain}",
            }
        ],
        "pricing_options": [
            {
                "pricing_option_id": f"po-{slot.slot_id}",
                "pricing_model": "cpm",
                "currency": "INR",
                "floor_price": slot.floor_cpm,
            }
        ],
        "reporting_capabilities": {
            "supported_metrics": ["impressions", "clicks", "spend"],
            "available_metrics": ["impressions", "clicks", "spend"],
            "available_reporting_frequencies": ["daily"],
            "expected_delay_minutes": 60,
            "timezone": "Asia/Kolkata",
            "supports_webhooks": False,
            "date_range_support": "date_range",
        },
    }


def publisher_to_products(publisher: PublisherConfig) -> list[dict[str, Any]]:
    """
    Convert an entire PublisherConfig into a list of AdCP product dicts.

    This is called by the seller server's get_products handler.
    """
    products = []
    for prop in publisher.properties:
        for slot in prop.slots:
            products.append(slot_to_product(slot, prop, publisher))
    return products
