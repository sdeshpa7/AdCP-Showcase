import { useState, useEffect } from 'react';
import { PUBLISHERS } from './useAgentData';

export const useViewershipData = (publisherId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateViewershipData = () => {
      // Deterministic but different for each publisher
      const seed = publisherId ? publisherId.length : 10;
      
      const publishersData = {
        "jiohotstar": {
          totalViewers: 450000000,
          dau: 110000000,
          avgWatchTime: 55,
          peakConcurrency: 65000000,
          retention: 82,
          networkUtilization: 94.8,
          mauTrend: 28.4,
          dauTrend: 22.5,
          deviceBreakdown: [
            { name: 'Mobile', value: 72 },
            { name: 'CTV', value: 24 },
            { name: 'Web', value: 4 }
          ],
          contentPerformance: [
            { title: 'IPL 2025: Live (Merged)', viewers: 65000000, trend: '+85%', rating: 4.9 },
            { title: 'Disney+ Originals Library', viewers: 42000000, trend: '+40%', rating: 4.8 },
            { title: 'HBO & Warner Bros Suite', viewers: 35000000, trend: '+25%', rating: 4.7 },
            { title: 'Jio Cinema Originals', viewers: 28000000, trend: '+15%', rating: 4.6 }
          ]
        },
        "ndtv": {
          totalViewers: 60000000,
          dau: 12000000,
          avgWatchTime: 18,
          peakConcurrency: 2200000,
          retention: 42,
          networkUtilization: 48.5,
          mauTrend: 6.2,
          dauTrend: 4.8,
          deviceBreakdown: [
            { name: 'Mobile', value: 55 },
            { name: 'Web', value: 40 },
            { name: 'CTV', value: 5 }
          ],
          contentPerformance: [
            { title: 'Election Results Live', viewers: 8500000, trend: '+120%', rating: 4.9 },
            { title: 'Prime Time with Ravish', viewers: 2500000, trend: '+5%', rating: 4.8 },
            { title: 'Gadgets 360 Show', viewers: 1200000, trend: '+15%', rating: 4.6 },
            { title: 'NDTV Food Special', viewers: 800000, trend: '+2%', rating: 4.4 }
          ]
        },
        "amazonin": {
          totalViewers: 250000000,
          dau: 32000000,
          avgWatchTime: 28,
          peakConcurrency: 4500000,
          retention: 58,
          networkUtilization: 62.1,
          mauTrend: 24.5,
          dauTrend: 18.2,
          deviceBreakdown: [
            { name: 'Mobile', value: 82 },
            { name: 'CTV', value: 12 },
            { name: 'Web', value: 6 }
          ],
          contentPerformance: [
            { title: 'Mirzapur Season 3', viewers: 35000000, trend: '+60%', rating: 4.9 },
            { title: 'The Family Man: New S', viewers: 28000000, trend: '+15%', rating: 4.8 },
            { title: 'MiniTV: Physics Wallah', viewers: 12000000, trend: '+30%', rating: 4.7 },
            { title: 'Amazon Live Commerce', viewers: 5500000, trend: '+22%', rating: 4.5 }
          ]
        },
        "espncricinfo": {
          totalViewers: 75000000,
          dau: 18000000,
          avgWatchTime: 22,
          peakConcurrency: 8500000,
          retention: 52,
          networkUtilization: 58.4,
          mauTrend: 35.2,
          dauTrend: 30.1,
          deviceBreakdown: [
            { name: 'Web', value: 58 },
            { name: 'Mobile', value: 40 },
            { name: 'CTV', value: 2 }
          ],
          contentPerformance: [
            { title: 'T20 World Cup Live', viewers: 25000000, trend: '+85%', rating: 4.9 },
            { title: 'Match Day Analysis', viewers: 8500000, trend: '+12%', rating: 4.7 },
            { title: 'Cricinfo Insights', viewers: 4200000, trend: '+5%', rating: 4.6 },
            { title: 'Historical Archives', viewers: 1500000, trend: '+2%', rating: 4.8 }
          ]
        },
        "myntra": {
          totalViewers: 45000000,
          dau: 8000000,
          avgWatchTime: 12,
          peakConcurrency: 1200000,
          retention: 65,
          networkUtilization: 42.8,
          mauTrend: 18.5,
          dauTrend: 15.2,
          deviceBreakdown: [
            { name: 'Mobile', value: 95 },
            { name: 'Web', value: 5 },
            { name: 'CTV', value: 0 }
          ],
          contentPerformance: [
            { title: 'EORS Live Launch', viewers: 4500000, trend: '+150%', rating: 4.9 },
            { title: 'Fashion Superstar S4', viewers: 1200000, trend: '+8%', rating: 4.6 },
            { title: 'Creator Studio Live', viewers: 850000, trend: '+45%', rating: 4.7 },
            { title: 'Style Casting', viewers: 300000, trend: '+12%', rating: 4.5 }
          ]
        }
      };

      return publishersData[publisherId] || publishersData["jiohotstar"];
    };

    setLoading(true);
    setTimeout(() => {
      setData(generateViewershipData());
      setLoading(false);
    }, 500);
  }, [publisherId]);

  return { data, loading };
};
