// Run with: node data/generate_snapshot.mjs
// Generates system_snapshot.json with full raw data including daily_delivery time-series

import { MOCK_DATA, SYSTEM_DATE, PUBLISHERS } from '../src/hooks/useAgentData.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const snapshot = {
  metadata: {
    generated_at: new Date().toISOString(),
    system_date: SYSTEM_DATE,
    advertiser_count: Object.keys(MOCK_DATA).length,
    publisher_count: PUBLISHERS.length,
    description: "Full AdCP system snapshot with deterministic daily delivery time-series"
  },
  publishers: PUBLISHERS,
  agents: {}
};

for (const [agentId, agentData] of Object.entries(MOCK_DATA)) {
  snapshot.agents[agentId] = {
    brand: agentData.brand,
    domain: agentData.domain,
    state: agentData.state,
    pacing: agentData.pacing,
    financials: agentData.financials,
    performance: agentData.performance,
    intelligence: agentData.intelligence,
    active_buys_count: agentData.active_buys.length,
    past_buys_count: agentData.past_buys.length,
    active_buys: agentData.active_buys,
    past_buys: agentData.past_buys
  };
}

const outPath = join(__dirname, 'system_snapshot.json');
writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

console.log(`\u2705 Snapshot saved to data/system_snapshot.json`);
console.log(`   System date: ${SYSTEM_DATE}`);
console.log(`   Agents: ${Object.keys(MOCK_DATA).join(', ')}`);
for (const [id, agent] of Object.entries(snapshot.agents)) {
  const sample = agent.active_buys[0];
  const dd = sample?.daily_delivery?.length || 0;
  console.log(`   ${id}: ${agent.active_buys_count} active, ${agent.past_buys_count} past | daily_delivery: ${dd > 0 ? `\u2705 (${dd} days)` : '\u274c'}`);
}
