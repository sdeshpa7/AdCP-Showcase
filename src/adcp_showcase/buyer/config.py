"""
Buyer agent configurations — 5 agents named after top digital advertising
spenders in India, each with distinct campaign briefs and strategies.

All budgets in INR (Indian Rupees).
"""

from __future__ import annotations

from ..models import BuyerPersona

# ── Top 5 Digital Advertising Spenders in India ──────────────────────────────
#
# Each agent has a unique brand identity, campaign brief, budget, and
# strategic personality that influences its LLM-driven decisions.

BUYER_PERSONAS: list[BuyerPersona] = [
    BuyerPersona(
        agent_id="flipkart",
        brand_name="Flipkart",
        brand_domain="flipkart.com",
        brief_text=(
            "Drive app installs and sales for the upcoming Big Billion Days sale. "
            "Target 18-35 mobile-first shoppers across India. Focus on video and "
            "display ads showcasing electronics and fashion deals."
        ),
        total_budget=1_250_000,  # ₹12.5 lakh
        channels=["ctv", "olv", "display"],
        strategy_notes=(
            "Aggressive bidder. Prioritize high-reach guaranteed inventory. "
            "Willing to pay premium CPMs for brand-safe sports and entertainment content."
        ),
    ),
    BuyerPersona(
        agent_id="amazon_india",
        brand_name="Amazon India",
        brand_domain="amazon.in",
        brief_text=(
            "Promote Amazon Prime Video originals and Prime membership benefits. "
            "Target 25-45 affluent urban audiences. Premium video placements on "
            "news and lifestyle publishers."
        ),
        total_budget=1_000_000,  # ₹10 lakh
        channels=["ctv", "olv"],
        strategy_notes=(
            "Data-driven optimizer. Focus on CTV for premium reach. "
            "Conservative on pricing — avoid overpaying. Prefer guaranteed deals."
        ),
    ),
    BuyerPersona(
        agent_id="jio",
        brand_name="Jio (Reliance)",
        brand_domain="jio.com",
        brief_text=(
            "Launch campaign for JioAirFiber and 5G services. Target 20-40 "
            "tech-savvy consumers in Tier 1 and Tier 2 cities. Mix of video "
            "and display across news, tech, and sports publishers."
        ),
        total_budget=1_500_000,  # ₹15 lakh
        channels=["ctv", "olv", "display"],
        strategy_notes=(
            "Largest budget — aims for maximum reach and frequency. "
            "Will bid aggressively on sports inventory. Diversify across "
            "multiple products for broad coverage."
        ),
    ),
    BuyerPersona(
        agent_id="hindustan_unilever",
        brand_name="Hindustan Unilever",
        brand_domain="hul.co.in",
        brief_text=(
            "Brand awareness campaign for Dove and Surf Excel across digital video. "
            "Target 25-50 household decision-makers. Family-friendly content on "
            "entertainment and lifestyle channels."
        ),
        total_budget=850_000,  # ₹8.5 lakh
        channels=["ctv", "olv"],
        strategy_notes=(
            "Brand safety is paramount. Only guaranteed, premium inventory. "
            "Moderate budgets — spread across multiple products for diversification. "
            "Avoid non-guaranteed / auction-based inventory."
        ),
    ),
    BuyerPersona(
        agent_id="hdfc_bank",
        brand_name="HDFC Bank",
        brand_domain="hdfcbank.com",
        brief_text=(
            "Promote HDFC Bank credit cards and personal loans. Target 28-50 "
            "professionals and high-net-worth individuals. Premium placements "
            "on financial news and business content."
        ),
        total_budget=700_000,  # ₹7 lakh
        channels=["ctv", "olv", "display"],
        strategy_notes=(
            "Conservative, value-focused buyer. Prioritize lowest CPM products "
            "with good audience match. Strict budget discipline — never exceed "
            "allocation limits. Prefer news publisher inventory."
        ),
    ),
]


def get_persona(agent_id: str) -> BuyerPersona:
    """Look up a buyer persona by agent_id."""
    for p in BUYER_PERSONAS:
        if p.agent_id == agent_id:
            return p
    raise ValueError(f"Unknown agent_id: {agent_id}. Available: {[p.agent_id for p in BUYER_PERSONAS]}")


def get_all_personas() -> list[BuyerPersona]:
    """Return all buyer personas."""
    return BUYER_PERSONAS.copy()
