import { useState, useEffect } from 'react';
import { MOCK_DATA, PUBLISHERS, SYSTEM_DATE } from './useAgentData';

export const usePublisherData = (timeframe = 'monthly') => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const publishers = PUBLISHERS.map(p => ({
    id: p.toLowerCase().replace('.', ''),
    name: p,
    domain: p.toLowerCase().includes('amazon') ? 'amazon.in' : (p.toLowerCase().includes('jio') ? 'jiohotstar.com' : p.toLowerCase() + '.com')
  }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        const pivotedData = {};

        PUBLISHERS.forEach(pubName => {
          const pubId = pubName.toLowerCase().replace('.', '');
          
          // Find all line items across all advertisers for this publisher
          const activeBuys = [];
          const pastBuys = [];
          
          Object.keys(MOCK_DATA).forEach(advKey => {
            const adv = MOCK_DATA[advKey];
            const advName = adv.brand;
            
            adv.active_buys.forEach(buy => {
              if (buy.publisher === pubName) {
                activeBuys.push({ ...buy, advertiser: advName, advertiserDomain: adv.domain, advertiserId: advKey });
              }
            });
            
            adv.past_buys.forEach(buy => {
              if (buy.publisher === pubName) {
                pastBuys.push({ ...buy, advertiser: advName, advertiserDomain: adv.domain, advertiserId: advKey });
              }
            });
          });

          // Aggregate Metrics
          const allBuys = [...activeBuys, ...pastBuys];
          const totalSpent = allBuys.reduce((sum, b) => sum + (b.performance?.spend || b.performance?.spent || 0), 0);
          const totalBudget = allBuys.reduce((sum, b) => sum + (b.budget || 0), 0);
          const totalImps = allBuys.reduce((sum, b) => sum + (b.performance?.impressions || 0), 0);
          const totalClicks = allBuys.reduce((sum, b) => sum + (b.performance?.clicks || 0), 0);
          const uniqueReach = allBuys.reduce((sum, b) => sum + (b.performance?.reach || 0), 0);

          pivotedData[pubId] = {
            success: true,
            brand: pubName,
            domain: pubName.toLowerCase().includes('amazon') ? 'amazon.in' : (pubName.toLowerCase().includes('jio') ? 'jiohotstar.com' : pubName.toLowerCase() + '.com'),
            state: "monitoring",
            pacing: {
              budget_used_pct: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
              is_overpacing: false
            },
            financials: {
              total_budget: totalBudget,
              spent: totalSpent,
              allocated: totalSpent,
              remaining: totalBudget - totalSpent
            },
            performance: {
              impressions: totalImps,
              reach: uniqueReach,
              clicks: totalClicks,
              ctr: totalImps > 0 ? (totalClicks / totalImps) * 100 : 0,
              roas: 4.8, // Platform average
              growth: 12.5
            },
            intelligence: {
              total_tokens: 0,
              estimated_cost_inr: 0,
              latest_reasoning: `Platform Insights: ${pubName} is seeing high engagement in Metros. AdCP Protocol optimizing floor prices across HUL and Amazon campaigns to maximize fill-rate.`
            },
            active_buys: activeBuys,
            past_buys: pastBuys,
            history: []
          };
        });

        setData(pivotedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, [timeframe]);

  return { data, loading, error, publishers };
};
