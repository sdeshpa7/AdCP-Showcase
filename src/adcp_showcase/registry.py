"""
Local Agent Registry — simulates the AdCP Registry API for local development.

In production AdCP, buyers discover seller agents via:
  1. /.well-known/adagents.json on each publisher domain
  2. The AgenticAdvertising.org Registry API:
     GET /api/registry/agents?capability=get_products&channel=ctv

For our local simulation, this module provides the same discovery interface
backed by the known set of local seller agents on ports 9001–9005.

Reference: https://docs.adcontextprotocol.org/docs/registry
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RegisteredAgent:
    """A seller agent entry in the local registry."""
    agent_id: str
    domain: str
    name: str
    agent_url: str
    capabilities: list[str]
    channels: list[str]


# ── Local Seller Agent Registry ─────────────────────────────────────────────
# Mirrors the structure returned by:
#   GET https://agenticadvertising.org/api/registry/agents
#
# Each entry declares the seller agent URL (MCP endpoint) and its capabilities.

LOCAL_SELLER_AGENTS: list[RegisteredAgent] = [
    RegisteredAgent(
        agent_id="jiohotstar",
        domain="jiohotstar.com",
        name="JioHotstar",
        agent_url="http://localhost:9001/mcp",
        capabilities=["get_products", "create_media_buy", "get_media_buy_delivery"],
        channels=["ctv", "olv", "display"],
    ),
    RegisteredAgent(
        agent_id="cricinfo",
        domain="espncricinfo.com",
        name="ESPNcricinfo",
        agent_url="http://localhost:9002/mcp",
        capabilities=["get_products", "create_media_buy", "get_media_buy_delivery"],
        channels=["display", "olv"],
    ),
    RegisteredAgent(
        agent_id="myntra",
        domain="myntra.com",
        name="Myntra",
        agent_url="http://localhost:9003/mcp",
        capabilities=["get_products", "create_media_buy", "get_media_buy_delivery"],
        channels=["display"],
    ),
    RegisteredAgent(
        agent_id="ndtv",
        domain="ndtv.com",
        name="NDTV",
        agent_url="http://localhost:9004/mcp",
        capabilities=["get_products", "create_media_buy", "get_media_buy_delivery"],
        channels=["display", "olv"],
    ),
    RegisteredAgent(
        agent_id="amazon_in",
        domain="amazon.in",
        name="Amazon.in",
        agent_url="http://localhost:9005/mcp",
        capabilities=["get_products", "create_media_buy", "get_media_buy_delivery"],
        channels=["ctv", "olv", "display"],
    ),
]


def get_seller_urls(capability: str = "get_products") -> list[str]:
    """Return all seller agent URLs that support a given capability.

    Mirrors: GET /api/registry/agents?capability=get_products
    """
    return [
        agent.agent_url
        for agent in LOCAL_SELLER_AGENTS
        if capability in agent.capabilities
    ]


def get_seller_agents(
    capability: str | None = None,
    channel: str | None = None,
) -> list[RegisteredAgent]:
    """Query the local registry with optional filters.

    Mirrors: GET /api/registry/agents?capability=...&channel=...
    """
    results = LOCAL_SELLER_AGENTS
    if capability:
        results = [a for a in results if capability in a.capabilities]
    if channel:
        results = [a for a in results if channel in a.channels]
    return results
