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
  orchestrator: { name: 'Seller Orchestrator', icon: '🏢', color: '#f59e0b', usesLLM: true, model: 'grok-3-mini' },
  catalog:      { name: 'Catalog Agent', icon: '📦', color: '#3b82f6', usesLLM: true, model: 'grok-3-mini' },
  exchange:     { name: 'Exchange Agent', icon: '⚡', color: '#ef4444', usesLLM: true, model: 'grok-3-mini' },
  validation:   { name: 'Validation Agent', icon: '✅', color: '#f97316', usesLLM: true, model: 'grok-3-mini' },
  delivery:     { name: 'Delivery Agent', icon: '📊', color: '#10b981', usesLLM: true, model: 'grok-3-mini' },
};

const makeSellerLane = (agentKey, contextTokens, monoTokens, contents) => ({
  type: 'lane-start',
  agent: SELLER_AGENTS[agentKey],
  contextWindow: { inputTokens: contextTokens, monoTokens, windowPct: Math.round((contextTokens / monoTokens) * 100), contents },
  details: {
    agent_id: agentKey,
    agent_name: SELLER_AGENTS[agentKey].name,
    uses_llm: true,
    llm_model: 'grok-3-mini',
    llm_provider: 'xAI',
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
    title: `${meta.name} Seller Agent initialized on :${meta.port} — LLM: grok-3-mini (xAI)`,
    details: {
      server: {
        publisher: meta.name,
        port: meta.port,
        products_loaded: meta.slots,
        cpm_range: meta.cpmRange,
        category: meta.category,
        transport: "AdCP SDK (adcp.server.ADCPHandler)",
        protocol: "JSON-RPC 2.0 over Streamable HTTP",
        llm: { model: "grok-3-mini", provider: "xAI", api: "OpenAI-compatible" },
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
        model: "grok-3-mini",
        provider: "xAI",
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
          model: "grok-3-mini",
          provider: "xAI",
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
  const totalTokensSaved = events.filter(e => e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e.contextEngineering || []).reduce((s, ce) => s + (ce.tokensSaved || 0), 0), 0);
  const totalLLMTokens = events.filter(e => e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e.tokenUsage?.total || 0), 0);
  const totalLLMCost = events.filter(e => e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e.tokenUsage?.costINR || 0), 0);
  const llmCallCount = events.filter(e => e.tokenUsage && e.type !== 'lane-start' && e.type !== 'handoff').length;

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
        llm_model: "grok-3-mini",
        llm_provider: "xAI",
        llm_calls: llmCallCount,
        llm_tokens: totalLLMTokens,
        llm_cost: `\u20b9${totalLLMCost.toFixed(2)}`,
        total_tokens_saved: totalTokensSaved.toLocaleString(),
      },
      architecture_note: "5 seller sub-agents powered by grok-3-mini (xAI). Each agent has targeted LLM calls for its domain: brand safety, floor pricing, catalog ranking, and pacing analysis.",
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  // ── Seller Multi-Agent Efficiency Table ────────────────────────────────
  events.push({
    type: 'summary-table',
    rows: [
      { metric: 'LLM Model', mono: 'N/A', multi: 'grok-3-mini (xAI)', savings: 'Specialized per agent' },
      { metric: 'LLM Calls', mono: `${llmCallCount} (single model)`, multi: `${llmCallCount} (5 agents)`, savings: 'Isolated context per call' },
      { metric: 'Total Tokens', mono: `${(totalLLMTokens * 3.2).toLocaleString()} tok`, multi: `${totalLLMTokens.toLocaleString()} tok`, savings: `${Math.round((1 - totalLLMTokens / (totalLLMTokens * 3.2)) * 100)}% reduction` },
      { metric: 'Sub-Agents', mono: '1 monolithic', multi: '5 specialized', savings: 'Isolated context' },
      { metric: 'Context per Agent', mono: `${monoWindow.toLocaleString()} tok`, multi: '~380 tok avg', savings: `${(100 - Math.round(380 / monoWindow * 100))}% smaller` },
      { metric: 'LLM Cost', mono: `₹${(totalLLMCost * 3.2).toFixed(2)}`, multi: `₹${totalLLMCost.toFixed(2)}`, savings: `${Math.round((1 - 1/3.2) * 100)}% cheaper` },
    ],
  });

  return events;
};
