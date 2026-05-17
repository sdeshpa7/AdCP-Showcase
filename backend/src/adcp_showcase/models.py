"""
Pydantic data models for the AdCP Buyer Agent workflow.

These models map to the AdCP v3 JSON schemas returned by seller agents,
plus buyer-side state (campaign briefs, budgets, agent personas).
All monetary values are in INR (Indian Rupees).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ── Metadata & Intelligence Models ──────────────────────────────────────────

class TokenUsage(BaseModel):
    """Tracks LLM token consumption for a campaign."""
    prompt_tokens: int = 0
    candidates_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_inr: float = 0.0


class AdLimits(BaseModel):
    """Daily caps and safety limits for an agent."""
    daily_budget_cap: float = 0.0
    daily_spend_so_far: float = 0.0
    max_daily_impressions: int = 0
    impressions_so_far: int = 0


class PerformanceMetrics(BaseModel):
    """Real-time performance metrics (CPM, CTR, etc.)"""
    target_impressions: int = 0
    impressions: int = 0
    clicks: int = 0
    avg_cpm: float = 0.0
    avg_ctr: float = 0.0
    ecpm: float = 0.0
    target_reach: int = 0
    reach: int = 0
    frequency: float = 0.0
    spend: float = 0.0
    roas: float = 0.0


# ── Campaign Brief (Buyer Input) ────────────────────────────────────────────

class CampaignBrief(BaseModel):
    """A buyer's advertising brief — the starting point for product discovery."""

    brand_domain: str = Field(description="Brand's domain, e.g. 'acmeoutdoor.com'")
    brief_text: str = Field(description="Natural-language media brief")
    total_budget: float = Field(gt=0, description="Total campaign budget in INR")
    start_time: str = Field(default="asap", description="Campaign start ISO-8601 or 'asap'")
    end_time: str = Field(description="Campaign end date ISO-8601")
    channels: list[str] = Field(
        default_factory=lambda: ["ctv", "olv", "display"],
        description="Preferred channels",
    )


# ── AdCP Product Models (from get_products response) ────────────────────────

class FormatId(BaseModel):
    agent_url: str
    id: str


class PricingOption(BaseModel):
    pricing_option_id: str
    pricing_model: str = "cpm"
    currency: str = "INR"
    fixed_price: float | None = None
    floor_price: float | None = None

    @property
    def effective_price(self) -> float:
        """Return the price to use for comparison."""
        return self.fixed_price or self.floor_price or 0.0


class Forecast(BaseModel):
    impressions: dict[str, int] | None = None  # {"min": ..., "max": ...}


class DeliveryMeasurement(BaseModel):
    provider: str | None = None
    notes: str | None = None


class Product(BaseModel):
    """A seller's ad product returned from get_products."""

    product_id: str
    name: str
    description: str | None = None
    channels: list[str] = Field(default_factory=list)
    pricing_options: list[PricingOption] = Field(default_factory=list)
    format_ids: list[FormatId] = Field(default_factory=list)
    delivery_type: str | None = None  # "guaranteed" | "non-guaranteed"
    forecast: Forecast | None = None
    delivery_measurement: DeliveryMeasurement | None = None
    publisher_properties: list[dict[str, Any]] | None = None
    source_url: str | None = None  # The seller agent URL this product belongs to

    @property
    def best_price(self) -> float:
        """Return the lowest effective CPM across all pricing options."""
        prices = [p.effective_price for p in self.pricing_options if p.effective_price > 0]
        return min(prices) if prices else 0.0

    @property
    def best_pricing_option_id(self) -> str | None:
        """Return the pricing option id with the best (lowest) price."""
        best = None
        best_price = float("inf")
        for p in self.pricing_options:
            if 0 < p.effective_price < best_price:
                best_price = p.effective_price
                best = p.pricing_option_id
        return best


class ProductDiscoveryResponse(BaseModel):
    """Parsed response from get_products."""

    products: list[Product] = Field(default_factory=list)
    sandbox: bool = False


# ── Media Buy Models (create_media_buy request/response) ─────────────────────

class PackageRequest(BaseModel):
    """A single package within a media buy order."""

    product_id: str
    budget: float
    pricing_option_id: str


class MediaBuyRequest(BaseModel):
    """Request payload for create_media_buy."""

    idempotency_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account: dict[str, Any] = Field(default_factory=lambda: {"account_id": "test_account"})
    brand: dict[str, str] = Field(description="{'domain': 'brand.com'}")
    start_time: str = "asap"
    end_time: str = ""
    packages: list[PackageRequest] = Field(default_factory=list)


class PackageResponse(BaseModel):
    package_id: str | None = None
    product_id: str
    budget: float
    pricing_option_id: str | None = None


class MediaBuyResponse(BaseModel):
    """Parsed response from create_media_buy."""

    media_buy_id: str
    status: str = ""  # "active", "pending_start", "submitted"
    revision: int = 1
    packages: list[PackageResponse] = Field(default_factory=list)
    valid_actions: list[str] = Field(default_factory=list)
    sandbox: bool = False
    source_url: str | None = None  # The seller agent URL this media buy belongs to


# ── Delivery Report Models (get_media_buy_delivery response) ─────────────────

class PackageDelivery(BaseModel):
    product_id: str | None = None
    package_id: str | None = None
    impressions: int = 0
    clicks: int = 0
    completion_rate: float | None = None
    spend: dict[str, Any] | None = None
    roas: float = 0.0


class DeliveryReport(BaseModel):
    """Parsed response from get_media_buy_delivery."""

    media_buy_id: str | None = None
    impressions: int = 0
    clicks: int = 0
    spend: dict[str, Any] | None = None
    roas: float = 0.0
    by_package: list[PackageDelivery] = Field(default_factory=list)


# ── Buyer-Side State ─────────────────────────────────────────────────────────

class BuyerAgentState(BaseModel):
    total_budget: float
    allocated: float = 0.0
    spent: float = 0.0
    remaining: float = 0.0
    buys_created: int = 0
    token_usage: TokenUsage = Field(default_factory=TokenUsage)
    performance: PerformanceMetrics = Field(default_factory=PerformanceMetrics)
    limits: AdLimits = Field(default_factory=AdLimits)
    events: list[dict[str, Any]] = Field(default_factory=list)

    @property
    def available_for_allocation(self) -> float:
        return self.total_budget - self.allocated

    def allocate(self, amount: float) -> bool:
        if amount > self.available_for_allocation:
            return False
        self.allocated += amount
        self.remaining = self.total_budget - self.allocated
        self.buys_created += 1
        return True

    def record_spend(self, amount: float) -> None:
        """Record actual spend from delivery reports."""
        self.spent += amount
        self.limits.daily_spend_so_far += amount


class ProductEvaluation(BaseModel):
    """LLM's evaluation of a product against campaign goals."""

    product_id: str
    product_name: str
    relevance_score: float = Field(ge=0, le=10, description="0-10 relevance score")
    reasoning: str = Field(description="Why this product is/isn't a good fit")
    recommended_budget: float = Field(
        ge=0, description="Suggested budget allocation for this product"
    )
    recommended: bool = Field(description="Should the buyer purchase this?")


# ── Buyer Agent Persona ──────────────────────────────────────────────────────

class BuyerPersona(BaseModel):
    """Configuration for a named buyer agent."""

    agent_id: str
    brand_name: str
    brand_domain: str
    brief_text: str
    total_budget: float
    channels: list[str] = Field(default_factory=lambda: ["ctv", "olv", "display"])
    start_time: str = "asap"
    end_time: str = "2026-06-30T23:59:59Z"
    strategy_notes: str = Field(
        default="",
        description="Additional strategy hints for the LLM (e.g. 'aggressive bidder')",
    )


# ── Simulation Event Log ─────────────────────────────────────────────────────

class EventType(str, Enum):
    DISCOVER = "product_discovery"
    EVALUATE = "product_evaluation"
    BUY = "media_buy_created"
    DELIVERY = "delivery_check"
    ERROR = "error"


class SimulationEvent(BaseModel):
    """A single event in the simulation log."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_id: str
    event_type: EventType
    details: dict[str, Any] = Field(default_factory=dict)
    success: bool = True
