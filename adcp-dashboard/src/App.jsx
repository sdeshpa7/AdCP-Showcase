import { useState, useEffect, useMemo, useRef } from 'react';
import { useAgentData } from './hooks/useAgentData';
import { generateBuyerFeed } from './hooks/useIntelligenceFeed';
import { generateForecastFeed } from './hooks/useForecastFeed';
import {
  Activity,
  IndianRupee,
  Target,
  TrendingUp,
  BrainCircuit,
  History,
  LayoutDashboard,
  ArrowLeft,
  Briefcase,
  RefreshCw,
  Search,
  Plus,
  Calendar,
  Share2,
  Monitor,
  Layout,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#ec4899'];

function App() {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth(); // 0 is Jan
  const fyStart = curM >= 3 ? curY : curY - 1;
  const FY_YEARS = Array.from({length: 4}, (_, i) => {
    const s = fyStart - 3 + i;
    return `${s}-${(s + 1).toString().slice(-2)}`;
  });
  const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
  const QUARTERS = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'];

  // Derive current FY defaults from the already-declared date variables
  const currentFY = `${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
  const currentMonthIdx = (curM - 3 + 12) % 12;
  const currentQIdx = Math.floor(currentMonthIdx / 3);

  const [timeframe, setTimeframe] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(FY_YEARS.includes(currentFY) ? currentFY : FY_YEARS[FY_YEARS.length - 1]);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIdx]);
  const [selectedQuarter, setSelectedQuarter] = useState(QUARTERS[currentQIdx]);
  const [campaignTab, setCampaignTab] = useState('active');
  const [mixDimension, setMixDimension] = useState('publishers');
  const [mixMetric, setMixMetric] = useState('impressions');
  const { data, loading, error, agents } = useAgentData(timeframe);
  const [activeAgentId, setActiveAgentId] = useState(agents[0].id);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailSearchTerm, setDetailSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [campaignPrompt, setCampaignPrompt] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [expandedFeedEvent, setExpandedFeedEvent] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationEvents, setSimulationEvents] = useState([]);
  const [allFeedEvents, setAllFeedEvents] = useState([]);
  const feedTimelineRef = useRef(null);
  const simulationTimerRef = useRef(null);

  // Auto-scroll feed timeline when new events arrive
  useEffect(() => {
    if (feedTimelineRef.current && simulationEvents.length > 0) {
      feedTimelineRef.current.scrollTop = feedTimelineRef.current.scrollHeight;
    }
  }, [simulationEvents.length]);

  // Cleanup simulation timer on unmount or view change
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    };
  }, []);

  // Reset simulation when switching agents
  useEffect(() => {
    setSimulationEvents([]);
    setAllFeedEvents([]);
    setIsSimulating(false);
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
  }, [activeAgentId]);

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [expandedHistoryEvent, setExpandedHistoryEvent] = useState(null);
  const [forecastMode, setForecastMode] = useState(false);

  const handleResetToCurrent = () => {
    setTimeframe('monthly');
    setSelectedYear(currentFY);
    setSelectedMonth(MONTHS[currentMonthIdx]);
    setSelectedQuarter(QUARTERS[currentQIdx]);
  };

  // Derive the active period based on the timeframe
  const selectedPeriod = timeframe === 'quarterly' ? selectedQuarter : selectedMonth;

  const handlePeriodChange = (val) => {
    if (timeframe === 'monthly') {
      setSelectedMonth(val);
      // Map to quarter as well
      const mIdx = MONTHS.indexOf(val);
      setSelectedQuarter(QUARTERS[Math.floor(mIdx / 3)]);
    } else if (timeframe === 'quarterly') {
      setSelectedQuarter(val);
    }
  };

  // Utilities & Formatting
  const formatToMillions = (num) => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatToCr = (num) => {
    if (!num && num !== 0) return '₹0';
    if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
    if (num > 0) return '₹' + (num / 100000).toFixed(2) + ' L';
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.toLocaleDateString('en-GB', { day: '2-digit' });
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      const year = d.getFullYear().toString().slice(-2);
      return `${day} ${month} ${year}`;
    } catch (e) { return dateStr; }
  };

  const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const month = d.toLocaleDateString('en-GB', { month: 'short' });
      const year = d.getFullYear().toString().slice(-2);
      return `${month} ${year}`;
    } catch (e) { return ''; }
  };

  const getSelectedDateRange = () => {
    const startYear = parseInt(selectedYear.split('-')[0]);
    if (timeframe === 'monthly') {
      const monthIdx = MONTHS.indexOf(selectedPeriod);
      const actualMonth = (monthIdx + 3) % 12;
      const actualYear = startYear + (monthIdx + 3 >= 12 ? 1 : 0);
      return {
        start: new Date(actualYear, actualMonth, 1),
        end: new Date(actualYear, actualMonth + 1, 0, 23, 59, 59)
      };
    } else if (timeframe === 'quarterly') {
      const qIdx = QUARTERS.indexOf(selectedPeriod);
      const startM = qIdx * 3 + 3;
      const startY = startYear + (startM >= 12 ? 1 : 0);
      const endM = startM + 3;
      const endY = startYear + (endM >= 12 ? 1 : 0);
      return {
        start: new Date(startY, startM % 12, 1),
        end: new Date(endY, endM % 12, 0, 23, 59, 59)
      };
    } else {
      return {
        start: new Date(startYear, 3, 1),
        end: new Date(startYear + 1, 3, 0, 23, 59, 59)
      };
    }
  };

  const getAvailablePeriods = () => {
    const currentYear = curY; // 2026
    const currentMonthIdx = (curM - 3 + 12) % 12; // May is index 1 in our April-start MONTHS array
    const startYear = parseInt(selectedYear.split('-')[0]);

    if (startYear > currentYear) return [];
    if (startYear < currentYear) return timeframe === 'monthly' ? MONTHS : QUARTERS;

    // For the current financial year (e.g., 2026-27)
    if (timeframe === 'monthly') return MONTHS.slice(0, currentMonthIdx + 1);

    // For quarterly
    if (currentMonthIdx < 3) return [QUARTERS[0]];
    if (currentMonthIdx < 6) return QUARTERS.slice(0, 2);
    if (currentMonthIdx < 9) return QUARTERS.slice(0, 3);
    return QUARTERS;
  };

  const GrowthBadge = ({ value }) => {
    const label = timeframe === 'monthly' ? 'MoM' : timeframe === 'quarterly' ? 'QoQ' : 'YoY';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
        <span style={{
          fontSize: '0.8rem', padding: '3px 8px', borderRadius: '4px',
          background: value >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          fontWeight: 600, whiteSpace: 'nowrap'
        }}>
          {value >= 0 ? '↑' : '↓'} {Math.abs(value).toFixed(1)}%
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
    );
  };

  const BrandLogo = ({ domain, brandName, size = 24, borderRadius = '4px', fontSize = '0.7rem' }) => {
    const [error, setError] = useState(false);
    const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return (
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', padding: '2px'
      }}>
        {!error ? (
          <img
            src={logoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setError(true)}
          />
        ) : (
          <span style={{ color: 'var(--accent-blue)', fontWeight: 800, fontSize }}>
            {brandName ? brandName.charAt(0).toUpperCase() : '?'}
          </span>
        )}
      </div>
    );
  };

  const availablePeriods = getAvailablePeriods();
  const activeData = data[activeAgentId] || {};
  const periodRange = getSelectedDateRange();

  // Unified Filtering Logic for the entire dashboard
  const activeBuys = (activeData.active_buys || []).filter(buy => {
    const bStart = new Date(buy.start_date || '2026-05-01');
    const bEnd = new Date(buy.end_date || '2026-05-31');
    return bStart <= periodRange.end && bEnd >= periodRange.start;
  });

  const completedBuys = (activeData.past_buys || []).filter(buy => {
    const bStart = new Date(buy.start_date || '2026-05-01');
    const bEnd = new Date(buy.end_date || '2026-05-31');
    return bStart <= periodRange.end && bEnd >= periodRange.start;
  });

  const hasActive = activeBuys.length > 0;
  const hasCompleted = completedBuys.length > 0;

  const contextLabel = (hasActive && hasCompleted) ? "Active + Completed"
    : hasActive ? "Active"
      : hasCompleted ? "Completed"
        : "";

  useEffect(() => {
    if (campaignTab === 'active' && !hasActive && hasCompleted) {
      setCampaignTab('completed');
    } else if (campaignTab === 'completed' && !hasCompleted && hasActive) {
      setCampaignTab('active');
    }
  }, [hasActive, hasCompleted, timeframe, activeAgentId]);

  if (loading && Object.keys(data).length === 0) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <div>Initializing AdCP Intelligence Network...</div>
      </div>
    );
  }

  if (error && Object.keys(data).length === 0) {
    return <div className="loading-screen" style={{ color: 'var(--accent-red)' }}>Failed to connect to AdCP Network: {error}</div>;
  }

  const handleAgentSwitch = (id) => {
    setActiveAgentId(id);
    setSelectedCampaignId(null);
  };

  const selectedCampaign = selectedCampaignId
    ? (() => {
      const allBuys = [...(activeData?.active_buys || []), ...(activeData?.past_buys || [])];
      const campaignBuys = allBuys.filter(b => (b.campaign_id || b.id) === selectedCampaignId);
      if (campaignBuys.length === 0) return null;
      return {
        id: selectedCampaignId,
        name: campaignBuys[0]?.name || "Unknown Campaign",
        brand: campaignBuys[0]?.brand,
        status: campaignBuys.every(b => b.status === 'completed') ? 'completed' : 'active',
        publisher: Array.from(new Set(campaignBuys.map(b => b.publisher))).join(', '),
        device: Array.from(new Set(campaignBuys.map(b => b.device))).join(', '),
        format: Array.from(new Set(campaignBuys.map(b => b.format))).join(', '),
        start_date: campaignBuys.reduce((min, b) => {
          const d = b.start_date || '2026-05-01';
          return (!min || d < min) ? d : min;
        }, null),
        end_date: campaignBuys.reduce((max, b) => {
          const d = b.end_date || '2026-05-31';
          return (!max || d > max) ? d : max;
        }, null),
        targeting: (() => {
          const allContent = Array.from(new Set(campaignBuys.map(b => b.targeting?.content).filter(Boolean)));
          return {
            gender: campaignBuys[0]?.targeting?.gender || 'Both',
            age: campaignBuys[0]?.targeting?.age || '18+',
            geography: campaignBuys[0]?.targeting?.geography,
            content: allContent,
            contentTarget: allContent.length === 1 ? allContent[0] : null
          };
        })(),
        budget: campaignBuys.reduce((sum, b) => sum + (b.budget || 0), 0),
        target_impressions: campaignBuys.reduce((sum, b) => sum + (b.target_impressions || 0), 0),
        target_reach: campaignBuys.reduce((sum, b) => sum + (b.target_reach || 0), 0),
        performance: {
          impressions: campaignBuys.reduce((sum, b) => sum + (b.performance?.impressions || 0), 0),
          reach: campaignBuys.reduce((sum, b) => sum + (b.performance?.reach || 0), 0),
          clicks: campaignBuys.reduce((sum, b) => sum + (b.performance?.clicks || 0), 0),
          spend: campaignBuys.reduce((sum, b) => sum + (b.performance?.spend || 0), 0),
          roas: campaignBuys.reduce((sum, b) => sum + (b.performance?.spend || 0) * (b.performance?.roas || 0), 0) /
            (campaignBuys.reduce((sum, b) => sum + (b.performance?.spend || 0), 0) || 1),
          ecpm: (campaignBuys.reduce((sum, b) => sum + (b.performance?.spend || 0), 0) /
            campaignBuys.reduce((sum, b) => sum + (b.performance?.impressions || 1), 0)) * 1000,
          is_underpacing: campaignBuys.some(b => b.performance?.is_underpacing)
        },
        line_items: campaignBuys
      };
    })()
    : null;

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="brand-header">
          <Activity size={24} color="var(--accent-blue)" />
          Advertiser Portal
        </div>

        <div className="agent-list">
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Advertisers
          </div>
          {agents.map(agent => (
            <button
              key={agent.id}
              className={`agent-btn ${activeAgentId === agent.id ? 'active' : ''}`}
              onClick={() => handleAgentSwitch(agent.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px' }}
            >
              <BrandLogo
                domain={data[agent.id]?.domain || 'google.com'}
                brandName={agent.name}
                size={22}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.name}</span>
              <div className={`status-dot ${data[agent.id] ? 'active' : ''}`}></div>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Dashboard Area */}
      <main className="main-content">
        {!activeData ? (
          <div className="loading-screen">Waiting for {agents.find(a => a.id === activeAgentId)?.name} agent to come online...</div>
        ) : currentView === 'create' ? (
          /* ======================= BUYER AGENT CAMPAIGN CREATION ======================= */
          <div className="create-campaign-view" style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
              <button className="back-btn" onClick={() => setCurrentView('dashboard')}>
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Buyer Agent</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{activeData.brand} AdCP Agent</div>
                </div>
                <BrandLogo
                  domain={activeData.domain}
                  brandName={activeData.brand}
                  size={48}
                  borderRadius="50%"
                  fontSize="1.2rem"
                />
              </div>
            </div>

            <div className="card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.01) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Deploy New Campaign</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
                Instruct your autonomous buyer agent to plan and execute a campaign. Describe your goals, target audience, and constraints in natural language.
              </p>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Campaign Objectives & Strategic Intent
                </label>
                <textarea
                  value={campaignPrompt}
                  onChange={(e) => setCampaignPrompt(e.target.value)}
                  placeholder="Example: Launch a awareness campaign for the new Shopsy festive collection. Target Gen-Z women in Tier 2 cities with a focus on high ROAS inventory on JioHotstar and Myntra. Budget: ₹50 Lakhs for 15 days."
                  style={{
                    width: '100%',
                    height: '220px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    color: '#fff',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                />
              </div>

              {(() => {
                const detectBudget = (text) => {
                  // Enhanced regex for ₹50 Lakhs, 2 Cr, 50L, 2Crores, etc.
                  const match = text.match(/(?:₹?\s*)(\d+(?:\.\d+)?)\s*(Lakhs?|Cr|Crores?|L|Crore)/i);
                  if (match) {
                    const val = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();
                    if (unit.startsWith('l')) return val * 100000;
                    if (unit.startsWith('c')) return val * 10000000;
                  }
                  return 0;
                };
                const budget = detectBudget(campaignPrompt);
                const requiresHITL = budget > 2000000;

                return (
                  <>
                    {requiresHITL && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px',
                        padding: '1rem 1.5rem',
                        marginBottom: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                          <Activity size={18} /> HUMAN-IN-THE-LOOP REQUIRED
                        </div>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', flex: 1 }}>
                          The detected budget (₹{(budget / 100000).toFixed(0)} Lakhs) exceeds the autonomous threshold of ₹20 Lakhs. Manual authorization is required to proceed.
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={isAuthorized}
                            onChange={(e) => setIsAuthorized(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Authorize Spend
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right', marginRight: 'auto' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Est. Token Usage</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                          {(1200 + Math.floor(campaignPrompt.length * 0.5)).toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tokens</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="status-dot active"></div> Agent Ready
                      </div>
                      <button
                        className="btn-forecast"
                        disabled={isSimulating}
                        onClick={() => {
                          if (isSimulating) return;
                          setForecastMode(true);
                          const events = generateForecastFeed(activeAgentId, activeData);
                          setAllFeedEvents(events);
                          setSimulationEvents([]);
                          setExpandedFeedEvent(null);
                          setIsSimulating(true);
                          let idx = 0;
                          const streamNext = () => {
                            if (idx < events.length) {
                              setSimulationEvents(prev => [...prev, events[idx]]);
                              idx++;
                              const lastEvt = events[idx - 1];
                              const delay = lastEvt?.type === 'lane-start' ? 400 :
                                            lastEvt?.type === 'handoff' ? 600 :
                                            lastEvt?.type === 'forecast-card' ? 1200 :
                                            lastEvt?.type === 'summary-table' ? 1500 :
                                            lastEvt?.phase === 'evaluate' ? 1800 :
                                            lastEvt?.phase === 'forecast' ? 1000 : 800;
                              simulationTimerRef.current = setTimeout(streamNext, delay);
                            } else {
                              setIsSimulating(false);
                            }
                          };
                          simulationTimerRef.current = setTimeout(streamNext, 500);
                        }}
                      >
                        <Eye size={18} />
                        {isSimulating && forecastMode ? 'Forecasting...' : 'Forecast Campaign'}
                      </button>
                      <button
                        onClick={() => {
                          if (requiresHITL && !isAuthorized) {
                            alert('Please authorize the spend before deploying.');
                            return;
                          }
                          if (isSimulating) return;
                          setForecastMode(false);
                          const events = generateBuyerFeed(activeAgentId, activeData);
                          setAllFeedEvents(events);
                          setSimulationEvents([]);
                          setExpandedFeedEvent(null);
                          setIsSimulating(true);
                          let idx = 0;
                          const streamNext = () => {
                            if (idx < events.length) {
                              setSimulationEvents(prev => [...prev, events[idx]]);
                              idx++;
                              const lastEvt = events[idx - 1];
                              const delay = lastEvt?.type === 'lane-start' ? 400 :
                                            lastEvt?.type === 'handoff' ? 600 :
                                            lastEvt?.type === 'summary-table' ? 1500 :
                                            lastEvt?.phase === 'evaluate' ? 1800 :
                                            lastEvt?.phase === 'buy' ? 1200 :
                                            lastEvt?.phase === 'summary' ? 2000 : 900;
                              simulationTimerRef.current = setTimeout(streamNext, delay);
                            } else {
                              setIsSimulating(false);
                            }
                          };
                          simulationTimerRef.current = setTimeout(streamNext, 500);
                        }}
                        style={{
                          padding: '12px 32px',
                          background: (requiresHITL && !isAuthorized) ? 'var(--text-muted)' : 'var(--accent-blue)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '1rem',
                          fontWeight: 700,
                          cursor: (requiresHITL && !isAuthorized) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s',
                          boxShadow: (requiresHITL && !isAuthorized) ? 'none' : '0 8px 24px rgba(59, 130, 246, 0.3)',
                          opacity: (requiresHITL && !isAuthorized) ? 0.6 : 1
                        }}
                        onMouseOver={(e) => {
                          if (requiresHITL && !isAuthorized) return;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          if (requiresHITL && !isAuthorized) return;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        <TrendingUp size={18} />
                        {isSimulating && !forecastMode ? 'Agent Running...' : (simulationEvents.length > 0 && !forecastMode ? 'Re-deploy Campaign' : 'Deploy Campaign')}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.2rem' }}>
                <div className="metric-sub" style={{ marginBottom: '0.5rem' }}>Context Layer</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agent will automatically resolve competitive moats and publisher exclusions.</div>
              </div>
              <div className="card" style={{ padding: '1.2rem' }}>
                <div className="metric-sub" style={{ marginBottom: '0.5rem' }}>Pacing Model</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Autonomous inventory bidding across JioHotstar, Myntra, and NDTV.</div>
              </div>
              <div className="card" style={{ padding: '1.2rem' }}>
                <div className="metric-sub" style={{ marginBottom: '0.5rem' }}>Inference Cost</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimized token usage via protocol-level context triggers.</div>
              </div>
            </div>

            {/* ── Agent Intelligence Feed (appears after Deploy) ── */}
            {(simulationEvents.length > 0 || isSimulating) && (() => {
              const visibleEvents = simulationEvents;
              const totalTokens = visibleEvents.reduce((s, e) => s + (e.tokenUsage?.total || 0), 0);
              const totalSaved = visibleEvents.reduce((s, e) => s + (e.contextEngineering || []).reduce((ss, ce) => ss + (ce.tokensSaved || 0), 0), 0);
              const totalCost = visibleEvents.reduce((s, e) => s + (e.tokenUsage?.costINR || 0), 0);
              const totalEvents = allFeedEvents.length;
              
              return (
                <div className="intelligence-feed" style={{ marginTop: '2rem' }}>
                  <div className="feed-header">
                    <div className="feed-header-title">
                      <div className="feed-live-dot" style={isSimulating ? (forecastMode ? { background: '#ec4899', boxShadow: '0 0 8px rgba(236,72,153,0.6)' } : {}) : { background: '#6b7280', boxShadow: 'none', animation: 'none' }} />
                      {isSimulating ? (forecastMode ? 'Forecast Intelligence Feed — LIVE' : 'Agent Intelligence Feed — LIVE') : (forecastMode ? 'Forecast Intelligence Feed — Complete' : 'Agent Intelligence Feed — Complete')}
                    </div>
                    <div className="feed-stats">
                      <div className="feed-stat">
                        Progress: <span className="feed-stat-value">{visibleEvents.length}/{totalEvents}</span>
                      </div>
                      <div className="feed-stat">
                        Tokens: <span className="feed-stat-value">{totalTokens.toLocaleString()}</span>
                      </div>
                      <div className="feed-stat">
                        Saved: <span className="feed-stat-value" style={{ color: '#10b981' }}>{totalSaved.toLocaleString()}</span>
                      </div>
                      <div className="feed-stat">
                        Cost: <span className="feed-stat-value" style={{ color: '#8b5cf6' }}>₹{totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="feed-timeline" ref={feedTimelineRef}>
                    {visibleEvents.map((evt, idx) => {
                      // Lane-start event
                      if (evt.type === 'lane-start') {
                        const cw = evt.contextWindow;
                        const isExp = expandedFeedEvent === idx;
                        return (
                          <div key={idx} className="feed-lane-header clickable" style={{ '--lane-color': evt.agent.color, animation: 'fadeIn 0.4s ease-out' }}
                            onClick={() => setExpandedFeedEvent(isExp ? null : idx)}>
                            <div className="lane-title">
                              <span>{evt.agent.icon}</span> {evt.agent.name}
                              <span className="lane-badge" data-llm={String(evt.agent.usesLLM)}>{evt.agent.usesLLM ? 'LLM' : 'Deterministic'}</span>
                              <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7 }}>{isExp ? '▼' : '▶'} JSON</span>
                            </div>
                            <div className="lane-meta">
                              <div className="feed-context-gauge">
                                <span className="gauge-label">{cw.inputTokens.toLocaleString()} tok ({cw.windowPct}%)</span>
                                <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${cw.windowPct}%`, background: evt.agent.color }} /></div>
                              </div>
                            </div>
                            {isExp && evt.details && (
                              <div className="feed-json-block">{JSON.stringify(evt.details, null, 2)}</div>
                            )}
                          </div>
                        );
                      }
                      // Handoff event
                      if (evt.type === 'handoff') {
                        const isExp = expandedFeedEvent === idx;
                        return (
                          <div key={idx} className="feed-handoff clickable" style={{ animation: 'fadeIn 0.4s ease-out' }}
                            onClick={() => setExpandedFeedEvent(isExp ? null : idx)}>
                            <span className="handoff-arrow">→</span>
                            <span>Handoff: {evt.from} → <span style={{ color: evt.toColor, fontWeight: 700 }}>{evt.to}</span></span>
                            <span className="handoff-payload">{evt.payloadTokens.toLocaleString()} tok</span>
                            <span style={{ opacity: 0.6 }}>{evt.payloadDescription}</span>
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7, marginLeft: 'auto' }}>{isExp ? '▼' : '▶'}</span>
                            {isExp && evt.details && (
                              <div className="feed-json-block" style={{ width: '100%' }}>{JSON.stringify(evt.details, null, 2)}</div>
                            )}
                          </div>
                        );
                      }
                      // Forecast card event
                      if (evt.type === 'forecast-card') {
                        const t = evt.totals;
                        const fmtM = (v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`;
                        const fmtL = (v) => `₹${(v/100000).toFixed(1)}L`;
                        return (
                          <div key={idx} className="forecast-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <div className="forecast-header">
                              <div className="forecast-title">📊 Campaign Forecast — {evt.brand}</div>
                              <span className="forecast-badge">Forecast Only — No Buys Created</span>
                            </div>
                            <div className="forecast-kpis">
                              <div className="forecast-kpi">
                                <div className="forecast-kpi-label">Budget</div>
                                <div className="forecast-kpi-value">{fmtL(t.budget)}</div>
                              </div>
                              <div className="forecast-kpi">
                                <div className="forecast-kpi-label">Est. Impressions</div>
                                <div className="forecast-kpi-value">{fmtM(t.impressions)}</div>
                              </div>
                              <div className="forecast-kpi">
                                <div className="forecast-kpi-label">Est. Reach</div>
                                <div className="forecast-kpi-value">{fmtM(t.reach)}</div>
                              </div>
                              <div className="forecast-kpi">
                                <div className="forecast-kpi-label">Est. ROAS</div>
                                <div className="forecast-kpi-value" style={{ color: t.roas >= 4 ? '#10b981' : '#f97316' }}>{t.roas}x</div>
                              </div>
                            </div>
                            <table>
                              <thead><tr><th>Publisher</th><th>Slot</th><th>Budget</th><th>Impressions</th><th>Reach</th><th>ROAS</th></tr></thead>
                              <tbody>
                                {evt.forecasts.map((f, fi) => (
                                  <tr key={fi}>
                                    <td>{f.publisher}</td>
                                    <td style={{ color: '#60a5fa' }}>{f.product_name.split(' — ')[1]}</td>
                                    <td>{fmtL(f.budget)}</td>
                                    <td>{fmtM(f.impressions)}</td>
                                    <td>{fmtM(f.reach)}</td>
                                    <td style={{ color: f.roas >= 4 ? '#10b981' : '#f97316', fontWeight: 700 }}>{f.roas}x</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="forecast-footer">
                              <span>⚡ {t.llmCalls} LLM call · {t.llmTokens.toLocaleString()} tokens · ₹{t.llmCost.toFixed(2)}</span>
                              <span className="safe">📝 No media buys created. Forecast only.</span>
                            </div>
                          </div>
                        );
                      }
                      // Summary table event
                      if (evt.type === 'summary-table') {
                        return (
                          <div key={idx} className="feed-summary-table" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <h4>Multi-Agent Efficiency Comparison</h4>
                            <table><thead><tr><th>Metric</th><th>Monolithic Agent</th><th>Multi-Agent (Actual)</th><th>Savings</th></tr></thead>
                              <tbody>{evt.rows.map((r, ri) => (
                                <tr key={ri}><td>{r.metric}</td><td>{r.mono}</td><td>{r.multi}</td><td className="savings">{r.savings}</td></tr>
                              ))}</tbody>
                            </table>
                          </div>
                        );
                      }
                      // Regular event
                      return (
                      <div
                        key={idx}
                        className={`feed-event ${expandedFeedEvent === idx ? 'expanded' : ''}`}
                        data-phase={evt.phase}
                        onClick={() => setExpandedFeedEvent(expandedFeedEvent === idx ? null : idx)}
                        style={{ animation: 'fadeIn 0.4s ease-out', borderLeft: evt.agentColor ? `2px solid ${evt.agentColor}` : undefined }}
                      >
                        <div className="feed-event-top">
                          <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                            <span className="feed-event-icon">{evt.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div className="feed-event-title">{evt.title}</div>
                              {evt.agentName && <div style={{ fontSize: '0.6rem', color: evt.agentColor || 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>{evt.agentName}</div>}
                              {evt.toolName && <div className="feed-tool-name">{evt.toolName}</div>}
                              
                              {evt.contextEngineering?.length > 0 && (
                                <div className="feed-ce-badges">
                                  {evt.contextEngineering.map((ce, ci) => (
                                    <span key={ci} className="feed-ce-badge">
                                      ⚡ {ce.strategy}
                                      {ce.tokensSaved > 0 && (
                                        <span className="feed-ce-saved"> −{ce.tokensSaved.toLocaleString()} tok</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {evt.tokenUsage && (
                                <div className="feed-token-bar-container">
                                  <span className="feed-token-label">{evt.tokenUsage.total.toLocaleString()} tokens</span>
                                  <div className="feed-token-bar">
                                    <div className="feed-token-bar-fill" style={{ width: `${Math.min((evt.tokenUsage.total / 5000) * 100, 100)}%` }} />
                                  </div>
                                  <span className="feed-token-cost">₹{evt.tokenUsage.costINR.toFixed(3)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="feed-event-meta">
                            <span className="feed-phase-badge" data-phase={evt.phase}>{evt.phaseLabel}</span>
                            <span className="feed-event-time">
                              {new Date(evt.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {expandedFeedEvent === idx && (
                          <div className="feed-expand">
                            {JSON.stringify(evt.details, null, 2)}
                          </div>
                        )}
                      </div>
                      );
                    })}
                    {isSimulating && (
                      <div className="feed-event" data-phase="init" style={{ opacity: 0.5 }}>
                        <div className="feed-event-top">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="loader" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                            <span className="feed-event-title" style={{ color: 'var(--text-muted)' }}>Processing next action...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Past Campaigns Accordion */}
            {(() => {
              const pastBuys = activeData?.past_buys || [];
              const campaignMap = {};
              pastBuys.forEach(buy => {
                const cid = buy.campaign_id || buy.id;
                if (!campaignMap[cid]) campaignMap[cid] = [];
                campaignMap[cid].push(buy);
              });
              const pastCampaigns = Object.entries(campaignMap)
                .map(([cid, buys]) => ({
                  id: cid,
                  name: (buys[0]?.name || 'Campaign').split(' - ')[0],
                  brand: buys[0]?.brand || activeData.brand,
                  start_date: buys.reduce((min, b) => b.start_date < min ? b.start_date : min, buys[0].start_date),
                  end_date: buys.reduce((max, b) => b.end_date > max ? b.end_date : max, buys[0].end_date),
                  budget: buys.reduce((s, b) => s + (b.budget || 0), 0),
                  target_impressions: buys.reduce((s, b) => s + (b.target_impressions || 0), 0),
                  target_reach: buys.reduce((s, b) => s + (b.target_reach || 0), 0),
                  impressions: buys.reduce((s, b) => s + (b.performance?.impressions || 0), 0),
                  reach: buys.reduce((s, b) => s + (b.performance?.reach || 0), 0),
                  roas: buys.length > 0 ? buys.reduce((s, b) => s + (b.performance?.roas || 0), 0) / buys.length : 0,
                  lineItems: buys.length,
                  publishers: [...new Set(buys.map(b => b.publisher))]
                }))
                .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))
                .slice(0, 5);

              if (pastCampaigns.length === 0) return null;

              const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); } catch(e) { return d; } };
              const fmtCr = (n) => n >= 10000000 ? '\u20b9' + (n / 10000000).toFixed(2) + ' Cr' : n >= 100000 ? '\u20b9' + (n / 100000).toFixed(1) + ' L' : '\u20b9' + n.toLocaleString('en-IN');
              const fmtM = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n.toString();

              return (
                <div style={{ marginTop: '3rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                    <History size={18} /> Past Campaigns
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({pastCampaigns.length} most recent)</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pastCampaigns.map((camp) => {
                      const isOpen = expandedHistoryId === camp.id;
                      const historyFeed = isOpen ? generateBuyerFeed(activeAgentId, activeData) : [];
                      return (
                        <div key={camp.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isOpen ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-light)' }}>
                          <div
                            onClick={() => setExpandedHistoryId(isOpen ? null : camp.id)}
                            style={{
                              padding: '1rem 1.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background 0.2s',
                              background: isOpen ? 'rgba(59,130,246,0.05)' : 'transparent'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{camp.name}</span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>COMPLETED</span>
                              </div>
                              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                <span>{fmtDate(camp.start_date)} - {fmtDate(camp.end_date)}</span>
                                <span>{camp.publishers.join(', ')}</span>
                                <span>{camp.lineItems} line items</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</div>
                                  <div style={{ fontWeight: 700, color: '#fff' }}>{fmtCr(camp.budget)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impressions</div>
                                  <div style={{ fontWeight: 700, color: '#fff' }}>{fmtM(camp.impressions)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reach</div>
                                  <div style={{ fontWeight: 700, color: '#fff' }}>{fmtM(camp.reach)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ROAS</div>
                                  <div style={{ fontWeight: 700, color: camp.roas >= 4 ? '#10b981' : '#f97316' }}>{camp.roas.toFixed(1)}x</div>
                                </div>
                              </div>
                              {isOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                            </div>
                          </div>

                          {isOpen && (
                            <div style={{ borderTop: '1px solid var(--border-light)' }}>
                              <div className="intelligence-feed" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                                <div className="feed-header" style={{ borderRadius: 0 }}>
                                  <div className="feed-header-title">
                                    <div className="feed-live-dot" style={{ background: '#6b7280', boxShadow: 'none', animation: 'none' }} />
                                    Historical Agent Feed
                                  </div>
                                  <div className="feed-stats">
                                    <div className="feed-stat">
                                      Events: <span className="feed-stat-value">{historyFeed.length}</span>
                                    </div>
                                    <div className="feed-stat">
                                      Tokens: <span className="feed-stat-value">{historyFeed.reduce((s, e) => s + (e.tokenUsage?.total || 0), 0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="feed-timeline" style={{ maxHeight: '400px' }}>
                                  {historyFeed.map((evt, idx) => {
                                    const isExp = expandedHistoryEvent === idx;
                                    if (evt.type === 'lane-start') {
                                      const cw = evt.contextWindow;
                                      return (<div key={idx} className="feed-lane-header clickable" style={{ '--lane-color': evt.agent.color }}
                                        onClick={() => setExpandedHistoryEvent(isExp ? null : idx)}>
                                        <div className="lane-title"><span>{evt.agent.icon}</span> {evt.agent.name} <span className="lane-badge" data-llm={String(evt.agent.usesLLM)}>{evt.agent.usesLLM ? 'LLM' : 'Deterministic'}</span>
                                          <span style={{ marginLeft: 'auto', fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7 }}>{isExp ? '▼' : '▶'} JSON</span>
                                        </div>
                                        <div className="lane-meta"><div className="feed-context-gauge"><span className="gauge-label">{cw.inputTokens.toLocaleString()} tok ({cw.windowPct}%)</span><div className="gauge-bar"><div className="gauge-fill" style={{ width: `${cw.windowPct}%`, background: evt.agent.color }} /></div></div></div>
                                        {isExp && evt.details && <div className="feed-json-block">{JSON.stringify(evt.details, null, 2)}</div>}
                                      </div>);
                                    }
                                    if (evt.type === 'handoff') {
                                      return (<div key={idx} className="feed-handoff clickable" onClick={() => setExpandedHistoryEvent(isExp ? null : idx)}>
                                        <span className="handoff-arrow">→</span><span>Handoff: {evt.from} → <span style={{ color: evt.toColor, fontWeight: 700 }}>{evt.to}</span></span><span className="handoff-payload">{evt.payloadTokens.toLocaleString()} tok</span>
                                        <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', opacity: 0.7, marginLeft: 'auto' }}>{isExp ? '▼' : '▶'}</span>
                                        {isExp && evt.details && <div className="feed-json-block" style={{ width: '100%' }}>{JSON.stringify(evt.details, null, 2)}</div>}
                                      </div>);
                                    }
                                    if (evt.type === 'summary-table') {
                                      return (<div key={idx} className="feed-summary-table"><h4>Multi-Agent Efficiency</h4><table><thead><tr><th>Metric</th><th>Monolithic</th><th>Multi-Agent</th><th>Savings</th></tr></thead><tbody>{evt.rows.map((r, ri) => (<tr key={ri}><td>{r.metric}</td><td>{r.mono}</td><td>{r.multi}</td><td className="savings">{r.savings}</td></tr>))}</tbody></table></div>);
                                    }
                                    return (
                                    <div key={idx} className={`feed-event ${isExp ? 'expanded' : ''}`} data-phase={evt.phase} style={{ borderLeft: evt.agentColor ? `2px solid ${evt.agentColor}` : undefined, cursor: 'pointer' }}
                                      onClick={() => setExpandedHistoryEvent(isExp ? null : idx)}>
                                      <div className="feed-event-top">
                                        <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
                                          <span className="feed-event-icon">{evt.icon}</span>
                                          <div style={{ flex: 1 }}>
                                            <div className="feed-event-title">{evt.title}</div>
                                            {evt.agentName && <div style={{ fontSize: '0.6rem', color: evt.agentColor || 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>{evt.agentName}</div>}
                                            {evt.toolName && <div className="feed-tool-name">{evt.toolName}</div>}
                                            {evt.contextEngineering?.length > 0 && (
                                              <div className="feed-ce-badges">
                                                {evt.contextEngineering.map((ce, ci) => (
                                                  <span key={ci} className="feed-ce-badge">
                                                    {ce.strategy}
                                                    {ce.tokensSaved > 0 && <span className="feed-ce-saved"> -{ce.tokensSaved.toLocaleString()} tok</span>}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <div className="feed-event-meta">
                                          <span className="feed-phase-badge" data-phase={evt.phase}>{evt.phaseLabel}</span>
                                        </div>
                                      </div>
                                      {isExp && evt.details && (
                                        <div className="feed-expand">
                                          {JSON.stringify(evt.details, null, 2)}
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>
        ) : (
          <>
            {/* Top Bar */}
            <div className="top-bar">
              <div>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '0.75rem' }}>
                  <BrandLogo
                    domain={activeData.domain}
                    brandName={activeData.brand}
                    size={42}
                    borderRadius="8px"
                    fontSize="1.1rem"
                  />
                  {activeData.brand}
                  {selectedCampaign ? ` — ${selectedCampaign.name}` : ' Dashboard'}
                </h1>
                <div style={{ color: 'var(--text-muted)' }}>{activeData.domain}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                  opacity: selectedCampaignId ? 0 : 1,
                  pointerEvents: selectedCampaignId ? 'none' : 'auto',
                  transition: 'opacity 0.2s ease'
                }}>
                  <div className="timeframe-selector" style={{ display: 'flex', background: 'var(--bg-dark)', borderRadius: '8px', padding: '4px' }}>
                    <button
                      onClick={handleResetToCurrent}
                      title="Reset to current period"
                      style={{
                        padding: '4px 8px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <RefreshCw size={14} />
                    </button>

                    {['monthly', 'quarterly', 'yearly'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => {
                          setTimeframe(tf);
                          // Auto-map current month to its quarter when switching to quarterly
                          if (tf === 'quarterly') {
                            const mIdx = MONTHS.indexOf(selectedMonth);
                            setSelectedQuarter(QUARTERS[Math.floor(mIdx / 3)]);
                          }
                        }}
                        style={{
                          padding: '4px 12px',
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          background: timeframe === tf ? 'var(--accent-blue)' : 'transparent',
                          color: timeframe === tf ? '#fff' : 'var(--text-muted)',
                          textTransform: 'capitalize',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {timeframe !== 'yearly' && (
                      <select
                        className="period-select"
                        value={selectedPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        style={{
                          background: 'var(--bg-dark)',
                          color: '#fff',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          outline: 'none'
                        }}
                      >
                        {availablePeriods.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    )}
                    <select
                      className="period-select"
                      value={selectedYear}
                      onChange={(e) => {
                        const newYear = e.target.value;
                        setSelectedYear(newYear);
                        const nextAvailable = getAvailablePeriods();
                        if (!nextAvailable.includes(selectedPeriod)) {
                          setSelectedPeriod(nextAvailable[0]);
                        }
                      }}
                      style={{
                        background: 'var(--bg-dark)',
                        color: '#fff',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        outline: 'none'
                      }}
                    >
                      {FY_YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>


              </div>
            </div>

            {selectedCampaignId && selectedCampaign ? (
              /* ======================= DETAILED CAMPAIGN VIEW ======================= */
              <div className="campaign-detail-view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button className="back-btn" onClick={() => setSelectedCampaignId(null)}>
                    <ArrowLeft size={16} /> Back to Overview
                  </button>
                  <div className="agent-state-badge" style={{ background: selectedCampaign.status === 'active' ? 'var(--accent-green)' : 'var(--accent-blue)', color: '#fff' }}>
                    {selectedCampaign.status.toUpperCase()}
                  </div>
                </div>

                <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
                  {/* Campaign Summary Card */}
                  <div className="card span-3" style={{ 
                    padding: '1.75rem', 
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)', 
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <div className="metric-sub" style={{ color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem', marginBottom: '0.4rem' }}>Campaign Summary</div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{selectedCampaign.name}</h2>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Campaign ID: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{selectedCampaign.id}</span></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="metric-sub" style={{ marginBottom: '0.6rem', fontSize: '0.75rem' }}>Primary Brand</div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          background: 'rgba(255,255,255,0.03)', 
                          padding: '0.6rem 1.25rem', 
                          borderRadius: '12px', 
                          border: '1px solid var(--border-light)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}>
                          <BrandLogo domain={activeData.domain} brandName={selectedCampaign.brand} size={24} borderRadius="4px" fontSize="0.7rem" />
                          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{selectedCampaign.brand}</span>
                        </div>
                      </div>
                    </div>

                    {/* Parameters Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                      <div>
                        <div className="metric-sub" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <Calendar size={16} style={{ color: 'var(--accent-blue)' }} /> Flight Period
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                          {formatShortDate(selectedCampaign.start_date)} — {formatShortDate(selectedCampaign.end_date)}
                        </div>
                      </div>
                      <div>
                        <div className="metric-sub" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <Share2 size={16} style={{ color: 'var(--accent-purple)' }} /> Publishers
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)', lineHeight: '1.4' }}>{selectedCampaign.publisher}</div>
                      </div>
                      <div>
                        <div className="metric-sub" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <Monitor size={16} style={{ color: 'var(--accent-orange)' }} /> Device
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                          {selectedCampaign.device.split(', ').map(d => d === 'Android' ? 'AOS' : (d === 'Connected TV' ? 'CTV' : d)).join(' + ')}
                        </div>
                      </div>
                      <div>
                        <div className="metric-sub" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <Layout size={16} style={{ color: 'var(--accent-green)' }} /> Ad Formats
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)', lineHeight: '1.4' }}>{selectedCampaign.format}</div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="card">
                    <div className="card-title"><IndianRupee size={18} /> Financial Summary</div>
                    <div style={{ marginTop: '1.5rem' }}>
                      <div className="metric-sub" style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Allocated Budget</div>
                      <div className="metric-value" style={{ fontSize: '1.75rem' }}>{formatToCr(selectedCampaign.budget)}</div>
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                      <div className="metric-sub" style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Actual Spend</div>
                      <div className="metric-value" style={{ color: 'var(--accent-blue)', fontSize: '1.75rem' }}>
                        {formatToCr(selectedCampaign.performance?.spend)}
                      </div>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        <span>Budget Burn</span>
                        <span>{(((selectedCampaign.performance?.spend || 0) / (selectedCampaign.budget || 1)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="progress-bg">
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(((selectedCampaign.performance?.spend || 0) / (selectedCampaign.budget || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery & Engagement Metrics */}
                  <div className="card span-2" style={{ padding: '1.5rem' }}>
                    <div className="card-title" style={{ marginBottom: '1.5rem', color: '#fff', fontSize: '1rem' }}>Performance Summary</div>

                    {/* Top Row: Primary Targets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                          <div>
                            <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Impressions</div>
                            <div className="metric-value" style={{ fontSize: '2.5rem', marginTop: '0.25rem' }}>{formatToMillions(selectedCampaign.performance?.impressions)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="metric-sub" style={{ fontSize: '0.85rem' }}>Target: {formatToMillions(selectedCampaign.target_impressions)}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                              {((selectedCampaign.performance?.impressions / selectedCampaign.target_impressions) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="progress-bg" style={{ height: '10px', background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(((selectedCampaign.performance?.impressions / selectedCampaign.target_impressions) * 100), 100)}%`,
                              background: selectedCampaign.performance?.is_underpacing ? 'var(--accent-red)' : 'linear-gradient(90deg, var(--accent-blue) 0%, #60a5fa 100%)'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                          <div>
                            <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Unique Reach</div>
                            <div className="metric-value" style={{ fontSize: '2.5rem', marginTop: '0.25rem' }}>{formatToMillions(selectedCampaign.performance?.reach)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="metric-sub" style={{ fontSize: '0.85rem' }}>Target: {formatToMillions(selectedCampaign.target_reach)}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                              {((selectedCampaign.performance?.reach / selectedCampaign.target_reach) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="progress-bg" style={{ height: '10px', background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.min(((selectedCampaign.performance?.reach / selectedCampaign.target_reach) * 100), 100)}%`,
                              background: selectedCampaign.performance?.is_underpacing ? 'var(--accent-red)' : 'linear-gradient(90deg, #8b5cf6) 0%, #a78bfa 100%)'
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Efficiency Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', paddingTop: '2rem' }}>
                      <div>
                        <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>Total Clicks</div>
                        <div className="metric-value" style={{ fontSize: '2rem' }}>{formatToMillions(selectedCampaign.performance?.clicks)}</div>
                      </div>
                      <div>
                        <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>CTR</div>
                        <div className="metric-value" style={{ fontSize: '2rem' }}>{selectedCampaign.performance?.impressions ? ((selectedCampaign.performance.clicks / selectedCampaign.performance.impressions) * 100).toFixed(2) : 0}%</div>
                      </div>
                      <div>
                        <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>ROAS</div>
                        <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--accent-orange)' }}>{(selectedCampaign.performance?.roas || 0).toFixed(1)}x</div>
                      </div>
                    </div>
                  </div>

                  {/* Targeting & Context Layer (NEW) */}
                  <div className="card span-2" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-light)' }}>
                    <div className="card-title" style={{ marginBottom: '1.2rem' }}><Target size={18} /> Targeting & Audience</div>
                    <div>
                      <div className="metric-sub" style={{ marginBottom: '0.8rem' }}>Demographic & Geographic Parameters</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {selectedCampaign.targeting?.gender === 'Both' ? 'M-F' : selectedCampaign.targeting?.gender}
                        </span>
                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Age: {selectedCampaign.targeting?.age}
                        </span>
                        <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {selectedCampaign.targeting?.geography}
                        </span>
                        {selectedCampaign.targeting?.contentTarget && (
                          <span style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {selectedCampaign.targeting.contentTarget}
                          </span>
                        )}
                        <span style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-orange)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {selectedCampaign.device.split(', ').map(d => d === 'Android' ? 'AOS' : (d === 'Connected TV' ? 'CTV' : d)).join(' + ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Usage (NEW) */}
                  <div className="card" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.01) 100%)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <div className="card-title" style={{ marginBottom: '1rem' }}><BrainCircuit size={18} /> AI Usage</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '2rem' }}>
                        <div>
                          <div className="metric-sub" style={{ fontSize: '0.7rem' }}>Tokens</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{(activeData.intelligence?.total_tokens / 10).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="metric-sub" style={{ fontSize: '0.7rem' }}>Cost</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-purple)' }}>₹{(activeData.intelligence?.estimated_cost_inr / 10).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Performance Table (NEW) */}
                  <div className="card span-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div className="card-title" style={{ marginBottom: 0 }}><History size={18} /> Daily Delivery Log (by Targeting)</div>
                      <div className="search-container" style={{ position: 'relative', flex: 1, margin: '0 2rem', minWidth: '250px', maxWidth: '400px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Search logs..."
                          value={detailSearchTerm}
                          onChange={(e) => setDetailSearchTerm(e.target.value)}
                          style={{
                            background: 'var(--bg-dark)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            padding: '6px 12px 6px 34px',
                            fontSize: '0.8rem',
                            color: '#fff',
                            width: '100%',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                        />
                      </div>
                    </div>
                    <table className="campaign-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Date</th>
                          <th style={{ textAlign: 'left' }}>Line Item / Targeting</th>
                          <th style={{ textAlign: 'center' }}>Device</th>
                          <th style={{ textAlign: 'center' }}>Impressions</th>
                          <th style={{ textAlign: 'center' }}>Clicks</th>
                          <th style={{ textAlign: 'center' }}>Spend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const log = [];
                          selectedCampaign.line_items.forEach(li => {
                            // Filter line items based on detailSearchTerm
                            if (detailSearchTerm) {
                              const term = detailSearchTerm.toLowerCase();
                              const matches =
                                (li.line_item_name && li.line_item_name.toLowerCase().includes(term)) ||
                                (li.publisher && li.publisher.toLowerCase().includes(term)) ||
                                (li.device && li.device.toLowerCase().includes(term)) ||
                                (li.format && li.format.toLowerCase().includes(term)) ||
                                (li.targeting?.content && li.targeting.content.toLowerCase().includes(term));

                              if (!matches) return;
                            }

                            const start = new Date(li.start_date);
                            const end = new Date(li.end_date);
                            const today = new Date('2026-05-10');
                            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                            for (let i = 0; i < days; i++) {
                              const d = new Date(start);
                              d.setDate(start.getDate() + i);
                              if (d > today && li.status === 'active') continue;

                              const jitterVal = 0.9 + (Math.random() * 0.2);
                              const dailyImps = Math.floor((li.performance.impressions / (li.status === 'active' ? Math.min(days, 10) : days)) * jitterVal);
                              const dailyClicks = Math.floor((li.performance.clicks / (li.status === 'active' ? Math.min(days, 10) : days)) * jitterVal);
                              const dailySpend = (li.performance.spend / (li.status === 'active' ? Math.min(days, 10) : days)) * jitterVal;

                              log.push({
                                date: d,
                                name: li.line_item_name,
                                targeting: li.targeting,
                                device: li.device,
                                format: li.format,
                                imps: dailyImps,
                                clicks: dailyClicks,
                                spend: dailySpend
                              });
                            }
                          });

                          return log
                            .sort((a, b) => b.date - a.date) // Sort by latest date first
                            .map((row, idx) => (
                              <tr key={`${row.date.toISOString()}-${idx}`}>
                                <td style={{ textAlign: 'left', fontWeight: 600 }}>{formatShortDate(row.date.toISOString())}</td>
                                <td style={{ textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#fff' }}>
                                    {row.name} - {row.format} - {row.targeting.gender === 'Both' ? 'Male-Female' : row.targeting.gender} - {row.targeting.age}{selectedCampaign.targeting?.contentTarget ? ` - ${row.targeting.content}` : ''}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-orange)' }}>{row.device === 'Android' ? 'AOS' : row.device}</span>
                                </td>
                                <td style={{ textAlign: 'center' }}>{formatToMillions(row.imps)}</td>
                                <td style={{ textAlign: 'center' }}>{row.clicks.toLocaleString()}</td>
                                <td style={{ textAlign: 'center' }}>{formatToCr(row.spend)}</td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* ======================= AGGREGATE DASHBOARD VIEW ======================= */
              <div className="dashboard-grid">

                {/* Financial Overview (Span 2) */}
                {(() => {
                  const allPeriodBuys = [...activeBuys, ...completedBuys];

                  const rawReach = allPeriodBuys.reduce((sum, b) => sum + (b.performance?.reach || 0), 0);
                  const rawTargetReach = allPeriodBuys.reduce((sum, b) => sum + (b.target_reach || 0), 0);

                  const periodMetrics = {
                    budget: allPeriodBuys.reduce((sum, b) => sum + (b.budget || 0), 0),
                    spent: allPeriodBuys.reduce((sum, b) => sum + (b.performance?.spent || b.performance?.spend || 0), 0),
                    impressions: allPeriodBuys.reduce((sum, b) => sum + (b.performance?.impressions || 0), 0),
                    target_impressions: allPeriodBuys.reduce((sum, b) => sum + (b.target_impressions || 0), 0),
                    // Reach is not additive - Heuristic: 75% unique across multiple campaigns
                    reach: allPeriodBuys.length > 1 ? Math.floor(rawReach * 0.75) : rawReach,
                    target_reach: allPeriodBuys.length > 1 ? Math.floor(rawTargetReach * 0.75) : rawTargetReach,
                    clicks: allPeriodBuys.reduce((sum, b) => sum + (b.performance?.clicks || 0), 0),
                    roas: allPeriodBuys.length > 0 ? allPeriodBuys.reduce((sum, b) => sum + (b.performance?.roas || 0), 0) / allPeriodBuys.length : 0
                  };

                  return (
                    <>
                      <div className="card span-2">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><IndianRupee size={18} /> Financials & Pacing</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Aggregated metrics for {contextLabel ? contextLabel : 'selected'} campaigns in {timeframe === 'yearly' ? 'the year' : selectedPeriod} {selectedYear}.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <div className="metric-sub">Budget</div>
                            <div className="metric-value">
                              {formatToCr(periodMetrics.budget)}
                              <GrowthBadge value={(activeData.performance?.growth || 0) * 0.8} />
                            </div>
                          </div>
                          <div>
                            <div className="metric-sub">Spent</div>
                            <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
                              {formatToCr(periodMetrics.spent)}
                              <GrowthBadge value={activeData.performance?.growth || 0} />
                            </div>
                          </div>
                          <div>
                            <div className="metric-sub">Remaining</div>
                            <div className="metric-value" style={{ color: 'var(--accent-green)' }}>{formatToCr(Math.max(0, periodMetrics.budget - periodMetrics.spent))}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span>Period Utilization</span>
                            <span>{periodMetrics.budget > 0 ? ((periodMetrics.spent / periodMetrics.budget) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="progress-bg">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(periodMetrics.budget > 0 ? (periodMetrics.spent / periodMetrics.budget) * 100 : 0, 100)}%`,
                                background: (periodMetrics.spent > periodMetrics.budget * 1.1) ? 'var(--accent-red)' : 'var(--accent-blue)'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Consumption Metrics */}
                      <div className="card">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><BrainCircuit size={18} /> Usage Metrics</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          AI agent resources utilized by {contextLabel ? contextLabel : 'selected'} campaigns during this period.
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <div className="metric-sub">Tokens Used {contextLabel && `(${contextLabel})`}</div>
                            <div className="metric-value">{((activeData.intelligence?.total_tokens || 0) * (allPeriodBuys.length > 0 ? 1 : 0)).toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="metric-sub">Estimated Cost {contextLabel && `(${contextLabel})`}</div>
                            <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>₹{((activeData.intelligence?.estimated_cost_inr || 0) * (allPeriodBuys.length > 0 ? 1 : 0)).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="card span-2">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}>Performance Metrics</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Consolidated delivery stats for {contextLabel ? contextLabel : 'selected'} campaigns in this period.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Target size={12} /> Target Imps</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>{formatToMillions(periodMetrics.target_impressions)}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Target size={12} /> Delivered Imps</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>{formatToMillions(periodMetrics.impressions)}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Activity size={12} /> Imps %</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem', color: 'var(--accent-green)' }}>
                              {periodMetrics.target_impressions ? ((periodMetrics.impressions / periodMetrics.target_impressions) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)', marginTop: '1rem' }}>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Target size={12} /> Target Reach</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>{formatToMillions(periodMetrics.target_reach)}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Target size={12} /> Delivered Reach</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>{formatToMillions(periodMetrics.reach)}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Activity size={12} /> Reach %</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem', color: 'var(--accent-blue)' }}>
                              {periodMetrics.target_reach ? ((periodMetrics.reach / periodMetrics.target_reach) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', paddingTop: '1rem' }}>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><TrendingUp size={12} /> Clicks</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>{formatToMillions(periodMetrics.clicks)}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Activity size={12} /> CTR</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>{periodMetrics.impressions ? ((periodMetrics.clicks / periodMetrics.impressions) * 100).toFixed(2) : 0}%</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><IndianRupee size={12} /> <span style={{ textTransform: 'none' }}>eCPM</span></div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>₹{periodMetrics.impressions ? Math.round((periodMetrics.spent / periodMetrics.impressions) * 1000).toLocaleString('en-IN') : 0}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><IndianRupee size={12} /> ROAS</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem', color: 'var(--accent-orange)' }}>{periodMetrics.roas.toFixed(1)}x</div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Top Performers Card */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <div className="card-title"><LayoutDashboard size={18} /> Top Performers</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <select
                        value={mixDimension}
                        onChange={(e) => setMixDimension(e.target.value)}
                        style={{ background: 'var(--bg-dark)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 4px' }}
                      >
                        <option value="brands">Brands</option>
                        <option value="publishers">Publishers</option>
                        <option value="devices">Devices</option>
                        <option value="ad_formats">Ad Formats</option>
                      </select>
                      <select
                        value={mixMetric}
                        onChange={(e) => setMixMetric(e.target.value)}
                        style={{ background: 'var(--bg-dark)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 4px' }}
                      >
                        <option value="impressions">Imps</option>
                        <option value="clicks">Clicks</option>
                        <option value="ctr">CTR</option>
                        <option value="reach">Reach</option>
                        <option value="roas">ROAS</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Rankings based on {contextLabel ? contextLabel : 'selected'} data for {timeframe === 'yearly' ? 'the year' : selectedPeriod} {selectedYear}.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(() => {
                      const allBuys = [...activeBuys, ...completedBuys];
                      const groups = {};

                      allBuys.forEach(buy => {
                        let key = 'Other';
                        if (mixDimension === 'brands') key = buy.brand;
                        else if (mixDimension === 'publishers') key = buy.publisher;
                        else if (mixDimension === 'campaigns') key = (buy.name || "Unknown").split(' - ')[0];
                        else if (mixDimension === 'devices') key = buy.device;
                        else if (mixDimension === 'ad_formats') key = buy.format;

                        if (!groups[key]) {
                          groups[key] = {
                            name: key,
                            impressions: 0, clicks: 0, reach: 0, spend: 0, roas_sum: 0, count: 0
                          };
                        }

                        groups[key].impressions += (buy.performance?.impressions || 0);
                        groups[key].clicks += (buy.performance?.clicks || 0);
                        groups[key].reach += (buy.performance?.reach || 0);
                        groups[key].spend += (buy.performance?.spend || 0);
                        groups[key].roas_sum += (buy.performance?.roas || 0);
                        groups[key].count += 1;
                      });

                      const aggregated = Object.values(groups).map(g => ({
                        ...g,
                        ctr: g.impressions ? (g.clicks / g.impressions) * 100 : 0,
                        roas: g.roas_sum / g.count,
                        [mixMetric]: mixMetric === 'ctr' ? (g.impressions ? (g.clicks / g.impressions) * 100 : 0) :
                          mixMetric === 'roas' ? (g.roas_sum / g.count) :
                            (mixMetric === 'revenue' ? g.spend : g[mixMetric])
                      }));

                      const sorted = aggregated.sort((a, b) => (b[mixMetric] || 0) - (a[mixMetric] || 0)).slice(0, 5);
                      const maxValue = Math.max(...sorted.map(d => d[mixMetric] || 0), 1);

                      if (sorted.length === 0) {
                        return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No performance data available for this period.</div>;
                      }

                      return sorted.map((item, index) => {
                        const currentVal = item[mixMetric] || 0;
                        const pct = (currentVal / maxValue) * 100;
                        return (
                          <div key={`${mixDimension}-${item.name}`} style={{ position: 'relative', padding: '0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{
                              position: 'absolute',
                              left: 0, top: 0, bottom: 0,
                              width: `${pct}%`,
                              background: 'rgba(59, 130, 246, 0.08)',
                              borderRadius: '6px',
                              zIndex: 0,
                              transition: 'width 0.3s ease'
                            }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>0{index + 1}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#fff' }}>{item.name}</span>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                                {mixMetric === 'ctr' ? currentVal.toFixed(2) + '%' :
                                  mixMetric === 'roas' ? currentVal.toFixed(1) + 'x' :
                                    formatToMillions(currentVal)}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()
                  }
                  </div>
                </div>

                {/* Campaigns Overview (Span 3) */}
                <div className="card span-3">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div className="card-title" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}><Briefcase size={18} /> Campaigns</div>

                    <div className="search-container" style={{ position: 'relative', flex: 1, margin: '0 2rem', minWidth: '300px', maxWidth: '500px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search campaigns, brands, IDs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                          background: 'var(--bg-dark)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '8px',
                          padding: '8px 12px 8px 38px',
                          fontSize: '0.85rem',
                          color: '#fff',
                          width: '100%',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--accent-blue)';
                          e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-light)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', background: 'var(--bg-dark)', borderRadius: '8px', padding: '4px', whiteSpace: 'nowrap', marginRight: '1.5rem' }}>
                      {(() => {
                        const tabs = (!hasActive && !hasCompleted)
                          ? ['active', 'completed']
                          : ['active', 'completed'].filter(t => t === 'active' ? hasActive : hasCompleted);

                        // Show both if both empty, otherwise filter
                        return tabs.map(tab => (
                          <button
                            key={tab}
                            onClick={() => setCampaignTab(tab)}
                            style={{
                              padding: '4px 16px',
                              fontSize: '0.75rem',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              background: campaignTab === tab ? 'var(--accent-blue)' : 'transparent',
                              color: campaignTab === tab ? '#fff' : 'var(--text-muted)',
                              textTransform: 'capitalize',
                              transition: 'all 0.2s',
                              fontWeight: 600
                            }}
                          >
                            {tab}
                          </button>
                        ));
                      })()}
                    </div>

                    <button
                      className="create-btn"
                      onClick={() => setCurrentView('create')}
                      style={{
                        marginLeft: '1.5rem',
                        padding: '6px 16px',
                        background: 'var(--accent-blue)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.3)';
                        e.currentTarget.style.background = '#4f46e5';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
                        e.currentTarget.style.background = 'var(--accent-blue)';
                      }}
                    >
                      <Plus size={14} /> Create Campaign
                    </button>
                  </div>
                  <div className="table-container">
                    <table className="campaign-table">
                      <thead>
                        <tr>
                          <th className="text-left" style={{ textAlign: 'left' }}>Campaign</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Brand</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Publisher</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Targeting</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Start</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>End</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Budget</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Impressions</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>% Delivered</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Reach</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>Clicks</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>CTR</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>eCPM</th>
                          <th className="text-center" style={{ textAlign: 'center' }}>ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          if (!activeData) return null;
                          const periodRange = getSelectedDateRange();
                          const allBuys = campaignTab === 'active' ? (activeData.active_buys || []) : (activeData.past_buys || []);

                          // Filter buys based on period overlap
                          let buys = allBuys.filter(buy => {
                            const bStart = new Date(buy.start_date || '2026-05-01');
                            const bEnd = new Date(buy.end_date || '2026-05-31');
                            return bStart <= periodRange.end && bEnd >= periodRange.start;
                          });

                          // Apply search filter if searchTerm exists
                          if (searchTerm) {
                            const term = searchTerm.toLowerCase();
                            buys = buys.filter(buy =>
                              (buy.name && buy.name.toLowerCase().includes(term)) ||
                              (buy.brand && buy.brand.toLowerCase().includes(term)) ||
                              ((buy.campaign_id || buy.id) && (buy.campaign_id || buy.id).toLowerCase().includes(term)) ||
                              (buy.publisher && buy.publisher.toLowerCase().includes(term))
                            );
                          }

                          if (buys.length === 0) return (
                            <tr>
                              <td colSpan="10" className="text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                                No campaigns found in the selected period.
                              </td>
                            </tr>
                          );

                          const campaignGroups = {};

                          buys.forEach(buy => {
                            if (!buy) return;
                            const cid = buy.campaign_id || buy.id || 'unassigned';

                            if (!campaignGroups[cid]) {
                              campaignGroups[cid] = {
                                id: cid,
                                name: (buy.name || "Unknown").split(' - ')[0],
                                brand: buy.brand || "Main",
                                targeting: {
                                  gender: buy.targeting?.gender || "Both",
                                  age: buy.targeting?.age || "18+",
                                  geographies: new Set(),
                                  devices: new Set()
                                },
                                publisher: new Set(),
                                status: buy.status || 'Active',
                                budget: 0,
                                impressions: 0,
                                target_impressions: 0,
                                reach: 0,
                                target_reach: 0,
                                clicks: 0,
                                items: 0,
                                start_date: buy.start_date || '2026-05-01',
                                end_date: buy.end_date || '2026-05-31',
                                is_underpacing: false
                              };
                            }
                            if (buy.performance?.is_underpacing) campaignGroups[cid].is_underpacing = true;
                            campaignGroups[cid].budget += (buy.budget || 0);
                            if (buy.start_date && buy.start_date < campaignGroups[cid].start_date) campaignGroups[cid].start_date = buy.start_date;
                            if (buy.end_date && buy.end_date > campaignGroups[cid].end_date) campaignGroups[cid].end_date = buy.end_date;
                            campaignGroups[cid].impressions += (buy.performance?.impressions || 0);
                            campaignGroups[cid].target_impressions += (buy.target_impressions || 0);
                            campaignGroups[cid].reach += (buy.performance?.reach || 0);
                            campaignGroups[cid].target_reach += (buy.target_reach || 0);
                            campaignGroups[cid].clicks += (buy.performance?.clicks || 0);
                            campaignGroups[cid].items += 1;
                            if (buy.publisher) campaignGroups[cid].publisher.add(buy.publisher);
                            if (buy.targeting?.geographies) {
                              buy.targeting.geographies.forEach(g => campaignGroups[cid].targeting.geographies.add(g));
                            } else if (buy.targeting?.geography) {
                              campaignGroups[cid].targeting.geographies.add(buy.targeting.geography);
                            }
                            if (buy.device) campaignGroups[cid].targeting.devices.add(buy.device);
                          });

                          return Object.values(campaignGroups)
                            .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                            .map(campaign => {
                              const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
                              const delivered = campaign.target_impressions > 0 ? ((campaign.impressions / campaign.target_impressions) * 100).toFixed(1) : '0.0';
                              const pubs = Array.from(campaign.publisher);
                              const publishers = pubs.join(', ') || 'Various';
                              const flightMonth = formatMonthYear(campaign.start_date);
                              const publisherLabel = pubs.slice(0, 2).join(' ');

                              return (
                                <tr key={campaign.id} onClick={() => setSelectedCampaignId(campaign.id)} className="clickable-row">
                                  <td className="text-left" style={{
                                    textAlign: 'left',
                                    paddingRight: '1.5rem',
                                    minWidth: '250px',
                                    maxWidth: '320px'
                                  }}>
                                    <div style={{
                                      fontWeight: 600,
                                      color: 'var(--accent-blue)',
                                      maxHeight: '2.4em',
                                      overflow: 'hidden',
                                      lineHeight: '1.2',
                                      whiteSpace: 'normal'
                                    }}>
                                      {campaign.name} {flightMonth}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>ID: {campaign.id}</div>
                                  </td>
                                  <td className="text-center" style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{campaign.brand}</td>
                                  <td className="text-center" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {Array.from(campaign.publisher).join(' + ')}
                                  </td>
                                  <td className="text-center" style={{ textAlign: 'center', minWidth: '180px', maxWidth: '240px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', gap: '6px', whiteSpace: 'nowrap' }}>
                                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>
                                          {campaign.targeting.gender === 'Both' ? 'M-F' : campaign.targeting.gender}
                                        </span>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>
                                          {campaign.targeting.age}
                                        </span>
                                        <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 700 }}>
                                          {Array.from(campaign.targeting.devices).map(d => {
                                            if (d === 'Connected TV') return 'CTV';
                                            if (d === 'Android') return 'AOS';
                                            return d;
                                          }).join(' + ')}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: '180px', lineHeight: '1.2', whiteSpace: 'normal' }}>
                                        {Array.from(campaign.targeting.geographies).join(' + ')}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center" style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatShortDate(campaign.start_date)}</td>
                                  <td className="text-center" style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatShortDate(campaign.end_date)}</td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatToCr(campaign.budget)}</td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatToMillions(campaign.impressions)}</td>
                                  <td className="text-center" style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{delivered}%</span>
                                      <div style={{ width: '60px', height: '4px', background: 'var(--border-light)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(parseFloat(delivered), 100)}%`, height: '100%', background: campaign.is_underpacing ? 'var(--accent-red)' : 'var(--accent-green)' }}></div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatToMillions(campaign.reach)}</td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{formatToMillions(campaign.clicks)}</td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{ctr}%</td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    ₹{campaign.impressions > 0 ? Math.round((campaign.budget * (parseFloat(delivered) / 100) / campaign.impressions) * 1000).toLocaleString('en-IN') : 0}
                                  </td>
                                  <td className="text-center" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    {campaign.items > 0 ? (campaign.budget / 10000000 * 0.4).toFixed(1) : 0}x
                                  </td>
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
