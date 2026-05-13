"""
Core Buyer Agent — the main AI agent that discovers products, evaluates them
with LLM reasoning, makes budget-aware buy decisions, and executes media buys
against AdCP seller agents.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from google import genai

from ..mcp_client import MCPClient
from ..models import (
    BuyerPersona,
    CampaignBrief,
    DeliveryReport,
    EventType,
    MediaBuyRequest,
    MediaBuyResponse,
    PackageRequest,
    Product,
    ProductDiscoveryResponse,
    ProductEvaluation,
    SimulationEvent,
)
from .budget import BudgetManager
from .prompts import (
    BID_DECISION_PROMPT,
    CAMPAIGN_SUMMARY_PROMPT,
    EVALUATE_PRODUCTS_PROMPT,
    SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)


class BuyerAgent:
    """
    An AI-powered media buying agent that operates on the AdCP protocol.

    The agent follows this workflow:
    1. Discover products from seller agents (get_products)
    2. Evaluate products using LLM reasoning
    3. Select and allocate budget to best-fit products
    4. Execute media buys (create_media_buy)
    5. Monitor delivery (get_media_buy_delivery)
    """

    def __init__(
        self,
        persona: BuyerPersona,
        mcp_clients: list[MCPClient],
        llm_client: genai.Client,
        llm_model: str = "gemma-3-27b-it",
    ):
        self.persona = persona
        self.mcp_clients = mcp_clients
        self.llm = llm_client
        self.llm_model = llm_model
        self.budget = BudgetManager(
            total_budget=persona.total_budget,
            max_single_buy_pct=0.5,
        )
        self.event_log: list[SimulationEvent] = []
        self.media_buys: list[MediaBuyResponse] = []
        self.latest_delivery_reports: dict[str, DeliveryReport] = {}
        self._system_prompt = SYSTEM_PROMPT.format(
            brand_name=persona.brand_name,
            brief_text=persona.brief_text,
            total_budget=persona.total_budget,
            channels=", ".join(persona.channels),
            strategy_notes=persona.strategy_notes or "No specific strategy.",
        )

        # Initialize Daily Limits
        self.budget.state.limits.daily_budget_cap = persona.total_budget / 30.0
        self.budget.state.limits.max_daily_impressions = 500_000

    @property
    def agent_id(self) -> str:
        return self.persona.agent_id

    @property
    def brand_name(self) -> str:
        return self.persona.brand_name

    def _log_event(
        self,
        event_type: EventType,
        details: dict[str, Any],
        success: bool = True,
    ) -> SimulationEvent:
        """Record a simulation event."""
        event = SimulationEvent(
            agent_id=self.agent_id,
            event_type=event_type,
            details=details,
            success=success,
        )
        self.event_log.append(event)
        return event

    # ── Step 1: Product Discovery ────────────────────────────────────────

    def _update_token_usage(self, response: Any) -> None:
        """Update the agent's state with token usage from a response."""
        if hasattr(response, "usage_metadata"):
            meta = response.usage_metadata
            self.budget.state.token_usage.prompt_tokens += meta.prompt_token_count
            self.budget.state.token_usage.candidates_tokens += meta.candidates_token_count
            self.budget.state.token_usage.total_tokens += meta.total_token_count
            
            # Rough estimate: $0.15 per million tokens (Gemma-3-27b pricing approx)
            # Conversion 1 USD = 95 INR
            cost_usd = (meta.total_token_count / 1_000_000.0) * 0.15
            self.budget.state.token_usage.estimated_cost_inr += cost_usd * 95.0

    async def discover_products(self) -> list[Product]:
        """
        Call get_products on all seller agents with the campaign brief.

        Returns a list of typed Product objects aggregated from all sellers.
        """
        logger.info("[%s] Discovering products from %d sellers...", self.agent_id, len(self.mcp_clients))

        all_products = []
        for client in self.mcp_clients:
            try:
                raw = await client.call_tool("get_products", {
                    "brief": self.persona.brief_text,
                    "brand": {"domain": self.persona.brand_domain},
                })
                response = ProductDiscoveryResponse.model_validate(raw)
                # Tag each product with its source URL
                for p in response.products:
                    p.source_url = client.agent_url
                all_products.extend(response.products)
            except Exception as exc:
                logger.error("[%s] Discovery failed for %s: %s", self.agent_id, client.agent_url, exc)

        self._log_event(
            EventType.DISCOVER,
            {
                "sellers_queried": len(self.mcp_clients),
                "products_found": len(all_products),
                "product_ids": [p.product_id for p in all_products],
            },
        )

        logger.info(
            "[%s] Found %d products total",
            self.agent_id,
            len(all_products),
        )
        return all_products

    # ── Step 2: Product Evaluation (LLM) ─────────────────────────────────

    async def evaluate_products(
        self,
        products: list[Product],
    ) -> list[ProductEvaluation]:
        """
        Use the LLM to evaluate each product against campaign goals.

        Returns scored evaluations sorted by relevance (highest first).
        """
        logger.info("[%s] Evaluating %d products with LLM...", self.agent_id, len(products))

        products_data = []
        for p in products:
            products_data.append({
                "product_id": p.product_id,
                "name": p.name,
                "description": p.description,
                "channels": p.channels,
                "delivery_type": p.delivery_type,
                "best_cpm": p.best_price,
                "pricing_options": [
                    {"id": po.pricing_option_id, "model": po.pricing_model, "price": po.effective_price}
                    for po in p.pricing_options
                ],
            })

        prompt = EVALUATE_PRODUCTS_PROMPT.format(
            products_json=json.dumps(products_data, indent=2),
            remaining_budget=self.budget.remaining,
        )

        response = self.llm.models.generate_content(
            model=self.llm_model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=self._system_prompt,
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
        self._update_token_usage(response)

        evaluations = self._parse_evaluations(response.text, products)

        # Sort by relevance score descending
        evaluations.sort(key=lambda e: e.relevance_score, reverse=True)

        self._log_event(
            EventType.EVALUATE,
            {
                "evaluations": [
                    {
                        "product_id": e.product_id,
                        "score": e.relevance_score,
                        "recommended": e.recommended,
                        "budget": e.recommended_budget,
                    }
                    for e in evaluations
                ],
            },
        )

        return evaluations

    def _parse_evaluations(
        self,
        llm_response: str,
        products: list[Product],
    ) -> list[ProductEvaluation]:
        """Parse LLM evaluation response, with fallback for malformed JSON."""
        try:
            # Try to extract JSON from the response
            text = llm_response.strip()
            # Handle markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            data = json.loads(text)
            evals_data = data.get("evaluations", [])
            return [ProductEvaluation.model_validate(e) for e in evals_data]
        except (json.JSONDecodeError, KeyError, Exception) as exc:
            logger.warning(
                "[%s] Failed to parse LLM evaluation (%s), using fallback scoring",
                self.agent_id,
                exc,
            )
            # Fallback: score products by channel match and price
            return self._fallback_evaluations(products)

    def _fallback_evaluations(self, products: list[Product]) -> list[ProductEvaluation]:
        """Simple heuristic scoring when LLM parsing fails."""
        evaluations = []
        for p in products:
            # Score based on channel overlap
            channel_overlap = len(set(p.channels) & set(self.persona.channels))
            channel_score = min(channel_overlap * 3, 6)

            # Score based on price (lower is better)
            price_score = max(0, 4 - (p.best_price / 20))  # $0 CPM = 4pts, $80 CPM = 0pts

            score = round(channel_score + price_score, 1)
            recommended = score >= 5 and p.best_price > 0

            evaluations.append(ProductEvaluation(
                product_id=p.product_id,
                product_name=p.name,
                relevance_score=score,
                reasoning=f"Channel match: {channel_overlap}/{len(self.persona.channels)}. CPM: ${p.best_price:.2f}.",
                recommended_budget=self.budget.compute_budget_for_product(p) if recommended else 0,
                recommended=recommended,
            ))
        return evaluations

    # ── Step 3: Budget Allocation ────────────────────────────────────────

    async def allocate_budgets(
        self,
        evaluations: list[ProductEvaluation],
        products: list[Product],
    ) -> list[tuple[Product, float]]:
        """
        Decide final budget allocations for recommended products.

        Returns list of (product, budget) tuples.
        """
        recommended = [e for e in evaluations if e.recommended and e.recommended_budget > 0]

        if not recommended:
            logger.info("[%s] No products recommended for purchase", self.agent_id)
            return []

        # Build product lookup
        product_map = {p.product_id: p for p in products}

        allocations: list[tuple[Product, float]] = []
        for eval_ in recommended:
            product = product_map.get(eval_.product_id)
            if not product:
                continue

            # Cap budget at what we can afford
            budget = min(eval_.recommended_budget, self.budget.max_single_buy)
            if budget <= 0 or not self.budget.can_afford(budget):
                # Try a smaller allocation
                budget = min(self.budget.remaining * 0.4, eval_.recommended_budget)
                if budget < 100:  # Minimum $100 buy
                    continue

            allocations.append((product, round(budget, 2)))

        return allocations

    # ── Step 4: Execute Media Buys ───────────────────────────────────────

    async def execute_buys(
        self,
        allocations: list[tuple[Product, float]],
    ) -> list[MediaBuyResponse]:
        """
        Create media buys for allocated products.

        Each product gets its own media buy with an idempotency key.
        """
        buys: list[MediaBuyResponse] = []

        # Create client lookup map
        client_map = {c.agent_url: c for c in self.mcp_clients}

        for product, budget in allocations:
            if not self.budget.allocate(budget):
                logger.warning(
                    "[%s] Budget allocation failed for %s ($%.2f)",
                    self.agent_id,
                    product.product_id,
                    budget,
                )
                continue

            if not product.source_url:
                logger.error("[%s] No source_url for product %s, skipping", self.agent_id, product.product_id)
                continue
            
            client = client_map.get(product.source_url)
            if not client:
                logger.error("[%s] No client found for URL %s", self.agent_id, product.source_url)
                continue

            pricing_option_id = product.best_pricing_option_id
            if not pricing_option_id:
                logger.warning(
                    "[%s] No pricing option for %s, skipping",
                    self.agent_id,
                    product.product_id,
                )
                continue

            request = MediaBuyRequest(
                brand={"domain": self.persona.brand_domain},
                start_time=self.persona.start_time,
                end_time=self.persona.end_time,
                packages=[
                    PackageRequest(
                        product_id=product.product_id,
                        budget=budget,
                        pricing_option_id=pricing_option_id,
                    )
                ],
            )

            logger.info(
                "[%s] Creating media buy: %s @ $%.2f on %s",
                self.agent_id,
                product.product_id,
                budget,
                product.source_url,
            )

            try:
                raw = await client.call_tool(
                    "create_media_buy",
                    request.model_dump(mode="json"),
                )
                buy = MediaBuyResponse.model_validate(raw)
                buy.source_url = product.source_url # Tag the response
                buys.append(buy)
                self.media_buys.append(buy)

                self._log_event(
                    EventType.BUY,
                    {
                        "media_buy_id": buy.media_buy_id,
                        "product_id": product.product_id,
                        "budget": budget,
                        "status": buy.status,
                        "seller": product.source_url,
                    },
                )

                logger.info(
                    "[%s] ✓ Media buy created: %s (status: %s)",
                    self.agent_id,
                    buy.media_buy_id,
                    buy.status,
                )
            except Exception as exc:
                logger.error(
                    "[%s] ✗ Media buy failed for %s: %s",
                    self.agent_id,
                    product.product_id,
                    exc,
                )
                self._log_event(
                    EventType.ERROR,
                    {"product_id": product.product_id, "error": str(exc)},
                    success=False,
                )

        return buys

    # ── Step 5: Check Delivery ───────────────────────────────────────────

    async def check_delivery(self) -> list[DeliveryReport]:
        """Check delivery status for all media buys."""
        reports: list[DeliveryReport] = []
        client_map = {c.agent_url: c for c in self.mcp_clients}

        total_imps = 0
        total_clicks = 0
        total_spend = 0.0
        total_revenue = 0.0

        for buy in self.media_buys:
            if not buy.source_url:
                continue
            
            client = client_map.get(buy.source_url)
            if not client:
                continue

            try:
                raw = await client.call_tool("get_media_buy_delivery", {
                    "account": {"account_id": "test_account"},
                    "media_buy_ids": [buy.media_buy_id],
                })

                report = DeliveryReport.model_validate(raw)
                report.media_buy_id = buy.media_buy_id
                reports.append(report)
                self.latest_delivery_reports[buy.media_buy_id] = report

                # Update running performance metrics
                total_imps += report.impressions
                total_clicks += report.clicks
                spend_val = report.spend.get("amount", 0.0) if report.spend else 0.0
                total_spend += spend_val
                
                # Weighted ROAS calculation: Revenue = Spend * ROAS
                total_revenue += spend_val * report.roas

                self._log_event(
                    EventType.DELIVERY,
                    {
                        "media_buy_id": buy.media_buy_id,
                        "impressions": report.impressions,
                        "clicks": report.clicks,
                        "roas": report.roas,
                        "seller": buy.source_url,
                    },
                )
            except Exception as exc:
                logger.warning(
                    "[%s] Delivery check failed for %s: %s",
                    self.agent_id,
                    buy.media_buy_id,
                    exc,
                )

        # Update Master Performance Metrics
        p = self.budget.state.performance
        p.impressions = total_imps
        p.clicks = total_clicks
        p.spend = total_spend
        p.roas = total_revenue / total_spend if total_spend > 0 else 0.0
        
        # Average Bid CPM across active buys
        active_cpm_sum = sum(b.price.amount for b in self.media_buys if b.price)
        if len(self.media_buys) > 0:
            p.avg_cpm = active_cpm_sum / len(self.media_buys)
        
        # Effective CPM (eCPM) = (Spend / Impressions) * 1000
        if total_imps > 0:
            p.ecpm = (total_spend / total_imps) * 1000.0
            p.avg_ctr = (total_clicks / total_imps) * 100.0
            
            # Simulate Reach & Frequency
            # We'll simulate 1.2x - 1.8x frequency for this demo.
            simulated_frequency = 1.2 + (total_imps / 2_000_000)
            p.reach = int(total_imps / simulated_frequency)
            p.frequency = total_imps / p.reach if p.reach > 0 else 0.0
        
        # Update daily limits tracker
        self.budget.state.limits.impressions_so_far = total_imps
        self.budget.state.limits.daily_spend_so_far = total_spend

        return reports

    # ── Full Autonomous Run ──────────────────────────────────────────────

    async def run(self) -> dict[str, Any]:
        """
        Execute the full buyer workflow autonomously.

        Returns a summary dict with all results.
        """
        logger.info("=" * 60)
        logger.info("[%s] Starting campaign for %s", self.agent_id, self.brand_name)
        logger.info("=" * 60)

        # Step 1: Discover
        products = await self.discover_products()

        # Step 2: Evaluate
        evaluations = await self.evaluate_products(products)

        # Step 3: Allocate
        allocations = await self.allocate_budgets(evaluations, products)

        # Step 4: Execute
        buys = await self.execute_buys(allocations)

        # Step 5: Check delivery
        delivery_reports = await self.check_delivery()

        return {
            "agent_id": self.agent_id,
            "brand_name": self.brand_name,
            "products_found": len(products),
            "products_evaluated": len(evaluations),
            "products_recommended": len([e for e in evaluations if e.recommended]),
            "buys_created": len(buys),
            "media_buy_ids": [b.media_buy_id for b in buys],
            "budget_summary": self.budget.summary(),
            "delivery_reports": len(delivery_reports),
            "event_count": len(self.event_log),
        }

    # ── Campaign Summary (LLM) ──────────────────────────────────────────

    async def generate_summary(self) -> str:
        """Generate an executive summary of the campaign using the LLM."""
        prompt = CAMPAIGN_SUMMARY_PROMPT.format(
            brand_name=self.brand_name,
            events_json=json.dumps(
                [e.model_dump(mode="json") for e in self.event_log],
                indent=2,
                default=str,
            ),
            budget_summary=json.dumps(self.budget.summary(), indent=2),
            buys_json=json.dumps(
                [b.model_dump(mode="json") for b in self.media_buys],
                indent=2,
            ),
        )

        response = self.llm.models.generate_content(
            model=self.llm_model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=self._system_prompt,
                temperature=0.5,
                max_output_tokens=1024,
            ),
        )
        self._update_token_usage(response)
        return response.text
