# Buyer Agent Architecture & Optimization Guide

This document outlines the structural design and context engineering strategies used for the AdCP Multi-Agent Simulation.

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
