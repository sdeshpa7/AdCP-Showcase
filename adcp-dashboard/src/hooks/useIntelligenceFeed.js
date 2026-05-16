/**
 * useIntelligenceFeed.js — Buyer-side Live Intelligence Feed
 * 
 * Generates a deterministic, pre-scripted event timeline that reconstructs
 * the 5-phase BuyerAgent workflow (Discover → Evaluate → Allocate → Buy → Monitor)
 * for the currently selected advertiser.
 * 
 * Each event mirrors the real architecture from agent.py, server.py, and the PRD.
 */

import { SYSTEM_DATE, PUBLISHERS } from './useAgentData';

// ── Agent Strategy Profiles (maps to buyer/config.py personas) ──────────────
export const STRATEGY_NOTES = {
  flipkart: {
    brief: "Drive app installs and sales for the upcoming Big Billion Days sale. Target 18-35 mobile-first shoppers across India.",
    strategy: "Aggressive bidder. Prioritize high-reach guaranteed inventory. Willing to pay premium CPMs for brand-safe sports and entertainment content.",
    channels: ["ctv", "olv", "display"],
    excludes: ["Amazon.in"],
    brandExcludes: {},
  },
  amazon: {
    brief: "Promote Amazon Prime Video originals and Prime membership benefits. Target 25-45 affluent urban audiences.",
    strategy: "Data-driven optimizer. Focus on CTV for premium reach. Conservative on pricing — avoid overpaying. Prefer guaranteed deals.",
    channels: ["ctv", "olv"],
    excludes: ["Myntra"],
    brandExcludes: { "Amazon Prime": ["JioHotstar"] },
  },
  jio: {
    brief: "Launch campaign for JioAirFiber and 5G services. Target 20-40 tech-savvy consumers in Tier 1 and Tier 2 cities.",
    strategy: "Largest budget — aims for maximum reach and frequency. Will bid aggressively on sports inventory.",
    channels: ["ctv", "olv", "display"],
    excludes: [],
    brandExcludes: { "JioMart": ["Myntra", "Amazon.in"] },
  },
  hul: {
    brief: "Brand awareness campaign for Dove and Surf Excel across digital video. Target 25-50 household decision-makers.",
    strategy: "Brand safety is paramount. Only guaranteed, premium inventory. Moderate budgets — spread across multiple products.",
    channels: ["ctv", "olv"],
    excludes: [],
    brandExcludes: {},
  },
  hdfc: {
    brief: "Promote HDFC Bank credit cards and personal loans. Target 28-50 professionals and high-net-worth individuals.",
    strategy: "Conservative, value-focused buyer. Prioritize lowest CPM products with good audience match. Strict budget discipline.",
    channels: ["ctv", "olv", "display"],
    excludes: [],
    brandExcludes: {},
  },
};

// ── Publisher Slot Catalog (mirrors seller/config.py) ───────────────────────
export const PUBLISHER_SLOTS = {
  "JioHotstar": [
    { id: "jh-android-preroll", name: "Android Video Pre-roll", channel: "olv", cpm: 120, platform: "mobile_app" },
    { id: "jh-android-midroll", name: "Android Video Mid-roll", channel: "olv", cpm: 200, platform: "mobile_app" },
    { id: "jh-android-billboard", name: "Android Billboard", channel: "display", cpm: 60, platform: "mobile_app" },
    { id: "jh-ios-preroll", name: "iOS Video Pre-roll", channel: "olv", cpm: 140, platform: "mobile_app" },
    { id: "jh-ios-midroll", name: "iOS Video Mid-roll", channel: "olv", cpm: 220, platform: "mobile_app" },
    { id: "jh-ctv-preroll", name: "CTV Video Pre-roll", channel: "ctv", cpm: 800, platform: "ctv" },
    { id: "jh-ctv-midroll", name: "CTV Video Mid-roll", channel: "ctv", cpm: 1200, platform: "ctv" },
    { id: "jh-web-billboard", name: "Web Billboard", channel: "display", cpm: 80, platform: "website" },
  ],
  "ESPNcricinfo": [
    { id: "ec-web-billboard", name: "Web Billboard", channel: "display", cpm: 140, platform: "website" },
    { id: "ec-web-preroll", name: "Web Video Pre-roll", channel: "olv", cpm: 200, platform: "website" },
    { id: "ec-web-midroll", name: "Web Video Mid-roll", channel: "olv", cpm: 280, platform: "website" },
  ],
  "Myntra": [
    { id: "my-android-billboard", name: "Android Billboard", channel: "display", cpm: 100, platform: "mobile_app" },
    { id: "my-ios-billboard", name: "iOS Billboard", channel: "display", cpm: 120, platform: "mobile_app" },
  ],
  "NDTV": [
    { id: "nd-web-billboard", name: "Web Billboard", channel: "display", cpm: 80, platform: "website" },
    { id: "nd-web-preroll", name: "Web Video Pre-roll", channel: "olv", cpm: 160, platform: "website" },
    { id: "nd-web-midroll", name: "Web Video Mid-roll", channel: "olv", cpm: 240, platform: "website" },
  ],
  "Amazon.in": [
    { id: "az-web-billboard", name: "Web Billboard", channel: "display", cpm: 90, platform: "website" },
    { id: "az-web-preroll", name: "Web Video Pre-roll", channel: "olv", cpm: 180, platform: "website" },
    { id: "az-android-billboard", name: "Android Billboard", channel: "display", cpm: 110, platform: "mobile_app" },
    { id: "az-android-preroll", name: "Android Video Pre-roll", channel: "olv", cpm: 160, platform: "mobile_app" },
  ],
};

// ── Ports (mirrors seller/server.py PORT_MAP) ───────────────────────────────
export const SELLER_PORTS = {
  "JioHotstar": 9001,
  "ESPNcricinfo": 9002,
  "Myntra": 9003,
  "NDTV": 9004,
  "Amazon.in": 9005,
};

// ── Seeded random for deterministic output per agent ────────────────────────
export const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
export const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// ── Context Engineering Annotations ─────────────────────────────────────────
export const CE_PHASE_DECOUPLING = (phase) => ({
  strategy: "Phase Decoupling",
  description: `Only ${phase} instructions sent to LLM — buy/delivery/summary logic excluded from prompt.`,
  tokensSaved: 2400 + Math.floor(Math.random() * 800),
  detail: "Code-orchestrated loop replaces monolithic prompt. Each phase gets a focused, minimal instruction set.",
});

export const CE_PRE_LLM_FILTERING = (total, filtered, reason) => ({
  strategy: "Pre-LLM Filtering",
  description: `${filtered} of ${total} products dropped before LLM call (${reason}).`,
  tokensSaved: filtered * 190,
  detail: `Python filters products by channel match before LLM call. ~190 tokens saved per filtered product.`,
});

export const CE_STRUCTURED_PROMPTING = (promptTokens) => ({
  strategy: "Structured Prompting",
  description: "Mandatory JSON response schema enforced. Zero conversational history in context window.",
  tokensSaved: 1800,
  detail: `Output constrained to { evaluations: [{ product_id, relevance_score, reasoning, recommended_budget, recommended }] }. No free-form text. Prompt: ${promptTokens.toLocaleString()} tokens.`,
});

export const CE_STATE_SUMMARIZATION = (buysCount) => ({
  strategy: "State Summarization",
  description: `BudgetManager summary (6 fields) sent instead of full event history (${buysCount} events × ~300 tokens each).`,
  tokensSaved: buysCount * 300 - 120,
  detail: "Constant context window size: { total_budget, allocated, remaining, buys_created, token_usage, limits }.",
});

// ── Sub-Agent Definitions (Buyer Side) ──────────────────────────────────────
export const BUYER_AGENTS = {
  orchestrator: { name: 'Orchestrator', icon: '🎯', color: '#f59e0b', usesLLM: true, model: 'gemma-2-27b-it' },
  discovery:    { name: 'Discovery Agent', icon: '🔍', color: '#3b82f6', usesLLM: true, model: 'gemma-2-27b-it' },
  evaluation:   { name: 'Evaluation Agent', icon: '🧠', color: '#8b5cf6', usesLLM: true, model: 'gemma-2-27b-it' },
  budget:       { name: 'Budget Agent', icon: '💰', color: '#f97316', usesLLM: true, model: 'gemma-2-27b-it' },
  rtb:          { name: 'RTB Agent', icon: '⚡', color: '#ef4444', usesLLM: true, model: 'gemma-2-27b-it' },
  delivery:     { name: 'Delivery Agent', icon: '📊', color: '#10b981', usesLLM: true, model: 'gemma-2-27b-it' },
};

export const makeLane = (agentKey, contextTokens, monoTokens, contents) => ({
  type: 'lane-start',
  agent: BUYER_AGENTS[agentKey],
  contextWindow: {
    inputTokens: contextTokens,
    monoTokens: monoTokens,
    windowPct: Math.round((contextTokens / monoTokens) * 100),
    contents,
  },
  details: {
    agent_id: agentKey,
    agent_name: BUYER_AGENTS[agentKey].name,
    uses_llm: BUYER_AGENTS[agentKey].usesLLM,
    context_window: {
      allocated_tokens: contextTokens,
      monolithic_equivalent: monoTokens,
      efficiency: `${Math.round((contextTokens / monoTokens) * 100)}% of monolithic`,
      loaded_context: contents,
    },
    ...(agentKey === 'orchestrator' ? {
      role: 'Task delegation and workflow coordination',
      system_prompt: 'You are the Orchestrator. Route campaign brief to Discovery, then Evaluation, then Budget, then Delivery. No LLM inference — pure dispatch.',
      inputs: ['campaign_brief', 'agent_registry', 'seller_urls'],
      outputs: ['task_assignments', 'execution_plan'],
    } : agentKey === 'discovery' ? {
      role: 'Catalog querying via MCP tool calls',
      system_prompt: 'Query all registered seller MCP servers for available ad inventory. Apply channel and exclusion filters before forwarding to Evaluation.',
      tools: ['get_products (MCP)', 'get_audience_data (MCP)'],
      transport: 'JSON-RPC 2.0 over Streamable HTTP',
      inputs: ['seller_urls', 'channel_filter', 'exclusion_list'],
      outputs: ['filtered_product_catalog'],
    } : agentKey === 'evaluation' ? {
      role: 'LLM-based product relevance scoring',
      system_prompt: 'You are a Senior Media Buyer AI. Score each product on a 1-10 scale for campaign fit. Consider channel alignment, CPM efficiency, and audience overlap. Output structured JSON only.',
      model: 'gemma-3-27b-it',
      temperature: 0.3,
      max_output_tokens: 2048,
      output_format: 'JSON_SCHEMA_ENFORCED',
      inputs: ['filtered_products', 'campaign_brief', 'brand_guidelines'],
      outputs: ['scored_evaluations[]', 'recommended_budget_per_slot'],
      safety_filters: ['competitive_exclusion', 'brand_safety_threshold'],
    } : agentKey === 'budget' ? {
      role: 'Deterministic budget allocation',
      system_prompt: null,
      algorithm: 'Greedy allocation: sort by score desc, cap at 40% of remaining per slot, enforce monthly ceiling',
      inputs: ['scored_products', 'monthly_budget', 'max_single_buy'],
      outputs: ['allocation_plan[]', 'remaining_budget'],
    } : {
      role: 'Buy execution and delivery monitoring',
      system_prompt: null,
      tools: ['create_media_buy (MCP)', 'get_media_buy_delivery (MCP)'],
      transport: 'JSON-RPC 2.0 over Streamable HTTP',
      inputs: ['allocation_plan', 'seller_urls'],
      outputs: ['media_buy_records[]', 'delivery_metrics[]'],
    }),
  },
});

export const makeHandoff = (fromKey, toKey, payloadTokens, desc) => ({
  type: 'handoff',
  from: BUYER_AGENTS[fromKey].name,
  to: BUYER_AGENTS[toKey].name,
  toColor: BUYER_AGENTS[toKey].color,
  payloadTokens,
  payloadDescription: desc,
  details: {
    transfer: {
      from_agent: BUYER_AGENTS[fromKey].name,
      to_agent: BUYER_AGENTS[toKey].name,
      payload_size: `${payloadTokens} tokens`,
      payload_description: desc,
      serialization: 'Structured JSON (no conversational history)',
      context_strategy: 'Only filtered output passed forward — source agent context discarded',
    },
  },
});

// ── Main Generator ──────────────────────────────────────────────────────────

export const generateBuyerFeed = (agentId, agentData) => {
  const profile = STRATEGY_NOTES[agentId];
  if (!profile) return [];

  const rand = seededRandom(hashString(agentId + SYSTEM_DATE));
  const events = [];
  const now = new Date(SYSTEM_DATE);
  let ts = new Date(now);
  ts.setHours(9, 0, 0, 0); // Start at 9 AM

  const addMinutes = (min) => {
    ts = new Date(ts.getTime() + min * 60000);
    return ts.toISOString();
  };

  // Track total monolithic window size for comparison
  const monoWindow = 9700; // tokens if single agent held everything

  // ── Orchestrator Lane ─────────────────────────────────────────────
  events.push(makeLane('orchestrator', 320, monoWindow, ['agent_config', 'seller_registry']));

  // ── Phase 0: Initialization ───────────────────────────────────────────
  events.push({
    timestamp: addMinutes(0),
    phase: 'init',
    phaseLabel: 'Agent Initialization',
    agentName: 'Orchestrator',
    agentColor: '#f59e0b',
    toolName: null,
    icon: '🚀',
    title: `${agentData?.brand || agentId} Orchestrator initialized — dispatching 5 sub-agents`,
    details: {
      system_prompt_tokens: 280 + Math.floor(rand() * 40),
      persona: {
        brand: agentData?.brand || agentId,
        brief: profile.brief.substring(0, 80) + '...',
        channels: profile.channels,
        strategy: profile.strategy.substring(0, 60) + '...',
      },
      sub_agents: Object.values(BUYER_AGENTS).map(a => `${a.icon} ${a.name} (${a.usesLLM ? 'LLM' : 'Deterministic'})`),
      llm: { model: "gemma-3-27b-it", temperature: 0.3, max_output_tokens: 2048 },
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  // Handoff: Orchestrator → Discovery Agent
  events.push(makeHandoff('orchestrator', 'discovery', 420, `Campaign brief + ${PUBLISHERS.length} seller URLs`));

  // ── Discovery Agent Lane ──────────────────────────────────────────
  events.push(makeLane('discovery', 1240, monoWindow, ['campaign_brief', 'seller_urls', 'exclusion_list']));

  // ── Phase 1: Discovery (Discovery Agent) ──────────────────────────
  const queriedPublishers = PUBLISHERS.filter(p => !profile.excludes.includes(p));
  let allDiscoveredSlots = [];
  let totalDiscoveryTokens = 0;

  queriedPublishers.forEach((pub, idx) => {
    const slots = PUBLISHER_SLOTS[pub] || [];
    const port = SELLER_PORTS[pub] || 9000;
    allDiscoveredSlots.push(...slots.map(s => ({ ...s, publisher: pub })));
    
    events.push({
      timestamp: addMinutes(1 + idx * 2),
      phase: 'discover',
      phaseLabel: 'Product Discovery',
      toolName: 'get_products',
      icon: '🔍',
      title: `Querying ${pub} (localhost:${port}) — ${slots.length} products returned`,
      details: {
        request: {
          method: "tools/call",
          params: {
            name: "get_products",
            arguments: {
              brief: profile.brief,
              brand: { domain: agentData?.domain || `${agentId}.com` },
            },
          },
        },
        response: {
          products_count: slots.length,
          products: slots.map(s => ({
            product_id: s.id,
            name: `${pub} — ${s.name}`,
            channel: s.channel,
            cpm: `₹${s.cpm}`,
            delivery_type: "guaranteed",
          })),
        },
        transport: "JSON-RPC 2.0 over Streamable HTTP",
      },
      contextEngineering: [],
      tokenUsage: null,
    });
    totalDiscoveryTokens += slots.length * 45;
  });

  // Exclusion event
  const excludedPubs = PUBLISHERS.filter(p => profile.excludes.includes(p));
  if (excludedPubs.length > 0) {
    events.push({
      timestamp: addMinutes(1),
      phase: 'discover',
      phaseLabel: 'Competitive Exclusion',
      toolName: null,
      icon: '🛡️',
      title: `Competitive exclusion: ${excludedPubs.join(', ')} blocked at protocol level`,
      details: {
        excluded_publishers: excludedPubs,
        reason: "Brand-level competitive exclusion — these publishers are direct competitors",
        enforcement: "Protocol-level (pre-discovery). Agent never sees excluded inventory.",
        tokens_saved: excludedPubs.reduce((sum, p) => sum + (PUBLISHER_SLOTS[p]?.length || 0) * 190, 0),
      },
      contextEngineering: [{
        strategy: "Protocol-Level Exclusion",
        description: `${excludedPubs.join(', ')} inventory never enters the agent's context window.`,
        tokensSaved: excludedPubs.reduce((sum, p) => sum + (PUBLISHER_SLOTS[p]?.length || 0) * 190, 0),
        detail: "Exclusions handled by the MCP client layer, not by the LLM. Zero inference cost for competitive separation.",
      }],
      tokenUsage: null,
    });
  }

  // Brand-level exclusions
  Object.entries(profile.brandExcludes).forEach(([brand, pubs]) => {
    events.push({
      timestamp: addMinutes(1),
      phase: 'discover',
      phaseLabel: 'Brand-Specific Exclusion',
      toolName: null,
      icon: '⚠️',
      title: `Brand exclusion: ${brand} cannot run on ${pubs.join(', ')}`,
      details: {
        brand,
        excluded_publishers: pubs,
        reason: `${brand} has a brand-specific competitive conflict with ${pubs.join(', ')}`,
      },
      contextEngineering: [],
      tokenUsage: null,
    });
  });

  // Pre-LLM Filtering
  const channelSet = new Set(profile.channels);
  const matchedSlots = allDiscoveredSlots.filter(s => channelSet.has(s.channel));
  const droppedSlots = allDiscoveredSlots.length - matchedSlots.length;

  events.push({
    timestamp: addMinutes(2),
    phase: 'discover',
    phaseLabel: 'Pre-LLM Filtering',
    toolName: null,
    icon: '⚡',
    title: `Channel filter applied: ${matchedSlots.length} products retained, ${droppedSlots} dropped`,
    details: {
      total_discovered: allDiscoveredSlots.length,
      channel_filter: profile.channels,
      retained: matchedSlots.length,
      dropped: droppedSlots,
      dropped_products: allDiscoveredSlots.filter(s => !channelSet.has(s.channel)).map(s => ({
        id: s.id,
        publisher: s.publisher,
        channel: s.channel,
        reason: `Channel '${s.channel}' not in agent's preferred channels [${profile.channels.join(', ')}]`,
      })),
    },
    contextEngineering: droppedSlots > 0 ? [
      CE_PRE_LLM_FILTERING(allDiscoveredSlots.length, droppedSlots, `channel mismatch: ${profile.channels.join('+')} filter`)
    ] : [],
    tokenUsage: null,
  });

  // Handoff: Discovery Agent → Evaluation Agent
  const discoveryPayloadTokens = matchedSlots.length * 195;
  events.push(makeHandoff('discovery', 'evaluation', discoveryPayloadTokens, `${matchedSlots.length} filtered products (channel-matched)`));

  // ── Evaluation Agent Lane ─────────────────────────────────────────
  const evalContextTokens = 420 + discoveryPayloadTokens;
  events.push(makeLane('evaluation', evalContextTokens, monoWindow, ['filtered_products', 'campaign_brief', 'json_schema']));

  // ── Phase 2: LLM Evaluation (Evaluation Agent) ───────────────────────
  const promptTokens = 420 + matchedSlots.length * 195 + Math.floor(rand() * 100);
  const completionTokens = 180 + matchedSlots.length * 85 + Math.floor(rand() * 50);
  const totalEvalTokens = promptTokens + completionTokens;
  const evalCost = (totalEvalTokens / 1_000_000) * 0.15 * 95;

  // Score each slot
  const evaluations = matchedSlots.map((slot, idx) => {
    const channelBonus = channelSet.has(slot.channel) ? 3.0 : 0;
    const cpmPenalty = Math.max(0, (slot.cpm - 200) / 100);
    const pubBonus = slot.publisher === "JioHotstar" ? 1.5 : (slot.publisher === "ESPNcricinfo" ? 1.0 : 0);
    const score = Math.min(10, Math.max(1, 5.5 + channelBonus - cpmPenalty + pubBonus + (rand() * 2 - 1)));
    const roundedScore = Math.round(score * 10) / 10;

    const reasonings = {
      ctv: `Premium CTV placement — high-value urban households on the biggest screen. ${slot.cpm > 500 ? 'Premium CPM justified by affluent audience.' : 'Competitive CPM for CTV.'}`,
      olv: `Mobile video reach for ${profile.channels.includes('olv') ? 'core audience' : 'secondary audience'}. CPM ₹${slot.cpm} is ${slot.cpm < 200 ? 'competitive' : 'above average'} for ${slot.name}.`,
      display: `Display/Billboard placement. ${roundedScore > 6 ? 'Good visibility for brand awareness.' : 'Limited direct-response potential. Better suited for upper-funnel campaigns.'}`,
    };

    return {
      product_id: slot.id,
      product_name: `${slot.publisher} — ${slot.name}`,
      publisher: slot.publisher,
      relevance_score: roundedScore,
      reasoning: reasonings[slot.channel] || "Standard inventory evaluation.",
      recommended_budget: roundedScore >= 6 ? Math.floor(50000 + rand() * 200000) : 0,
      recommended: roundedScore >= 6,
      channel: slot.channel,
      cpm: slot.cpm,
    };
  }).sort((a, b) => b.relevance_score - a.relevance_score);

  events.push({
    timestamp: addMinutes(5),
    phase: 'evaluate',
    phaseLabel: 'LLM Evaluation',
    toolName: 'LLM: evaluate_products',
    icon: '🧠',
    title: `Evaluated ${matchedSlots.length} products with gemma-3-27b-it`,
    details: {
      llm_call: {
        model: "gemma-3-27b-it",
        temperature: 0.3,
        max_output_tokens: 2048,
        system_prompt: "Senior media buyer AI agent persona with campaign brief and budget constraints",
      },
      evaluations: evaluations.map(e => ({
        product: e.product_name,
        score: `${e.relevance_score}/10`,
        recommended: e.recommended ? '✅' : '❌',
        reasoning: e.reasoning,
        budget: e.recommended ? `₹${(e.recommended_budget / 100000).toFixed(1)}L` : '—',
      })),
      recommended_count: evaluations.filter(e => e.recommended).length,
      rejected_count: evaluations.filter(e => !e.recommended).length,
    },
    contextEngineering: [
      CE_PHASE_DECOUPLING("evaluation"),
      CE_STRUCTURED_PROMPTING(promptTokens),
    ],
    tokenUsage: {
      prompt: promptTokens,
      completion: completionTokens,
      total: totalEvalTokens,
      costINR: parseFloat(evalCost.toFixed(4)),
    },
  });

  // Handoff: Evaluation Agent → Budget Agent
  const recommended = evaluations.filter(e => e.recommended);
  const evalPayloadTokens = recommended.length * 85;
  events.push(makeHandoff('evaluation', 'budget', evalPayloadTokens, `${recommended.length} scored products (recommended)`));

  // ── Budget Agent Lane ─────────────────────────────────────────────
  events.push(makeLane('budget', 620, monoWindow, ['scored_products', 'budget_state_summary']));

  // ── Phase 3: Budget Allocation (Budget Agent) ─────────────────────────
  const totalBudget = agentData?.financials?.total_budget || 100000000;
  const monthlyBudget = totalBudget / 12;
  const maxSingleBuy = monthlyBudget * 0.5;
  let remainingBudget = monthlyBudget;

  const allocations = recommended.slice(0, 5).map(e => {
    const alloc = Math.min(e.recommended_budget, maxSingleBuy, remainingBudget * 0.4);
    remainingBudget -= alloc;
    return {
      product_id: e.product_id,
      product_name: e.product_name,
      publisher: e.publisher,
      budget: Math.floor(alloc),
      pct_of_remaining: ((alloc / monthlyBudget) * 100).toFixed(1),
      channel: e.channel,
      cpm: e.cpm,
    };
  }).filter(a => a.budget > 1000);

  const reserveKept = Math.floor(remainingBudget);
  const eventCount = 5 + evaluations.length; // Approximate events so far

  events.push({
    timestamp: addMinutes(3),
    phase: 'allocate',
    phaseLabel: 'Budget Allocation',
    toolName: 'BudgetManager.allocate',
    icon: '💰',
    title: `Allocated ₹${(allocations.reduce((s, a) => s + a.budget, 0) / 100000).toFixed(1)}L across ${allocations.length} products`,
    details: {
      budget_state: {
        total_monthly: `₹${(monthlyBudget / 100000).toFixed(1)}L`,
        max_single_buy: `₹${(maxSingleBuy / 100000).toFixed(1)}L`,
        reserve_kept: `₹${(reserveKept / 100000).toFixed(1)}L (${((reserveKept / monthlyBudget) * 100).toFixed(0)}% buffer)`,
      },
      allocations: allocations.map(a => ({
        product: a.product_name,
        budget: `₹${(a.budget / 100000).toFixed(1)}L`,
        pct: `${a.pct_of_remaining}%`,
      })),
    },
    contextEngineering: [
      CE_STATE_SUMMARIZATION(eventCount),
    ],
    tokenUsage: null,
  });

  // Assign buy_type to each allocation: ~20% are Open Exchange (RTB), rest are Direct Buy
  allocations.forEach((alloc, idx) => {
    alloc.buy_type = (idx % 3 === 0) ? 'exchange' : 'direct';
  });

  const directAllocations = allocations.filter(a => a.buy_type === 'direct');
  const exchangeAllocations = allocations.filter(a => a.buy_type === 'exchange');

  // ── Route: Budget Agent splits into two paths ─────────────────────

  // Path 1: Direct allocations → Delivery Agent
  if (directAllocations.length > 0) {
    events.push(makeHandoff('budget', 'delivery', directAllocations.length * 60,
      `${directAllocations.length} direct buy orders (guaranteed inventory)`));

    // ── Delivery Agent Lane (Direct Buys) ─────────────────────────────
    events.push(makeLane('delivery', directAllocations.length * 120, monoWindow, ['buy_ids', 'seller_endpoints']));

    directAllocations.forEach((alloc, idx) => {
      const port = SELLER_PORTS[alloc.publisher] || 9000;
      const buyId = `mb-${agentId.substring(0, 2)}${String(idx + 1).padStart(2, '0')}-${Math.floor(rand() * 9999).toString().padStart(4, '0')}`;

      events.push({
        timestamp: addMinutes(2 + idx),
        phase: 'buy',
        phaseLabel: 'Direct Buy Execution',
        toolName: 'create_media_buy',
        icon: '📋',
        title: `Direct buy on ${alloc.publisher}: ${alloc.product_name} (₹${(alloc.budget / 100000).toFixed(1)}L)`,
        details: {
          buy_type: 'Direct Buy (Guaranteed)',
          request: {
            method: "tools/call",
            params: {
              name: "create_media_buy",
              arguments: {
                brand: { domain: agentData?.domain || `${agentId}.com` },
                idempotency_key: `${agentId}-${Date.now()}-${idx}`,
                start_time: "asap",
                end_time: "2026-06-30T23:59:59Z",
                packages: [{
                  product_id: alloc.product_id,
                  budget: alloc.budget,
                  pricing_option_id: `po-${alloc.product_id}`,
                }],
              },
            },
          },
          response: {
            media_buy_id: buyId,
            status: "active",
            valid_actions: ["pause", "cancel"],
            revision: 1,
            sandbox: true,
          },
          transport: `JSON-RPC 2.0 → localhost:${port}/mcp`,
        },
        contextEngineering: [],
        tokenUsage: null,
      });
    });
  }

  // Path 2: Exchange allocations → RTB Agent
  if (exchangeAllocations.length > 0) {
    events.push(makeHandoff('budget', 'rtb', exchangeAllocations.length * 80,
      `${exchangeAllocations.length} exchange bid requests (open auction inventory)`));

    // ── RTB Agent Lane ──────────────────────────────────────────────
    events.push(makeLane('rtb', exchangeAllocations.length * 150, monoWindow, ['bid_requests', 'floor_prices', 'auction_config']));

    exchangeAllocations.forEach((alloc, idx) => {
      const port = SELLER_PORTS[alloc.publisher] || 9000;
      const floorCPM = Math.floor(alloc.cpm * 0.70);
      const bidCPM = Math.floor(alloc.cpm * (0.85 + rand() * 0.30));
      const numBidders = 3 + Math.floor(rand() * 5);
      const won = rand() > 0.2; // 80% win rate for our agent
      const clearingCPM = won ? Math.floor(floorCPM + (bidCPM - floorCPM) * (0.5 + rand() * 0.3)) : Math.floor(bidCPM * (1.02 + rand() * 0.1));

      // Bid submission event
      events.push({
        timestamp: addMinutes(1 + idx * 2),
        phase: 'rtb',
        phaseLabel: 'RTB Auction',
        agentName: 'RTB Agent',
        agentColor: '#ef4444',
        toolName: 'submit_bid',
        icon: '⚡',
        title: `Bid submitted: ${alloc.publisher} ${alloc.product_name} — ₹${bidCPM} CPM (floor: ₹${floorCPM})`,
        details: {
          bid_request: {
            ad_slot: alloc.product_id,
            publisher: alloc.publisher,
            floor_price_cpm: `₹${floorCPM}`,
            auction_type: 'second_price',
            targeting: { channels: profile.channels, brand: agentData?.brand },
          },
          bid_response: {
            our_bid_cpm: `₹${bidCPM}`,
            competitors: numBidders,
            bid_strategy: bidCPM > alloc.cpm ? 'aggressive' : 'value',
          },
          outcome: won ? {
            status: '🏆 WON',
            clearing_price_cpm: `₹${clearingCPM}`,
            savings_vs_bid: `₹${bidCPM - clearingCPM} CPM (${((1 - clearingCPM / bidCPM) * 100).toFixed(0)}% savings via 2nd-price)`,
            effective_budget: `₹${(alloc.budget * (clearingCPM / bidCPM) / 100000).toFixed(1)}L`,
          } : {
            status: '❌ LOST',
            winning_bid_cpm: `₹${clearingCPM}`,
            our_bid_cpm: `₹${bidCPM}`,
            delta: `₹${clearingCPM - bidCPM} above our max`,
          },
          transport: `OpenRTB 2.6 → localhost:${port}/rtb`,
        },
        contextEngineering: [],
        tokenUsage: null,
      });

      alloc._won = won;
      alloc._clearingCPM = clearingCPM;
    });

    // Handoff: RTB Agent → Delivery Agent (won bids only)
    const wonBids = exchangeAllocations.filter(a => a._won);
    if (wonBids.length > 0) {
      events.push(makeHandoff('rtb', 'delivery', wonBids.length * 60,
        `${wonBids.length} won auction(s) — ready for execution`));

      wonBids.forEach((alloc, idx) => {
        const port = SELLER_PORTS[alloc.publisher] || 9000;
        const buyId = `rtb-${agentId.substring(0, 2)}${String(idx + 1).padStart(2, '0')}-${Math.floor(rand() * 9999).toString().padStart(4, '0')}`;

        events.push({
          timestamp: addMinutes(1 + idx),
          phase: 'buy',
          phaseLabel: 'RTB Won — Execution',
          toolName: 'execute_rtb_win',
          icon: '⚡',
          title: `RTB win executed: ${alloc.publisher} ${alloc.product_name} at ₹${alloc._clearingCPM} CPM`,
          details: {
            buy_type: 'Open Exchange (RTB)',
            auction_result: {
              clearing_price: `₹${alloc._clearingCPM} CPM`,
              auction_type: 'second_price',
            },
            response: {
              media_buy_id: buyId,
              status: "active",
              valid_actions: ["pause", "cancel"],
              revision: 1,
            },
            transport: `OpenRTB 2.6 → localhost:${port}/rtb`,
          },
          contextEngineering: [],
          tokenUsage: null,
        });
      });
    }
  }


  // ── Phase 5: Delivery Monitoring ──────────────────────────────────────
  allocations.forEach((alloc, idx) => {
    const port = SELLER_PORTS[alloc.publisher] || 9000;
    const impressions = Math.floor((alloc.budget / alloc.cpm) * 1000 * (0.85 + rand() * 0.15));
    const clicks = Math.floor(impressions * (0.002 + rand() * 0.006));
    const spend = Math.floor(alloc.budget * (0.88 + rand() * 0.12));
    const roas = parseFloat((3.5 + rand() * 4.0).toFixed(1));
    const deliveryPct = ((impressions / ((alloc.budget / alloc.cpm) * 1000)) * 100).toFixed(1);

    events.push({
      timestamp: addMinutes(10 + idx * 3),
      phase: 'monitor',
      phaseLabel: 'Delivery Monitoring',
      toolName: 'get_media_buy_delivery',
      icon: '📊',
      title: `Delivery check: ${alloc.publisher} — ${deliveryPct}% delivered, ROAS ${roas}x`,
      details: {
        request: {
          method: "tools/call",
          params: {
            name: "get_media_buy_delivery",
            arguments: {
              account: { account_id: "test_account" },
              media_buy_ids: [`mb-${agentId.substring(0, 2)}${String(idx + 1).padStart(2, '0')}`],
            },
          },
        },
        response: {
          impressions: impressions.toLocaleString('en-IN'),
          clicks: clicks.toLocaleString('en-IN'),
          spend: `₹${(spend / 100000).toFixed(2)}L`,
          roas: `${roas}x`,
          delivery_pct: `${deliveryPct}%`,
        },
        performance_status: parseFloat(deliveryPct) >= 90 ? "✅ On-pace" : (parseFloat(deliveryPct) >= 70 ? "⚠️ Slightly behind" : "🔴 Under-pacing"),
      },
      contextEngineering: [],
      tokenUsage: null,
    });
  });

  // ── Multi-Agent Comparison Summary ────────────────────────────────────
  const summaryPromptTokens = 600 + allocations.length * 120;
  const summaryCompletionTokens = 350 + Math.floor(rand() * 100);
  const summaryTotalTokens = summaryPromptTokens + summaryCompletionTokens;
  const summaryCost = (summaryTotalTokens / 1_000_000) * 0.15 * 95;

  const totalTokens = totalEvalTokens + summaryTotalTokens;
  const totalCost = evalCost + summaryCost;
  const totalTokensSaved = events.filter(e => e.type !== 'lane-start' && e.type !== 'handoff').reduce((sum, e) =>
    sum + (e.contextEngineering || []).reduce((s, ce) => s + (ce.tokensSaved || 0), 0), 0);

  events.push({
    timestamp: addMinutes(5),
    phase: 'summary',
    phaseLabel: 'Campaign Summary',
    agentName: 'Orchestrator',
    agentColor: '#f59e0b',
    toolName: 'LLM: generate_summary',
    icon: '\ud83d\udccb',
    title: `Campaign complete \u2014 ${allocations.length} buys, ${totalTokens.toLocaleString()} total tokens, \u20b9${totalCost.toFixed(2)} LLM cost`,
    details: {
      llm_call: {
        model: "gemma-3-27b-it",
        temperature: 0.5,
        max_output_tokens: 1024,
        input: "budget_summary + buy IDs (not full event log)",
      },
      total_metrics: {
        llm_calls: 2,
        total_tokens: totalTokens.toLocaleString(),
        total_cost: `\u20b9${totalCost.toFixed(2)}`,
        tokens_saved_by_context_engineering: totalTokensSaved.toLocaleString(),
        savings_pct: `${((totalTokensSaved / (totalTokens + totalTokensSaved)) * 100).toFixed(0)}%`,
      },
    },
    contextEngineering: [
      CE_STATE_SUMMARIZATION(allocations.length + evaluations.length),
    ],
    tokenUsage: {
      prompt: summaryPromptTokens,
      completion: summaryCompletionTokens,
      total: summaryTotalTokens,
      costINR: parseFloat(summaryCost.toFixed(4)),
    },
  });

  // ── Final: Multi-Agent Efficiency Table ────────────────────────────────
  events.push({
    type: 'summary-table',
    rows: [
      { metric: 'Max Context Window', mono: `${monoWindow.toLocaleString()} tok`, multi: `${evalContextTokens.toLocaleString()} tok (Eval Agent)`, savings: `${(100 - Math.round(evalContextTokens / monoWindow * 100))}% smaller` },
      { metric: 'LLM Calls', mono: '2', multi: '2 (same)', savings: '\u2014' },
      { metric: 'Total LLM Tokens', mono: `~${(totalTokens + totalTokensSaved).toLocaleString()}`, multi: `~${totalTokens.toLocaleString()}`, savings: `${Math.round(totalTokensSaved / (totalTokens + totalTokensSaved) * 100)}% fewer` },
      { metric: 'Non-LLM Agents', mono: '0 of 1', multi: '3 of 4', savings: '75% deterministic' },
      { metric: 'Tokens Saved', mono: '0', multi: totalTokensSaved.toLocaleString(), savings: `\u20b9${(totalTokensSaved / 1000000 * 0.15 * 95).toFixed(2)} saved` },
    ],
  });

  return events;
};
