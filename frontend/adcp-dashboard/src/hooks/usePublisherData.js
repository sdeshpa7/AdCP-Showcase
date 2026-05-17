import { useState, useEffect } from 'react';
import { PUBLISHERS } from './useAgentData';

const API_BASE_URL = 'http://localhost:8010/api/v1';

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
    const fetchAllPublisherData = async () => {
      try {
        setLoading(true);
        const pivotedData = {};

        // Fetch data for all publishers in parallel
        await Promise.all(PUBLISHERS.map(async (pubName) => {
          const pubId = pubName.toLowerCase().replace('.', '');
          try {
            const response = await fetch(`${API_BASE_URL}/publishers/${pubName}`);
            const result = await response.json();
            if (result.success) {
              pivotedData[pubId] = result;
            }
          } catch (err) {
            console.error(`Failed to fetch data for publisher ${pubName}:`, err);
          }
        }));

        setData(pivotedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAllPublisherData();
  }, [timeframe]);

  return { data, loading, error, publishers };
};
