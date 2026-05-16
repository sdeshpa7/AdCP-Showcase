import { useState, useEffect } from 'react';

export const SYSTEM_DATE = new Date().toISOString().split('T')[0];

// ── Seeded PRNG (local copy to avoid circular import with useIntelligenceFeed) ──
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

// ── API Configuration ──
const API_BASE_URL = 'http://localhost:8010/api/v1';

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
        
        // Fetch all agents in parallel
        const results = await Promise.all(
          agents.map(agent => 
            fetch(`${API_BASE_URL}/agents/${agent.id}`)
              .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch ${agent.id}`);
                return res.json();
              })
          )
        );

        const newData = {};
        agents.forEach((agent, i) => {
          newData[agent.id] = results[i];
        });

        setData(newData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching agent data from DB:", err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, [timeframe]);

  return { data, loading, error, agents };
};
