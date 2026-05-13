"""
Media Buy Store — in-memory transaction ledger for seller agents.

Tracks all media buy contracts created by buyer agents. Each seller
maintains its own independent store (no cross-publisher state).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class MediaBuyRecord(BaseModel):
    """A single media buy contract stored by the seller."""

    media_buy_id: str = Field(default_factory=lambda: f"mb-{uuid.uuid4().hex[:12]}")
    buyer_ref: str | None = None
    brand_domain: str = ""
    product_id: str = ""
    package_id: str = Field(default_factory=lambda: f"pkg-{uuid.uuid4().hex[:8]}")
    budget: float = 0.0
    pricing_option_id: str = ""
    status: str = "active"
    revision: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Delivery tracking (updated by the simulator)
    impressions_delivered: int = 0
    clicks_delivered: int = 0
    spend_delivered: float = 0.0
    roas_delivered: float = 0.0


class MediaBuyStore:
    """
    In-memory store for media buy contracts.

    One store per seller agent — no shared state between publishers.
    """

    def __init__(self, publisher_id: str):
        self.publisher_id = publisher_id
        self._buys: dict[str, MediaBuyRecord] = {}

    def create_buy(
        self,
        product_id: str,
        budget: float,
        pricing_option_id: str,
        brand_domain: str = "",
        buyer_ref: str | None = None,
    ) -> MediaBuyRecord:
        """
        Create a new media buy contract.

        Returns the created MediaBuyRecord with a unique media_buy_id.
        """
        record = MediaBuyRecord(
            buyer_ref=buyer_ref,
            brand_domain=brand_domain,
            product_id=product_id,
            budget=budget,
            pricing_option_id=pricing_option_id,
        )
        self._buys[record.media_buy_id] = record
        return record

    def get_buy(self, media_buy_id: str) -> MediaBuyRecord | None:
        """Retrieve a specific media buy by ID."""
        return self._buys.get(media_buy_id)

    def get_all_buys(self) -> list[MediaBuyRecord]:
        """Return all media buys for this publisher."""
        return list(self._buys.values())

    def get_active_buys(self) -> list[MediaBuyRecord]:
        """Return only active media buys."""
        return [b for b in self._buys.values() if b.status == "active"]

    def update_delivery(
        self,
        media_buy_id: str,
        impressions: int,
        clicks: int,
        spend: float,
        roas: float = 0.0,
    ) -> bool:
        """Update delivery metrics for a media buy. Returns False if not found."""
        record = self._buys.get(media_buy_id)
        if not record:
            return False
        record.impressions_delivered = impressions
        record.clicks_delivered = clicks
        record.spend_delivered = spend
        record.roas_delivered = roas
        return True

    @property
    def total_revenue(self) -> float:
        """Total revenue from all buys."""
        return sum(b.budget for b in self._buys.values())

    @property
    def buy_count(self) -> int:
        return len(self._buys)
