import { useState, useEffect, useRef } from 'react';
import { usePublisherData } from './hooks/usePublisherData';
import { useViewershipData } from './hooks/useViewershipData';
import { SYSTEM_DATE } from './hooks/useAgentData';
import { generateSellerFeed } from './hooks/usePublisherIntelligenceFeed';
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
  Users,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  ShieldCheck,
  ZapOff,
  Clock,
  ExternalLink,
  MessageSquare,
  BarChart3,
  Globe,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#ec4899'];

function PublisherApp() {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const fyStart = curM >= 3 ? curY : curY - 1;
  const FY_YEARS = Array.from({length: 4}, (_, i) => {
    const s = fyStart - 3 + i;
    return `${s}-${(s + 1).toString().slice(-2)}`;
  });
  const MONTHS = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
  const QUARTERS = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'];

  const currentFY = `${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
  const currentMonthIdx = (curM - 3 + 12) % 12;
  const currentQIdx = Math.floor(currentMonthIdx / 3);

  const [timeframe, setTimeframe] = useState('monthly');
  const [selectedYear, setSelectedYear] = useState(FY_YEARS.includes(currentFY) ? currentFY : FY_YEARS[FY_YEARS.length - 1]);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIdx]);
  const [selectedQuarter, setSelectedQuarter] = useState(QUARTERS[currentQIdx]);
  const [campaignTab, setCampaignTab] = useState('active');
  const [mixDimension, setMixDimension] = useState('advertisers');
  const [mixMetric, setMixMetric] = useState('revenue');
  const [viewMode, setViewMode] = useState('advertising');
  
  const { data, loading, error, publishers } = usePublisherData(timeframe);
  const [activePublisherId, setActivePublisherId] = useState(publishers[0].id);
  const { data: viewershipData, loading: viewershipLoading } = useViewershipData(activePublisherId);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Cleanup simulation timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
    };
  }, []);

  // Reset simulation when switching publishers
  useEffect(() => {
    setSimulationEvents([]);
    setAllFeedEvents([]);
    setIsSimulating(false);
    if (simulationTimerRef.current) clearTimeout(simulationTimerRef.current);
  }, [activePublisherId]);

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [expandedHistoryEvent, setExpandedHistoryEvent] = useState(null);

  const selectedPeriod = timeframe === 'quarterly' ? selectedQuarter : selectedMonth;

  // GrowthBadge - Matched with App.jsx
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

  // Formatting Helpers
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
    const currentYear = curY; 
    const currentMonthIdx = (curM - 3 + 12) % 12;
    const startYear = parseInt(selectedYear.split('-')[0]);

    if (startYear > currentYear) return [];
    if (startYear < currentYear) return timeframe === 'monthly' ? MONTHS : QUARTERS;

    if (timeframe === 'monthly') return MONTHS.slice(0, currentMonthIdx + 1);

    if (currentMonthIdx < 3) return [QUARTERS[0]];
    if (currentMonthIdx < 6) return QUARTERS.slice(0, 2);
    if (currentMonthIdx < 9) return QUARTERS.slice(0, 3);
    return QUARTERS;
  };

  const periodRange = getSelectedDateRange();
  const availablePeriods = getAvailablePeriods();

  const handleResetToCurrent = () => {
    setTimeframe('monthly');
    setSelectedYear(currentFY);
    setSelectedMonth(MONTHS[currentMonthIdx]);
    setSelectedQuarter(QUARTERS[currentQIdx]);
  };

  const BrandLogo = ({ domain, brandName, size = 24, borderRadius = '4px', fontSize = '0.7rem' }) => {
    const [logoError, setLogoError] = useState(false);
    const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    return (
      <div style={{
        width: `${size}px`, height: `${size}px`, borderRadius, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', padding: '2px'
      }}>
        {!logoError ? (
          <img
            src={logoUrl}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setLogoError(true)}
          />
        ) : (
          <span style={{ color: 'var(--accent-blue)', fontWeight: 800, fontSize }}>
            {brandName ? brandName.charAt(0).toUpperCase() : '?'}
          </span>
        )}
      </div>
    );
  };

  if (loading && Object.keys(data).length === 0) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        Syncing Publisher Portal Node...
      </div>
    );
  }

  if (error && Object.keys(data).length === 0) {
    return <div className="loading-screen" style={{ color: 'var(--accent-red)' }}>Failed to connect to Publisher Portal Network: {error}</div>;
  }

  const activeData = data[activePublisherId] || {};
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

  const buys = campaignTab === 'active' ? activeBuys : completedBuys;
  
  const selectedCampaign = selectedCampaignId
    ? (() => {
      const allBuys = [...activeBuys, ...completedBuys];
      const campaignBuys = allBuys.filter(b => (b.campaign_id || b.id) == selectedCampaignId);
      if (campaignBuys.length === 0) return null;
      return {
        id: selectedCampaignId,
        name: (campaignBuys[0]?.name || "Unknown Campaign").split(' - ')[0],
        brand: campaignBuys[0]?.brand,
        advertiser: campaignBuys[0]?.advertiser,
        advertiserDomain: campaignBuys[0]?.advertiserDomain,
        status: campaignBuys.every(b => b.status === 'completed') ? 'completed' : 'active',
        publisher: activeData.brand,
        device: Array.from(new Set(campaignBuys.map(b => b.device))).join(', '),
        format: Array.from(new Set(campaignBuys.map(b => b.format))).join(', '),
        start_date: campaignBuys.reduce((min, b) => b.start_date < min ? b.start_date : min, campaignBuys[0].start_date),
        end_date: campaignBuys.reduce((max, b) => b.end_date > max ? b.end_date : max, campaignBuys[0].end_date),
        budget: campaignBuys.reduce((sum, b) => sum + b.budget, 0),
        target_impressions: campaignBuys.reduce((sum, b) => sum + (b.target_impressions || 0), 0),
        target_reach: campaignBuys.reduce((sum, b) => sum + (b.target_reach || 0), 0),
        performance: {
          impressions: campaignBuys.reduce((sum, b) => sum + (b.performance?.impressions || 0), 0),
          reach: campaignBuys.reduce((sum, b) => sum + (b.performance?.reach || 0), 0),
          clicks: campaignBuys.reduce((sum, b) => sum + (b.performance?.clicks || 0), 0),
          spend: campaignBuys.reduce((sum, b) => sum + (b.performance?.spend || b.performance?.spent || 0), 0),
          roas: campaignBuys.length > 0 ? campaignBuys.reduce((sum, b) => sum + (b.performance?.roas || 0), 0) / campaignBuys.length : 0,
          is_underpacing: campaignBuys.some(b => b.performance?.is_underpacing)
        },
        targeting: (() => {
          const allContent = Array.from(new Set(campaignBuys.map(b => b.targeting?.content).filter(Boolean)));
          return {
            gender: campaignBuys[0].targeting?.gender || 'Both',
            age: campaignBuys[0].targeting?.age || '18+',
            geographies: Array.from(new Set(campaignBuys.map(b => b.targeting?.geography).filter(Boolean))),
            content: allContent,
            contentTarget: allContent.length === 1 ? allContent[0] : null
          };
        })(),
        line_items: campaignBuys
      };
    })()
    : null;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="brand-header">
          <Activity size={24} color="var(--accent-blue)" />
          <span>Publisher Portal</span>
        </div>
        
        <div className="metric-sub" style={{ padding: '0 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected Platforms</div>
        <div className="agent-list">
          {publishers.map(pub => (
            <button
              key={pub.id}
              className={`agent-btn ${activePublisherId === pub.id ? 'active' : ''}`}
              onClick={() => {
                setActivePublisherId(pub.id);
                setSelectedCampaignId(null);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BrandLogo domain={pub.domain} brandName={pub.name} size={20} />
                <span>{pub.name}</span>
              </div>
              <div className={`status-dot ${activePublisherId === pub.id ? 'active' : ''}`}></div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <div className="metric-sub" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>Network Latency</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.8rem' }}>
            <Activity size={14} /> 12ms (Stable)
          </div>
        </div>
      </div>

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {currentView === 'create' ? (
          /* ======================= SELLER AGENT STRATEGY DEPLOYMENT ======================= */
          <div className="create-campaign-view" style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
              <button className="back-btn" onClick={() => setCurrentView('dashboard')} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}>
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Seller Agent</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-red)' }}>{activeData.brand} AdCP Seller Agent</div>
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

            <div className="card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.01) 100%)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Get New Campaign</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2.5rem' }}>
                Instruct your autonomous seller agent to optimize yield and inventory allocation. Describe your floor pricing strategy, priority content shows, and buyer-specific preferences in natural language.
              </p>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Yield Optimization & Strategic Intent
                </label>
                <textarea
                  value={campaignPrompt}
                  onChange={(e) => setCampaignPrompt(e.target.value)}
                  placeholder="Example: Optimize floor prices for the upcoming IPL playoffs. Prioritize premium FMCG brands like HUL and P&G. Target a 15% yield increase on Connected TV inventory while maintaining 95% fill rate."
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
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-red)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                />
              </div>

              {(() => {
                const detectValue = (text) => {
                  const match = text.match(/(?:₹?\s*)(\d+(?:\.\d+)?)\s*(Lakhs?|Cr|Crores?|L|Crore)/i);
                  if (match) {
                    const val = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();
                    if (unit.startsWith('l')) return val * 100000;
                    if (unit.startsWith('c')) return val * 10000000;
                  }
                  return 0;
                };
                const detectedVal = detectValue(campaignPrompt);
                const requiresHITL = detectedVal > 2000000;

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
                          The detected transaction value (₹{(detectedVal / 100000).toFixed(0)} Lakhs) exceeds the autonomous threshold of ₹20 Lakhs. Manual authorization is required to proceed.
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}>
                          <input
                            type="checkbox"
                            checked={isAuthorized}
                            onChange={(e) => setIsAuthorized(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Authorize Strategy
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Est. Strategy Tokens</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                          {(1500 + Math.floor(campaignPrompt.length * 0.6)).toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>tokens</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="status-dot active" style={{ background: 'var(--accent-red)' }}></div> Seller Agent Ready
                      </div>
                      <button
                        onClick={() => {
                          if (requiresHITL && !isAuthorized) {
                            alert('Please authorize the strategy before deploying.');
                            return;
                          }
                          if (isSimulating) return;
                          // Generate all events and start streaming them
                          const events = generateSellerFeed(activePublisherId, activeData);
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
                                            lastEvt?.phase === 'accept' ? 1500 :
                                            lastEvt?.phase === 'serve' ? 1200 :
                                            lastEvt?.phase === 'summary' ? 2000 : 800;
                              simulationTimerRef.current = setTimeout(streamNext, delay);
                            } else {
                              setIsSimulating(false);
                            }
                          };
                          simulationTimerRef.current = setTimeout(streamNext, 500);
                        }}
                        style={{
                          padding: '12px 32px',
                          background: (requiresHITL && !isAuthorized) ? 'var(--text-muted)' : 'var(--accent-red)',
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
                          boxShadow: (requiresHITL && !isAuthorized) ? 'none' : '0 8px 24px rgba(239, 68, 68, 0.3)',
                          opacity: (requiresHITL && !isAuthorized) ? 0.6 : 1
                        }}
                      >
                        <Zap size={18} />
                        {isSimulating ? 'Agent Running...' : (simulationEvents.length > 0 ? 'Re-run Strategy' : 'Get Campaign')}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.2rem' }}>
                <div className="metric-sub" style={{ marginBottom: '0.5rem', color: 'var(--accent-red)' }}>Yield Optimization</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Agent will automatically resolve competitive moats and floor price triggers.</div>
              </div>
              <div className="card" style={{ padding: '1.2rem' }}>
                <div className="metric-sub" style={{ marginBottom: '0.5rem', color: 'var(--accent-red)' }}>Inventory Allocation</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Autonomous slot distribution across premium buyers like HUL and Amazon.</div>
              </div>
              <div className="card" style={{ padding: '1.2rem' }}>
                <div className="metric-sub" style={{ marginBottom: '0.5rem', color: 'var(--accent-red)' }}>Revenue Maximization</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Optimized yield via protocol-level context triggers and buyer scoring.</div>
              </div>
            </div>

            {/* ── Seller Agent Intelligence Feed (appears after Get Campaign) ── */}
            {(simulationEvents.length > 0 || isSimulating) && (() => {
              const visibleEvents = simulationEvents;
              const totalTokensSaved = visibleEvents.reduce((s, e) => s + (e.contextEngineering || []).reduce((ss, ce) => ss + (ce.tokensSaved || 0), 0), 0);
              const buyersServed = visibleEvents.filter(e => e.phase === 'serve').length;
              const buysAccepted = visibleEvents.filter(e => e.phase === 'accept').length;
              const totalEvents = allFeedEvents.length;
              
              const totalLLMTokens = visibleEvents.reduce((s, e) => s + (e.tokenUsage?.total || 0), 0);
              const totalLLMCost = visibleEvents.reduce((s, e) => s + (e.tokenUsage?.costINR || 0), 0);
              
              return (
                <div className="intelligence-feed" style={{ marginTop: '2rem' }}>
                  <div className="feed-header">
                    <div className="feed-header-title">
                      <div className="feed-live-dot" style={isSimulating ? {} : { background: '#6b7280', boxShadow: 'none', animation: 'none' }} />
                      {isSimulating ? 'Live Yield Intelligence — LIVE' : 'Live Yield Intelligence — Complete'}
                    </div>
                    <div className="feed-stats">
                      <div className="feed-stat">
                        Progress: <span className="feed-stat-value">{visibleEvents.length}/{totalEvents}</span>
                      </div>
                      <div className="feed-stat">
                        Buyers: <span className="feed-stat-value">{buyersServed}</span>
                      </div>
                      <div className="feed-stat">
                        Buys: <span className="feed-stat-value" style={{ color: '#10b981' }}>{buysAccepted}</span>
                      </div>
                      <div className="feed-stat">
                        Grok Tokens: <span className="feed-stat-value" style={{ color: '#ef4444' }}>{totalLLMTokens.toLocaleString()}</span>
                      </div>
                      <div className="feed-stat">
                        Cost: <span className="feed-stat-value" style={{ color: '#f59e0b' }}>₹{totalLLMCost.toFixed(2)}</span>
                      </div>
                      <div className="feed-stat">
                        Saved: <span className="feed-stat-value" style={{ color: '#10b981' }}>{totalTokensSaved.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="feed-timeline" ref={feedTimelineRef}>
                    {visibleEvents.map((evt, idx) => {
                      if (evt.type === 'lane-start') {
                        const cw = evt.contextWindow;
                        const isExp = expandedFeedEvent === idx;
                        return (
                          <div key={idx} className="feed-lane-header clickable" style={{ '--lane-color': evt.agent.color, animation: 'fadeIn 0.4s ease-out' }}
                            onClick={() => setExpandedFeedEvent(isExp ? null : idx)}>
                            <div className="lane-title"><span>{evt.agent.icon}</span> {evt.agent.name}
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
                      if (evt.type === 'summary-table') {
                        return (
                          <div key={idx} className="feed-summary-table" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                            <h4>Multi-Agent Efficiency Comparison</h4>
                            <table><thead><tr><th>Metric</th><th>Monolithic</th><th>Multi-Agent</th><th>Savings</th></tr></thead>
                              <tbody>{evt.rows.map((r, ri) => (
                                <tr key={ri}><td>{r.metric}</td><td>{r.mono}</td><td>{r.multi}</td><td className="savings">{r.savings}</td></tr>
                              ))}</tbody>
                            </table>
                          </div>
                        );
                      }
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
                  brand: buys[0]?.brand || buys[0]?.advertiser || 'Advertiser',
                  start_date: buys.reduce((min, b) => b.start_date < min ? b.start_date : min, buys[0].start_date),
                  end_date: buys.reduce((max, b) => b.end_date > max ? b.end_date : max, buys[0].end_date),
                  budget: buys.reduce((s, b) => s + (b.budget || 0), 0),
                  target_impressions: buys.reduce((s, b) => s + (b.target_impressions || 0), 0),
                  target_reach: buys.reduce((s, b) => s + (b.target_reach || 0), 0),
                  impressions: buys.reduce((s, b) => s + (b.performance?.impressions || 0), 0),
                  reach: buys.reduce((s, b) => s + (b.performance?.reach || 0), 0),
                  roas: buys.length > 0 ? buys.reduce((s, b) => s + (b.performance?.roas || 0), 0) / buys.length : 0,
                  lineItems: buys.length,
                  advertisers: [...new Set(buys.map(b => b.advertiser || b.brand))]
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
                      const historyFeed = isOpen ? generateSellerFeed(activePublisherId, activeData) : [];
                      return (
                        <div key={camp.id} className="card" style={{ padding: 0, overflow: 'hidden', border: isOpen ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-light)' }}>
                          <div
                            onClick={() => setExpandedHistoryId(isOpen ? null : camp.id)}
                            style={{
                              padding: '1rem 1.5rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background 0.2s',
                              background: isOpen ? 'rgba(239,68,68,0.05)' : 'transparent'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{camp.name}</span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>COMPLETED</span>
                              </div>
                              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                <span>{fmtDate(camp.start_date)} - {fmtDate(camp.end_date)}</span>
                                <span>{camp.advertisers.join(', ')}</span>
                                <span>{camp.lineItems} line items</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</div>
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
                                    Historical Seller Feed
                                  </div>
                                  <div className="feed-stats">
                                    <div className="feed-stat">
                                      Events: <span className="feed-stat-value">{historyFeed.length}</span>
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
        ) : !selectedCampaignId ? (
          /* ======================= OVERVIEW DASHBOARD ======================= */
          <>
            <div className="top-bar" style={{ paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '0.2rem' }}>
                  <BrandLogo domain={activeData.domain} brandName={activeData.brand} size={42} borderRadius="8px" />
                  {activeData.brand} {viewMode === 'advertising' ? 'Ad Manager' : 'Viewership Portal'}
                </h1>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{activeData.domain} • <span style={{ color: viewMode === 'advertising' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>{viewMode === 'advertising' ? 'Advertising View' : 'Viewership View'}</span></div>
              </div>
              
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-light)' }}>
                  <button 
                    onClick={() => setViewMode('advertising')}
                    style={{
                      padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: viewMode === 'advertising' ? 'var(--accent-blue)' : 'transparent',
                      color: viewMode === 'advertising' ? '#fff' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s'
                    }}
                  >
                    <IndianRupee size={16} /> Advertising
                  </button>
                  <button 
                    onClick={() => setViewMode('viewership')}
                    style={{
                      padding: '8px 16px', fontSize: '0.8rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: viewMode === 'viewership' ? 'var(--accent-red)' : 'transparent',
                      color: viewMode === 'viewership' ? '#fff' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s'
                    }}
                  >
                    <Users size={16} /> Viewership
                  </button>
                </div>

                <div style={{ width: '1px', height: '30px', background: 'var(--border-light)' }}></div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div className="timeframe-selector" style={{ display: 'flex', background: 'var(--bg-dark)', borderRadius: '8px', padding: '4px' }}>
                    <button onClick={handleResetToCurrent} title="Reset" style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <RefreshCw size={14} />
                    </button>
                    {['monthly', 'quarterly', 'yearly'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        style={{
                          padding: '4px 12px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: timeframe === tf ? 'var(--accent-blue)' : 'transparent',
                          color: timeframe === tf ? '#fff' : 'var(--text-muted)'
                        }}
                      >{tf.charAt(0).toUpperCase() + tf.slice(1)}</button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {timeframe !== 'yearly' && (
                      <select className="period-select" value={selectedPeriod} onChange={(e) => timeframe === 'monthly' ? setSelectedMonth(e.target.value) : setSelectedQuarter(e.target.value)}>
                        {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                    <select className="period-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                      {FY_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              {viewMode === 'advertising' ? (
                (() => {
                  const allPeriodBuys = [...activeBuys, ...completedBuys];
                  const rawReach = allPeriodBuys.reduce((sum, b) => sum + (b.performance?.reach || 0), 0);
                  const rawTargetReach = allPeriodBuys.reduce((sum, b) => sum + (b.target_reach || 0), 0);

                  const periodMetrics = {
                    budget: allPeriodBuys.reduce((sum, b) => sum + (b.budget || 0), 0),
                    spent: allPeriodBuys.reduce((sum, b) => sum + (b.performance?.spent || b.performance?.spend || 0), 0),
                    impressions: allPeriodBuys.reduce((sum, b) => sum + (b.performance?.impressions || 0), 0),
                    target_impressions: allPeriodBuys.reduce((sum, b) => sum + (b.target_impressions || 0), 0),
                    reach: allPeriodBuys.length > 1 ? Math.floor(rawReach * 0.75) : rawReach,
                    target_reach: allPeriodBuys.length > 1 ? Math.floor(rawTargetReach * 0.75) : rawTargetReach,
                    clicks: allPeriodBuys.reduce((sum, b) => sum + (b.performance?.clicks || 0), 0),
                    roas: allPeriodBuys.length > 0 ? allPeriodBuys.reduce((sum, b) => sum + (b.performance?.roas || 0), 0) / allPeriodBuys.length : 0
                  };

                  return (
                    <>
                      {/* Financials & Pacing */}
                      <div className="card span-2">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><IndianRupee size={18} /> Financials & Pacing</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Aggregated metrics for platform revenue in {timeframe === 'yearly' ? 'the year' : selectedPeriod} {selectedYear}.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <div className="metric-sub">Booked Revenue</div>
                            <div className="metric-value">
                              {formatToCr(periodMetrics.budget)}
                              <GrowthBadge value={(activeData.performance?.growth || 0) * 0.8} />
                            </div>
                          </div>
                          <div>
                            <div className="metric-sub">Delivered Revenue</div>
                            <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
                              {formatToCr(periodMetrics.spent)}
                              <GrowthBadge value={activeData.performance?.growth || 0} />
                            </div>
                          </div>
                          <div>
                            <div className="metric-sub">Remaining</div>
                            <div className="metric-value" style={{ color: 'var(--accent-orange)' }}>
                              {formatToCr(periodMetrics.budget - periodMetrics.spent)}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            <span>Delivery</span>
                            <span>{periodMetrics.budget > 0 ? ((periodMetrics.spent / periodMetrics.budget) * 100).toFixed(1) : 0}%</span>
                          </div>
                          <div className="progress-bg">
                            <div className="progress-fill" style={{ width: `${Math.min(periodMetrics.budget > 0 ? (periodMetrics.spent / periodMetrics.budget) * 100 : 0, 100)}%`, background: 'var(--accent-blue)' }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Usage Metrics */}
                      <div className="card">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><BrainCircuit size={18} /> Usage Metrics</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          AI agent resources utilized by platform campaigns in {timeframe === 'yearly' ? 'the year' : selectedPeriod} {selectedYear}.
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                          <div>
                            <div className="metric-sub">Tokens Used</div>
                            <div className="metric-value">{(activeData.intelligence?.total_tokens || 0).toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <div className="metric-sub">Estimated Resource Cost</div>
                            <div className="metric-value" style={{ color: 'var(--accent-purple)' }}>₹{(activeData.intelligence?.estimated_cost_inr || 0).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="card span-2">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}>Performance Metrics</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Consolidated delivery stats for platform campaigns in {timeframe === 'yearly' ? 'the year' : selectedPeriod} {selectedYear}.
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
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><IndianRupee size={12} /> eCPM</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem' }}>₹{periodMetrics.impressions ? Math.round((periodMetrics.spent / periodMetrics.impressions) * 1000).toLocaleString('en-IN') : 0}</div>
                          </div>
                          <div>
                            <div className="metric-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', marginBottom: '0.5rem' }}><Activity size={12} /> Fill Rate</div>
                            <div className="metric-value" style={{ fontSize: '1.1rem', color: 'var(--accent-orange)' }}>{(() => {
                              if (!viewershipData || !viewershipData.dau || !viewershipData.avgWatchTime) return '0';
                              const adSlotsPerMin = 0.2;
                              const monthlyInventory = viewershipData.dau * viewershipData.avgWatchTime * adSlotsPerMin * 30;
                              return monthlyInventory > 0 ? ((periodMetrics.impressions / monthlyInventory) * 100).toFixed(1) : '0';
                            })()}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Top Performers Card */}
                      <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <div className="card-title"><LayoutDashboard size={18} /> Top Performers</div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <select value={mixDimension} onChange={(e) => setMixDimension(e.target.value)} style={{ background: 'var(--bg-dark)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 4px' }}>
                              <option value="advertisers">Advertisers</option>
                              <option value="brands">Brands</option>
                              <option value="devices">Devices</option>
                              <option value="ad_formats">Ad Formats</option>
                            </select>
                            <select value={mixMetric} onChange={(e) => setMixMetric(e.target.value)} style={{ background: 'var(--bg-dark)', color: '#fff', border: '1px solid var(--border-light)', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 4px' }}>
                              <option value="revenue">Revenue</option>
                              <option value="impressions">Imps</option>
                              <option value="clicks">Clicks</option>
                              <option value="ctr">CTR</option>
                              <option value="reach">Reach</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                          {(() => {
                            const groups = {};
                            allPeriodBuys.forEach(buy => {
                              let key = 'Other';
                              if (mixDimension === 'advertisers') key = buy.advertiser;
                              else if (mixDimension === 'brands') key = buy.brand;
                              else if (mixDimension === 'devices') key = buy.device;
                              else if (mixDimension === 'ad_formats') key = buy.format;

                              if (!groups[key]) {
                                groups[key] = { name: key, revenue: 0, impressions: 0, clicks: 0, reach: 0 };
                              }
                              
                              groups[key].revenue += (buy.performance?.spend || buy.performance?.spent || 0);
                              groups[key].impressions += (buy.performance?.impressions || 0);
                              groups[key].clicks += (buy.performance?.clicks || 0);
                              groups[key].reach += (buy.performance?.reach || 0);
                            });

                            const sorted = Object.values(groups).map(g => ({
                              ...g,
                              ctr: g.impressions ? (g.clicks / g.impressions) * 100 : 0
                            })).sort((a, b) => b[mixMetric] - a[mixMetric]).slice(0, 5);

                            return sorted.map((item, i) => (
                              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{i + 1}</div>
                                  <div style={{ fontSize: '0.85rem' }}>{item.name}</div>
                                </div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                  {mixMetric === 'revenue' ? formatToCr(item.revenue) :
                                   mixMetric === 'ctr' ? `${item.ctr.toFixed(2)}%` :
                                   mixMetric === 'impressions' || mixMetric === 'reach' || mixMetric === 'clicks' ? formatToMillions(item[mixMetric]) :
                                   item[mixMetric]}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Campaigns Table */}
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
                                  outline: 'none',
                                  width: '100%',
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
                              {['active', 'completed'].map(tab => (
                                <button
                                  key={tab}
                                  onClick={() => setCampaignTab(tab)}
                                  style={{
                                    padding: '4px 16px', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    background: campaignTab === tab ? 'var(--accent-blue)' : 'transparent',
                                    color: campaignTab === tab ? '#fff' : 'var(--text-muted)',
                                    textTransform: 'capitalize',
                                    fontWeight: 600,
                                    transition: 'all 0.2s'
                                  }}
                                >{tab}</button>
                              ))}
                            </div>

                            <button
                              className="create-btn"
                              onClick={() => setCurrentView('create')}
                              style={{
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
                                <th className="text-center" style={{ textAlign: 'center' }}>Advertiser</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Brand</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Type</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Targeting</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Start</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>End</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Booked Revenue</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Impressions</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>% Imp Delivered</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Reach</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>Clicks</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>CTR</th>
                                <th className="text-center" style={{ textAlign: 'center' }}>eCPM</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const filteredBuys = buys.filter(b => 
                                  (b.name && b.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                                  (b.advertiser && b.advertiser.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                  (b.brand && b.brand.toLowerCase().includes(searchTerm.toLowerCase()))
                                );

                                const campaignGroups = {};
                                filteredBuys.forEach(buy => {
                                  const cid = buy.campaign_id || buy.id;
                                  if (!campaignGroups[cid]) {
                                    campaignGroups[cid] = {
                                      id: cid, name: (buy.name || "Unknown").split(' - ')[0], advertiser: buy.advertiser, brand: buy.brand,
                                      targeting: {
                                        gender: buy.targeting?.gender || "Both",
                                        age: buy.targeting?.age || "18+",
                                        geographies: new Set(),
                                        devices: new Set(),
                                        content: new Set()
                                      },
                                      budget: 0, impressions: 0, target_impressions: 0,
                                      reach: 0, target_reach: 0, clicks: 0, items: 0,
                                      buy_types: new Set(),
                                      start_date: buy.start_date || '2026-05-01',
                                      end_date: buy.end_date || '2026-05-31',
                                      is_underpacing: false
                                    };
                                  }
                                  if (buy.performance?.is_underpacing) campaignGroups[cid].is_underpacing = true;
                                  campaignGroups[cid].budget += buy.budget;
                                  campaignGroups[cid].impressions += (buy.performance?.impressions || 0);
                                  campaignGroups[cid].target_impressions += buy.target_impressions;
                                  campaignGroups[cid].reach += (buy.performance?.reach || 0);
                                  campaignGroups[cid].target_reach += (buy.target_reach || 0);
                                  campaignGroups[cid].clicks += (buy.performance?.clicks || 0);
                                  campaignGroups[cid].items += 1;
                                  if (buy.start_date && buy.start_date < campaignGroups[cid].start_date) campaignGroups[cid].start_date = buy.start_date;
                                  if (buy.end_date && buy.end_date > campaignGroups[cid].end_date) campaignGroups[cid].end_date = buy.end_date;
                                  if (buy.targeting?.geographies) {
                                    buy.targeting.geographies.forEach(g => campaignGroups[cid].targeting.geographies.add(g));
                                  } else if (buy.targeting?.geography) {
                                    campaignGroups[cid].targeting.geographies.add(buy.targeting.geography);
                                  }
                                  if (buy.device) campaignGroups[cid].targeting.devices.add(buy.device);
                                  if (buy.targeting?.content) campaignGroups[cid].targeting.content.add(buy.targeting.content);
                                  if (buy.buy_type) campaignGroups[cid].buy_types.add(buy.buy_type);
                                });

                                // Determine if each campaign is content-targeted (all line items share same content)
                                Object.values(campaignGroups).forEach(cg => {
                                  if (cg.targeting.content.size === 1) {
                                    cg.targeting.contentTarget = Array.from(cg.targeting.content)[0];
                                  } else {
                                    cg.targeting.contentTarget = null; // RON - mixed content = not content-targeted
                                  }
                                });

                                return Object.values(campaignGroups)
                                  .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
                                  .map(campaign => {
                                    const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
                                    const delivered = campaign.target_impressions > 0 ? ((campaign.impressions / campaign.target_impressions) * 100).toFixed(1) : '0.0';
                                    const flightMonth = formatMonthYear(campaign.start_date);

                                    return (
                                  <tr key={campaign.id} onClick={() => setSelectedCampaignId(campaign.id)} className="clickable-row">
                                    <td className="text-left" style={{ textAlign: 'left', paddingRight: '1.5rem', minWidth: '250px', maxWidth: '320px' }}>
                                      <div style={{ fontWeight: 600, color: 'var(--accent-blue)', maxHeight: '2.4em', overflow: 'hidden', lineHeight: '1.2', whiteSpace: 'normal' }}>{campaign.name} {flightMonth}</div>
                                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>ID: {campaign.id}</div>
                                    </td>
                                    <td className="text-center" style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{campaign.advertiser}</td>
                                    <td className="text-center" style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{campaign.brand}</td>
                                    <td className="text-center" style={{ textAlign: 'center' }}>
                                      <span style={{
                                        background: campaign.buy_types.has('exchange') ? 'rgba(249, 115, 22, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                        color: campaign.buy_types.has('exchange') ? 'var(--accent-orange)' : 'var(--accent-blue)',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {campaign.buy_types.has('exchange') ? '⚡ Open Exchange' : '📋 Direct Buy'}
                                      </span>
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
                                        {campaign.targeting.contentTarget && (
                                          <div style={{ fontSize: '0.65rem', color: '#ec4899', maxWidth: '220px', lineHeight: '1.2', whiteSpace: 'normal' }}>
                                            {campaign.targeting.contentTarget}
                                          </div>
                                        )}
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
                                  </tr>
                                    );
                                  });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                (() => {
                  if (viewershipLoading || !viewershipData) return <div className="card span-3" style={{ textAlign: 'center', padding: '4rem' }}><RefreshCw className="loader" style={{ animation: 'spin 2s linear infinite' }} /> <div style={{ marginTop: '1rem' }}>Synchronizing viewership metrics...</div></div>;

                  return (
                    <>
                      {/* Audience Overview Card */}
                      <div className="card span-2">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><Users size={18} /> Audience Overview</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Real-time viewership engagement for {activeData.brand} in {timeframe === 'yearly' ? 'the year' : selectedPeriod} {selectedYear}.
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                          <div>
                            <div className="metric-sub">Total Reach (MAU)</div>
                            <div className="metric-value">
                              {formatToMillions(viewershipData.totalViewers)}
                              <GrowthBadge value={viewershipData.mauTrend} />
                            </div>
                          </div>
                          <div>
                            <div className="metric-sub">Daily Active Users</div>
                            <div className="metric-value" style={{ color: 'var(--accent-red)' }}>
                              {formatToMillions(viewershipData.dau)}
                              <GrowthBadge value={viewershipData.dauTrend} />
                            </div>
                          </div>
                          <div>
                            <div className="metric-sub">Peak Concurrency</div>
                            <div className="metric-value" style={{ color: 'var(--accent-orange)' }}>
                              {formatToMillions(viewershipData.peakConcurrency)}
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Network Capacity Utilization</span>
                            <span style={{ fontWeight: 600 }}>{viewershipData.networkUtilization}%</span>
                          </div>
                          <div className="progress-bg" style={{ height: '6px' }}>
                            <div className="progress-fill" style={{ width: `${viewershipData.networkUtilization}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-red))' }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Engagement Metrics */}
                      <div className="card">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><Monitor size={18} /> Engagement Stats</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Average consumption patterns.
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          <div>
                            <div className="metric-sub">Avg Watch Time</div>
                            <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>{viewershipData.avgWatchTime} min</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>Per user session</div>
                          </div>
                          <div>
                            <div className="metric-sub">D30 Retention</div>
                            <div className="metric-value" style={{ color: 'var(--accent-green)' }}>{viewershipData.retention}%</div>
                            <div className="progress-bg" style={{ height: '4px', marginTop: '8px' }}>
                              <div className="progress-fill" style={{ width: `${viewershipData.retention}%`, background: 'var(--accent-green)' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Performing Content */}
                      <div className="card span-2">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><Zap size={18} /> Content Leaderboard</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Top shows and live events by unique viewer count.
                        </div>

                        <div className="table-container" style={{ marginTop: '0.5rem' }}>
                          <table className="campaign-table">
                            <thead>
                              <tr>
                                <th>Content Title</th>
                                <th>Unique Viewers</th>
                                <th>Trend</th>
                                <th>Rating</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewershipData.contentPerformance.map((show, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontWeight: 600 }}>{show.title}</td>
                                  <td>{formatToMillions(show.viewers)}</td>
                                  <td>
                                    <span style={{ color: show.trend.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                                      {show.trend}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{ color: 'var(--accent-orange)' }}>★</span> {show.rating}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Device Breakdown */}
                      <div className="card">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><Layout size={18} /> Device Distribution</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          Audience access by platform.
                        </div>
                        <div style={{ height: '180px', marginTop: '1rem' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={viewershipData.deviceBreakdown}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {viewershipData.deviceBreakdown.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border-light)', borderRadius: '8px' }}
                                itemStyle={{ fontSize: '0.8rem' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '1rem' }}>
                          {viewershipData.deviceBreakdown.map((d, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d.name}</div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: COLORS[i % COLORS.length] }}>{d.value}%</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Audience Demographics */}
                      <div className="card span-3">
                        <div className="card-title" style={{ marginBottom: '0.2rem' }}><Users size={18} /> Audience Insights</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                          Deep dive into audience composition and consumption behavior.
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div className="metric-sub" style={{ marginBottom: '1rem' }}>Age Distribution</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {[
                                { label: '18-24', pct: 35, color: '#3b82f6' },
                                { label: '25-34', pct: 42, color: '#10b981' },
                                { label: '35-44', pct: 15, color: '#f97316' },
                                { label: '45+', pct: 8, color: '#8b5cf6' }
                              ].map((item, i) => (
                                <div key={i}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                                    <span>{item.label}</span>
                                    <span>{item.pct}%</span>
                                  </div>
                                  <div className="progress-bg" style={{ height: '4px' }}>
                                    <div className="progress-fill" style={{ width: `${item.pct}%`, background: item.color }}></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div className="metric-sub" style={{ marginBottom: '1rem' }}>Gender Split</div>
                            <div style={{ display: 'flex', height: '40px', borderRadius: '8px', overflow: 'hidden', marginTop: '1.5rem' }}>
                              <div style={{ width: '58%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>Male 58%</div>
                              <div style={{ width: '42%', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>Female 42%</div>
                            </div>
                            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              High affinity for <span style={{ color: '#fff' }}>Sports</span> and <span style={{ color: '#fff' }}>Fashion</span> content.
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                            <div className="metric-sub" style={{ marginBottom: '1rem' }}>Geo Concentration</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {[
                                { label: 'Mumbai', viewers: '12.4M' },
                                { label: 'Delhi', viewers: '10.2M' },
                                { label: 'Bangalore', viewers: '8.5M' },
                                { label: 'Hyderabad', viewers: '6.8M' }
                              ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                  <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-blue)' }}>{item.viewers}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()
              )}

            </div>
          </>
        ) : (
          /* ======================= DETAILED CAMPAIGN VIEW ======================= */
          selectedCampaign ? (
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
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{selectedCampaign.name} {formatMonthYear(selectedCampaign.start_date)}</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Campaign ID: <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{selectedCampaign.id}</span></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="metric-sub" style={{ marginBottom: '0.6rem', fontSize: '0.75rem' }}>Advertiser & Brand</div>
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
                      <BrandLogo domain={selectedCampaign.advertiserDomain} brandName={selectedCampaign.advertiser} size={24} borderRadius="4px" fontSize="0.7rem" />
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{selectedCampaign.advertiser} — {selectedCampaign.brand}</span>
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
                      <Share2 size={16} style={{ color: 'var(--accent-purple)' }} /> Platform
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
                  <div className="metric-sub" style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Booked Revenue</div>
                  <div className="metric-value" style={{ fontSize: '1.75rem' }}>{formatToCr(selectedCampaign.budget)}</div>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="metric-sub" style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>Delivered Revenue</div>
                  <div className="metric-value" style={{ color: 'var(--accent-blue)', fontSize: '1.75rem' }}>
                    {formatToCr(selectedCampaign.performance?.spend)}
                  </div>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <span>Delivery Rate</span>
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
                        <div className="metric-value" style={{ fontSize: '2.5rem', marginTop: '0.25rem' }}>{formatToMillions(selectedCampaign.performance.impressions)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="metric-sub" style={{ fontSize: '0.85rem' }}>Target: {formatToMillions(selectedCampaign.target_impressions)}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                          {selectedCampaign.target_impressions ? ((selectedCampaign.performance.impressions / selectedCampaign.target_impressions) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                    <div className="progress-bg" style={{ height: '10px', background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(selectedCampaign.target_impressions ? ((selectedCampaign.performance.impressions / selectedCampaign.target_impressions) * 100) : 0, 100)}%`,
                          background: selectedCampaign.performance.is_underpacing ? 'var(--accent-red)' : 'linear-gradient(90deg, var(--accent-blue) 0%, #60a5fa 100%)'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                      <div>
                        <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Unique Reach</div>
                        <div className="metric-value" style={{ fontSize: '2.5rem', marginTop: '0.25rem' }}>{formatToMillions(selectedCampaign.performance.reach)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="metric-sub" style={{ fontSize: '0.85rem' }}>Target: {formatToMillions(selectedCampaign.target_reach)}</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                          {selectedCampaign.target_reach ? ((selectedCampaign.performance.reach / selectedCampaign.target_reach) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                    <div className="progress-bg" style={{ height: '10px', background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(selectedCampaign.target_reach ? ((selectedCampaign.performance.reach / selectedCampaign.target_reach) * 100) : 0, 100)}%`,
                          background: selectedCampaign.performance.is_underpacing ? 'var(--accent-red)' : 'linear-gradient(90deg, #8b5cf6) 0%, #a78bfa 100%)'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Efficiency Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', paddingTop: '2rem' }}>
                  <div>
                    <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>Total Clicks</div>
                    <div className="metric-value" style={{ fontSize: '2rem' }}>{formatToMillions(selectedCampaign.performance.clicks)}</div>
                  </div>
                  <div>
                    <div className="metric-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.5rem' }}>CTR</div>
                    <div className="metric-value" style={{ fontSize: '2rem' }}>{selectedCampaign.performance.impressions ? ((selectedCampaign.performance.clicks / selectedCampaign.performance.impressions) * 100).toFixed(2) : 0}%</div>
                  </div>
                </div>
              </div>

              {/* Targeting & Context Layer */}
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
                      {(selectedCampaign.targeting?.geographies || []).join(' + ') || 'Pan-India'}
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

              {/* AI Usage */}
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

              {/* Daily serving Log */}
              <div className="card span-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <div className="card-title" style={{ marginBottom: '1.5rem' }}><History size={18} /> Ad Serving Log</div>
                <div className="table-container">
                  <table className="campaign-table">
                    <thead>
                      <tr>
                        <th className="text-left">Date</th>
                        <th className="text-left">Line Item Targeting</th>
                        <th className="text-center">Device</th>
                        <th className="text-center">Imps</th>
                        <th className="text-center">Clicks</th>
                        <th className="text-center">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const log = [];
                        selectedCampaign.line_items.forEach(li => {
                          // Read from pre-computed daily delivery time series
                          (li.daily_delivery || []).forEach(dd => {
                            log.push({
                              date: new Date(dd.date),
                              name: li.line_item_name,
                              targeting: li.targeting,
                              device: li.device,
                              format: li.format,
                              imps: dd.impressions,
                              clicks: dd.clicks,
                              spend: dd.spend
                            });
                          });
                        });
                        return log
                          .sort((a, b) => b.date - a.date)
                          .map((row, idx) => (
                          <tr key={`${row.date.toISOString()}-${idx}`}>
                            <td className="text-left" style={{ fontWeight: 600 }}>{formatShortDate(row.date.toISOString())}</td>
                            <td className="text-left"><div style={{ fontSize: '0.8rem', color: '#fff' }}>{row.name} - {row.format} - {row.targeting.gender === 'Both' ? 'M-F' : row.targeting.gender} - {row.targeting.age}{selectedCampaign.targeting?.contentTarget ? ` - ${row.targeting.content}` : ''}</div></td>
                            <td className="text-center"><span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-orange)' }}>{row.device === 'Android' ? 'AOS' : row.device}</span></td>
                            <td className="text-center">{formatToMillions(row.imps)}</td>
                            <td className="text-center">{row.clicks.toLocaleString()}</td>
                            <td className="text-center">{formatToCr(row.spend)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <h2>Campaign Not Found</h2>
              <button className="back-btn" onClick={() => setSelectedCampaignId(null)}>Back to Overview</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default PublisherApp;
