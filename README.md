# AdCP: Advertising Context Protocol — Multi-Agent Simulation

AdCP is a decentralized, end-to-end simulation of an autonomous advertising marketplace. It demonstrates how AI agents can replace traditional monolithic ad-serving systems to handle discovery, evaluation, and trading of media in real-time using the **Model Context Protocol (MCP)**.

![AdCP Architecture](https://raw.githubusercontent.com/sdeshpa7/AdCP-Showcase/main/adcp-dashboard/public/preview.png) *(Note: Add actual screenshot to your repo later)*

## 🚀 Overview

This project simulates a high-fidelity environment where **Advertiser Agents** (Buyers) and **Publisher Agents** (Sellers) negotiate and execute media buys without human intervention.

- **Buyers** use **Gemma-2-27b-it** to evaluate publisher inventory against complex brand briefs.
- **Sellers** use **Llama-3-70b (Groq)** to perform real-time brand safety validation and yield optimization.

---

## 🧠 Multi-Agent Architecture

The system decomposes the monolithic ad-stack into specialized sub-agents to reduce context window bloat and improve reasoning accuracy.

### 🏢 Buyer Side (Demand-Side Platform)
- **Orchestrator**: Routes requests and manages the campaign lifecycle.
- **Discovery Agent**: Queries publishers for relevant inventory slots.
- **Evaluation Agent**: Uses Gemma to score inventory against brand safety and performance criteria.
- **Budget Agent**: Manages daily pacing and allocation across different line items.
- **RTB Agent**: Handles bid submission and auction mechanics.
- **Delivery Agent**: Monitors impressions and optimizes reach/frequency.

### 📰 Seller Side (Supply-Side Platform)
- **Yield Orchestrator**: Manages incoming requests from buyer agents.
- **Catalog Agent**: Maintains the product inventory and audience signals.
- **Exchange Agent**: Dynamically sets floor prices based on demand intensity.
- **Validation Agent**: Uses Llama-3 to assess brand safety and competitive conflicts.
- **Performance Agent**: Generates simulated delivery reports (ROAS, CTR).

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12+, FastAPI, MCP (Model Context Protocol).
- **LLMs**: Google Gemini (Gemma-2) & Groq (Llama-3.3).
- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Protocols**: JSON-RPC 2.0 over Streamable HTTP.

---

## 🚥 Setup Instructions

### 1. Prerequisites
- Python 3.12+
- Node.js 20+
- [Google AI Studio Key](https://aistudio.google.com/) (for Gemma)
- [Groq API Key](https://console.groq.com/) (for Llama)

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

# Buyer Config (Gemini/Gemma)
GEMINI_API_KEY=your_google_ai_studio_key
BUYER_LLM_MODEL=models/gemma-2-27b-it

# Seller Config (Groq/Llama)
XAI_API_KEY=your_groq_api_key
SELLER_LLM_MODEL=llama-3.3-70b-versatile
```

---

## 🎮 Running the Simulation

### Step 1: Launch the Dashboard
```bash
cd adcp-dashboard
npm run dev
```
Navigate to `http://localhost:5173/publisher` to see the Seller side or `http://localhost:5173/advertiser` for the Buyer side.

### Step 2: Start the Multi-Agent Demo
In a new terminal:
```bash
python -m adcp_showcase.demo
```
This script orchestrates 10 concurrent agents (5 Buyers, 5 Sellers) and begins the trading simulation.

---

## 📊 Live Intelligence Feeds

One of the core features of AdCP is the **Real-Time Reasoning Feed**.
- **Live Feed Intelligence (Buyer)**: Watch the Evaluation Agent's thought process as it rejects or accepts ad slots.
- **Live Yield Intelligence (Seller)**: See the Validation Agent perform LLM-based brand safety checks on incoming orders.

---

## 📄 License
MIT License. Created as a portfolio project for MarTech & AdTech AI Engineering.
