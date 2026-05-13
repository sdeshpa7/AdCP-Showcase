"""
AdCP Buying Agent CLI — Orchestrator entry point.

Supports two modes:
  --mode interactive  Step-by-step walkthrough with Rich display
  --mode autonomous   Fully autonomous run with summary at the end

Run a single agent:
  python -m adcp_showcase.cli --agent flipkart

Run all 5 agents competing:
  python -m adcp_showcase.cli --all

Run a custom brief:
  python -m adcp_showcase.cli --brief "Video ads for pet food" \\
      --brand premiumpetfoods.com --budget 5000
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys

from dotenv import load_dotenv
from google import genai
from rich.console import Console
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text
from rich.tree import Tree

from .buyer.agent import BuyerAgent
from .buyer.budget import BudgetManager
from .buyer.config import BUYER_PERSONAS, get_all_personas, get_persona
from .mcp_client import MCPClient
from .models import BuyerPersona, Product, ProductEvaluation

console = Console()

# ── Rich Display Helpers ─────────────────────────────────────────────────────


def display_banner() -> None:
    """Show the AdCP Showcase banner."""
    banner = Text()
    banner.append("╔══════════════════════════════════════════════════════════╗\n", style="bold cyan")
    banner.append("║           ", style="bold cyan")
    banner.append("AdCP Buying Agent Showcase", style="bold white")
    banner.append("                 ║\n", style="bold cyan")
    banner.append("║     ", style="bold cyan")
    banner.append("Multi-Agent Advertising Simulation", style="dim white")
    banner.append("              ║\n", style="bold cyan")
    banner.append("╚══════════════════════════════════════════════════════════╝", style="bold cyan")
    console.print(banner)
    console.print()


def display_persona(persona: BuyerPersona) -> None:
    """Display a buyer persona card."""
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column("Field", style="dim")
    table.add_column("Value")
    table.add_row("Brand", persona.brand_name)
    table.add_row("Domain", persona.brand_domain)
    table.add_row("Budget", f"${persona.total_budget:,.2f}")
    table.add_row("Channels", ", ".join(persona.channels))
    table.add_row("Strategy", persona.strategy_notes or "—")

    panel = Panel(
        table,
        title=f"🏢 {persona.brand_name} ({persona.agent_id})",
        border_style="blue",
        padding=(1, 2),
    )
    console.print(panel)


def display_products(products: list[Product]) -> None:
    """Display discovered products in a table."""
    table = Table(title="📦 Discovered Products", border_style="green")
    table.add_column("#", style="dim", width=3)
    table.add_column("Product ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Channels", style="yellow")
    table.add_column("Type", style="magenta")
    table.add_column("Best CPM", style="green", justify="right")

    for i, p in enumerate(products, 1):
        table.add_row(
            str(i),
            p.product_id,
            p.name[:40],
            ", ".join(p.channels),
            p.delivery_type or "—",
            f"${p.best_price:.2f}" if p.best_price > 0 else "—",
        )

    console.print(table)
    console.print()


def display_evaluations(evaluations: list[ProductEvaluation]) -> None:
    """Display LLM evaluations in a table."""
    table = Table(title="🧠 AI Evaluation Results", border_style="yellow")
    table.add_column("Product", style="cyan")
    table.add_column("Score", justify="center", width=7)
    table.add_column("Recommended", justify="center", width=12)
    table.add_column("Budget", style="green", justify="right")
    table.add_column("Reasoning", style="dim", max_width=45)

    for e in evaluations:
        score_color = "green" if e.relevance_score >= 7 else "yellow" if e.relevance_score >= 4 else "red"
        rec_icon = "✅" if e.recommended else "❌"
        table.add_row(
            e.product_name[:30],
            f"[{score_color}]{e.relevance_score:.1f}[/]",
            rec_icon,
            f"${e.recommended_budget:,.0f}" if e.recommended else "—",
            e.reasoning[:45] + "..." if len(e.reasoning) > 45 else e.reasoning,
        )

    console.print(table)
    console.print()


def display_buy_results(buys: list[dict], agent_id: str) -> None:
    """Display media buy results."""
    if not buys:
        console.print(f"  [{agent_id}] No media buys created.", style="dim")
        return

    for buy in buys:
        console.print(
            f"  ✅ [bold green]Buy Created[/] │ "
            f"ID: [cyan]{buy.get('media_buy_id', '?')}[/] │ "
            f"Status: [yellow]{buy.get('status', '?')}[/]"
        )


def display_budget_summary(summary: dict) -> None:
    """Display budget status."""
    table = Table(show_header=False, box=None, padding=(0, 1))
    table.add_column("Metric", style="dim")
    table.add_column("Value", justify="right")
    table.add_row("Total Budget", f"${summary['total_budget']:,.2f}")
    table.add_row("Allocated", f"${summary['allocated']:,.2f}")
    table.add_row("Remaining", f"${summary['remaining']:,.2f}")
    table.add_row("Buys Created", str(int(summary['buys_created'])))

    panel = Panel(table, title="💰 Budget Status", border_style="green", padding=(0, 2))
    console.print(panel)


def display_competition_results(results: list[dict]) -> None:
    """Display a competition summary table for all agents."""
    table = Table(
        title="🏆 Competition Results — All Buyer Agents",
        border_style="bold magenta",
    )
    table.add_column("Rank", style="bold", width=5, justify="center")
    table.add_column("Agent", style="cyan")
    table.add_column("Brand", style="white")
    table.add_column("Products Found", justify="center")
    table.add_column("Buys Made", justify="center")
    table.add_column("Budget Used", style="green", justify="right")
    table.add_column("Budget Remaining", style="yellow", justify="right")

    # Sort by buys created, then by budget utilized
    sorted_results = sorted(
        results,
        key=lambda r: (r.get("buys_created", 0), r.get("budget_summary", {}).get("allocated", 0)),
        reverse=True,
    )

    medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
    for i, r in enumerate(sorted_results):
        bs = r.get("budget_summary", {})
        table.add_row(
            medals[i] if i < len(medals) else str(i + 1),
            r["agent_id"],
            r["brand_name"],
            str(r.get("products_found", 0)),
            str(r.get("buys_created", 0)),
            f"${bs.get('allocated', 0):,.2f}",
            f"${bs.get('remaining', 0):,.2f}",
        )

    console.print()
    console.print(table)
    console.print()


# ── Core Workflow ────────────────────────────────────────────────────────────


async def run_agent_interactive(agent: BuyerAgent) -> dict:
    """Run a single agent in interactive mode with step-by-step display."""
    display_persona(agent.persona)

    # Step 1: Discover
    console.print("\n[bold]Step 1/5:[/] 🔍 Discovering products...\n")
    products = await agent.discover_products()
    display_products(products)

    # Step 2: Evaluate
    console.print("[bold]Step 2/5:[/] 🧠 Evaluating products with AI...\n")
    evaluations = await agent.evaluate_products(products)
    display_evaluations(evaluations)

    # Step 3: Allocate
    console.print("[bold]Step 3/5:[/] 💰 Allocating budgets...\n")
    allocations = await agent.allocate_budgets(evaluations, products)
    if allocations:
        for product, budget in allocations:
            console.print(
                f"  📌 [cyan]{product.product_id}[/] → ${budget:,.2f}"
            )
    else:
        console.print("  [dim]No products selected for purchase.[/dim]")
    console.print()

    # Step 4: Execute
    console.print("[bold]Step 4/5:[/] 🚀 Executing media buys...\n")
    buys = await agent.execute_buys(allocations)
    for buy in buys:
        console.print(
            f"  ✅ [bold green]Buy Created[/] │ "
            f"ID: [cyan]{buy.media_buy_id}[/] │ "
            f"Status: [yellow]{buy.status}[/]"
        )
    console.print()

    # Step 5: Check delivery
    console.print("[bold]Step 5/5:[/] 📊 Checking delivery...\n")
    reports = await agent.check_delivery()
    for report in reports:
        console.print(
            f"  📈 Buy [cyan]{report.media_buy_id}[/]: "
            f"{report.impressions:,} impressions, {report.clicks:,} clicks"
        )
    console.print()

    # Budget summary
    display_budget_summary(agent.budget.summary())

    # Generate AI summary
    console.print("\n[bold]📝 AI Campaign Summary:[/]\n")
    try:
        summary_text = await agent.generate_summary()
        console.print(Panel(
            Markdown(summary_text),
            border_style="blue",
            title=f"{agent.brand_name} — Campaign Report",
        ))
    except Exception as exc:
        console.print(f"  [dim]Summary generation failed: {exc}[/dim]")

    return agent.event_log[-1].details if agent.event_log else {}


async def run_agent_autonomous(agent: BuyerAgent) -> dict:
    """Run a single agent in autonomous mode (minimal output)."""
    console.print(f"  🤖 [cyan]{agent.brand_name}[/] starting...", end="")
    result = await agent.run()
    buys = result.get("buys_created", 0)
    budget = result.get("budget_summary", {})
    console.print(
        f" → {result['products_found']} products, "
        f"{buys} buys, "
        f"${budget.get('allocated', 0):,.0f} allocated"
    )
    return result


def create_agent(
    persona: BuyerPersona,
    mcp_client: MCPClient,
    llm_client: genai.Client,
    llm_model: str,
) -> BuyerAgent:
    """Factory to create a BuyerAgent."""
    return BuyerAgent(
        persona=persona,
        mcp_clients=[mcp_client],
        llm_client=llm_client,
        llm_model=llm_model,
    )


# ── Main ─────────────────────────────────────────────────────────────────────


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="AdCP Buying Agent — Multi-Agent Advertising Simulation",
    )
    parser.add_argument(
        "--agent",
        type=str,
        help="Run a single agent by ID (e.g. 'flipkart', 'jio')",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run all 5 buyer agents in competition mode",
    )
    parser.add_argument(
        "--mode",
        choices=["interactive", "autonomous"],
        default="interactive",
        help="interactive = step-by-step display, autonomous = quick run",
    )
    parser.add_argument(
        "--brief",
        type=str,
        help="Custom brief text (creates a one-off agent)",
    )
    parser.add_argument("--brand", type=str, default="testbrand.com")
    parser.add_argument("--budget", type=float, default=5000)
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="LLM model name (default: gemma-3-27b-it)",
    )
    parser.add_argument("--verbose", "-v", action="store_true")

    args = parser.parse_args()

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig(level=logging.WARNING)

    # Load environment
    load_dotenv()
    auth_token = os.getenv("ADCP_AUTH_TOKEN")
    agent_url = os.getenv("ADCP_TEST_AGENT_URL", "https://test-agent.adcontextprotocol.org/mcp")
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    llm_model = args.model or os.getenv("LLM_MODEL", "gemma-3-27b-it")

    if not auth_token:
        console.print("[bold red]Error:[/] ADCP_AUTH_TOKEN not set in .env")
        sys.exit(1)
    if not gemini_api_key:
        console.print("[bold red]Error:[/] GEMINI_API_KEY not set in .env")
        sys.exit(1)

    # Ensure the URL points to the sales MCP endpoint
    if "/sales/mcp" not in agent_url:
        agent_url = agent_url.replace("/mcp", "/sales/mcp")

    display_banner()

    # Create shared clients
    mcp_client = MCPClient(agent_url=agent_url, auth_token=auth_token)
    llm_client = genai.Client(api_key=gemini_api_key)

    try:
        if args.brief:
            # Custom one-off agent
            persona = BuyerPersona(
                agent_id="custom",
                brand_name=args.brand,
                brand_domain=args.brand,
                brief_text=args.brief,
                total_budget=args.budget,
            )
            agent = create_agent(persona, mcp_client, llm_client, llm_model)

            if args.mode == "interactive":
                await run_agent_interactive(agent)
            else:
                result = await run_agent_autonomous(agent)
                display_budget_summary(result.get("budget_summary", {}))

        elif args.all:
            # Competition mode — all 5 agents
            console.print(
                "[bold]🏁 Competition Mode[/] — 5 Buyer Agents competing\n",
                style="bold magenta",
            )

            personas = get_all_personas()
            for p in personas:
                display_persona(p)
                console.print()

            console.rule("[bold]Starting Simulation[/]")
            console.print()

            results = []
            for persona in personas:
                agent = create_agent(persona, mcp_client, llm_client, llm_model)
                if args.mode == "interactive":
                    console.rule(f"[bold cyan]{persona.brand_name}[/]")
                    await run_agent_interactive(agent)
                    results.append({
                        "agent_id": agent.agent_id,
                        "brand_name": agent.brand_name,
                        "products_found": len(agent.event_log),
                        "buys_created": len(agent.media_buys),
                        "budget_summary": agent.budget.summary(),
                    })
                else:
                    result = await run_agent_autonomous(agent)
                    results.append(result)

            display_competition_results(results)

        elif args.agent:
            # Single named agent
            persona = get_persona(args.agent)
            agent = create_agent(persona, mcp_client, llm_client, llm_model)

            if args.mode == "interactive":
                await run_agent_interactive(agent)
            else:
                result = await run_agent_autonomous(agent)
                display_budget_summary(result.get("budget_summary", {}))

        else:
            console.print(
                "[bold yellow]Usage:[/] Specify --agent <id>, --all, or --brief <text>\n"
            )
            console.print("[bold]Available agents:[/]")
            for p in BUYER_PERSONAS:
                console.print(f"  • [cyan]{p.agent_id}[/] — {p.brand_name}")
            console.print()
            console.print("Examples:")
            console.print("  python -m adcp_showcase.cli --agent flipkart")
            console.print("  python -m adcp_showcase.cli --all --mode autonomous")
            console.print("  python -m adcp_showcase.cli --brief 'Video ads for shoes' --budget 5000")

    finally:
        await mcp_client.close()


def cli_entry() -> None:
    """Synchronous entry point for the CLI."""
    asyncio.run(main())


if __name__ == "__main__":
    cli_entry()
