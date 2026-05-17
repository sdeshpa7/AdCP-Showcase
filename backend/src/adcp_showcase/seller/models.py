"""
Pydantic models for the Publisher/Seller side of the AdCP ecosystem.

These models define inventory structure, audience demographics, ad formats,
and context signals that the Seller Agent serves to Buyer Agents.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────────────

class Platform(str, Enum):
    """Inventory delivery platform."""
    MOBILE_APP = "mobile_app"
    CTV = "ctv"
    WEBSITE = "website"


class AdFormat(str, Enum):
    """Available ad creative formats."""
    BILLBOARD = "billboard"          # Large static/animated display unit
    VIDEO_PREROLL = "video_preroll"  # Pre-content video ad (6-30s)
    VIDEO_MIDROLL = "video_midroll"  # Mid-content video ad (15-30s)
    DISPLAY = "display"             # Standard display banner (300x250, 728x90, etc.)


class AgeGroup(str, Enum):
    """Age segmentation buckets."""
    AGE_18_24 = "18-24"
    AGE_25_34 = "25-34"
    AGE_35_44 = "35-44"
    AGE_45_54 = "45-54"
    AGE_55_PLUS = "55+"


class GeoRegion(str, Enum):
    """Geographic regions of India for ad targeting."""
    NORTH = "north"      # Delhi, UP, Punjab, Haryana, Rajasthan, etc.
    SOUTH = "south"      # Karnataka, Tamil Nadu, Kerala, AP, Telangana
    EAST = "east"        # West Bengal, Odisha, Bihar, Jharkhand, NE states
    WEST = "west"        # Maharashtra, Gujarat, Goa
    CENTRAL = "central"  # MP, Chhattisgarh


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class CityTier(str, Enum):
    METRO = "metro"     # Mumbai, Delhi, Bangalore, etc.
    TIER_1 = "tier_1"   # Pune, Jaipur, Lucknow, etc.
    TIER_2 = "tier_2"   # Nagpur, Indore, Vadodara, etc.
    TIER_3 = "tier_3"   # Smaller towns and rural-adjacent


# ── Audience Demographics ────────────────────────────────────────────────────

class AudienceSegment(BaseModel):
    """
    A demographic slice of a publisher's audience.

    Each segment represents a percentage share of the total audience
    for a specific (age, gender, region, tier) combination.
    """
    age_group: AgeGroup
    gender: Gender
    region: GeoRegion
    city_tier: CityTier
    share_pct: float = Field(
        ge=0, le=100,
        description="Percentage of total audience in this segment",
    )


class AudienceProfile(BaseModel):
    """Aggregate audience profile for a publisher."""
    total_mau: int = Field(description="Monthly Active Users (millions modeled as int)")
    gender_split: dict[str, float] = Field(
        description="{'male': 0.65, 'female': 0.35}",
    )
    age_distribution: dict[str, float] = Field(
        description="{'18-24': 0.28, '25-34': 0.36, ...}",
    )
    geo_distribution: dict[str, float] = Field(
        description="{'north': 0.30, 'south': 0.25, ...}",
    )
    tier_distribution: dict[str, float] = Field(
        description="{'metro': 0.35, 'tier_1': 0.25, ...}",
    )


# ── Inventory Slot ───────────────────────────────────────────────────────────

class InventorySlot(BaseModel):
    """
    A specific ad placement within a publisher property.

    Example: "JioHotstar CTV – Video Midroll during Live Cricket"
    """
    slot_id: str = Field(description="Unique slot identifier")
    slot_name: str = Field(description="Human-readable slot name")
    platform: Platform
    ad_format: AdFormat
    floor_cpm: float = Field(
        ge=0,
        description="Floor CPM in INR — minimum price to win this slot",
    )
    est_daily_impressions: int = Field(
        ge=0,
        description="Estimated daily available impressions",
    )
    content_context: str = Field(
        default="",
        description="What kind of content this slot appears in (e.g. 'live cricket')",
    )
    brand_safety_tier: str = Field(
        default="standard",
        description="Brand safety level: 'premium', 'standard', or 'open'",
    )


# ── Publisher Property ───────────────────────────────────────────────────────

class PublisherProperty(BaseModel):
    """
    A single publisher property (e.g., 'JioHotstar Mobile App').

    Maps to the AdCP `publisher_properties` array in a product response.
    A publisher can have multiple properties (e.g., mobile, web, CTV).
    """
    property_id: str
    property_name: str
    platform: Platform
    inventory_share_pct: float = Field(
        ge=0, le=100,
        description="What percentage of the publisher's total inventory is on this platform",
    )
    slots: list[InventorySlot] = Field(default_factory=list)


# ── Publisher Configuration ──────────────────────────────────────────────────

class PublisherConfig(BaseModel):
    """
    Full configuration for a single publisher.

    This is the seller-side equivalent of BuyerPersona — it defines
    everything about a publisher's inventory, audience, and ad capabilities.
    """
    publisher_id: str = Field(description="Unique publisher identifier")
    publisher_name: str = Field(description="Display name (e.g., 'JioHotstar')")
    domain: str = Field(description="Publisher's primary domain")
    category: str = Field(
        description="Content category: 'streaming', 'sports', 'fashion', 'news', 'e-commerce'",
    )
    description: str = Field(description="Brief description of the publisher")

    # Platform availability
    platforms: list[Platform] = Field(description="Available platforms")
    ad_formats: list[AdFormat] = Field(description="Supported ad formats")

    # Properties (per-platform inventory)
    properties: list[PublisherProperty] = Field(default_factory=list)

    # Audience
    audience: AudienceProfile

    # Context signals (sent to buyers for LLM evaluation)
    content_signals: dict[str, Any] = Field(
        default_factory=dict,
        description="Contextual signals for buyer LLM evaluation (genre, topics, etc.)",
    )
