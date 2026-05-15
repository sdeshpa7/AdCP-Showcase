/**
 * useForecastFeed.js — Forecast-mode Intelligence Feed
 * 
 * Runs Discovery → Evaluation → Forecast Agent (no buy execution).
 * Produces projected impressions, reach, ROAS per slot without side effects.
 */

import { SYSTEM_DATE, PUBLISHERS } from './useAgentData';
import {
  STRATEGY_NOTES, PUBLISHER_SLOTS, SELLER_PORTS,
  BUYER_AGENTS, makeLane, makeHandoff,
  CE_PHASE_DECOUPLING, CE_PRE_LLM_FILTERING, CE_STRUCTURED_PROMPTING,
  seededRandom, hashString,
} from './useIntelligenceFeed';

// ── Forecast Agent Definition ───────────────────────────────────────────────
const FORECAST_AGENT = { name: 'Forecast Agent', icon: '🔮', color: '#ec4899', usesLLM: false };

const makeForecastLane = (contextTokens, monoTokens, contents) => ({
  type: 'lane-start',
  agent: FORECAST_AGENT,
  contextWindow: {
    inputTokens: contextTokens,
    monoTokens,
    windowPct: Math.round((contextTokens / monoTokens) * 100),
    contents,
  },
});

const makeForecastHandoff = (fromKey, payloadTokens, desc) => ({
  type: 'handoff',
  from: BUYER_AGENTS[fromKey].name,
  to: FORECAST_AGENT.name,
  toColor: FORECAST_AGENT.color,
  payloadTokens,
  payloadDescription: desc,
});

// ── Delivery Math (from seller/delivery.py) ─────────────────────────────────
const CTR_BENCHMARKS = {
  video_preroll: [0.008, 0.015],
  video_midroll: [0.006, 0.012],
  billboard: [0.003, 0.006],
  display: [0.002, 0.005],
};

const ROAS_BENCHMARKS = {
  "JioHotstar": [3.5, 6.5],
  "Amazon.in": [5.0, 9.0],
  "Myntra": [4.0, 7.0],
  "ESPNcricinfo": [2.0, 4.0],
  "NDTV": [2.0, 3.5],
};

const inferFormat = (slotId) => {
  const s = slotId.toLowerCase();
  if (s.includes('midroll')) return 'video_midroll';
  if (s.includes('preroll')) return 'video_preroll';
  if (s.includes('billboard')) return 'billboard';
  return 'display';
};

// ── Main Forecast Generator ─────────────────────────────────────────────────
export const generateForecastFeed = (agentId, agentData) => {
  const profile = STRATEGY_NOTES[agentId];
  if (!profile) return [];

  const rand = seededRandom(hashString(agentId + SYSTEM_DATE + 'forecast'));
  const events = [];
  const now = new Date(SYSTEM_DATE);
  let ts = new Date(now);
  ts.setHours(9, 0, 0, 0);

  const addMinutes = (min) => {
    ts = new Date(ts.getTime() + min * 60000);
    return ts.toISOString();
  };

  const monoWindow = 9700;

  // ── Orchestrator Lane ─────────────────────────────────────────────────
  events.push(makeLane('orchestrator', 320, monoWindow, ['agent_config', 'seller_registry']));

  events.push({
    timestamp: addMinutes(0),
    phase: 'init',
    phaseLabel: 'Forecast Initialization',
    agentName: 'Orchestrator',
    agentColor: '#f59e0b',
    toolName: null,
    icon: '🔮',
    title: `${agentData?.brand || agentId} Forecast Mode — Discovery + Evaluation + Forecast (no execution)`,
    details: {
      mode: 'FORECAST',
      sub_agents: ['🎯 Orchestrator', '🔍 Discovery Agent', '🧠 Evaluation Agent', '🔮 Forecast Agent'],
      skipped_agents: ['💰 Budget Agent (no allocation)', '📊 Delivery Agent (no buy execution)'],
      side_effects: 'NONE — no create_media_buy calls will be made',
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  // ── Handoff → Discovery ───────────────────────────────────────────────
  events.push(makeHandoff('orchestrator', 'discovery', 420, `Campaign brief + ${PUBLISHERS.length} seller URLs`));
  events.push(makeLane('discovery', 1240, monoWindow, ['campaign_brief', 'seller_urls', 'exclusion_list']));

  // ── Phase 1: Discovery ────────────────────────────────────────────────
  const queriedPublishers = PUBLISHERS.filter(p => !profile.excludes.includes(p));
  let allDiscoveredSlots = [];

  queriedPublishers.forEach((pub, idx) => {
    const slots = PUBLISHER_SLOTS[pub] || [];
    allDiscoveredSlots.push(...slots.map(s => ({ ...s, publisher: pub })));
    const port = SELLER_PORTS[pub] || 9000;

    events.push({
      timestamp: addMinutes(1 + idx * 2),
      phase: 'discover',
      phaseLabel: 'Product Discovery',
      agentName: 'Discovery Agent',
      agentColor: '#3b82f6',
      toolName: 'get_products',
      icon: '🔍',
      title: `Querying ${pub} (localhost:${port}) — ${slots.length} products returned`,
      details: {
        response: { products_count: slots.length },
        transport: "JSON-RPC 2.0 over Streamable HTTP",
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
    agentName: 'Discovery Agent',
    agentColor: '#3b82f6',
    toolName: null,
    icon: '⚡',
    title: `Channel filter: ${matchedSlots.length} retained, ${droppedSlots} dropped`,
    details: { retained: matchedSlots.length, dropped: droppedSlots, channels: profile.channels },
    contextEngineering: droppedSlots > 0 ? [
      CE_PRE_LLM_FILTERING(allDiscoveredSlots.length, droppedSlots, `channel mismatch: ${profile.channels.join('+')} filter`)
    ] : [],
    tokenUsage: null,
  });

  // ── Handoff → Evaluation ──────────────────────────────────────────────
  const discoveryPayloadTokens = matchedSlots.length * 195;
  events.push(makeHandoff('discovery', 'evaluation', discoveryPayloadTokens, `${matchedSlots.length} filtered products (channel-matched)`));

  const evalContextTokens = 420 + discoveryPayloadTokens;
  events.push(makeLane('evaluation', evalContextTokens, monoWindow, ['filtered_products', 'campaign_brief', 'json_schema']));

  // ── Phase 2: Evaluation ───────────────────────────────────────────────
  const promptTokens = 420 + matchedSlots.length * 195 + Math.floor(rand() * 100);
  const completionTokens = 180 + matchedSlots.length * 85 + Math.floor(rand() * 50);
  const totalEvalTokens = promptTokens + completionTokens;
  const evalCost = (totalEvalTokens / 1_000_000) * 0.15 * 95;

  const evaluations = matchedSlots.map((slot) => {
    const channelBonus = channelSet.has(slot.channel) ? 3.0 : 0;
    const cpmPenalty = Math.max(0, (slot.cpm - 200) / 100);
    const pubBonus = slot.publisher === "JioHotstar" ? 1.5 : (slot.publisher === "ESPNcricinfo" ? 1.0 : 0);
    const score = Math.min(10, Math.max(1, 5.5 + channelBonus - cpmPenalty + pubBonus + (rand() * 2 - 1)));
    const roundedScore = Math.round(score * 10) / 10;

    return {
      product_id: slot.id,
      product_name: `${slot.publisher} — ${slot.name}`,
      publisher: slot.publisher,
      relevance_score: roundedScore,
      recommended: roundedScore >= 6,
      recommended_budget: roundedScore >= 6 ? Math.floor(50000 + rand() * 200000) : 0,
      channel: slot.channel,
      cpm: slot.cpm,
    };
  }).sort((a, b) => b.relevance_score - a.relevance_score);

  events.push({
    timestamp: addMinutes(5),
    phase: 'evaluate',
    phaseLabel: 'LLM Evaluation',
    agentName: 'Evaluation Agent',
    agentColor: '#8b5cf6',
    toolName: 'LLM: evaluate_products',
    icon: '🧠',
    title: `Evaluated ${matchedSlots.length} products — ${evaluations.filter(e => e.recommended).length} recommended`,
    details: {
      evaluations: evaluations.slice(0, 8).map(e => ({
        product: e.product_name,
        score: `${e.relevance_score}/10`,
        recommended: e.recommended ? '✅' : '❌',
        cpm: `₹${e.cpm}`,
      })),
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

  // ── Skip notification ─────────────────────────────────────────────────
  events.push({
    timestamp: addMinutes(1),
    phase: 'forecast',
    phaseLabel: 'Forecast Mode',
    agentName: 'Orchestrator',
    agentColor: '#f59e0b',
    toolName: null,
    icon: '⏭️',
    title: 'Skipping Budget Agent & Delivery Agent — forecast mode, no buy execution',
    details: {
      skipped: ['Budget Agent: no budget allocation', 'Delivery Agent: no create_media_buy calls'],
      reason: 'Forecast mode produces projections using delivery math without side effects',
    },
    contextEngineering: [],
    tokenUsage: null,
  });

  // ── Handoff → Forecast Agent ──────────────────────────────────────────
  const recommended = evaluations.filter(e => e.recommended);
  const forecastPayloadTokens = recommended.length * 60;
  events.push({
    type: 'handoff',
    from: 'Evaluation Agent',
    to: FORECAST_AGENT.name,
    toColor: FORECAST_AGENT.color,
    payloadTokens: forecastPayloadTokens,
    payloadDescription: `${recommended.length} scored products + CPM table`,
  });

  events.push(makeForecastLane(forecastPayloadTokens + 200, monoWindow, ['scored_products', 'cpm_table', 'ctr_benchmarks', 'roas_ranges']));

  // ── Phase 3: Forecast ─────────────────────────────────────────────────
  const totalBudget = agentData?.financials?.total_budget || 100000000;
  const monthlyBudget = totalBudget / 12;
  let remainingBudget = monthlyBudget;

  const forecasts = recommended.slice(0, 6).map((e) => {
    const budget = Math.min(e.recommended_budget, remainingBudget * 0.35);
    remainingBudget -= budget;
    if (budget < 1000) return null;

    const format = inferFormat(e.product_id);
    const deliveryFactor = 0.90 + rand() * 0.15;
    const impressions = Math.floor((budget / e.cpm) * 1000 * deliveryFactor);

    const ctrRange = CTR_BENCHMARKS[format] || [0.003, 0.006];
    const ctr = (ctrRange[0] + ctrRange[1]) / 2;
    const clicks = Math.floor(impressions * ctr);

    const roasRange = ROAS_BENCHMARKS[e.publisher] || [2.0, 4.0];
    const roas = parseFloat(((roasRange[0] + roasRange[1]) / 2).toFixed(1));

    const frequency = 1.2 + (impressions / 2_000_000);
    const reach = Math.floor(impressions / frequency);

    return {
      product_id: e.product_id,
      product_name: e.product_name,
      publisher: e.publisher,
      channel: e.channel,
      score: e.relevance_score,
      cpm: e.cpm,
      budget: Math.floor(budget),
      impressions,
      clicks,
      reach,
      roas,
      ctr: parseFloat((ctr * 100).toFixed(2)),
      format,
    };
  }).filter(Boolean);

  // Forecast computation event
  events.push({
    timestamp: addMinutes(3),
    phase: 'forecast',
    phaseLabel: 'Forecast Computation',
    agentName: 'Forecast Agent',
    agentColor: '#ec4899',
    toolName: 'delivery_math (client-side)',
    icon: '🔮',
    title: `Projected ${forecasts.length} placements — ${(forecasts.reduce((s, f) => s + f.impressions, 0) / 1000000).toFixed(1)}M impressions`,
    details: {
      math_source: 'seller/delivery.py formulas (CPM → impressions, CTR benchmarks, ROAS ranges)',
      forecasts: forecasts.map(f => ({
        product: f.product_name,
        budget: `₹${(f.budget / 100000).toFixed(1)}L`,
        impressions: `${(f.impressions / 1000000).toFixed(2)}M`,
        reach: `${(f.reach / 1000000).toFixed(2)}M`,
        roas: `${f.roas}x`,
      })),
    },
    contextEngineering: [{
      strategy: 'Forecast Isolation',
      description: 'Forecast Agent uses deterministic math only — no LLM, no side effects, no create_media_buy calls.',
      tokensSaved: 0,
      detail: 'Pure computation: (budget / CPM) × 1000 × delivery_factor. CTR and ROAS from industry benchmarks.',
    }],
    tokenUsage: null,
  });

  // ── Forecast Card Event ───────────────────────────────────────────────
  const totalImpressions = forecasts.reduce((s, f) => s + f.impressions, 0);
  const totalReach = forecasts.reduce((s, f) => s + f.reach, 0);
  const totalForecastBudget = forecasts.reduce((s, f) => s + f.budget, 0);
  const weightedRoas = forecasts.reduce((s, f) => s + f.roas * f.budget, 0) / (totalForecastBudget || 1);

  events.push({
    type: 'forecast-card',
    brand: agentData?.brand || agentId,
    totals: {
      budget: totalForecastBudget,
      impressions: totalImpressions,
      reach: totalReach,
      roas: parseFloat(weightedRoas.toFixed(1)),
      llmCalls: 1,
      llmTokens: totalEvalTokens,
      llmCost: evalCost,
    },
    forecasts,
  });

  // ── Summary Table ─────────────────────────────────────────────────────
  const totalTokensSaved = events.filter(e => !e.type).reduce((sum, e) =>
    sum + (e.contextEngineering || []).reduce((s, ce) => s + (ce.tokensSaved || 0), 0), 0);

  events.push({
    type: 'summary-table',
    rows: [
      { metric: 'Agent Lanes', mono: '5 (full deploy)', multi: '3 + Forecast', savings: '2 lanes skipped' },
      { metric: 'LLM Calls', mono: '2 (eval + summary)', multi: '1 (eval only)', savings: '50% fewer' },
      { metric: 'Total LLM Tokens', mono: `~${(totalEvalTokens * 2).toLocaleString()}`, multi: `~${totalEvalTokens.toLocaleString()}`, savings: '50% fewer' },
      { metric: 'Side Effects', mono: 'Creates media buys', multi: 'None', savings: '100% safe' },
      { metric: 'Forecast Agent Context', mono: '—', multi: `${(forecastPayloadTokens + 200).toLocaleString()} tok`, savings: `${Math.round((forecastPayloadTokens + 200) / monoWindow * 100)}% of mono` },
    ],
  });

  return events;
};
