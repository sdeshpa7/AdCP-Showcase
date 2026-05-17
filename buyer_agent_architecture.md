# Buyer Agent Architecture & Optimization Guide

This document outlines the structural design and context engineering strategies used for the AdCP Multi-Agent Simulation.

---

## 📑 Presentation Slides & Handshake Diagrams (Clean 2D Vectors)
*These images have been saved directly to your project root folder. You can save, download, and drop them directly into your PowerPoint / Google Slides pitch deck!*

### 1. Master System Diagram: Buyer & Seller Handshake (No Cutoffs)
*A single, high-contrast visual showing both agents, the MCP tool interface with nested skills, and SQLite ledger:*

![Unified AdCP Multi-Agent Presentation Schematic](adcp_unified_presentation_schematic.png)

---

### 2. Chronological Handshake Sequence Flow
*Traces the step-by-step transaction workflow from initial brief ingestion to final SQLite database contract validation:*

![Chronological Handshake Sequence Flow](sequence_flow_presentation_schematic.png)

---

## 🛠️ Unified Seller Agent Tools & Skills List
*Here is the structured mapping of the specific tools exposed by the **Seller Agent (SSP)**, with their internal execution skills nested under them:*

*   **Tool: `get_adcp_capabilities()`**
    *   **Nested Skill:** *Sandbox Feature Reporting* — Dynamically queries and declares currency formats (INR), platforms, supported ad types, and active server features.
*   **Tool: `get_products()`**
    *   **Nested Skill:** *Inventory Catalog Service* — Services available premium placements, audience specs, and basic floor prices.
    *   **Nested Skill:** *Dashboard Telemetry Aggregator (`get_dashboard`)* — Calculates aggregate publisher financials (eCPM yield, total revenue) and breakdowns directly from database rows.
*   **Tool: `create_media_buy()`**
    *   **Nested Skill:** *Grok-3 Brand Safety Check* — Uses Grok LLM to validate buyer domain reputation, competitive overlaps, and risk scoring.
    *   **Nested Skill:** *Contract & Exclusivity Validator* — Ensures package IDs are correct and that the media budget satisfies dyn-floor conditions.
    *   **Nested Skill:** *SQLite Transaction Ledger* — Persists approved programmatic deals directly to the central SQL database.
*   **Tool: `get_media_buy_delivery()`**
    *   **Nested Skill:** *Dynamic Telemetry Simulation* — Computes and reports real-time campaign delivery stats (Impressions served, CTR %, Spend, ROAS) based on live play pacing.

---

## 1. The Buyer Agent Stack

| Component | Role | Implementation |
| :--- | :--- | :--- |
| **LLM** | Brain & Decision Maker | **Gemma-3-27b-it** (via Google GenAI) |
| **Tools (Skills)** | Interaction Layer | **MCP Client** (calls Seller `get_products`, `create_media_buy`) |
| **Knowledge** | Base Assumptions | **Persona Config** (Brand brief, strategy, INR budgets) |
| **Database** | State Persistence | **In-Memory State Machine** (BudgetManager + EventLog) |
| **Control Layer** | External Interface | **FastAPI MCP Server** (JSON-RPC 2.0) |

## 2. Context Window Engineering
To keep the agent performant and cost-effective, we use the following "Noise Reduction" strategies:

### A. Phase-Based Decoupling (Task Splitting)
*   **Logic**: The agent doesn't "run the whole campaign" in one prompt. It follows a code-orchestrated loop: `Discovery` -> `Filtering` -> `Evaluation` -> `Allocation` -> `Execution`.
*   **Code Reference**: `agent.py -> run_campaign()`
*   **Benefit**: Reduces the amount of instructions the LLM needs to hold at any one time.

### B. Pre-LLM Filtering (Context Distillation)
*   **Logic**: We use Python to filter out products that don't match the campaign's channels before sending them to the LLM.
*   **Code Reference**: `agent.py -> evaluate_products()` (Line 175)
*   **Benefit**: Drastically reduces the number of tokens consumed by irrelevant product data.

### C. Structured Prompting (Schema Enforcement)
*   **Logic**: We use a system prompt that mandates a strict JSON response. We do not use chat-style conversation history.
*   **Code Reference**: `prompts.py -> EVALUATION_SYSTEM_PROMPT`
*   **Benefit**: Zero "conversational noise" (filler words, apologies, or rambling) in the input or output.

### D. State Summarization (Signal Extraction)
*   **Logic**: Instead of a "Chat History" of every log, we maintain a `BudgetManager` object and a concise `ai_summary`.
*   **Code Reference**: `budget.py` and `agent.py -> generate_summary()`
*   **Benefit**: Keeps the context window constant rather than growing linearly with the number of transactions.

## 3. Code Map for Revisit

- **Identity & Identity**: `src/adcp_showcase/buyer/config.py`
- **Orchestration**: `src/adcp_showcase/buyer/agent.py`
- **Prompts & Logic**: `src/adcp_showcase/buyer/prompts.py`
- **Monetary State**: `src/adcp_showcase/buyer/budget.py`
- **Interface**: `src/adcp_showcase/buyer/server.py`
