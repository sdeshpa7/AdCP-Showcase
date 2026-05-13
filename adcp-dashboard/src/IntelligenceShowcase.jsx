import React, { useState, useEffect, useRef } from 'react';

const LOG_TYPES = {
  PROTOCOL: { color: '#3b82f6', label: 'PROTOCOL' },
  DISCOVERY: { color: '#8b5cf6', label: 'DISCOVERY' },
  PRUNING: { color: '#f97316', label: 'PRUNING' },
  EVALUATION: { color: '#ec4899', label: 'REASONING' },
  EXECUTION: { color: '#10b981', label: 'EXECUTION' },
  INFO: { color: '#888888', label: 'INFO' }
};

const SIMULATION_STEPS = [
  { type: 'INFO', message: 'Initializing AdCP Buyer Agent for "Flipkart Fashion"...', delay: 800 },
  { type: 'PROTOCOL', message: 'Handshake with AdCP Registry: Found 12 verified Seller Agents.', delay: 1200 },
  { type: 'DISCOVERY', message: 'Broadcasting get_products() to JioHotstar, Myntra, and NDTV...', delay: 1500 },
  { type: 'DISCOVERY', message: 'Received 84 inventory products. 6 channels identified.', delay: 800 },
  { type: 'INFO', message: 'Applying Context Engineering & Safety Manifests...', delay: 1000 },
  { type: 'PRUNING', message: 'REJECTED: 12 items on NDTV (Political context mismatch). Tokens Saved: 4.2k.', delay: 1200 },
  { type: 'PRUNING', message: 'REJECTED: 8 items on JioHotstar (Ad-load cap exceeded). Tokens Saved: 2.8k.', delay: 800 },
  { type: 'INFO', message: 'Sending 64 sanitized products to Evaluation Engine (Gemma-3-27b).', delay: 1500 },
  { type: 'EVALUATION', message: 'Scoring "IPL Live Broadcast - Video Mid-roll": 9.8/10. Reasoning: Perfect demographic fit.', delay: 2000 },
  { type: 'EVALUATION', message: 'Scoring "Myntra Fashion Superstar - Display": 8.5/10. Reasoning: High context relevance.', delay: 1200 },
  { type: 'INFO', message: 'Allocating Budget: INR 1.2 Cr based on ROAS projections...', delay: 1500 },
  { type: 'EXECUTION', message: 'CALLING: create_media_buy() on JioHotstar. MediaBuy ID: MB_7721.', delay: 1000 },
  { type: 'EXECUTION', message: 'SUCCESS: Transaction confirmed. Impressions secured: 24.5M.', delay: 800 },
  { type: 'INFO', message: 'Simulation Complete. Agent entering Monitoring State.', delay: 500 }
];

export default function IntelligenceShowcase() {
  const [logs, setLogs] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const logEndRef = useRef(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const runSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setLogs([]);

    for (const step of SIMULATION_STEPS) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      setLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        ...step
      }]);
    }
    setIsSimulating(false);
  };

  return (
    <div style={{
      padding: '2rem',
      background: '#0a0a0a',
      minHeight: '100vh',
      color: '#f0f0f0',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              AdCP Live Intelligence Showcase
            </h1>
            <p style={{ color: '#888' }}>Visualize the autonomous reasoning and tool-usage loop of an AdCP Agent.</p>
          </div>
          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            style={{
              background: isSimulating ? '#222' : '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: isSimulating ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {isSimulating ? 'Simulation in Progress...' : 'Run Agent Loop'}
          </button>
        </header>

        <div style={{
          background: '#111',
          border: '1px solid #222',
          borderRadius: '12px',
          padding: '1.5rem',
          height: '600px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
          position: 'relative'
        }}>
          {logs.length === 0 && !isSimulating && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              color: '#444', textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
              <p>Click "Run Agent Loop" to see the agent's internal reasoning.</p>
            </div>
          )}

          {logs.map((log) => (
            <div key={log.id} style={{
              display: 'flex',
              gap: '1rem',
              fontSize: '0.95rem',
              fontFamily: 'monospace',
              lineHeight: 1.4,
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <span style={{ color: '#444', whiteSpace: 'nowrap' }}>[{log.timestamp}]</span>
              <span style={{ 
                color: LOG_TYPES[log.type].color, 
                fontWeight: 700, 
                width: '100px',
                display: 'inline-block'
              }}>
                [{LOG_TYPES[log.type].label}]
              </span>
              <span style={{ color: log.type === 'PRUNING' ? '#f97316' : '#ccc' }}>
                {log.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        <div style={{ 
          marginTop: '2rem', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem' 
        }}>
          <div style={{ background: '#111', padding: '1rem', borderRadius: '8px', border: '1px solid #222' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Protocol Layer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>MCP Tool-Calling</div>
          </div>
          <div style={{ background: '#111', padding: '1rem', borderRadius: '8px', border: '1px solid #222' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Intelligence Layer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Context Engineering</div>
          </div>
          <div style={{ background: '#111', padding: '1rem', borderRadius: '8px', border: '1px solid #222' }}>
            <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reasoning Layer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gemma-3 Inference</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
