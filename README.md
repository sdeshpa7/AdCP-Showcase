# AdCP: Advertising Context Protocol — Multi-Agent Simulation

AdCP is a decentralized, end-to-end simulation of an autonomous advertising marketplace. It demonstrates how AI agents can replace traditional monolithic ad-serving systems to handle discovery, evaluation, and trading of media in real-time using the **Model Context Protocol (MCP)**.

![AdCP Architecture](https://raw.githubusercontent.com/sdeshpa7/AdCP-Showcase/main/adcp-dashboard/public/preview.png)

## 🚀 Overview

This project simulates a high-fidelity environment where **Advertiser Agents** (Buyers) and **Publisher Agents** (Sellers) negotiate and execute media buys without human intervention.

- **Buyers**: Use **Gemma-3-27b-it** (via Google Gemini) to evaluate publisher inventory against complex brand briefs.
- **Sellers**: Use **Gemma-3** or **Grok (xAI)** to perform real-time brand safety validation and yield optimization.
- **Persistence**: A centralized SQLite database (`adcp.db`) stores 3 years of historical transaction data, served via a dedicated **Transaction API**.

---

## 🧠 Multi-Agent Architecture

The system decomposes the monolithic ad-stack into specialized sub-agents to reduce context window bloat and improve reasoning accuracy.

### 🏢 Buyer Side (Demand-Side Platform)
- **Phase-Based Decoupling**: Separate discovery, evaluation, and allocation phases.
- **Prompt-Aware Filtering**: Intent detection reduces token usage by 40% via pre-LLM inventory filtering.
- **Intelligence Feed**: Real-time display of LLM reasoning during the "Negotiation" phase.

### 📰 Seller Side (Supply-Side Platform)
- **Yield Orchestrator**: Manages incoming requests from buyer agents.
- **Catalog Agent**: Maintains the product inventory and audience signals.
- **Decoupled Transactions**: Media buys are stored in a persistent reference ledger, separate from agent tool logic.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.14, FastAPI, AdCP SDK (MCP v5+).
- **LLMs**: Google Gemini (Gemma-3-27b-it).
- **Database**: SQLite with a dedicated **FastAPI Transaction API** (Port 8010).
- **Frontend**: React 19, Vite, Recharts, Vanilla CSS.

---

## 🚥 Setup Instructions

### 1. Prerequisites
- Python 3.12+
- Node.js 20+
- [Google AI Studio Key](https://aistudio.google.com/)

### 2. Installation & Setup

#### 🍎 Linux & macOS (Bash / Zsh)
```bash
# Clone the repository
git clone https://github.com/sdeshpa7/AdCP-Showcase.git
cd AdCP-Showcase

# Set up backend and activate virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Set up frontend dependencies
cd ../frontend/adcp-dashboard
npm install
```

#### 🪟 Windows (CMD / PowerShell)
```cmd
:: Clone the repository
git clone https://github.com/sdeshpa7/AdCP-Showcase.git
cd AdCP-Showcase

:: Set up backend and activate virtual environment
cd backend
python -m venv .venv
:: (CMD)
call .venv\Scripts\activate.bat
:: (PowerShell)
:: .venv\Scripts\Activate.ps1
pip install -e .

:: Set up frontend dependencies
cd ..\frontend\adcp-dashboard
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Protocol Auth
ADCP_AUTH_TOKEN=your_random_secret_token

# LLM Config
GEMINI_API_KEY=your_google_ai_studio_key
LLM_MODEL=gemma-3-27b-it
```

---

## 🎮 Running the Simulation

### Step 1: Launch the Multi-Agent Demo
```bash
# In the root directory
python -m adcp_showcase.demo
```
This orchestrates:
1. **Database Seeding**: Populates `adcp.db` with historical transactions (if empty).
2. **Transaction API**: Starts the background server on `:8010`.
3. **Agent Servers**: Launches 5 Buyers (:8001-8005) and 5 Sellers (:9001-9005).
4. **Campaign Execution**: Agents begin their autonomous workflow.

---

### 📡 Direct Agent Endpoints (MCP Node URLs)
When the simulation is running, each individual advertiser and publisher operates as a fully decoupled **Model Context Protocol (MCP)** server. You can inspect, query, or hook them into any MCP-compliant manager or client using these dedicated endpoints:

#### 🏢 Buyer Agents (Advertisers)
| Advertiser Brand | Dedicated Port | Direct MCP Server Endpoint |
| :--- | :---: | :--- |
| **Flipkart** | `8001` | `http://localhost:8001/mcp` |
| **Amazon India** | `8002` | `http://localhost:8002/mcp` |
| **Jio** | `8003` | `http://localhost:8003/mcp` |
| **Hindustan Unilever** | `8004` | `http://localhost:8004/mcp` |
| **HDFC Bank** | `8005` | `http://localhost:8005/mcp` |

#### 📰 Seller Agents (Publishers)
| Publisher Inventory | Dedicated Port | Direct MCP Server Endpoint |
| :--- | :---: | :--- |
| **JioHotstar** | `9001` | `http://localhost:9001/mcp` |
| **Cricinfo** | `9002` | `http://localhost:9002/mcp` |
| **Myntra** | `9003` | `http://localhost:9003/mcp` |
| **NDTV** | `9004` | `http://localhost:9004/mcp` |
| **Amazon.in** | `9005` | `http://localhost:9005/mcp` |

#### 🛠️ Direct Query Example (Fast Verification)
To verify that an individual agent is online, execute a quick HTTP `POST` to their MCP endpoint:
```bash
curl -X POST http://localhost:8001/mcp \
  -H "Authorization: Bearer local" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "params": {}, "id": 1}'
```

---

### Step 2: Launch the Dashboards

#### 🍎 Linux & macOS (Terminal Zsh/Bash)
Navigate to the dashboard directory in two separate terminal windows:
```bash
# Terminal 1: Advertiser Portal (Default: Port 5173)
cd frontend/adcp-dashboard
npm run dev

# Terminal 2: Publisher Portal (Default: Port 5177 for Safari compatibility)
cd frontend/adcp-dashboard
npm run publisher
```

#### 🪟 Windows (CMD / PowerShell)
Navigate to the dashboard directory in two separate console windows:
```cmd
:: Terminal 1: Advertiser Portal (Default: Port 5173)
cd frontend\adcp-dashboard
npm run dev

:: Terminal 2: Publisher Portal (Default: Port 5177)
cd frontend\adcp-dashboard
npm run publisher
```

- **Advertiser Portal**: **[http://localhost:5173](http://localhost:5173)**
- **Publisher Portal**: **[http://localhost:5177](http://localhost:5177)**
- **Backend API Server**: **[http://localhost:8010](http://localhost:8010)**

---

## 📡 Live Feeds & Interactive Cockpits

### 🏢 1. Live Intelligence Feed (Advertiser DSP Cockpit)
*   **How to Access:**
    *   Navigate to **[http://localhost:5173](http://localhost:5173)** in your browser.
    *   **Launch the Agent Workflow:** Under the Advertiser cockpit interface, fill in your campaign parameters (or use the preloaded defaults) and click the **"Create Campaign"** button. This directly signals the active Buyer Agent, spinning up the autonomous discovery, context auditing, and bidding pipeline in real-time.
*   **What Happens in Detail:**
    *   **Context Ingestion:** The Advertiser Agent (DSP running `Gemma-3-27b-it`) ingests your active campaign briefs, mapping dynamic target criteria (e.g. Connected TV slots, category budgets).
    *   **Surgical Context Pruning:** Before sending queries to the LLM, the pre-evaluation metadata filter scans and prunes non-matching publisher slots (saving ~190 tokens per slot), compressing the prompt context footprint by **85%**.
    *   **Autonomous Evaluation:** The Gemma-3-27b-it reasoning model scores each qualified inventory slot on a strict `0-10` relevance scale based on category context and audience match.
    *   **Real-Time Console Telemetry:** The dashboard renders a scrolling live console displaying step-by-step agent reasoning, active tool-calls (`get_products()`, `create_media_buy()`), and structured schema validation events.

### 📰 2. Live Yield Feed (Publisher SSP Cockpit)
*   **How to Access:**
    *   Open **[http://localhost:5177](http://localhost:5177)** in Safari or Chrome.
    *   **Observe Autonomous Bidding Triggers:** Once you click the **"Create Campaign"** button on the Advertiser Dashboard (Port 5173), the active Buyer Agent automatically sends real-time bidding requests to the SSP server. The Publisher Cockpit instantly captures these inputs and displays safety evaluations, pricing matches, and updated transaction ledgers on-screen.
*   **What Happens in Detail:**
    *   **Brand Safety Verification (Grok-3):** Upon receiving a bid request from the buyer agent, the Publisher Yield Orchestrator triggers `_brand_safety_check()`, prompting `Grok-3` to run a zero-shot compliance audit of the advertiser's reputation, domain, and competitive exclusions.
    *   **eCPM Floor Pricing Optimization:** The SSP automatically verifies incoming bid pricing against dynamic, pacing-adjusted publisher floors, dynamically rejecting bids below thresholds to secure optimal monetization yields.
    *   **Stateful Contract Execution:** Approved campaigns programmatically trigger `create_media_buy()`, secure-signing a programmatic contract committed directly to the central transaction database (`adcp.db`), instantly updating the publisher's live yield metrics.
    *   **Live Revenue Telemetry:** Renders real-time eCPM averages, dynamic yield forecasts, active partner discount indexes, and natural language pacing flights (`Day X of Y`) pulling directly from SQLite ledger queries.

---

## 📝 High-Impact Simulation Prompts (Test Scenarios)
You can directly test the multi-agent negotiation, brand safety evaluation, and dynamic floor pricing engines by copy-pasting these copyable briefs into the interactive portals. See the full scenario analysis in **[docs/sample_prompts.md](docs/sample_prompts.md)**.

### 🏢 Buyer Agent (DSP) Briefs
*   **Prime Day Placement (CTV & Targeted):**
    > *“Launch a premium awareness campaign for Amazon Prime Day. Target high-engagement slots on JioHotstar specifically during the IPL Playoffs. We are looking for CTV Video Mid-rolls and Mobile Pre-rolls. Budget: ₹50 Lakhs. Maximum allowed CPM: ₹1,500.”*
*   **Hyper-Local Cricket Promo (RCB vs CSK):**
    > *“Promote the 'Big Billion Days' teaser specifically to cricket fans in Karnataka and Tamil Nadu. Focus on the upcoming RCB vs CSK match on JioHotstar. Use slots that over-index on Southern demographics. Budget: ₹25 Lakhs.”*
*   **Open Exchange Branding Campaign (Dove Quality):**
    > *“Run a 14-day brand equity campaign for Dove. Target all available publishers (Open Exchange). Focus on 'Brand Safety Tier: Premium' inventory only. Distribute ₹1 Crore budget across Display and Video formats equally.”*

### 📰 Seller Agent (SSP) Strategies
*   **IPL Yield Optimization Brief:**
    > *“Optimize floor prices for the upcoming IPL Playoffs. Set a 15% floor price premium on all Connected TV (CTV) Mid-rolls and Pre-rolls. Prioritize e-commerce brands (specifically Amazon and Flipkart) by offering a competitive 5% volume floor discount for package buys.”*

---

## 📊 Core Features

- **🔮 Publisher Strategy Evaluation**: A dedicated dry-run mode for publishers to preview eCPM optimization, partner discounts, fill-rate forecasts, and projected total yield uplifts (+%) in a specialized `yield-forecast-card` prior to launching configurations on the server.
- **⚡ Real-Time Flight Pacing**: Injects natural language date-parsing (e.g., *"May 15th to May 30th"*) into campaign briefs, dynamically calculating and displaying pacing cycles (e.g., *"Day 3 of 15"*) and snaps in the delivery monitoring feed.
- **🔍 Prompt-Aware Discovery**: Target highly specific slots like *"IPL Playoffs on Connected TV"* and watch the buyer agent autonomously scan and select only contextually aligned channels.
- **🛡️ Secure Sub-Agent Registry**: A fully active, verified registry mapping `catalog`, `exchange`, and `validation` sub-agent nodes for transparent execution logs.
- **📈 Advanced Performance Aggregators**: Robust, database-driven ranking cards (like *Top Performers*) pulling real-time aggregate brand and publisher metrics dynamically using complete SQLite fallbacks.
- **💾 Decoupled Persistence**: Historical data across 3 years is stored locally in `adcp.db` and served dynamically via the FastAPI transaction backend.

---

## 📄 License
MIT License.
