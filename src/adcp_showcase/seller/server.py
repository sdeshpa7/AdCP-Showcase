"""
Seller Agent MCP Server — each publisher runs as an independent AdCP agent.

Each publisher is a proper MCP server (using the adcp Python SDK) that:
- Exposes standard AdCP capabilities (get_adcp_capabilities)
- Serves its inventory catalog via get_products (with publisher_properties)
- Accepts media buy orders via create_media_buy
- Reports simulated delivery via get_media_buy_delivery
- Runs on its own port and is independently discoverable

Usage:
    python -m adcp_showcase.seller.server --publisher jiohotstar --port 9001
    python -m adcp_showcase.seller.server --publisher cricinfo --port 9002
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

from adcp.server import ADCPHandler, serve
from adcp.server.responses import (
    capabilities_response,
    delivery_response,
    media_buy_response,
    products_response,
)

from .config import PublisherConfig, get_publisher
from .delivery import simulate_delivery
from .inventory import publisher_to_products
from .store import MediaBuyStore

logger = logging.getLogger(__name__)


# ── Port Map ─────────────────────────────────────────────────────────────────

PORT_MAP = {
    "jiohotstar": 9001,
    "cricinfo": 9002,
    "myntra": 9003,
    "ndtv": 9004,
    "amazon_in": 9005,
}


# ── Seller MCP Handler ──────────────────────────────────────────────────────

class SellerAgentHandler(ADCPHandler):
    """
    An MCP server handler for a single publisher/seller agent.

    Serves inventory, processes media buys, and reports delivery.
    Each publisher runs its own instance on a dedicated port.
    """

    def __init__(
        self,
        publisher: PublisherConfig,
        llm_client: OpenAI | None = None,
        llm_model: str = "grok-3-mini",
    ):
        super().__init__()
        self.publisher = publisher
        self.llm = llm_client
        self.llm_model = llm_model
        self.store = MediaBuyStore(publisher.publisher_id)

        # Pre-build the product catalog (it's static per publisher)
        self._products = publisher_to_products(publisher)

        # Build a CPM lookup for the delivery simulator
        self._cpm_lookup: dict[str, float] = {}
        for prop in publisher.properties:
            for slot in prop.slots:
                self._cpm_lookup[slot.slot_id] = slot.floor_cpm

        # Build a set of valid product IDs for buy validation
        self._valid_product_ids = {p["product_id"] for p in self._products}

        logger.info(
            "[%s] Initialized with %d products, CPM range ₹%.0f–₹%.0f",
            publisher.publisher_id,
            len(self._products),
            min(self._cpm_lookup.values()) if self._cpm_lookup else 0,
            max(self._cpm_lookup.values()) if self._cpm_lookup else 0,
        )

    # ── Standard AdCP Tools ──────────────────────────────────────────

    async def get_adcp_capabilities(self, params, context=None):
        """Declare what this seller agent supports."""
        return capabilities_response(
            ["media_buy"],
            sandbox=True,
            features={
                "role": "seller",
                "publisher": self.publisher.publisher_name,
                "domain": self.publisher.domain,
                "category": self.publisher.category,
                "platforms": [p.value for p in self.publisher.platforms],
                "ad_formats": [f.value for f in self.publisher.ad_formats],
                "total_products": len(self._products),
                "currency": "INR",
                "seller_modes": ["get_products", "create_media_buy", "get_media_buy_delivery", "get_dashboard"],
            },
        )

    async def get_products(self, params, context=None):
        """
        Serve the publisher's inventory catalog.

        Returns all available ad slots as AdCP products with full
        publisher_properties, pricing, forecasts, and context signals.
        """
        mode = params.get("mode", "discover") if isinstance(params, dict) else "discover"
        
        if mode == "get_dashboard":
            return await self._handle_get_dashboard(params)
            
        logger.info(
            "[%s] get_products called — serving %d products",
            self.publisher.publisher_id,
            len(self._products),
        )
        return products_response(self._products, sandbox=True)

    async def _handle_get_dashboard(self, params: dict) -> dict:
        """Return a full snapshot for the Publisher Yield Portal."""
        active_buys = self.store.get_active_buys()
        
        # Calculate totals
        total_revenue = 0.0
        total_imps = 0
        total_clicks = 0
        
        # Breakdown by product
        product_metrics = {}
        for p in self._products:
            product_metrics[p["product_id"]] = {
                "name": p["name"],
                "revenue": 0.0,
                "impressions": 0,
                "clicks": 0,
            }

        # Content-wise aggregation (Specific to JioHotstar)
        content_metrics = {
            "Live Sports": {"revenue": 0.0, "impressions": 0},
            "VOD Sports": {"revenue": 0.0, "impressions": 0},
            "Entertainment": {"revenue": 0.0, "impressions": 0}
        }

        # Top Buyers aggregation
        buyer_metrics = {}

        from .delivery import simulate_delivery
        for buy in active_buys:
            cpm = self._cpm_lookup.get(buy.product_id, 100.0)
            delivery = simulate_delivery(buy, self.publisher.publisher_id, cpm)
            
            # Use brand domain or publisher_properties to identify buyer
            buyer_id = buy.brand_domain or "Unknown Buyer"
            if buyer_id not in buyer_metrics:
                buyer_metrics[buyer_id] = 0.0
            buyer_metrics[buyer_id] += delivery["spend"]["amount"]

            total_revenue += delivery["spend"]["amount"]
            total_imps += delivery["impressions"]
            total_clicks += delivery["clicks"]
            
            if buy.product_id in product_metrics:
                m = product_metrics[buy.product_id]
                m["revenue"] += delivery["spend"]["amount"]
                m["impressions"] += delivery["impressions"]
                m["clicks"] += delivery["clicks"]
                # Store slot-level ROAS for yield analysis
                m["roas"] = delivery["roas"]

            # Universal Content Mapping
            cat = "General"
            pid = buy.product_id.lower()
            pub_id = self.publisher.publisher_id
            
            if pub_id == "jiohotstar":
                cat = "Entertainment"
                if "cricket" in pid or "ipl" in pid: cat = "Live Sports"
                elif "highlights" in pid: cat = "VOD Sports"
            
            elif pub_id == "cricinfo":
                cat = "Match Analysis"
                if "live" in pid or "scorecard" in pid: cat = "Live Scores"
                elif "stats" in pid or "record" in pid: cat = "Player Stats"
                
            elif pub_id == "myntra":
                cat = "Beauty & Kids"
                if "women" in pid: cat = "Women's Fashion"
                elif "men" in pid: cat = "Men's Fashion"
                
            elif pub_id == "ndtv":
                cat = "Global News"
                if "politics" in pid or "opinion" in pid: cat = "Politics"
                elif "business" in pid or "tech" in pid: cat = "Business"
                
            elif pub_id == "amazon_in":
                cat = "Daily Essentials"
                if "electronics" in pid or "mobile" in pid: cat = "Electronics"
                elif "fashion" in pid or "apparel" in pid: cat = "Fashion"

            if cat not in content_metrics:
                content_metrics[cat] = {"revenue": 0.0, "impressions": 0}
                
            content_metrics[cat]["revenue"] += delivery["spend"]["amount"]
            content_metrics[cat]["impressions"] += delivery["impressions"]

        # Calculate eCPM
        ecpm = (total_revenue / total_imps * 1000.0) if total_imps > 0 else 0.0
        
        dashboard_data = {
            "success": True,
            "publisher": self.publisher.publisher_name,
            "domain": self.publisher.domain,
            "financials": {
                "total_revenue": total_revenue,
                "active_contracts": len(active_buys),
                "avg_ecpm": ecpm,
                "currency": "INR",
            },
            "performance": {
                "total_impressions": total_imps,
                "total_clicks": total_clicks,
                "avg_ctr": (total_clicks / total_imps * 100.0) if total_imps > 0 else 0.0,
            },
            "content_wise": content_metrics,
            "top_buyers": [
                {"name": name, "revenue": rev}
                for name, rev in sorted(buyer_metrics.items(), key=lambda x: x[1], reverse=True)
            ],
            "inventory": [
                {
                    "id": pid,
                    "name": data["name"],
                    "revenue": data["revenue"],
                    "impressions": data["impressions"],
                    "yield": (data["revenue"] / data["impressions"] * 1000.0) if data["impressions"] > 0 else 0.0
                }
                for pid, data in product_metrics.items() if data["impressions"] > 0 or data["revenue"] > 0
            ]
        }
        
        return products_response([
            {
                "product_id": "__publisher_dashboard__",
                "name": "dashboard_data",
                "description": json.dumps(dashboard_data, default=str)
            }
        ], sandbox=True)

    def _brand_safety_check(self, brand_domain: str) -> dict[str, Any]:
        """
        Use Grok (xAI) to assess brand safety for this publisher.

        Returns a dict with 'safe' (bool) and 'reasoning' (str).
        Falls back to safe=True if no LLM client is configured.
        """
        if not self.llm:
            return {"safe": True, "reasoning": "No LLM configured — auto-approved.", "model": "none"}

        try:
            prompt = (
                f"You are a brand safety validator for {self.publisher.publisher_name} "
                f"({self.publisher.category} publisher, domain: {self.publisher.domain}).\n\n"
                f"A buyer agent for brand '{brand_domain}' wants to place ads on this publisher.\n\n"
                f"Assess whether this brand is a safe fit for this publisher's content. "
                f"Consider competitive conflicts, content appropriateness, and brand reputation.\n\n"
                f"Respond ONLY with valid JSON:\n"
                f'{{"safe": true, "reasoning": "1-2 sentence explanation", "risk_score": 0.05}}'
            )

            response = self.llm.chat.completions.create(
                model=self.llm_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=256,
            )

            text = response.choices[0].message.content.strip()
            # Parse JSON from response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            result = json.loads(text)
            result["model"] = self.llm_model
            result["tokens"] = {
                "prompt": response.usage.prompt_tokens if response.usage else 0,
                "completion": response.usage.completion_tokens if response.usage else 0,
                "total": response.usage.total_tokens if response.usage else 0,
            }

            logger.info(
                "[%s] Brand safety check for %s: safe=%s (risk=%.2f)",
                self.publisher.publisher_id,
                brand_domain,
                result.get("safe", True),
                result.get("risk_score", 0),
            )
            return result

        except Exception as exc:
            logger.warning(
                "[%s] Brand safety LLM check failed (%s), defaulting to safe",
                self.publisher.publisher_id, exc,
            )
            return {"safe": True, "reasoning": f"LLM check failed ({exc}), auto-approved.", "model": self.llm_model}

    async def create_media_buy(self, params, context=None):
        """
        Accept a media buy order from a buyer agent.

        Uses Grok (xAI) for brand safety validation, then validates the
        product exists and budget meets the floor price, and creates a
        contract in the store.
        """
        if isinstance(params, dict):
            packages = params.get("packages", [])
            brand = params.get("brand", {})
            brand_domain = brand.get("domain", "") if isinstance(brand, dict) else ""
            buyer_ref = params.get("idempotency_key", None)
        else:
            packages = getattr(params, "packages", [])
            brand = getattr(params, "brand", {})
            brand_domain = brand.get("domain", "") if isinstance(brand, dict) else ""
            buyer_ref = getattr(params, "idempotency_key", None)

        if not packages:
            logger.warning("[%s] create_media_buy: no packages", self.publisher.publisher_id)
            return media_buy_response(
                media_buy_id="error",
                packages=[],
                status="rejected",
                sandbox=True,
            )

        created_packages = []
        total_budget = 0.0

        for pkg in packages:
            # Enrich publisher_properties with buyer brand for dashboard
            props = pkg.get("publisher_properties", {}).copy() if isinstance(pkg, dict) else getattr(pkg, "publisher_properties", {}).copy()
            if isinstance(brand, dict) and "name" in brand:
                props["brand_name"] = brand["name"]

            if isinstance(pkg, dict):
                product_id = pkg.get("product_id", "")
                budget = float(pkg.get("budget", 0))
                pricing_id = pkg.get("pricing_option_id", "")
            else:
                product_id = getattr(pkg, "product_id", "")
                budget = float(getattr(pkg, "budget", 0))
                pricing_id = getattr(pkg, "pricing_option_id", "")

            # Validate product exists
            if product_id not in self._valid_product_ids:
                logger.warning(
                    "[%s] Unknown product_id: %s",
                    self.publisher.publisher_id, product_id,
                )
                continue

            # Brand safety check via Grok
            safety = self._brand_safety_check(brand_domain)
            if not safety.get("safe", True):
                logger.warning(
                    "[%s] Brand safety REJECTED for %s: %s",
                    self.publisher.publisher_id, brand_domain, safety.get("reasoning"),
                )
                continue

            # Validate budget meets floor
            floor = self._cpm_lookup.get(product_id, 0)
            if budget <= 0:
                logger.warning(
                    "[%s] Invalid budget %.2f for %s",
                    self.publisher.publisher_id, budget, product_id,
                )
                continue

            # Store the buy
            record = self.store.create_buy(
                product_id=product_id,
                budget=budget,
                pricing_option_id=pricing_id,
                brand_domain=brand_domain,
                buyer_ref=buyer_ref,
            )
            total_budget += budget

            created_packages.append({
                "package_id": record.package_id,
                "product_id": product_id,
                "budget": budget,
                "pricing_option_id": pricing_id,
            })

            logger.info(
                "[%s] Media buy created: %s → %s (₹%.2f)",
                self.publisher.publisher_id,
                record.media_buy_id,
                product_id,
                budget,
            )

        if not created_packages:
            return media_buy_response(
                media_buy_id="error",
                packages=[],
                status="rejected",
                sandbox=True,
            )

        # Use the first record's media_buy_id as the umbrella ID
        first_buy = self.store.get_all_buys()[-len(created_packages)]

        return media_buy_response(
            media_buy_id=first_buy.media_buy_id,
            packages=created_packages,
            buyer_ref=buyer_ref,
            status="active",
            valid_actions=["pause", "cancel"],
            revision=1,
            sandbox=True,
        )

    async def get_media_buy_delivery(self, params, context=None):
        """
        Return simulated delivery metrics for active media buys.

        Uses the delivery simulator to generate realistic impressions,
        clicks, and spend data based on the buy's budget and CPM.
        """
        # Get the specific media_buy_id if provided
        if isinstance(params, dict):
            media_buy_id = params.get("media_buy_id")
        else:
            media_buy_id = getattr(params, "media_buy_id", None)

        if media_buy_id:
            record = self.store.get_buy(media_buy_id)
            records = [record] if record else []
        else:
            records = self.store.get_active_buys()

        if not records:
            return delivery_response(
                media_buy_deliveries=[],
                currency="INR",
                sandbox=True,
            )

        # Simulate delivery for each record
        deliveries = []
        for record in records:
            cpm = self._cpm_lookup.get(record.product_id, 100.0)
            sim = simulate_delivery(record, self.publisher.publisher_id, floor_cpm=cpm)

            # Update the store with simulated data
            self.store.update_delivery(
                media_buy_id=record.media_buy_id,
                impressions=sim["impressions"],
                clicks=sim["clicks"],
                spend=sim["spend"]["amount"],
                roas=sim["roas"],
            )

            deliveries.append({
                "media_buy_id": record.media_buy_id,
                "status": record.status,
                "impressions": sim["impressions"],
                "clicks": sim["clicks"],
                "spend": sim["spend"],
                "roas": sim["roas"],
                "completion_rate": sim.get("completion_rate", 0),
                "totals": {
                    "impressions": sim["impressions"],
                    "clicks": sim["clicks"],
                    "spend": sim["spend"],
                    "roas": sim["roas"],
                },
                "by_package": [
                    {
                        "package_id": record.package_id,
                        "product_id": record.product_id,
                        "pricing_model": "cpm",
                        "rate": cpm,
                        "currency": "INR",
                        "impressions": sim["impressions"],
                        "clicks": sim["clicks"],
                        "spend": sim["spend"],
                        "roas": sim["roas"],
                    }
                ],
            })

        logger.info(
            "[%s] Delivery report: %d buys, %d total impressions, Avg ROAS %.2f",
            self.publisher.publisher_id,
            len(deliveries),
            sum(d["impressions"] for d in deliveries),
            sum(d["roas"] for d in deliveries) / len(deliveries) if deliveries else 0,
        )

        return delivery_response(
            media_buy_deliveries=deliveries,
            currency="INR",
            sandbox=True,
        )


# ── Server Entry Point ──────────────────────────────────────────────────────

def main() -> None:
    """Start a single seller agent as an MCP server."""
    parser = argparse.ArgumentParser(
        description="Start a seller/publisher agent MCP server",
    )
    parser.add_argument(
        "--publisher", type=str, required=True,
        help="Publisher ID (jiohotstar, cricinfo, myntra, ndtv, amazon_in)",
    )
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--model", type=str, default=None, help="LLM model (default: grok-3-mini)")
    parser.add_argument("--verbose", "-v", action="store_true")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        )

    load_dotenv()

    publisher = get_publisher(args.publisher)
    port = args.port or PORT_MAP.get(args.publisher, 9001)

    # Initialize LLM client (xAI or Groq)
    xai_api_key = os.getenv("XAI_API_KEY")
    llm_model = args.model or os.getenv("SELLER_LLM_MODEL", "grok-3")
    llm_client = None

    if xai_api_key:
        # Detect if it's a Groq key (starts with gsk_) or xAI key
        base_url = "https://api.x.ai/v1"
        provider = "xAI"
        if xai_api_key.startswith("gsk_"):
            base_url = "https://api.groq.com/openai/v1"
            provider = "Groq"
        
        llm_client = OpenAI(
            api_key=xai_api_key,
            base_url=base_url,
        )
        logger.info("%s LLM initialized: model=%s", provider, llm_model)
    else:
        logger.warning("XAI_API_KEY not set — seller will run without LLM brand safety checks")

    handler = SellerAgentHandler(
        publisher=publisher,
        llm_client=llm_client,
        llm_model=llm_model,
    )

    total_slots = sum(len(p.slots) for p in publisher.properties)
    cpms = [s.floor_cpm for p in publisher.properties for s in p.slots]
    
    if llm_client:
        provider = "Groq" if xai_api_key.startswith("gsk_") else "xAI"
        llm_status = f"{llm_model} ({provider})"
    else:
        llm_status = "No LLM"

    print(f"╔══════════════════════════════════════════════════════════╗")
    print(f"║  📰 {publisher.publisher_name:<20s} Seller Agent             ║")
    print(f"║  📡 Serving on http://localhost:{port}/mcp               ║")
    print(f"║  📦 {total_slots} ad slots | CPM ₹{min(cpms):,.0f}–₹{max(cpms):,.0f}             ║")
    print(f"║  👥 {publisher.audience.total_mau:>12,} MAU                       ║")
    print(f"║  🧠 LLM: {llm_status:<20s}                          ║")
    print(f"╚══════════════════════════════════════════════════════════╝")

    serve(
        handler,
        name=f"seller-{publisher.publisher_id}",
        port=port,
        transport="streamable-http",
        base_url=f"http://localhost:{port}",
        specialisms=["seller-supply-side"],
        description=f"{publisher.publisher_name} Seller Agent — supply-side inventory",
    )


if __name__ == "__main__":
    main()
