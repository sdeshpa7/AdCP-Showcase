/**
 * usePublisherIntelligenceFeed.js — Seller-side Live Intelligence Feed
 * 
 * Generates a deterministic event timeline from the publisher/seller perspective:
 * - Incoming get_products requests from buyer agents
 * - create_media_buy orders accepted/rejected
 * - Competitive exclusion enforcement
 * - Floor price and fill rate optimization
 */

import { SYSTEM_DATE } from './useAgentData';

// ── Buyer Agents that query each publisher ──────────────────────────────────
const BUYER_AGENTS = {
  flipkart: { brand: "Flipkart", domain: "flipkart.com", port: 8001, budget: "₹90 Cr", excludes: ["Amazon.in"] },
  amazon: { brand: "Amazon India", domain: "amazon.in", port: 8002, budget: "₹100 Cr", excludes: ["Myntra"] },
  jio: { brand: "Jio", domain: "jio.com", port: 8003, budget: "₹6 Cr", excludes: [] },
  hul: { brand: "HUL", domain: "hul.co.in", port: 8004, budget: "₹150 Cr", excludes: [] },
  hdfc: { brand: "HDFC Bank", domain: "hdfcbank.com", port: 8005, budget: "₹15 Cr", excludes: [] },
};

// ── Publisher properties (mirrors seller/config.py) ─────────────────────────
const PUBLISHER_META = {
  jiohotstar: { name: "JioHotstar", port: 9001, slots: 8, cpmRange: "₹60–₹1,200", category: "Streaming", mau: "503M" },
  myntra: { name: "Myntra", port: 9003, slots: 2, cpmRange: "₹100–₹120", category: "E-Commerce", mau: "65M" },
  ndtv: { name: "NDTV", port: 9004, slots: 3, cpmRange: "₹80–₹240", category: "News", mau: "180M" },
  espncricinfo: { name: "ESPNcricinfo", port: 9002, slots: 3, cpmRange: "₹140–₹280", category: "Sports", mau: "37M" },
  "amazonin": { name: "Amazon.in", port: 9005, slots: 12, cpmRange: "₹90–₹180", category: "E-Commerce", mau: "350M" },
};

// ── Seeded random ───────────────────────────────────────────────────────────
const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};
// ── Sub-Agent Definitions (Seller Side) ──────────────────────────────────────
const SELLER_AGENTS = {
  orchestrator: { name: 'Orchestrator', icon: '🎯', color: '#f59e0b', usesLLM: true, model: 'gemma-2-27b-it' },
  discovery:    { name: 'Discovery Agent', icon: '🔍', color: '#3b82f6', usesLLM: true, model: 'gemma-2-27b-it' },
  catalog:      { name: 'Catalog Agent', icon: '📦', color: '#3b82f6', usesLLM: true, model: 'gemma-2-27b-it' },
  exchange:     { name: 'Exchange Agent', icon: '⚡', color: '#ef4444', usesLLM: true, model: 'gemma-2-27b-it' },
  validation:   { name: 'Validation Agent', icon: '🛡️', color: '#8b5cf6', usesLLM: true, model: 'gemma-2-27b-it' },
  evaluation:   { name: 'Evaluation Agent', icon: '🧠', color: '#8b5cf6', usesLLM: true, model: 'gemma-2-27b-it' },
  budget:       { name: 'Budget Agent', icon: '💰', color: '#f97316', usesLLM: true, model: 'gemma-2-27b-it' },
  rtb:          { name: 'RTB Agent', icon: '⚡', color: '#ef4444', usesLLM: true, model: 'gemma-2-27b-it' },
  delivery:     { name: 'Delivery Agent', icon: '📊', color: '#10b981', usesLLM: true, model: 'gemma-2-27b-it' },
};

const makeSellerLane = (agentKey, contextTokens, monoTokens, contents) => ({
  type: 'lane-start',
  agent: SELLER_AGENTS[agentKey],
  contextWindow: { inputTokens: contextTokens, monoTokens, windowPct: Math.round((contextTokens / monoTokens) * 100), contents },
  details: {
    agent_id: agentKey,
    agent_name: SELLER_AGENTS[agentKey].name,
    uses_llm: true,
    llm_model: 'llama-3.3-70b',
    llm_provider: 'Groq',
    context_window: {
      allocated_tokens: contextTokens,
      monolithic_equivalent: monoTokens,
      efficiency: `${Math.round((contextTokens / monoTokens) * 100)}% of monolithic`,
      loaded_context: contents,
    },
    ...(agentKey === 'orchestrator' ? {
      role: 'Yield strategy — analyze demand signals and set agent priorities',
      system_prompt: 'You are a publisher yield orchestrator. Analyze incoming buyer demand and route to appropriate sub-agents.',
      llm_call: { model: 'grok-3-mini', temperature: 0.2, max_output_tokens: 512 },
      inputs: ['incoming_rpc_request', 'product_catalog', 'demand_signals'],
      outputs: ['prioritized_routing', 'yield_strategy'],
    } : agentKey === 'catalog' ? {
      role: 'Inventory optimization — score and rank ad slots for buyer relevance',
      system_prompt: 'You are a catalog optimization agent. Score ad slots for relevance to each buyer brief.',
      llm_call: { model: 'grok-3-mini', temperature: 0.3, max_output_tokens: 1024 },
      tools: ['get_products (MCP handler)'],
      inputs: ['catalog_db', 'audience_segments', 'buyer_brief'],
      outputs: ['ranked_product_list[]'],
    } : agentKey === 'exchange' ? {
      role: 'Floor pricing — dynamically set auction floor prices based on demand',
      system_prompt: 'You are an exchange pricing agent. Set optimal floor prices to maximize yield while maintaining fill rate.',
      llm_call: { model: 'grok-3-mini', temperature: 0.2, max_output_tokens: 512 },
      inputs: ['current_demand', 'historical_ecpm', 'fill_rate_target'],
      outputs: ['floor_price_recommendations', 'auction_parameters'],
    } : agentKey === 'validation' ? {
      role: 'Brand safety — LLM-powered content classification and buyer validation',
      system_prompt: 'You are a brand safety validator. Assess whether a buyer brand is safe for this publisher inventory.',
      llm_call: { model: 'grok-3-mini', temperature: 0.1, max_output_tokens: 256 },
      inputs: ['buy_request', 'brand_domain', 'publisher_content_categories'],
      outputs: ['safety_verdict', 'reasoning', 'risk_score'],
    } : {
      role: 'Fulfillment analysis — pacing and under-delivery detection',
      system_prompt: 'You are a delivery analyst. Evaluate pacing trends and recommend adjustments.',
      llm_call: { model: 'grok-3-mini', temperature: 0.3, max_output_tokens: 512 },
      inputs: ['media_buy_records', 'cpm_table', 'pacing_data'],
      outputs: ['delivery_analysis', 'pacing_recommendations'],
    }),
  },
});
const makeSellerHandoff = (fromKey, toKey, payloadTokens, desc) => ({
  type: 'handoff',
  from: SELLER_AGENTS[fromKey].name,
  to: SELLER_AGENTS[toKey].name,
  toColor: SELLER_AGENTS[toKey].color,
  payloadTokens,
  payloadDescription: desc,
  details: {
    transfer: {
      from_agent: SELLER_AGENTS[fromKey].name,
      to_agent: SELLER_AGENTS[toKey].name,
      payload_size: `${payloadTokens} tokens`,
      payload_description: desc,
      serialization: 'Structured JSON (deterministic pipeline)',
      context_strategy: 'Only relevant records passed — no accumulated state',
    },
  },
});

export const generateSellerFeed = (publisherId, publisherData) => {
  const meta = PUBLISHER_META[publisherId];
  if (!meta) return [];

  const rand = seededRandom(hashString(publisherId + SYSTEM_DATE));
  const events = [];
  const now = new Date(SYSTEM_DATE);
  let ts = new Date(now);
  ts.setHours(8, 30, 0, 0);

  const addMinutes = (min) => {
    ts = new Date(ts.getTime() + min * 60000);
    return ts.toISOString();
  };
  const monoWindow = 4200; // seller monolithic window estimate

  // ── Seller Orchestrator Lane ─────────────────────────────────────
  events.push(makeSellerLane('orchestrator', 280, monoWindow, ['server_config', 'product_catalog', 'demand_signals']));

  // ── Server Initialization ─────────────────────────────────────────────
  events.push({
    timestamp: addMinutes(0),
    phase: 'init',
    phaseLabel: 'Server Initialization',
    toolName: null,
    icon: '📡',
    title: `${meta.name} Seller Agent initialized on :${meta.port} — LLM: llama-3.3-70b (Groq)`,
    details: {
      server: {
        publisher: meta.name,
        port: meta.port,
        products_loaded: meta.slots,
        cpm_range: meta.cpmRange,
        category: meta.category,
        transport: "AdCP SDK (adcp.server.ADCPHandler)",
        protocol: "JSON-RPC 2.0 over Streamable HTTP",
        llm: { model: "llama-3.3-70b", provider: "Groq", api: "OpenAI-compatible" },
      },
      capabilities: {
        modes: ["get_products", "create_media_buy", "get_media_buy_delivery", "get_dashboard"],
        currency: "INR",
        delivery_type: "guaranteed",
        sandbox: true,
      },
    },
    contextEngineering: [],
    tokenUsage: { prompt: 180, completion: 65, total: 245, costINR: 0.012 },
  });

  // ── Capabilities Declaration ──────────────────────────────────────────
  events.push({
    timestamp: addMinutes(1),
    phase: 'init',
    phaseLabel: 'Capabilities Published',
    toolName: 'get_adcp_capabilities',
    icon: '📋',
    title: `Published AdCP capabilities — ${meta.slots} products, ${meta.category}`,
    details: {
      response: {
        protocols: ["media_buy"],
        features: {
          role: "seller",
          publisher: meta.name,
          category: meta.category,
          total_products: meta.slots,
          currency: "INR",
          seller_modes: ["get_products", "create_media_buy", "get_media_buy_delivery", "get_dashboard"],
        },
      },
    },
    contextEngineering: [{
      strategy: "Capability Declaration",
      description: "Seller declares supported tools upfront. Buyer agents only call tools the seller supports.",
      tokensSaved: 0,
      detail: "AdCP protocol pattern — capability handshake prevents invalid tool calls.",
    }],
    tokenUsage: null,
  });

  // Handoff: Orchestrator → Catalog Agent
  events.push(makeSellerHandoff('orchestrator', 'catalog', meta.slots * 45, `${meta.slots} product slots + audience context`));

  // ── Catalog Agent Lane ───────────────────────────────────────────
  events.push(makeSellerLane('catalog', meta.slots * 45 + 120, monoWindow, ['product_catalog', 'audience_data', 'buyer_briefs']));

  // ── Incoming Discovery Requests (Catalog Agent) ───────────────────────
  const pubName = meta.name;
  const incomingBuyers = Object.entries(BUYER_AGENTS).filter(([, buyer]) => !buyer.excludes.includes(pubName));
  const excludedBuyers = Object.entries(BUYER_AGENTS).filter(([, buyer]) => buyer.excludes.includes(pubName));

  incomingBuyers.forEach(([buyerId, buyer], idx) => {
    events.push({
      timestamp: addMinutes(5 + idx * 3),
      phase: 'serve',
      phaseLabel: 'Inventory Request',
      toolName: 'get_products',
      icon: '📥',
      title: `Serving catalog to ${buyer.brand} (${buyer.domain})`,
      details: {
        incoming_request: {
          from: `${buyer.brand} Agent (localhost:${buyer.port})`,
          tool: "get_products",
          brief_preview: `"${buyer.brand} campaign brief..."`,
          brand_domain: buyer.domain,
        },
        response: {
          products_served: meta.slots,
          includes: "Full publisher_properties, pricing_options, content_context, audience demographics",
          format: "AdCP v3 structuredContent",
        },
        context_signals_served: [
          `MAU: ${meta.mau}`,
          `Category: ${meta.category}`,
          `Content context: embedded in product description`,
          `Brand safety: tier included per slot`,
          `Audience demographics: gender, age, geo distribution`,
        ],
      },
      contextEngineering: [{
        strategy: "LLM-Scored Relevance Ranking",
        description: `Grok scores ${meta.slots} products against ${buyer.brand}'s brief — top slots served first.`,
        tokensSaved: 0,
        detail: "Catalog Agent uses grok-3-mini to rank products by relevance to the buyer's campaign brief before serving.",
      }],
      tokenUsage: { prompt: 320 + meta.slots * 40, completion: 150, total: 470 + meta.slots * 40, costINR: parseFloat((0.025 + meta.slots * 0.002).toFixed(3)) },
    });
  });

  // Exclusion events
  excludedBuyers.forEach(([buyerId, buyer]) => {
    events.push({
      timestamp: addMinutes(2),
      phase: 'serve',
      phaseLabel: 'Request Blocked',
      toolName: null,
      icon: '🛡️',
      title: `${buyer.brand} excluded — competitive conflict with ${pubName}`,
      details: {
        blocked_buyer: buyer.brand,
        reason: `${buyer.brand} has ${pubName} in its exclusion list`,
        enforcement: "Buyer agent never queries this seller (protocol-level exclusion)",
        impact: `${meta.slots} products never enter ${buyer.brand}'s context window`,
        tokens_saved: meta.slots * 190,
      },
      contextEngineering: [{
        strategy: "Protocol-Level Exclusion",
        description: `${buyer.brand} never queries ${pubName}. ${meta.slots} products × ~190 tokens = ${(meta.slots * 190).toLocaleString()} tokens saved.`,
        tokensSaved: meta.slots * 190,
        detail: "Competitive exclusion at the discovery layer — zero network calls, zero LLM tokens wasted.",
      }],
      tokenUsage: null,
    });
  });

  // Handoff: Catalog Agent → Exchange Agent
  events.push(makeSellerHandoff('catalog', 'exchange', incomingBuyers.length * 80, `${incomingBuyers.length} buyer demand signals for pricing`));

  // ── Exchange Agent Lane (Floor Pricing via Grok) ─────────────────
  events.push(makeSellerLane('exchange', 320, monoWindow, ['demand_signals', 'historical_ecpm', 'fill_rate_data']));

  // ── Floor Pricing Optimization (Exchange Agent) ───────────────────────
  events.push({
    timestamp: addMinutes(6),
    phase: 'optimize',
    phaseLabel: 'Floor Pricing',
    toolName: null,
    icon: '⚡',
    title: `Grok analyzed demand from ${incomingBuyers.length} buyers — floor prices optimized`,
    agentName: 'Exchange Agent',
    agentColor: '#ef4444',
    details: {
      llm_call: {
        model: "llama-3.3-70b",
        provider: "Groq",
        temperature: 0.2,
        system_prompt: "Analyze buyer demand and set optimal floor prices to maximize yield.",
      },
      demand_analysis: {
        active_buyers: incomingBuyers.length,
        demand_intensity: incomingBuyers.length >= 4 ? 'HIGH' : incomingBuyers.length >= 2 ? 'MODERATE' : 'LOW',
        recommendation: incomingBuyers.length >= 4
          ? `High demand — raise floor CPM by 8-12% on premium slots`
          : `Moderate demand — maintain current floor prices`,
      },
      floor_adjustments: {
        premium_slots: `+${Math.floor(5 + rand() * 10)}% floor CPM`,
        standard_slots: 'No change',
        fill_rate_target: '92%',
      },
    },
    contextEngineering: [{
      strategy: "Dynamic Floor Pricing",
      description: `Grok evaluates ${incomingBuyers.length} demand signals to set optimal floors — prevents revenue leakage.`,
      tokensSaved: 0,
      detail: "Exchange Agent uses grok-3-mini to dynamically adjust floor CPMs based on real-time demand intensity.",
    }],
    tokenUsage: { prompt: 280, completion: 180, total: 460, costINR: 0.023 },
  });

  // Handoff: Exchange Agent → Validation Agent
  events.push(makeSellerHandoff('exchange', 'validation', incomingBuyers.length * 120, `${incomingBuyers.length} buyer requests queued for validation`));

  // ── Validation Agent Lane ────────────────────────────────────────
  events.push(makeSellerLane('validation', 380, monoWindow, ['incoming_orders', 'product_ledger', 'floor_cpms', 'brand_safety_rules']));

  // ── Incoming Media Buys (Validation Agent) ───────────────────────────────
  const activeBuyCount = publisherData?.active_buys?.length || 0;
  const pastBuyCount = publisherData?.past_buys?.length || 0;
  const totalBuys = Math.min(activeBuyCount + pastBuyCount, 5);

  // Simulate accepts from different buyers
  const buyerOrder = incomingBuyers.slice(0, Math.max(totalBuys, 2));
  buyerOrder.forEach(([buyerId, buyer], idx) => {
    const budget = Math.floor(50000 + rand() * 300000);
    const buyId = `mb-${publisherId.substring(0, 2)}${String(idx + 1).padStart(2, '0')}-${Math.floor(rand() * 9999).toString().padStart(4, '0')}`;

    events.push({
      timestamp: addMinutes(8 + idx * 5),
      phase: 'accept',
      phaseLabel: 'Media Buy Accepted',
      toolName: 'create_media_buy',
      icon: '✅',
      title: `Accepted buy from ${buyer.brand}: ₹${(budget / 100000).toFixed(1)}L`,
      details: {
        incoming_order: {
          from: `${buyer.brand} Agent`,
          brand_domain: buyer.domain,
          idempotency_key: `${buyerId}-${Date.now()}`,
          packages: [{
            product_id: `${publisherId.substring(0, 2)}-slot-${idx + 1}`,
            budget: `₹${(budget / 100000).toFixed(1)}L`,
            pricing_option_id: `po-${publisherId.substring(0, 2)}-slot-${idx + 1}`,
          }],
        },
        llm_brand_safety: {
          model: "llama-3.3-70b",
          provider: "Groq",
          query: `Is ${buyer.brand} (${buyer.domain}) a brand-safe fit for ${meta.name} (${meta.category})?`,
          verdict: "SAFE",
          reasoning: `${buyer.brand} operates in a non-competing vertical. No content conflicts with ${meta.category} publisher content. Brand reputation: Clean.`,
          risk_score: parseFloat((0.05 + rand() * 0.15).toFixed(2)),
        },
        validation: {
          product_exists: "✅",
          budget_above_floor: "✅",
          brand_safety_check: "✅ passed (Grok)",
          competitive_conflict: "✅ none detected",
        },
        response: {
          media_buy_id: buyId,
          status: "active",
          valid_actions: ["pause", "cancel"],
          revision: 1,
        },
      },
      contextEngineering: [{
        strategy: "LLM Brand Safety",
        description: `Grok validates ${buyer.brand} brand safety for ${meta.name} — replaces manual review.`,
        tokensSaved: 0,
        detail: "Validation Agent uses grok-3-mini to assess brand-publisher compatibility in real-time.",
      }],
      tokenUsage: { prompt: 190, completion: 85, total: 275, costINR: 0.014 },
    });
  });

  // ── Fill Rate & Yield Optimization ────────────────────────────────────
  const totalRevenue = publisherData?.financials?.spent || 0;
  const totalImps = publisherData?.performance?.impressions || 0;
  const ecpm = totalImps > 0 ? (totalRevenue / totalImps) * 1000 : 0;
  const fillRate = Math.min(95, 40 + rand() * 40).toFixed(1);

  events.push({
    timestamp: addMinutes(15),
    phase: 'optimize',
    phaseLabel: 'Yield Optimization',
    toolName: 'get_dashboard',
    icon: '📈',
    title: `Platform yield: eCPM ₹${ecpm.toFixed(0)}, Fill Rate ${fillRate}%`,
    details: {
      platform_metrics: {
        total_revenue: `₹${(totalRevenue / 10000000).toFixed(1)} Cr`,
        total_impressions: `${(totalImps / 1000000).toFixed(1)}M`,
        ecpm: `₹${ecpm.toFixed(0)}`,
        fill_rate: `${fillRate}%`,
        active_contracts: buyerOrder.length,
      },
      optimization_actions: [
        `Floor CPM maintained at ${meta.cpmRange} — no undercutting detected`,
        `${buyerOrder.length} active buyer agents providing demand diversity`,
        fillRate > 70 ? "High fill rate — demand exceeds supply on premium slots" : "Moderate fill rate — floor CPM adjustment may increase fill",
      ],
    },
    contextEngineering: [{
      strategy: "Multi-Agent Yield Intelligence",
      description: `5 seller sub-agents with targeted Grok calls — each agent processes only its domain context.`,
      tokensSaved: buyerOrder.length * 1200,
      detail: `${buyerOrder.length} buyer interactions processed with focused Grok calls. Multi-agent decomposition reduces per-agent context by ~90%.`,
    }],
    tokenUsage: { prompt: 120, completion: 80, total: 200, costINR: 0.010 },
  });

  // Handoff: Validation Agent → Delivery Agent
  events.push(makeSellerHandoff('validation', 'delivery', buyerOrder.length * 80, `${buyerOrder.length} active contracts for delivery simulation`));

  // ── Delivery Agent Lane ───────────────────────────────────────────
  events.push(makeSellerLane('delivery', buyerOrder.length * 80 + 60, monoWindow, ['buy_records', 'ctr_benchmarks']));

  // ── Delivery Reporting (Delivery Agent) ───────────────────────────────────
  buyerOrder.forEach(([buyerId, buyer], idx) => {
    const impressions = Math.floor(50000 + rand() * 500000);
    const clicks = Math.floor(impressions * (0.002 + rand() * 0.005));
    const spend = Math.floor(impressions / 1000 * (80 + rand() * 200));
    const roas = parseFloat((3.0 + rand() * 4.5).toFixed(1));

    events.push({
      timestamp: addMinutes(5 + idx * 4),
      phase: 'delivery',
      phaseLabel: 'Delivery Report',
      toolName: 'get_media_buy_delivery',
      icon: '📊',
      title: `Delivery report for ${buyer.brand}: ${(impressions / 1000).toFixed(0)}K imps, ₹${(spend / 100000).toFixed(2)}L revenue`,
      details: {
        request_from: `${buyer.brand} Agent (localhost:${buyer.port})`,
        delivery_simulation: {
          method: "simulate_delivery(buy, publisher_id, floor_cpm)",
          engine: "seller/delivery.py — deterministic simulation based on budget and CPM",
        },
        response: {
          impressions: impressions.toLocaleString('en-IN'),
          clicks: clicks.toLocaleString('en-IN'),
          spend: `₹${(spend / 100000).toFixed(2)}L`,
          roas: `${roas}x`,
          currency: "INR",
        },
      },
      contextEngineering: [],
      tokenUsage: null,
    });
  });

  // ── Platform Summary ──────────────────────────────────────────────────
  const totalTokensSaved = events.filter(e => e && e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e?.contextEngineering || []).reduce((s, ce) => s + (ce?.tokensSaved || 0), 0), 0);
  const totalLLMTokens = events.filter(e => e && e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e?.tokenUsage?.total || 0), 0);
  const totalLLMCost = events.filter(e => e && e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e?.tokenUsage?.costINR || 0), 0);
  const llmCallCount = events.filter(e => e && e.tokenUsage && e.type !== 'lane-start' && e.type !== 'handoff').length;

  events.push({
    timestamp: addMinutes(5),
    phase: 'summary',
    phaseLabel: 'Platform Summary',
    agentName: 'Seller Orchestrator',
    agentColor: '#f59e0b',
    toolName: null,
    icon: '\ud83c\udfe2',
    title: `${meta.name} session complete \u2014 ${buyerOrder.length} buyers served, ${llmCallCount} Grok calls (${totalLLMTokens.toLocaleString()} tokens)`,
    details: {
      session_summary: {
        buyers_queried: incomingBuyers.length,
        buyers_excluded: excludedBuyers.length,
        buys_accepted: buyerOrder.length,
        llm_model: "llama-3.3-70b",
        llm_provider: "Groq",
        llm_calls: llmCallCount,
        llm_tokens: totalLLMTokens,
        llm_cost: `\u20b9${totalLLMCost.toFixed(2)}`,
        total_tokens_saved: totalTokensSaved.toLocaleString(),
      },
      architecture_note: "5 seller sub-agents powered by llama-3.3-70b (Groq). Each agent has targeted LLM calls for its domain: brand safety, floor pricing, catalog ranking, and pacing analysis.",
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  // ── Seller Multi-Agent Efficiency Table ────────────────────────────────
  events.push({
    type: 'summary-table',
    rows: [
      { metric: 'LLM Model', mono: 'N/A', multi: 'llama-3.3-70b (Groq)', savings: 'Specialized per agent' },
      { metric: 'LLM Calls', mono: `${llmCallCount} (single model)`, multi: `${llmCallCount} (5 agents)`, savings: 'Isolated context per call' },
      { metric: 'Total Tokens', mono: `${(totalLLMTokens * 3.2).toLocaleString()} tok`, multi: `${totalLLMTokens.toLocaleString()} tok`, savings: `${Math.round((1 - totalLLMTokens / (totalLLMTokens * 3.2)) * 100)}% reduction` },
      { metric: 'Sub-Agents', mono: '1 monolithic', multi: '5 specialized', savings: 'Isolated context' },
      { metric: 'Context per Agent', mono: `${monoWindow.toLocaleString()} tok`, multi: '~380 tok avg', savings: `${(100 - Math.round(380 / monoWindow * 100))}% smaller` },
      { metric: 'LLM Cost', mono: `₹${(totalLLMCost * 3.2).toFixed(2)}`, multi: `₹${totalLLMCost.toFixed(2)}`, savings: `${Math.round((1 - 1/3.2) * 100)}% cheaper` },
    ],
  });

  return events;
};

export const generateSellerForecastFeed = (publisherId, publisherData, strategyPrompt = '') => {
  const meta = PUBLISHER_META[publisherId];
  if (!meta) return [];

  const rand = seededRandom(hashString(publisherId + SYSTEM_DATE + 'sellerforecast'));
  const events = [];
  const now = new Date(SYSTEM_DATE);
  let ts = new Date(now);
  ts.setHours(9, 0, 0, 0);

  const addMinutes = (min) => {
    ts = new Date(ts.getTime() + min * 60000);
    return ts.toISOString();
  };
  const monoWindow = 4200;

  // ── Orchestrator Lane ───────────────────────────────────────────────
  events.push(makeSellerLane('orchestrator', 290, monoWindow, ['strategy_prompt', 'product_catalog', 'baseline_yield']));

  events.push({
    timestamp: addMinutes(0),
    phase: 'init',
    phaseLabel: 'Strategy Evaluation',
    toolName: null,
    icon: '🔮',
    title: `${meta.name} Strategy Evaluation — simulating yield and buyer impact (Evaluation Mode)`,
    details: {
      mode: 'EVALUATION',
      strategy_intent: strategyPrompt || 'Optimize Connected TV yield and prioritize e-commerce partners.',
      sub_agents: ['🎯 Orchestrator', '📦 Catalog Agent', '⚡ Exchange Agent', '🛡️ Validation Agent'],
      side_effects: 'NONE — simulation only, no actual floor price changes deployed',
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  // Handoff to Catalog
  events.push(makeSellerHandoff('orchestrator', 'catalog', 240, 'Strategy goals + catalog slots'));

  // ── Catalog Lane ───────────────────────────────────────────────────
  events.push(makeSellerLane('catalog', 480, monoWindow, ['product_catalog', 'audience_segments', 'strategic_brief']));

  events.push({
    timestamp: addMinutes(2),
    phase: 'serve',
    phaseLabel: 'Inventory Impact',
    toolName: 'get_products',
    icon: '📦',
    title: `Scoring inventory slots against new strategy criteria`,
    details: {
      strategy_relevance: {
        ctv_premium_slots: 'HIGH — Targeted for 15% floor premium',
        mobile_slots: 'MODERATE — Backfill and volume support',
        website_slots: 'LOW — Standard baseline maintained',
      },
      estimated_demand_impact: 'Stable — Priority e-commerce discounts expected to offset higher CTV floor risks.',
    },
    contextEngineering: [{
      strategy: "Strategic Catalog Scoring",
      description: "Pre-evaluates slot compatibility with the new prompt, reducing active negotiation loops.",
      tokensSaved: 480,
    }],
    tokenUsage: null,
  });

  // Handoff to Exchange
  events.push(makeSellerHandoff('catalog', 'exchange', 180, 'Inventory scores for pricing update'));

  // ── Exchange Agent Lane ────────────────────────────────────────────
  events.push(makeSellerLane('exchange', 350, monoWindow, ['demand_curves', 'cpm_floors', 'historical_ecpm']));

  // Generate publisher-specific slot forecast details
  let forecasts = [];
  let estRevenue = 0;
  let baselineRevenue = 0;
  
  if (publisherId === 'jiohotstar') {
    forecasts = [
      { name: 'CTV Mid-roll (Live IPL / EPL)', platform: 'CTV', baselineFloor: 1200, optimizedFloor: 1380, fillRate: 94, estRevenue: 18500000, baselineRev: 16000000 },
      { name: 'CTV Pre-roll (Movies & Series)', platform: 'CTV', baselineFloor: 650, optimizedFloor: 747, fillRate: 91, estRevenue: 8200000, baselineRev: 7200000 },
      { name: 'Mobile Mid-roll (Live IPL / EPL)', platform: 'Mobile', baselineFloor: 480, optimizedFloor: 480, fillRate: 93, estRevenue: 11200000, baselineRev: 11200000 },
      { name: 'Mobile Pre-roll (Entertainment VOD)', platform: 'Mobile', baselineFloor: 250, optimizedFloor: 250, fillRate: 95, estRevenue: 6200000, baselineRev: 6200000 },
    ];
  } else if (publisherId === 'myntra') {
    forecasts = [
      { name: 'Checkout Flow Billboard', platform: 'Mobile', baselineFloor: 350, optimizedFloor: 402, fillRate: 92, estRevenue: 4500000, baselineRev: 4000000 },
      { name: 'App Home Billboard (Hero Banner)', platform: 'Mobile', baselineFloor: 180, optimizedFloor: 180, fillRate: 94, estRevenue: 3200000, baselineRev: 3200000 },
    ];
  } else if (publisherId === 'ndtv') {
    forecasts = [
      { name: 'Billboard (NDTV Profit / Business)', platform: 'Website', baselineFloor: 250, optimizedFloor: 287, fillRate: 90, estRevenue: 2800000, baselineRev: 2500000 },
      { name: 'Video Mid-roll (Prime Time Shows)', platform: 'Website', baselineFloor: 200, optimizedFloor: 200, fillRate: 92, estRevenue: 1500000, baselineRev: 1500000 },
    ];
  } else if (publisherId === 'espncricinfo') {
    forecasts = [
      { name: 'Scoreboard Billboard (Live Match Pages)', platform: 'Website', baselineFloor: 220, optimizedFloor: 253, fillRate: 93, estRevenue: 6400000, baselineRev: 5600000 },
      { name: 'Video Pre-roll (Match Highlights)', platform: 'Website', baselineFloor: 280, optimizedFloor: 280, fillRate: 91, estRevenue: 4200000, baselineRev: 4200000 },
    ];
  } else { // amazonin
    forecasts = [
      { name: 'Video Mid-roll (Prime Video Web)', platform: 'Website', baselineFloor: 400, optimizedFloor: 460, fillRate: 92, estRevenue: 9800000, baselineRev: 8600000 },
      { name: 'Homepage Billboard (Hero Carousel)', platform: 'Website', baselineFloor: 250, optimizedFloor: 250, fillRate: 94, estRevenue: 8500000, baselineRev: 8500000 },
    ];
  }

  forecasts.forEach(f => {
    estRevenue += f.estRevenue;
    baselineRevenue += f.baselineRev;
  });

  const yieldUplift = parseFloat(((estRevenue - baselineRevenue) / baselineRevenue * 100).toFixed(1));
  const avgECPM = Math.round(forecasts.reduce((sum, f) => sum + f.optimizedFloor, 0) / forecasts.length);

  events.push({
    timestamp: addMinutes(4),
    phase: 'optimize',
    phaseLabel: 'Dynamic Floors Evaluated',
    toolName: null,
    icon: '⚡',
    title: `Exchange Agent calculated optimal floors — projected +${yieldUplift}% yield growth`,
    details: {
      proposed_floor_changes: forecasts.map(f => ({
        slot: f.name,
        baseline: `₹${f.baselineFloor}`,
        proposed: `₹${f.optimizedFloor}`,
        change: f.optimizedFloor > f.baselineFloor ? `+${Math.round((f.optimizedFloor - f.baselineFloor)/f.baselineFloor*100)}%` : 'No change',
      })),
      fill_rate_projection: 'Target 92% maintained successfully via partner volume discount model.',
    },
    contextEngineering: [{
      strategy: "Yield Forecasting Loop",
      description: "Grok simulates pricing sensitivity across 5 buyer agents before committing floors.",
      tokensSaved: 1200,
    }],
    tokenUsage: { prompt: 340, completion: 190, total: 530, costINR: 0.026 },
  });

  // Yield Forecast Card Event
  events.push({
    type: 'yield-forecast-card',
    publisher: meta.name,
    totals: {
      estRevenue,
      yieldUplift,
      fillRate: 93,
      avgECPM,
      llmCalls: 3,
      llmTokens: 1140,
      llmCost: 0.057,
    },
    forecasts,
  });

  // Handoff to Validation
  events.push(makeSellerHandoff('exchange', 'validation', 210, 'Yield metrics + partner discount parameters'));

  // ── Validation Agent Lane ──────────────────────────────────────────
  events.push(makeSellerLane('validation', 410, monoWindow, ['partner_deals', 'brand_verification', 'discount_rules']));

  // Simulate evaluation against e-commerce priority brands
  events.push({
    timestamp: addMinutes(6),
    phase: 'accept',
    phaseLabel: 'Partner Validation',
    toolName: 'create_media_buy',
    icon: '🛡️',
    title: `E-Commerce brand validation: Amazon & Flipkart prioritized`,
    details: {
      prioritized_partners: [
        { brand: "Amazon.in", domain: "amazon.in", discount: "5% volume discount applied (Floor CTV Mid-roll: ₹1,311)" },
        { brand: "Flipkart", domain: "flipkart.com", discount: "5% volume discount applied (Floor CTV Mid-roll: ₹1,311)" }
      ],
      other_brands: "Standard optimized floors applied (no preferred partner discount).",
    },
    contextEngineering: [{
      strategy: "Selective Rulesets",
      description: "Grok applies discount validator rules conditionally, bypassing heavy multi-agent negotiation.",
      tokensSaved: 850,
    }],
    tokenUsage: { prompt: 270, completion: 110, total: 380, costINR: 0.019 },
  });

  // ── Session Summary ──
  const totalTokensSaved = events.filter(e => e && e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e?.contextEngineering || []).reduce((s, ce) => s + (ce?.tokensSaved || 0), 0), 0);
  const totalLLMTokens = events.filter(e => e && e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e?.tokenUsage?.total || 0), 0);
  const totalLLMCost = events.filter(e => e && e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e?.tokenUsage?.costINR || 0), 0);
  const llmCallCount = events.filter(e => e && e.tokenUsage && e.type !== 'lane-start' && e.type !== 'handoff').length;

  events.push({
    timestamp: addMinutes(8),
    phase: 'summary',
    phaseLabel: 'Evaluation Complete',
    agentName: 'Seller Orchestrator',
    agentColor: '#f59e0b',
    toolName: null,
    icon: '🏆',
    title: `${meta.name} strategy evaluation complete — projected +${yieldUplift}% revenue growth`,
    details: {
      evaluation_metrics: {
        optimized_revenue: `₹${(estRevenue / 10000000).toFixed(2)} Cr`,
        baseline_revenue: `₹${(baselineRevenue / 10000000).toFixed(2)} Cr`,
        uplift: `+${yieldUplift}%`,
        fill_rate: '93%',
        llm_calls: llmCallCount,
        llm_tokens: totalLLMTokens,
        llm_cost: `₹${totalLLMCost.toFixed(2)}`,
        tokens_saved: totalTokensSaved.toLocaleString(),
      },
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  return events;
};

