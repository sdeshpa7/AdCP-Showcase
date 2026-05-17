"""
Buyer Agent MCP Server — each buyer runs as an independent AdCP agent.

Each buyer agent is a proper MCP server (using the adcp Python SDK) that:
- Exposes standard AdCP capabilities (get_adcp_capabilities)
- Exposes buyer-specific actions via get_products mode multiplexer
- Internally calls the seller's MCP tools (get_products, create_media_buy)
- Runs on its own port and is independently discoverable

The campaign manager sends commands through the get_products tool using a
"mode" parameter. Custom response data is wrapped inside a virtual product
with product_id="__agent_response__" so it conforms to the AdCP schema.

Usage:
    python -m adcp_showcase.buyer.server --agent flipkart --port 8001
    python -m adcp_showcase.buyer.server --agent amazon_india --port 8002
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from enum import Enum
from typing import Any

from dotenv import load_dotenv
from google import genai

from adcp.server import ADCPHandler, serve
from adcp.server.responses import capabilities_response, products_response

from ..mcp_client import MCPClient
from ..models import (
    BuyerPersona,
    CampaignBrief,
)
from ..registry import get_seller_urls
from .agent import BuyerAgent
from .config import get_persona

logger = logging.getLogger(__name__)

# Sentinel product_id used to distinguish agent responses from real products
AGENT_RESPONSE_ID = "__agent_response__"


def _wrap_as_product(payload: dict) -> dict:
    """
    Wrap a custom response payload inside a product-shaped dict.

    The adcp SDK enforces that get_products returns a list of products.
    We use a sentinel product_id so the campaign manager can distinguish
    agent control responses from real products.
    """
    return products_response(
        [
            {
                "product_id": AGENT_RESPONSE_ID,
                "name": payload.get("state", "agent_response"),
                "description": json.dumps(payload, default=str),
            }
        ],
        sandbox=True,
    )


# ── Campaign State ───────────────────────────────────────────────────────────

class CampaignState(str, Enum):
    IDLE = "idle"
    CONFIGURED = "configured"
    DISCOVERING = "discovering"
    EVALUATING = "evaluating"
    BUYING = "buying"
    MONITORING = "monitoring"
    COMPLETED = "completed"
    ERROR = "error"


# ── Buyer MCP Handler ────────────────────────────────────────────────────────

class BuyerAgentHandler(ADCPHandler):
    """
    An MCP server handler for a single buyer agent.

    Exposes standard AdCP capabilities plus buyer-specific campaign
    management tools via the get_products interface with mode routing.
    """

    def __init__(
        self,
        persona: BuyerPersona,
        seller_urls: list[str],
        auth_token: str,
        llm_client: genai.Client,
        llm_model: str = "gemma-3-27b-it",
    ):
        super().__init__()
        self.persona = persona
        self.seller_urls = seller_urls
        self.auth_token = auth_token
        self.llm_client = llm_client
        self.llm_model = llm_model

        # Campaign state
        self.state = CampaignState.IDLE
        self.campaign_brief: CampaignBrief | None = None
        self.agent: BuyerAgent | None = None
        self.results: dict[str, Any] = {}
        self.error_message: str | None = None

    # ── Standard AdCP Tools ──────────────────────────────────────────

    async def get_adcp_capabilities(self, params, context=None):
        """Declare what this buyer agent supports."""
        return capabilities_response(
            ["media_buy"],
            sandbox=True,
            features={
                "role": "buyer",
                "brand": self.persona.brand_name,
                "brand_domain": self.persona.brand_domain,
                "buyer_modes": [
                    "set_campaign",
                    "run_campaign",
                    "get_status",
                    "get_dashboard",
                    "discover",
                ],
            },
        )

    # ── get_products (mode multiplexer) ──────────────────────────────

    async def get_products(self, params, context=None):
        """
        Multiplexed entry point for all buyer agent operations.

        Modes:
            set_campaign  — configure the agent with a brief and budget
            run_campaign  — execute the full buying workflow
            get_status    — return current campaign state
            discover      — forward product discovery to the seller (default)
        """
        mode = params.get("mode", "discover") if isinstance(params, dict) else "discover"

        if mode == "set_campaign":
            return await self._handle_set_campaign(params)
        elif mode == "run_campaign":
            return await self._handle_run_campaign(params)
        elif mode == "get_status":
            return await self._handle_get_status(params)
        elif mode == "get_dashboard":
            return await self._handle_get_dashboard(params)
        else:
            return await self._handle_product_discovery(params)

    async def _handle_set_campaign(self, params: dict) -> dict:
        """Configure the buyer agent with a campaign brief."""
        if self.state not in (CampaignState.IDLE, CampaignState.COMPLETED, CampaignState.ERROR):
            return _wrap_as_product({
                "success": False,
                "error": f"Cannot set campaign while in state: {self.state.value}",
                "current_state": self.state.value,
            })

        brief_text = params.get("brief", self.persona.brief_text)
        budget = params.get("budget", self.persona.total_budget)
        channels = params.get("channels", self.persona.channels)
        start_time = params.get("start_time", self.persona.start_time)
        end_time = params.get("end_time", self.persona.end_time)

        self.campaign_brief = CampaignBrief(
            brand_domain=self.persona.brand_domain,
            brief_text=brief_text,
            total_budget=float(budget),
            start_time=start_time,
            end_time=end_time,
            channels=channels,
        )

        # Update persona with the campaign manager's overrides
        self.persona = self.persona.model_copy(update={
            "brief_text": brief_text,
            "total_budget": float(budget),
            "channels": channels,
            "start_time": start_time,
            "end_time": end_time,
        })

        # Create MCP clients for all seller agents (per AdCP multi-agent pattern)
        mcp_clients = [
            MCPClient(agent_url=url, auth_token=self.auth_token)
            for url in self.seller_urls
        ]
        self.agent = BuyerAgent(
            persona=self.persona,
            mcp_clients=mcp_clients,
            llm_client=self.llm_client,
            llm_model=self.llm_model,
        )

        self.state = CampaignState.CONFIGURED
        self.results = {}
        self.error_message = None

        logger.info(
            "[%s] Campaign configured: budget=%.2f, channels=%s",
            self.persona.agent_id, budget, channels,
        )

        return _wrap_as_product({
            "success": True,
            "agent_id": self.persona.agent_id,
            "brand": self.persona.brand_name,
            "state": self.state.value,
            "campaign": {
                "brief": brief_text,
                "budget": float(budget),
                "channels": channels,
                "start_time": start_time,
                "end_time": end_time,
            },
        })

    async def _handle_run_campaign(self, params: dict) -> dict:
        """Execute the full buyer campaign workflow."""
        if self.state != CampaignState.CONFIGURED:
            return _wrap_as_product({
                "success": False,
                "error": f"Cannot run campaign in state: {self.state.value}. "
                         f"Call set_campaign first.",
            })

        if not self.agent:
            return _wrap_as_product({
                "success": False,
                "error": "No agent configured. Call set_campaign first.",
            })

        logger.info("[%s] Starting campaign execution...", self.persona.agent_id)

        try:
            # Step 1: Discover products from the seller agent
            self.state = CampaignState.DISCOVERING
            products = await self.agent.discover_products()
            self.results["products_found"] = len(products)
            self.results["product_ids"] = [p.product_id for p in products]

            # Step 2: Evaluate products with LLM
            self.state = CampaignState.EVALUATING
            evaluations = await self.agent.evaluate_products(products)
            recommended = [e for e in evaluations if e.recommended]
            self.results["products_evaluated"] = len(evaluations)
            self.results["products_recommended"] = len(recommended)
            self.results["evaluations"] = [
                {
                    "product_id": e.product_id,
                    "score": e.relevance_score,
                    "recommended": e.recommended,
                    "reasoning": e.reasoning,
                    "budget": e.recommended_budget,
                }
                for e in evaluations
            ]

            # Step 3: Allocate budget and execute media buys
            self.state = CampaignState.BUYING
            allocations = await self.agent.allocate_budgets(evaluations, products)
            buys = await self.agent.execute_buys(allocations)
            self.results["buys_created"] = len(buys)
            self.results["media_buys"] = [
                {"media_buy_id": b.media_buy_id, "status": b.status}
                for b in buys
            ]

            # Step 4: Check delivery
            self.state = CampaignState.MONITORING
            reports = await self.agent.check_delivery()
            self.results["delivery_reports"] = len(reports)

            # Step 5: Generate AI summary
            try:
                summary = await self.agent.generate_summary()
                self.results["ai_summary"] = summary
            except Exception as exc:
                self.results["ai_summary"] = f"Summary generation failed: {exc}"

            self.results["budget_summary"] = self.agent.budget.summary()
            self.state = CampaignState.COMPLETED

            logger.info(
                "[%s] Campaign completed: %d buys, $%.2f allocated",
                self.persona.agent_id, len(buys), self.agent.budget.state.allocated,
            )

            return _wrap_as_product({
                "success": True,
                "agent_id": self.persona.agent_id,
                "brand": self.persona.brand_name,
                "state": self.state.value,
                "results": self.results,
            })

        except Exception as exc:
            self.state = CampaignState.ERROR
            self.error_message = str(exc)
            logger.error("[%s] Campaign failed: %s", self.persona.agent_id, exc)

            return _wrap_as_product({
                "success": False,
                "agent_id": self.persona.agent_id,
                "brand": self.persona.brand_name,
                "state": self.state.value,
                "error": str(exc),
                "partial_results": self.results,
            })

    async def _handle_get_status(self, params: dict) -> dict:
        """Return the current campaign status."""
        response = {
            "agent_id": self.persona.agent_id,
            "brand": self.persona.brand_name,
            "state": self.state.value,
            "results": self.results,
        }
        if self.campaign_brief:
            response["campaign"] = {
                "brief": self.campaign_brief.brief_text,
                "budget": self.campaign_brief.total_budget,
                "channels": self.campaign_brief.channels,
            }
        if self.error_message:
            response["error"] = self.error_message
        if self.agent:
            response["budget_status"] = self.agent.budget.summary()
            response["event_count"] = len(self.event_log)

        return _wrap_as_product(response)

    async def _handle_get_dashboard(self, params: dict) -> dict:
        """Return a full snapshot for the Advertiser Portal dashboard."""
        if not self.agent:
            return _wrap_as_product({
                "success": False,
                "error": "Agent not initialized",
                "brand": self.persona.brand_name,
                "state": self.state.value,
            })

        # Get latest delivery metrics
        await self.agent.check_delivery()

        state = self.agent.budget.state
        dashboard_data = {
            "success": True,
            "brand": self.persona.brand_name,
            "domain": self.persona.brand_domain,
            "state": self.state.value,
            "pacing": {
                "budget_used_pct": (state.spent / state.total_budget * 100) if state.total_budget > 0 else 0,
                "is_overpacing": (state.spent / state.total_budget) > 0.8 # Simple logic for demo
            },
            "financials": {
                "total_budget": state.total_budget,
                "spent": state.spent,
                "allocated": state.allocated,
                "remaining": state.remaining,
                "currency": "INR",
            },
            "performance": {
                "target_impressions": state.limits.max_daily_impressions * 30,
                "target_reach": int(state.limits.max_daily_impressions * 30 * 0.7),
                "impressions": state.performance.impressions,
                "reach": state.performance.reach or int(state.performance.impressions * 0.65),
                "clicks": state.performance.clicks,
                "ctr": (state.performance.clicks / state.performance.impressions * 100) if state.performance.impressions > 0 else 0,
                "avg_cpm": state.performance.avg_cpm,
                "ecpm": state.performance.ecpm,
                "roas": (state.performance.clicks * 0.05 * 2500) / state.spent if state.spent > 0 else 0,
                "frequency": state.performance.frequency,
            },
            "intelligence": {
                "total_tokens": state.token_usage.total_tokens,
                "estimated_cost_inr": state.token_usage.estimated_cost_inr,
                "latest_reasoning": self.agent.event_log[-1].details.get("reasoning", "Analyzing market...") if self.agent.event_log else "Initializing...",
            },
            "publisher_mix": self._get_publisher_mix(),
            "active_buys": [
                {
                    "id": b.media_buy_id,
                    "status": b.status,
                    "publisher": b.source_url,
                    "budget": sum(pkg.budget for pkg in b.packages) if b.packages else 0,
                    "performance": {
                        "impressions": self.agent.latest_delivery_reports[b.media_buy_id].impressions,
                        "clicks": self.agent.latest_delivery_reports[b.media_buy_id].clicks,
                        "spend": self.agent.latest_delivery_reports[b.media_buy_id].spend.amount,
                        "ecpm": (self.agent.latest_delivery_reports[b.media_buy_id].spend.amount / self.agent.latest_delivery_reports[b.media_buy_id].impressions * 1000) if self.agent.latest_delivery_reports[b.media_buy_id].impressions > 0 else 0
                    } if b.media_buy_id in self.agent.latest_delivery_reports else {
                        "impressions": 0, "clicks": 0, "spend": 0, "ecpm": 0
                    }
                }
                for b in self.agent.media_buys
            ],
            "history": [
                {"type": e.event_type.value, "time": e.timestamp.isoformat(), "success": e.success}
                for e in self.agent.event_log[-10:]
            ]
        }
        
        return _wrap_as_product(dashboard_data)

    def _get_publisher_mix(self) -> dict[str, float]:
        """Calculate the percentage of spend per publisher."""
        if not self.agent or not self.agent.media_buys:
            return {}
        mix = {}
        total = sum(b.price.amount for b in self.agent.media_buys if b.price)
        if total == 0: return {}
        
        for b in self.agent.media_buys:
            if not b.source_url or not b.price: continue
            name = b.source_url.split(':')[-1].split('/')[0]
            mix[name] = mix.get(name, 0.0) + (b.price.amount / total * 100)
        return mix

    async def _handle_product_discovery(self, params: dict) -> dict:
        """Forward a product discovery request to the seller agent."""
        if not self.agent:
            mcp_clients = [
                MCPClient(agent_url=url, auth_token=self.auth_token)
                for url in self.seller_urls
            ]
            temp_agent = BuyerAgent(
                persona=self.persona,
                mcp_clients=mcp_clients,
                llm_client=self.llm_client,
                llm_model=self.llm_model,
            )
            products = await temp_agent.discover_products()
            for client in mcp_clients:
                await client.close()
        else:
            products = await self.agent.discover_products()

        # Return real products in the standard format
        product_dicts = [
            {
                "product_id": p.product_id,
                "name": p.name,
                "description": p.description or "",
                "channels": p.channels,
            }
            for p in products
        ]
        return products_response(product_dicts, sandbox=True)


# ── Server Entry Point ──────────────────────────────────────────────────────

PORT_MAP = {
    "flipkart": 8001,
    "amazon_india": 8002,
    "jio": 8003,
    "hindustan_unilever": 8004,
    "hdfc_bank": 8005,
}


def main() -> None:
    """Start a single buyer agent as an MCP server."""
    parser = argparse.ArgumentParser(
        description="Start a buyer agent MCP server",
    )
    parser.add_argument(
        "--agent", type=str, required=True,
        help="Buyer agent ID (flipkart, amazon_india, jio, hindustan_unilever, hdfc_bank)",
    )
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--model", type=str, default=None)
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

    persona = get_persona(args.agent)
    auth_token = os.getenv("ADCP_AUTH_TOKEN", "local-dev-token")
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    llm_model = args.model or os.getenv("LLM_MODEL", "gemma-3-27b-it")

    if not gemini_api_key:
        print("Error: GEMINI_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    # Discover all seller agents from the local registry
    # (In production AdCP, this would query agenticadvertising.org/api/registry/agents)
    seller_urls = get_seller_urls(capability="get_products")
    logger.info("Discovered %d seller agents from registry", len(seller_urls))

    port = args.port or PORT_MAP.get(args.agent, 8001)
    llm_client = genai.Client(api_key=gemini_api_key)

    handler = BuyerAgentHandler(
        persona=persona,
        seller_urls=seller_urls,
        auth_token=auth_token,
        llm_client=llm_client,
        llm_model=llm_model,
    )

    print(f"╔══════════════════════════════════════════════════════════╗")
    print(f"║  🏢 {persona.brand_name:<20s} Buyer Agent                  ║")
    print(f"║  📡 Serving on http://localhost:{port}/mcp               ║")
    print(f"║  💰 Default budget: ₹{persona.total_budget:>10,.0f}                  ║")
    print(f"║  🔗 Connected to {len(seller_urls)} seller agents                    ║")
    print(f"║  🎯 State: IDLE (waiting for campaign manager)          ║")
    print(f"╚══════════════════════════════════════════════════════════╝")

    serve(
        handler,
        name=f"buyer-{persona.agent_id}",
        port=port,
        transport="streamable-http",
        base_url=f"http://localhost:{port}",
        specialisms=["buyer-demand-side"],
        description=f"{persona.brand_name} Buyer Agent — demand-side media buying",
    )


if __name__ == "__main__":
    main()
