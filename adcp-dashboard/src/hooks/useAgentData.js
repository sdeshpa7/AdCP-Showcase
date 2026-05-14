import { useState, useEffect } from 'react';

export const SYSTEM_DATE = new Date().toISOString().split('T')[0];

const gaussianRandom = (mean = 0, stdev = 1) => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};

const jitter = (val, factor = 0.15) => {
  const change = val * factor * (Math.random() * 2 - 1);
  return Math.floor(val + change);
};

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

export const PUBLISHERS = ["JioHotstar", "Myntra", "NDTV", "ESPNcricinfo", "Amazon.in"];
const PUBLISHER_INVENTORY = {
  "JioHotstar": [
    { device: "Android", format: "Video Pre-roll" },
    { device: "Android", format: "Video Mid-roll" },
    { device: "Android", format: "Billboard" },
    { device: "iOS", format: "Video Pre-roll" },
    { device: "iOS", format: "Video Mid-roll" },
    { device: "iOS", format: "Billboard" },
    { device: "CTV", format: "Video Pre-roll" },
    { device: "CTV", format: "Video Mid-roll" },
    { device: "Website", format: "Billboard" }
  ],
  "ESPNcricinfo": [
    { device: "Website", format: "Billboard" },
    { device: "Website", format: "Video Pre-roll" },
    { device: "Website", format: "Video Mid-roll" }
  ],
  "Myntra": [
    { device: "Android", format: "Billboard" },
    { device: "iOS", format: "Billboard" }
  ],
  "NDTV": [
    { device: "Website", format: "Billboard" },
    { device: "Website", format: "Video Pre-roll" },
    { device: "Website", format: "Video Mid-roll" }
  ],
  "Amazon.in": [
    { device: "Website", format: "Billboard" },
    { device: "Website", format: "Display" },
    { device: "Website", format: "Video Pre-roll" },
    { device: "Website", format: "Video Mid-roll" },
    { device: "Android", format: "Billboard" },
    { device: "Android", format: "Display" },
    { device: "Android", format: "Video Pre-roll" },
    { device: "Android", format: "Video Mid-roll" },
    { device: "iOS", format: "Billboard" },
    { device: "iOS", format: "Display" },
    { device: "iOS", format: "Video Pre-roll" },
    { device: "iOS", format: "Video Mid-roll" }
  ]
};
const AGE_GROUPS = ["18-34", "18-44", "24-60", "18+", "24+", "All Age Groups"];
const METROS = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"];
const TIER_2 = ["Jaipur", "Lucknow", "Chandigarh", "Indore", "Kochi", "Patna", "Surat", "Nagpur", "Bhopal", "Visakhapatnam", "Coimbatore", "Vadodara", "Thiruvananthapuram", "Agra", "Madurai", "Varanasi", "Nashik", "Rajkot", "Mysore", "Jodhpur", "Raipur", "Ranchi", "Guwahati", "Amritsar", "Vijayawada", "Dehradun", "Mangalore", "Aurangabad", "Bhubaneswar", "Meerut"];
const TIER_3 = ["Jalandhar", "Udaipur", "Aligarh", "Bareilly", "Moradabad", "Gorakhpur", "Bikaner", "Jammu", "Dharamshala", "Shimla", "Pondicherry", "Guntur", "Nellore", "Warangal", "Solapur", "Kolhapur", "Belgaum", "Hubli", "Tirupati", "Salem", "Tiruchirappalli", "Jamshedpur", "Dhanbad", "Siliguri", "Durgapur", "Ajmer", "Gwalior", "Ujjain", "Rohtak", "Panipat"];
// Weighted to reflect actual Hotstar/JioHotstar campaign distribution:
// ~40% Pan-India, ~20% Metros, ~8% Tier 2, ~7% Tier 3, ~15% Regional clusters, ~10% Single states
const CAMPAIGN_GEO_TYPES = [
  "Pan-India", "Pan-India", "Pan-India", "Pan-India", "Pan-India", "Pan-India",  // 6
  "Metros", "Metros", "Metros",                                                   // 3
  "Tier 2", "Tier 2",                                                              // 2 (added one more to compensate for removed Tier entry)
  "Tier 3",                                                                        // 1
  "South", "South",                                              // 2
  "HSM",                                                                    // 1
  "Maharashtra",                                                                   // 1 (single state - rare)
];
const REGIONAL_CLUSTERS = {
  "South": ["Tamil Nadu", "Karnataka", "Kerala", "Andhra Pradesh", "Telangana"],
  "HSM": ["Uttar Pradesh", "Madhya Pradesh", "Rajasthan", "Bihar", "Jharkhand", "Chhattisgarh", "Uttarakhand", "Haryana", "Maharashtra", "Gujarat", "Punjab", "West Bengal", "Odisha", "Assam", "Goa", "Himachal Pradesh", "Jammu & Kashmir", "Delhi NCR", "Sikkim", "Meghalaya", "Tripura", "Manipur", "Mizoram", "Nagaland", "Arunachal Pradesh"]
};
const STATE_CITIES = {
  "Maharashtra": { metros: ["Mumbai", "Pune"], others: ["Nagpur", "Nashik"] },
  "Karnataka": { metros: ["Bangalore"], others: ["Mysore", "Hubli"] },
  "Tamil Nadu": { metros: ["Chennai"], others: ["Coimbatore", "Madurai"] },
  "Uttar Pradesh": { metros: ["Lucknow"], others: ["Varanasi", "Kanpur"] },
  "Delhi NCR": { metros: ["Delhi", "Noida", "Gurugram"], others: [] },
  "Gujarat": { metros: ["Ahmedabad"], others: ["Surat", "Vadodara"] }
};
const getLineItemGeo = (campaignGeo, index) => {
  if (campaignGeo === 'Pan-India') return 'National';
  if (campaignGeo === 'Metros') return METROS[index % METROS.length];
  if (campaignGeo === 'Tier 2') return TIER_2[index % TIER_2.length];
  if (campaignGeo === 'Tier 3') return TIER_3[index % TIER_3.length];
  const stateData = STATE_CITIES[campaignGeo];
  if (stateData) {
    // Some line items target the whole state, others target specific cities
    const allCities = [...stateData.metros, ...stateData.others];
    const options = [campaignGeo, ...allCities];
    return options[index % options.length];
  }
  return 'National';
};
const PUBLISHER_SHOWS = {
  "JioHotstar": ["IPL Live Broadcast", "Koffee with Karan", "Big Boss OTT", "Hotstar Specials"],
  "Myntra": ["End of Reason Sale Preview", "Myntra Fashion Superstar", "Live Commerce", "Sneaker Drop Live"],
  "NDTV": ["Left Right & Centre", "Prime Time News", "Morning News Desk", "Tech Guru"],
  "ESPNcricinfo": ["Match Day Live", "T20 Timeout", "Match Highlights", "Cricket Analysis"],
  "Amazon.in": ["Great Indian Festival", "Amazon MiniTV Shows", "Tech Launchpad Live", "Amazon Fashion Week"]
};

let idCounter = 1;

const createLineItem = (agentId, campaignId, name, lineItemName, status, publisher, device, format, budget, start, end, targetParams, brandName) => {
  const profile = AGENT_PROFILES[agentId];
  const budgetVal = jitter(budget);

  // Realistic CPMs based on Format
  let cpm = 50; // Default Display
  if (format === 'Video Mid-roll') cpm = jitter(280, 0.2);
  if (format === 'Video Pre-roll') cpm = jitter(180, 0.2);
  if (format === 'Display') cpm = jitter(120, 0.15);
  if (device === 'CTV') cpm = jitter(750, 0.1);
  if (format === 'Billboard') cpm = jitter(180, 0.1);

  const targetImps = Math.floor((budgetVal / cpm) * 1000);
  
  let deliveryPct = 1.0;
  let isUnderpacing = false;
  if (status === 'active') {
    const today = new Date(SYSTEM_DATE);
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const totalDuration = endDate - startDate;
    const elapsed = today - startDate;
    
    // timeRatio is 0.0 to 1.0
    const timeRatio = Math.max(0.05, Math.min(1.0, elapsed / (totalDuration || 1)));
    
    // Pacing variance: gaussian around 1.0 (mean), 0.10 (stdev)
    // Results in ~0.8 to ~1.2 multiplier to simulate under/over pacing
    const pacingFactor = gaussianRandom(1.0, 0.10); 
    deliveryPct = Math.max(0.01, Math.min(1.0, timeRatio * pacingFactor));
    isUnderpacing = pacingFactor < 0.80;
  } else {
    // Completed campaigns deliver ~100% (with slight variance)
    deliveryPct = Math.min(gaussianRandom(0.995, 0.01), 1.01);
  }

  const impressions = Math.floor(targetImps * deliveryPct);

  // Resolve content string early so it can influence ROAS calculation
  const contentLabel = (PUBLISHER_SHOWS[publisher] || ["Run of Network"])[idCounter % 4];

  // --- LAYER 1: Funnel-Position ROAS ---
  // Device/format sets the base funnel position multiplier.
  let roas = profile.roas_base;
  if (device === 'CTV' || format === 'Billboard') {
    roas *= 0.3; // Upper funnel: awareness, not direct response
  } else if (format === 'Video Pre-roll' || format === 'Video Mid-roll') {
    roas *= 0.5; // Mid funnel: consideration
  } else {
    roas *= 1.0; // Lower funnel: Display / Performance retains full base
  }

  // --- LAYER 2: Content Context ROAS ---
  // Live sports (IPL) drive a massive downstream "halo effect":
  // brands report 2x–3x higher search-lift and +40% conversion efficiency.
  if (contentLabel === 'IPL Live Broadcast') {
    roas *= 2.0; // Research: IPL halo — biggest tentpole event in India
  } else if (['End of Reason Sale Preview', 'Live Commerce', 'Great Indian Festival', 'Amazon Fashion Week'].some(s => contentLabel.includes(s))) {
    roas *= 1.5; // High-intent commerce: audience is actively shopping
  }

  // --- LAYER 3: Premium Inventory Lift ---
  // CTV on JioHotstar = affluent urban household on the biggest screen.
  // Higher basket sizes mean better post-view attribution even with 0 clicks.
  if (publisher === 'JioHotstar' && device === 'CTV') {
    roas *= 1.2;
  }

  roas = jitter(roas, 0.08);

  // Calibrate Clicks based on Format and Device
  let clicks = 0;
  if (device === 'CTV') {
    clicks = 0; // Strict non-clickable living room experience
  } else if (format === 'Video Mid-roll') {
    clicks = 0; // Deep in content — no clickable overlay
  } else if (format === 'Video Pre-roll') {
    clicks = jitter(impressions * 0.005, 0.15); // 0.5% CTR
  } else if (format === 'Billboard') {
    clicks = jitter(impressions * 0.001, 0.15); // 0.1% CTR
  } else if (format === 'Display') {
    clicks = jitter(impressions * 0.003, 0.15); // 0.3% CTR
  } else {
    clicks = jitter(impressions * 0.002, 0.15); // Fallback 0.2% CTR
  }

  return {
    id: `LI-${idCounter++}`,
    campaign_id: campaignId,
    name: name,
    line_item_name: lineItemName,
    brand: brandName,
    status,
    publisher,
    device,
    format,
    budget: budgetVal,
    target_impressions: targetImps,
    target_reach: Math.floor(targetImps * 0.8),
    start_date: start,
    end_date: end,
    targeting: {
      gender: targetParams.gender,
      age: targetParams.age,
      geography: targetParams.geography || (device === 'CTV' ? 'Metropolitan Cities' : 'Pan-India'),
      content: contentLabel
    },
    performance: {
      impressions: impressions,
      reach: Math.floor(impressions * 0.8),
      clicks: clicks,
      spend: jitter(budgetVal * (deliveryPct * 0.99), 0.01),
      roas: parseFloat(roas.toFixed(2)),
      is_underpacing: isUnderpacing
    },
    delivered_pct: Math.floor(deliveryPct * 100)
  };
};

const getValidPublisher = (agentId, preferredPub, brandName) => {
  const profile = AGENT_PROFILES[agentId];

  const agentExclude = profile.exclusions || [];
  const brandExclude = (profile.brandExclusions && profile.brandExclusions[brandName]) || [];
  const allExclude = [...new Set([...agentExclude, ...brandExclude])];

  if (!allExclude.includes(preferredPub)) return preferredPub;

  // Fallback ONLY to other publishers in the original 5
  const neutrals = PUBLISHERS.filter(p => !allExclude.includes(p));
  return neutrals[Math.floor(Math.random() * neutrals.length)] || "NDTV";
};

const generateHistory = (agentId) => {
  const now = new Date(SYSTEM_DATE);
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-indexed
  const curDay = now.getDate();

  // Generate 3 full fiscal years of history + current partial year
  // FY starts in April, so if we're in Jan-Mar we're still in the previous FY
  const currentFYStart = curMonth >= 4 ? curYear : curYear - 1;
  const years = [currentFYStart - 3, currentFYStart - 2, currentFYStart - 1, currentFYStart];

  const months = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];
  const profile = AGENT_PROFILES[agentId];
  const data = [];
  
  // Total budget for this brand per year. Monthly base is ~1/12th
  const monthlyBase = profile.base_annual_budget / 12;

  years.forEach(y => {
    months.forEach((m, mIdx) => {
      const monthNum = parseInt(m);
      const yearStr = (monthNum <= 3) ? y + 1 : y;
      if (yearStr > curYear) return;
      if (yearStr === curYear && monthNum > curMonth) return;
      
      const isCurrentMonth = (yearStr === curYear && monthNum === curMonth);
      const datePrefix = `${yearStr}-${m}`;
      
      // Determine monthly multiplier based on season
      let multiplier = 1.0;
      if (['10', '11'].includes(m)) multiplier = profile.festive_multiplier;
      if (['03', '04', '05'].includes(m)) multiplier = profile.ipl_multiplier;
      
      const budgetPool = monthlyBase * multiplier;
      
      // We will generate N campaigns for this month based on budget scale.
      // Large spenders get up to 25. Smaller get 5-8.
      const campaignCount = Math.floor(budgetPool / 15000000) + 3; // 1 campaign per ~1.5 Crore
      const cappedCount = Math.min(campaignCount, 25); // Cap to 25 per month so it doesn't crash the browser
      
      const budgetPerCamp = budgetPool / cappedCount;

      for (let i = 0; i < cappedCount; i++) {
        let status = isCurrentMonth ? 'active' : 'completed';
        
        // ~30% of current month campaigns are completed (short burst campaigns that finished early)
        // Campaigns with index divisible by 3 are completed
        if (isCurrentMonth && i % 3 === 0) {
          status = 'completed';
        }

        const brand = profile.brands[i % profile.brands.length];
        const agentOffset = Object.keys(AGENT_PROFILES).indexOf(agentId);
        let pub = PUBLISHERS[(mIdx + i + agentOffset) % PUBLISHERS.length];
        pub = getValidPublisher(agentId, pub, brand);
        const inv = PUBLISHER_INVENTORY[pub] || PUBLISHER_INVENTORY["NDTV"];
        let selectedInv = inv[(mIdx + i) % inv.length];
        if (i % 5 === 0 && selectedInv.device === "Android") {
           const iosMatch = inv.find(x => x.device === "iOS" && x.format === selectedInv.format);
           if (iosMatch) selectedInv = iosMatch;
        }

        const campaignGender = profile.genders[i % profile.genders.length];
        const campaignAge = AGE_GROUPS[i % AGE_GROUPS.length];
        const campaignGeo = CAMPAIGN_GEO_TYPES[(i + mIdx) % CAMPAIGN_GEO_TYPES.length];
        const targetParams = { gender: campaignGender, age: campaignAge, geography: campaignGeo };
        
        const campName = `${brand} - ${multiplier > 1.2 ? 'Mega ' : ''}Campaign ${i+1}`;
        const campId = `${agentId.toUpperCase()}-${datePrefix}-C${i+1}`;
        
        // Dates: span most of the month
        let startDayVal = (i % 10) + 1;
        let endDayVal = (i % 10) + 15;

        // If it's a current month completed campaign, it must end before today
        if (status === 'completed' && isCurrentMonth) {
          startDayVal = Math.max(1, (i % (curDay - 2)) + 1);
          endDayVal = Math.min(curDay - 1, startDayVal + 5 + (i % 4));
        }

        const startDay = String(startDayVal).padStart(2, '0');
        const endDay = String(endDayVal).padStart(2, '0');
        
        // Generate line items based on geography type
        const stateData = STATE_CITIES[targetParams.geography];
        const clusterData = REGIONAL_CLUSTERS[targetParams.geography];
        const isStateCampaign = !!stateData;
        const isClusterCampaign = !!clusterData;
        
        if (isClusterCampaign) {
          // Regional cluster: create one line item per state in the cluster
          const perStateBudget = budgetPerCamp / clusterData.length;
          clusterData.forEach((state, si) => {
            const itemInv = inv[(mIdx + i + si) % inv.length];
            data.push(createLineItem(
              agentId, campId, campName, state, status, pub,
              itemInv.device, itemInv.format, perStateBudget,
              `${datePrefix}-${startDay}`, `${datePrefix}-${endDay}`,
              { ...targetParams, geography: targetParams.geography }, brand
            ));
          });
        } else if (isStateCampaign && i % 3 !== 0) {
          // State campaign WITH city breakdown: create line items for each city + "Rest of"
          const allCities = [...stateData.metros, ...stateData.others];
          const restLabel = `Rest of ${targetParams.geography} excl. ${stateData.metros.join(', ')}`;
          const geoItems = [...allCities, restLabel];
          const perItemBudget = budgetPerCamp / geoItems.length;
          
          geoItems.forEach((geo, gi) => {
            const itemInv = inv[(mIdx + i + gi) % inv.length];
            data.push(createLineItem(
              agentId, campId, campName, geo, status, pub,
              itemInv.device, itemInv.format, perItemBudget,
              `${datePrefix}-${startDay}`, `${datePrefix}-${endDay}`,
              { ...targetParams, geography: targetParams.geography }, brand
            ));
          });
        } else if (isStateCampaign) {
          // State campaign targeting the WHOLE state (no city breakdown)
          data.push(createLineItem(
            agentId, campId, campName, targetParams.geography, status, pub,
            selectedInv.device, selectedInv.format, budgetPerCamp,
            `${datePrefix}-${startDay}`, `${datePrefix}-${endDay}`,
            targetParams, brand
          ));
        } else if (targetParams.geography === 'Metros' || targetParams.geography === 'Tier 2' || targetParams.geography === 'Tier 3') {
          // Tier campaigns: create line items for ALL cities in the tier
          const cityPool = targetParams.geography === 'Metros' ? METROS :
                           targetParams.geography === 'Tier 2' ? TIER_2 : TIER_3;
          const perCityBudget = budgetPerCamp / cityPool.length;
          
          cityPool.forEach((city, ci) => {
            const itemInv = inv[(mIdx + i + ci) % inv.length];
            data.push(createLineItem(
              agentId, campId, campName, city, status, pub,
              itemInv.device, itemInv.format, perCityBudget,
              `${datePrefix}-${startDay}`, `${datePrefix}-${endDay}`,
              { ...targetParams, geography: targetParams.geography }, brand
            ));
          });
        } else {
          // Pan-India: single national line item
          data.push(createLineItem(
            agentId, campId, campName, 'National', status, pub,
            selectedInv.device, selectedInv.format, budgetPerCamp,
            `${datePrefix}-${startDay}`, `${datePrefix}-${endDay}`,
            targetParams, brand
          ));
        }
      }
    });
  });
  return data;
};

export const MOCK_DATA = {
  flipkart: {
    success: true, brand: "Flipkart", domain: "flipkart.com", state: "monitoring",
    pacing: { budget_used_pct: 68.5, is_overpacing: false },
    financials: { total_budget: 900000000, spent: 616500000, allocated: 616500000, remaining: 283500000 },
    performance: { impressions: 845000000, reach: 640000000, clicks: 2500000, ctr: 0.29, roas: 5.8, growth: 15.2 },
    intelligence: { total_tokens: 0, estimated_cost_inr: 0, latest_reasoning: "AdCP Protocol: Dynamically engineered planning window. Competitor exclusion manifest injected into JIT tool-definitions only, saving 12k tokens per inference." },
    active_buys: generateHistory('flipkart').filter(c => c.status === 'active'),
    past_buys: generateHistory('flipkart').filter(c => c.status === 'completed'),
    history: []
  },
  amazon: {
    success: true, brand: "Amazon India", domain: "amazon.in", state: "monitoring",
    pacing: { budget_used_pct: 72.1, is_overpacing: false },
    financials: { total_budget: 1000000000, spent: 721000000, allocated: 721000000, remaining: 279000000 },
    performance: { impressions: 980000000, reach: 715000000, clicks: 3100000, ctr: 0.31, roas: 5.5, growth: 12.1 },
    intelligence: { total_tokens: 0, estimated_cost_inr: 0, latest_reasoning: "Context Engineering: Amazon Prime policy manifest handled via Tool-Sanitization. Agent operating on filtered inventory set to maintain focus on ROAS optimization." },
    active_buys: generateHistory('amazon').filter(c => c.status === 'active'),
    past_buys: generateHistory('amazon').filter(c => c.status === 'completed'),
    history: []
  },
  jio: {
    success: true, brand: "Jio", domain: "jio.com", state: "monitoring",
    pacing: { budget_used_pct: 45.4, is_overpacing: false },
    financials: { total_budget: 60000000, spent: 27240000, allocated: 27240000, remaining: 32760000 },
    performance: { impressions: 120000000, reach: 95000000, clicks: 400000, ctr: 0.33, roas: 4.5, growth: 22.4 },
    intelligence: { total_tokens: 0, estimated_cost_inr: 0, latest_reasoning: "AdCP Governance: Enforcing retail moat via Context-Triggers. Exclusions handled at Protocol-Level to minimize context window bloat." },
    active_buys: generateHistory('jio').filter(c => c.status === 'active'),
    past_buys: generateHistory('jio').filter(c => c.status === 'completed'),
    history: []
  },
  hul: {
    success: true, brand: "HUL", domain: "hul.co.in", state: "monitoring",
    pacing: { budget_used_pct: 65.5, is_overpacing: false },
    financials: { total_budget: 1500000000, spent: 982500000, allocated: 982500000, remaining: 517500000 },
    performance: { impressions: 1425000000, reach: 1180000000, clicks: 4500000, ctr: 0.31, roas: 4.8, growth: 10.5 },
    intelligence: { total_tokens: 0, estimated_cost_inr: 0, latest_reasoning: "Portfolio concurrency: Lakme and Dove running distinct line items on Myntra." },
    active_buys: generateHistory('hul').filter(c => c.status === 'active'),
    past_buys: generateHistory('hul').filter(c => c.status === 'completed'),
    history: []
  },
  hdfc: {
    success: true, brand: "HDFC Bank", domain: "hdfcbank.com", state: "monitoring",
    pacing: { budget_used_pct: 50.2, is_overpacing: false },
    financials: { total_budget: 150000000, spent: 75300000, allocated: 75300000, remaining: 74700000 },
    performance: { impressions: 280000000, reach: 165000000, clicks: 900000, ctr: 0.32, roas: 5.2, growth: 18.1 },
    intelligence: { total_tokens: 0, estimated_cost_inr: 0, latest_reasoning: "Strategic overlap: Credit Card and PayZapp concurrent acquisition activity." },
    active_buys: generateHistory('hdfc').filter(c => c.status === 'active'),
    past_buys: generateHistory('hdfc').filter(c => c.status === 'completed'),
    history: []
  }
};

export const useAgentData = (timeframe = 'monthly') => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const agents = [
    { id: 'flipkart', name: 'Flipkart' },
    { id: 'amazon', name: 'Amazon' },
    { id: 'jio', name: 'Jio' },
    { id: 'hul', name: 'HUL' },
    { id: 'hdfc', name: 'HDFC' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        const rawData = JSON.parse(JSON.stringify(MOCK_DATA));
        setData(rawData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, [timeframe]);

  return { data, loading, error, agents };
};
