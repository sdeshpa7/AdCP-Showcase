"""
Budget management for buyer agents.

Tracks allocations, enforces spend limits, and provides
CPM-based value comparison utilities.
"""

from __future__ import annotations

from ..models import BuyerAgentState, Product


class BudgetManager:
    """
    Manages a buyer agent's budget through the campaign lifecycle.

    Handles allocation reservations when creating media buys and
    actual spend tracking from delivery reports.
    """

    def __init__(self, total_budget: float, max_single_buy_pct: float = 0.5):
        """
        Args:
            total_budget: Total campaign budget in INR.
            max_single_buy_pct: Max percentage of total budget for a single buy (0-1).
        """
        self.state = BuyerAgentState(total_budget=total_budget, remaining=total_budget)
        self.max_single_buy_pct = max_single_buy_pct

    @property
    def remaining(self) -> float:
        return self.state.remaining

    @property
    def max_single_buy(self) -> float:
        """Maximum amount allowed for a single media buy."""
        return min(
            self.state.total_budget * self.max_single_buy_pct,
            self.state.available_for_allocation,
        )

    def can_afford(self, amount: float) -> bool:
        """Check if the agent can allocate this amount."""
        return amount <= self.state.available_for_allocation

    def allocate(self, amount: float) -> bool:
        """
        Reserve budget for a media buy.

        Returns True if allocation succeeded, False if insufficient funds.
        """
        if amount <= 0:
            return False
        if amount > self.max_single_buy:
            return False
        return self.state.allocate(amount)

    def record_spend(self, amount: float) -> None:
        """Record actual spend from a delivery report."""
        self.state.limits.daily_spend_so_far += amount
        # Update remaining budget
        # (Simplified for this simulation)

    def compute_budget_for_product(
        self,
        product: Product,
        target_impressions: int = 100_000,
    ) -> float:
        """
        Compute a sensible budget allocation for a product based on its CPM.

        Args:
            product: The product to compute budget for.
            target_impressions: Desired number of impressions.

        Returns:
            Budget in USD, capped at max_single_buy.
        """
        cpm = product.best_price
        if cpm <= 0:
            return 0.0

        # Budget = (impressions / 1000) * CPM
        ideal_budget = (target_impressions / 1000) * cpm
        return min(ideal_budget, self.max_single_buy)

    def summary(self) -> dict[str, Any]:
        """Return a budget summary dict for display."""
        return {
            "total_budget": self.state.total_budget,
            "allocated": self.state.allocated,
            "remaining": self.state.remaining,
            "buys_created": self.state.buys_created,
            "token_usage": self.state.token_usage.model_dump(),
            "limits": self.state.limits.model_dump(),
        }
