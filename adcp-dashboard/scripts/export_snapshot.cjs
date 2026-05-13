const fs = require('fs');
const path = require('path');

// Constants from useAgentData.js
const SYSTEM_DATE = '2026-05-10';
const PUBLISHERS = ["JioHotstar", "Myntra", "NDTV", "ESPNcricinfo", "Amazon.in"];

const AGENT_PROFILES = {
  flipkart: {
    base_annual_budget: 900000000, ipl_multiplier: 1.5, festive_multiplier: 3.5, roas_base: 5.5, genders: ["Both", "M", "F"],
    brands: ["Flipkart Minutes", "Flipkart Fashion", "Cleartrip", "Shopsy", "Mobiles"],
    exclusions: ["Amazon.in"]
  },
  amazon: {
    base_annual_budget: 1000000000, ipl_multiplier: 1.2, festive_multiplier: 4.0, roas_base: 5.2, genders: ["Both", "M", "F"],
    brands: ["Amazon Prime", "Amazon Fresh", "Amazon Pay", "Daily Essentials"],
    exclusions: ["Myntra"],
    brandExclusions: { "Amazon Prime": ["JioHotstar"] }
  },
  jio: {
    base_annual_budget: 60000000, ipl_multiplier: 3.0, festive_multiplier: 1.2, roas_base: 4.5, genders: ["Both"],
    brands: ["JioAirFiber", "JioMart", "Jio5G", "AJIO"],
    brandExclusions: { "JioMart": ["Myntra", "Amazon.in"] }
  },
  hul: { 
    base_annual_budget: 1500000000, ipl_multiplier: 1.8, festive_multiplier: 1.5, roas_base: 4.8, genders: ["F", "Both"], 
    brands: ["Lakme", "Dove", "Surf Excel", "Ponds", "Tresemmé", "Knorr", "Horlicks"] 
  },
  hdfc: { 
    base_annual_budget: 150000000, ipl_multiplier: 2.0, festive_multiplier: 1.5, roas_base: 5.0, genders: ["Both", "M"], 
    brands: ["Credit Cards", "Home Loans", "PayZapp", "HDFC Life", "Personal Loans"] 
  }
};

// Simplified generation logic for the snapshot
function generateSnapshot() {
  const snapshot = {
    metadata: {
      generated_at: new Date().toISOString(),
      system_date: SYSTEM_DATE,
      advertiser_count: Object.keys(AGENT_PROFILES).length,
      publisher_count: PUBLISHERS.length
    },
    profiles: AGENT_PROFILES,
    data_summary: {}
  };

  Object.keys(AGENT_PROFILES).forEach(agentId => {
    snapshot.data_summary[agentId] = {
      budget_config: AGENT_PROFILES[agentId],
      sample_campaigns: [] // We'll just store a few samples to keep file size reasonable for a reference
    };
  });

  return snapshot;
}

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const snapshot = generateSnapshot();
fs.writeFileSync(path.join(dataDir, 'system_snapshot.json'), JSON.stringify(snapshot, null, 2));

console.log('Data snapshot saved to adcp-dashboard/data/system_snapshot.json');
