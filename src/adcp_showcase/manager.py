"""
Campaign Manager CLI — talks to a single buyer agent's MCP server.

Each campaign manager is an independent operator that controls only
its own buyer agent. In the real world, Flipkart's campaign manager
never touches Amazon's agent.

Usage:
    # Tell the Flipkart agent its campaign brief and budget
    python -m adcp_showcase.manager --agent-url http://localhost:8001/mcp \\
        --brief "Big Billion Days electronics sale" \\
        --budget 15000

    # Or use the agent name shorthand (assumes fixed ports)
    python -m adcp_showcase.manager --agent flipkart \\
        --brief "Big Billion Days electronics sale" \\
        --budget 15000

    # Just check status of an agent
    python -m adcp_showcase.manager --agent flipkart --status
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time

from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .mcp_client import MCPClient

console = Console()

# Must match the sentinel in buyer/server.py
AGENT_RESPONSE_ID = "__agent_response__"


def extract_agent_response(raw: dict) -> dict:
    """
    Extract the actual agent response from the products wrapper.

    The buyer server wraps custom payloads inside a virtual product
    with product_id='__agent_response__' and the JSON payload in
    the description field.
    """
    products = raw.get("products", [])
    for p in products:
        if isinstance(p, dict) and p.get("product_id") == AGENT_RESPONSE_ID:
            desc = p.get("description", "{}")
            try:
                return json.loads(desc)
            except json.JSONDecodeError:
                return {"raw": desc}
    # Fallback: return the raw response if no agent wrapper found
    return raw

# ── Port Map ─────────────────────────────────────────────────────────────────

PORT_MAP = {
    "flipkart": 8001,
    "amazon_india": 8002,
    "jio": 8003,
    "hindustan_unilever": 8004,
    "hdfc_bank": 8005,
}


def resolve_agent_url(agent: str | None, agent_url: str | None) -> str:
    """Resolve the agent MCP URL from --agent name or --agent-url."""
    if agent_url:
        return agent_url
    if agent and agent in PORT_MAP:
        return f"http://localhost:{PORT_MAP[agent]}/mcp"
    raise ValueError(
        f"Specify --agent-url or --agent (one of: {list(PORT_MAP.keys())})"
    )


# ── Display Helpers ──────────────────────────────────────────────────────────

def display_banner(agent_name: str, url: str) -> None:
    """Show the campaign manager banner."""
    banner = Text()
    banner.append("╔══════════════════════════════════════════════════════════╗\n", style="bold green")
    banner.append("║         ", style="bold green")
    banner.append("Campaign Manager Console", style="bold white")
    banner.append("                   ║\n", style="bold green")
    banner.append("║  ", style="bold green")
    banner.append(f"Agent: {agent_name:<20s}", style="cyan")
    banner.append("                              ║\n", style="bold green")
    banner.append("╚══════════════════════════════════════════════════════════╝", style="bold green")
    console.print(banner)
    console.print(f"  🔗 Connected to: [dim]{url}[/dim]\n")


def display_campaign_response(data: dict) -> None:
    """Display a set_campaign response."""
    if data.get("success"):
        campaign = data.get("campaign", {})
        table = Table(show_header=False, box=None, padding=(0, 2))
        table.add_column("Field", style="dim")
        table.add_column("Value")
        table.add_row("Agent", data.get("agent_id", "?"))
        table.add_row("Brand", data.get("brand", "?"))
        table.add_row("State", f"[green]{data.get('state', '?')}[/green]")
        table.add_row("Brief", campaign.get("brief", "?")[:60])
        table.add_row("Budget", f"${campaign.get('budget', 0):,.2f}")
        table.add_row("Channels", ", ".join(campaign.get("channels", [])))

        panel = Panel(table, title="✅ Campaign Configured", border_style="green")
        console.print(panel)
    else:
        console.print(f"[bold red]❌ Error:[/bold red] {data.get('error', 'Unknown error')}")


def display_run_response(data: dict) -> None:
    """Display a run_campaign response."""
    if data.get("success"):
        results = data.get("results", {})

        # Products table
        console.print("\n[bold]📦 Products Discovery[/bold]")
        console.print(f"  Found: {results.get('products_found', 0)} products")

        # Evaluations table
        evaluations = results.get("evaluations", [])
        if evaluations:
            table = Table(title="🧠 AI Evaluations", border_style="yellow")
            table.add_column("Product", style="cyan")
            table.add_column("Score", justify="center", width=7)
            table.add_column("Recommended", justify="center", width=12)
            table.add_column("Budget", style="green", justify="right")
            table.add_column("Reasoning", style="dim", max_width=40)

            for e in evaluations:
                score = e.get("score", 0)
                color = "green" if score >= 7 else "yellow" if score >= 4 else "red"
                rec = "✅" if e.get("recommended") else "❌"
                table.add_row(
                    str(e.get("product_id", "?"))[:25],
                    f"[{color}]{score:.1f}[/]",
                    rec,
                    f"${e.get('budget', 0):,.0f}" if e.get("recommended") else "—",
                    str(e.get("reasoning", ""))[:40],
                )
            console.print(table)

        # Media buys
        buys = results.get("media_buys", [])
        if buys:
            console.print(f"\n[bold]🚀 Media Buys Created: {len(buys)}[/bold]")
            for buy in buys:
                console.print(
                    f"  ✅ ID: [cyan]{buy.get('media_buy_id', '?')}[/cyan] │ "
                    f"Status: [yellow]{buy.get('status', '?')}[/yellow]"
                )

        # Budget summary
        budget = results.get("budget_summary", {})
        if budget:
            console.print(f"\n[bold]💰 Budget Status[/bold]")
            console.print(f"  Total: ${budget.get('total_budget', 0):,.2f}")
            console.print(f"  Allocated: ${budget.get('allocated', 0):,.2f}")
            console.print(f"  Remaining: ${budget.get('remaining', 0):,.2f}")

        # AI Summary
        summary = results.get("ai_summary")
        if summary:
            console.print()
            console.print(Panel(
                Markdown(summary),
                title="📝 AI Campaign Summary",
                border_style="blue",
            ))
    else:
        console.print(f"\n[bold red]❌ Campaign Failed:[/bold red] {data.get('error', 'Unknown error')}")
        partial = data.get("partial_results", {})
        if partial:
            console.print(f"  Partial results: {json.dumps(partial, indent=2, default=str)[:500]}")


def display_status(data: dict) -> None:
    """Display get_campaign_status response."""
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Field", style="dim")
    table.add_column("Value")
    table.add_row("Agent", data.get("agent_id", "?"))
    table.add_row("Brand", data.get("brand", "?"))

    state = data.get("state", "?")
    state_colors = {
        "idle": "dim", "configured": "yellow", "discovering": "cyan",
        "evaluating": "blue", "buying": "magenta", "monitoring": "cyan",
        "completed": "green", "error": "red",
    }
    color = state_colors.get(state, "white")
    table.add_row("State", f"[{color}]{state}[/{color}]")

    if data.get("error"):
        table.add_row("Error", f"[red]{data['error']}[/red]")

    campaign = data.get("campaign", {})
    if campaign:
        table.add_row("Brief", str(campaign.get("brief", ""))[:50])
        table.add_row("Budget", f"${campaign.get('budget', 0):,.2f}")

    budget_status = data.get("budget_status", {})
    if budget_status:
        table.add_row("Allocated", f"${budget_status.get('allocated', 0):,.2f}")
        table.add_row("Remaining", f"${budget_status.get('remaining', 0):,.2f}")
        table.add_row("Buys Created", str(int(budget_status.get("buys_created", 0))))

    table.add_row("Events", str(data.get("event_count", 0)))

    panel = Panel(table, title="📊 Agent Status", border_style="cyan")
    console.print(panel)


# ── Core Workflow ────────────────────────────────────────────────────────────

async def set_campaign(client: MCPClient, brief: str, budget: float, channels: list[str]) -> dict:
    """Send set_campaign to the buyer agent."""
    response = await client.call_tool("get_products", {
        "mode": "set_campaign",
        "brief": brief,
        "budget": budget,
        "channels": channels,
    })
    return extract_agent_response(response)


async def run_campaign(client: MCPClient) -> dict:
    """Send run_campaign to the buyer agent."""
    response = await client.call_tool("get_products", {
        "mode": "run_campaign",
    })
    return extract_agent_response(response)


async def get_status(client: MCPClient) -> dict:
    """Send get_campaign_status to the buyer agent."""
    response = await client.call_tool("get_products", {
        "mode": "get_status",
    })
    return extract_agent_response(response)


# ── Main ─────────────────────────────────────────────────────────────────────

async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Campaign Manager — control a single buyer agent",
    )
    parser.add_argument(
        "--agent",
        type=str,
        help="Agent name (flipkart, amazon_india, jio, hindustan_unilever, hdfc_bank)",
    )
    parser.add_argument(
        "--agent-url",
        type=str,
        help="Direct MCP URL of the buyer agent",
    )
    parser.add_argument(
        "--brief",
        type=str,
        help="Campaign brief text",
    )
    parser.add_argument(
        "--budget",
        type=float,
        help="Campaign budget in USD",
    )
    parser.add_argument(
        "--channels",
        nargs="+",
        default=["ctv", "olv", "display"],
        help="Ad channels to target",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Just check the agent's current status",
    )
    parser.add_argument(
        "--run-only",
        action="store_true",
        help="Only run the campaign (assumes already configured)",
    )

    args = parser.parse_args()
    load_dotenv()

    try:
        agent_url = resolve_agent_url(args.agent, args.agent_url)
    except ValueError as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        sys.exit(1)

    agent_name = args.agent or agent_url
    display_banner(agent_name, agent_url)

    # No auth needed for local agent communication
    client = MCPClient(agent_url=agent_url, auth_token="local")

    try:
        if args.status:
            # Just show status
            console.print("📊 Fetching agent status...\n")
            data = await get_status(client)
            display_status(data)

        elif args.run_only:
            # Run campaign without configuring
            console.print("🚀 Triggering campaign execution...\n")
            data = await run_campaign(client)
            display_run_response(data)

        elif args.brief:
            # Full workflow: set campaign + run
            budget = args.budget or 5000

            # Step 1: Configure
            console.print("[bold]Step 1:[/bold] Configuring campaign...\n")
            config_data = await set_campaign(
                client, args.brief, budget, args.channels,
            )
            display_campaign_response(config_data)

            if not config_data.get("success"):
                console.print("\n[red]Campaign configuration failed. Aborting.[/red]")
                return

            # Step 2: Run
            console.print("\n[bold]Step 2:[/bold] Executing campaign...\n")
            console.print("  ⏳ This may take a moment (LLM evaluation + AdCP calls)...\n")

            start = time.time()
            run_data = await run_campaign(client)
            elapsed = time.time() - start

            display_run_response(run_data)
            console.print(f"\n  ⏱️  Campaign completed in {elapsed:.1f}s")

        else:
            console.print(
                "[bold yellow]Usage:[/bold yellow] Specify --brief to configure and run, "
                "--status to check, or --run-only to trigger.\n"
            )
            console.print("Examples:")
            console.print(
                '  python -m adcp_showcase.manager --agent flipkart '
                '--brief "Big Billion Days sale" --budget 15000'
            )
            console.print("  python -m adcp_showcase.manager --agent flipkart --status")
            console.print("  python -m adcp_showcase.manager --agent flipkart --run-only")

    finally:
        await client.close()


def cli_entry() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    cli_entry()
