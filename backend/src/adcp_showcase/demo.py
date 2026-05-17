"""
Demo Launcher — spins up all 5 buyer agents and runs them for presentation.

This is an OBSERVER, not a controller. It starts each agent as a subprocess
and then monitors their progress from the outside.

Usage:
    # Start all 5 agents and run their campaigns
    python -m adcp_showcase.demo

    # Start specific agents only
    python -m adcp_showcase.demo --agents flipkart jio hdfc_bank
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time

from dotenv import load_dotenv
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .buyer.config import BUYER_PERSONAS, get_all_personas
from .mcp_client import MCPClient

console = Console()

AGENT_RESPONSE_ID = "__agent_response__"


def extract_agent_response(raw: dict) -> dict:
    """Extract actual payload from the products wrapper."""
    products = raw.get("products", [])
    for p in products:
        if isinstance(p, dict) and p.get("product_id") == AGENT_RESPONSE_ID:
            try:
                return json.loads(p.get("description", "{}"))
            except json.JSONDecodeError:
                return {"raw": p.get("description", "")}
    return raw

PORT_MAP = {
    "flipkart": 8001,
    "amazon_india": 8002,
    "jio": 8003,
    "hindustan_unilever": 8004,
    "hdfc_bank": 8005,
}


def display_banner() -> None:
    """Show the demo banner."""
    banner = Text()
    banner.append("╔══════════════════════════════════════════════════════════╗\n", style="bold magenta")
    banner.append("║        ", style="bold magenta")
    banner.append("AdCP Multi-Agent Competition Demo", style="bold white")
    banner.append("           ║\n", style="bold magenta")
    banner.append("║     ", style="bold magenta")
    banner.append("5 Buyer Agents × 1 Seller × Real AdCP", style="dim white")
    banner.append("           ║\n", style="bold magenta")
    banner.append("╚══════════════════════════════════════════════════════════╝", style="bold magenta")
    console.print(banner)
    console.print()


async def wait_for_agent(agent_id: str, port: int, timeout: float = 60.0) -> bool:
    """Wait until an agent server is responding."""
    url = f"http://127.0.0.1:{port}/mcp"
    client = MCPClient(agent_url=url, auth_token="local")
    start = time.time()

    while time.time() - start < timeout:
        try:
            result = await client.call_tool("get_products", {"mode": "get_status"})
            await client.close()
            return True
        except Exception:
            await asyncio.sleep(0.5)

    await client.close()
    return False


async def configure_and_run_agent(agent_id: str, port: int, persona) -> dict:
    """Send set_campaign + run_campaign to a buyer agent."""
    url = f"http://127.0.0.1:{port}/mcp"
    client = MCPClient(agent_url=url, auth_token="local")

    try:
        # Step 1: Configure
        await client.call_tool("get_products", {
            "mode": "set_campaign",
            "brief": persona.brief_text,
            "budget": persona.total_budget,
            "channels": persona.channels,
        })

        # Step 2: Run
        raw = await client.call_tool("get_products", {
            "mode": "run_campaign",
        })

        return extract_agent_response(raw)
    except Exception as exc:
        return {"success": False, "error": str(exc), "agent_id": agent_id}
    finally:
        await client.close()


def build_scoreboard(results: list[dict]) -> Table:
    """Build the competition scoreboard table."""
    table = Table(
        title="🏆 Competition Scoreboard",
        border_style="bold magenta",
    )
    table.add_column("Rank", style="bold", width=5, justify="center")
    table.add_column("Brand", style="cyan")
    table.add_column("Products", justify="center")
    table.add_column("Buys", justify="center")
    table.add_column("Budget Used", style="green", justify="right")
    table.add_column("Remaining", style="yellow", justify="right")
    table.add_column("Status", justify="center")

    # Sort by buys then budget used
    sorted_results = sorted(
        results,
        key=lambda r: (
            r.get("results", {}).get("buys_created", 0),
            r.get("results", {}).get("budget_summary", {}).get("allocated", 0),
        ),
        reverse=True,
    )

    medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]
    for i, r in enumerate(sorted_results):
        res = r.get("results", {})
        bs = res.get("budget_summary", {})
        status = "✅" if r.get("success") else "❌"

        table.add_row(
            medals[i] if i < len(medals) else str(i + 1),
            r.get("brand", r.get("agent_id", "?")),
            str(res.get("products_found", 0)),
            str(res.get("buys_created", 0)),
            f"${bs.get('allocated', 0):,.2f}",
            f"${bs.get('remaining', 0):,.2f}",
            status,
        )

    return table


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="AdCP Demo — Multi-Agent Competition Launcher",
    )
    parser.add_argument(
        "--agents",
        nargs="+",
        default=None,
        help="Specific agent IDs to run (default: all 5)",
    )
    parser.add_argument("--verbose", "-v", action="store_true")

    args = parser.parse_args()
    load_dotenv()

    # Check prerequisites
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    xai_key = os.getenv("XAI_API_KEY")
    adcp_token = os.getenv("ADCP_AUTH_TOKEN")

    if not gemini_key:
        console.print("[bold red]Error:[/bold red] GEMINI_API_KEY not set in .env")
        sys.exit(1)
    if not xai_key:
        console.print("[bold yellow]Warning:[/bold yellow] XAI_API_KEY not set — seller agents will run without Grok LLM")
    if not adcp_token:
        console.print("[bold red]Error:[/bold red] ADCP_AUTH_TOKEN not set in .env")
        sys.exit(1)

    display_banner()

    # Determine which agents to run
    personas = get_all_personas()
    if args.agents:
        personas = [p for p in personas if p.agent_id in args.agents]

    if not personas:
        console.print("[bold red]Error:[/bold red] No valid agents specified.")
        sys.exit(1)

    # Show the lineup
    console.print("[bold]📋 Agent Lineup:[/bold]\n")
    for p in personas:
        port = PORT_MAP[p.agent_id]
        console.print(
            f"  🏢 [cyan]{p.brand_name:<25s}[/cyan] "
            f"port={port}  budget=${p.total_budget:>10,.2f}"
        )
    console.print()

    python_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        ".venv", "bin", "python",
    )
    # Fallback if venv path doesn't exist
    if not os.path.exists(python_path):
        python_path = sys.executable

    # Step 0: Determine paths
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    src_dir = os.path.join(root_dir, "src")
    
    env = os.environ.copy()
    env["PYTHONPATH"] = src_dir + (os.pathsep + env["PYTHONPATH"] if "PYTHONPATH" in env else "")

    # Step 0.1: Ensure Database is seeded
    db_path = os.path.join(root_dir, "src", "adcp_showcase", "adcp.db")
    if not os.path.exists(db_path):
        console.print("[bold yellow]Database not found. Seeding historical transactions...[/bold yellow]")
        subprocess.run([python_path, "-m", "adcp_showcase.scripts.seed_database"], check=True, env=env)
    
    # Step 1: Start Database API Server (Port 8010)
    console.rule("[bold]Starting Database API (History Store)[/bold]")
    api_cmd = [
        python_path, "-m", "adcp_showcase.database_api"
    ]
    api_proc = subprocess.Popen(
        api_cmd,
        cwd=root_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )
    console.print("  📡 Database API started on :8010 [green]started[/green]")

    # Step 1.1: Start all Seller agents (Publishers)
    console.rule("[bold]Starting Seller Agents (Publishers)[/bold]")
    seller_processes: list[subprocess.Popen] = []
    
    publishers = ["jiohotstar", "cricinfo", "myntra", "ndtv", "amazon_in"]
    for i, pub in enumerate(publishers):
        port = 9001 + i
        cmd = [
            python_path, "-m", "adcp_showcase.seller.server",
            "--publisher", pub,
            "--port", str(port),
        ]
        console.print(f"  📡 Starting {pub:<12s} on :{port}...", end="")
        proc = subprocess.Popen(
            cmd,
            cwd=root_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=env,
        )
        seller_processes.append(proc)
        console.print(" [green]started[/green]")

    # Step 2: Start all Buyer agents (Advertisers)
    console.rule("[bold]Starting Buyer Agents (Advertisers)[/bold]")
    processes: list[subprocess.Popen] = []

    for p in personas:
        port = PORT_MAP[p.agent_id]
        cmd = [
            python_path, "-m", "adcp_showcase.buyer.server",
            "--agent", p.agent_id,
            "--port", str(port),
        ]
        if args.verbose:
            cmd.append("-v")

        console.print(f"  🚀 Starting {p.brand_name:<12s} on :{port}...", end="")

        proc = subprocess.Popen(
            cmd,
            cwd=root_dir,
            stdout=subprocess.DEVNULL if not args.verbose else None,
            stderr=subprocess.DEVNULL if not args.verbose else None,
            env=env,
        )
        processes.append(proc)
        console.print(" [green]started[/green]")

    # Combine all processes for cleanup
    all_processes = [api_proc] + seller_processes + processes

    # Step 2: Wait for all servers to be ready
    console.print("\n  ⏳ Waiting for servers to initialize...\n")
    await asyncio.sleep(3)

    ready_agents = []
    for p in personas:
        port = PORT_MAP[p.agent_id]
        ok = await wait_for_agent(p.agent_id, port)
        if ok:
            console.print(f"  ✅ {p.brand_name} ready on :{port}")
            ready_agents.append(p)
        else:
            console.print(f"  ❌ {p.brand_name} failed to start on :{port}")

    if not ready_agents:
        console.print("\n[bold red]No agents started. Aborting.[/bold red]")
        for proc in processes:
            proc.terminate()
        sys.exit(1)

    # Step 3: Run campaigns concurrently
    console.print()
    console.rule("[bold]Running Campaigns[/bold]")
    console.print("  ⏳ Each agent is independently discovering, evaluating, and buying...\n")

    start_time = time.time()

    tasks = [
        configure_and_run_agent(p.agent_id, PORT_MAP[p.agent_id], p)
        for p in ready_agents
    ]
    results = await asyncio.gather(*tasks)

    elapsed = time.time() - start_time
    console.print(f"\n  ⏱️  All campaigns completed in {elapsed:.1f}s\n")

    # Step 4: Show results
    console.rule("[bold]Results[/bold]")
    console.print()

    # Individual summaries
    for result in results:
        agent_id = result.get("agent_id", "?")
        brand = result.get("brand", agent_id)
        success = result.get("success", False)

        if success:
            res = result.get("results", {})
            summary = res.get("ai_summary", "No summary available")

            console.print(Panel(
                summary[:500] if isinstance(summary, str) else str(summary)[:500],
                title=f"📝 {brand}",
                border_style="blue",
            ))
        else:
            console.print(Panel(
                f"Error: {result.get('error', 'Unknown')}",
                title=f"❌ {brand}",
                border_style="red",
            ))

    # Scoreboard
    console.print()
    scoreboard = build_scoreboard(results)
    console.print(scoreboard)

    # Step 5: Cleanup
    console.print("\n  🛑 Stopping agent servers...")
    for proc in all_processes:
        proc.terminate()
    for proc in all_processes:
        proc.wait(timeout=5)
    console.print("  ✅ All servers stopped.\n")


def cli_entry() -> None:
    asyncio.run(main())


if __name__ == "__main__":
    cli_entry()
