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

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/sdeshpa7/AdCP-Showcase.git
cd AdCP-Showcase

# Install Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Install Frontend dependencies
cd adcp-dashboard
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

### Step 2: Launch the Dashboards
In two separate terminals:

```bash
# Terminal 1: Advertiser Portal
cd adcp-dashboard
npm run dev

# Terminal 2: Publisher Portal
cd adcp-dashboard
npm run publisher
```

- **Advertiser Portal**: `http://localhost:5173/` (or the next available port)
- **Publisher Portal**: `http://localhost:5174/` (or the next available port)

---

## 📊 Core Features

- **Prompt-Aware Discovery**: Target "IPL Playoffs on JioHotstar" and watch the agent intelligently filter out irrelevant inventory.
- **Direct-First Buying**: Defaults to Guaranteed Direct buys unless "Open Exchange" is explicitly requested in the prompt.
- **Historical Analysis**: 3 years of persistent transaction data available in the dashboard charts, fetched from the SQLite backend.
- **Decoupled Architecture**: Agents remain pure AdCP actors; persistence is handled by the Demo Orchestrator and Transaction API.

---

## 📄 License
MIT License. Created as a portfolio project for AdTech AI Engineering.
