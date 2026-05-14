# AdCP Dashboard — Data Model & Business Rules

> **Purpose**: This document captures every data assumption, formula, and business rule used in the AdCP Advertiser and Publisher dashboards. It serves as the single source of truth for anyone resuming work on this codebase.
>
> **Source files**:
> - [`useAgentData.js`](../src/hooks/useAgentData.js) — Advertiser agent profiles, campaign generation, publisher inventory
> - [`useViewershipData.js`](../src/hooks/useViewershipData.js) — Publisher viewership metrics (DAU, watch time, etc.)
> - [`usePublisherData.js`](../src/hooks/usePublisherData.js) — Publisher-side data pivot from advertiser buys
> - [`PublisherApp.jsx`](../src/PublisherApp.jsx) — Fill Rate calculation and publisher dashboard rendering
> - [`App.jsx`](../src/App.jsx) — Advertiser dashboard rendering

---

## Table of Contents

1. [System Date](#1-system-date)
2. [Advertiser Agent Profiles](#2-advertiser-agent-profiles)
3. [Publisher Inventory Definitions](#3-publisher-inventory-definitions)
4. [Publisher Viewership Data](#4-publisher-viewership-data)
5. [Campaign Generation Rules](#5-campaign-generation-rules)
6. [CPM Benchmarks](#6-cpm-benchmarks)
7. [ROAS Calculation Model](#7-roas-calculation-model)
8. [CTR / Click Model](#8-ctr--click-model)
9. [Pacing & Delivery Model](#9-pacing--delivery-model)
10. [Fill Rate Formula](#10-fill-rate-formula)
11. [Geographic Targeting Model](#11-geographic-targeting-model)
12. [Content Targeting Rules](#12-content-targeting-rules)
13. [Competitive Exclusions](#13-competitive-exclusions)
14. [Publisher Data Pivot Logic](#14-publisher-data-pivot-logic)

---

## 1. System Date

The simulation uses the **current system date** (`new Date()`) when the dashboard is opened. All "active" campaigns are paced against this date. All campaigns before the current month are marked `completed`.

```
SYSTEM_DATE = new Date().toISOString().split('T')[0]  // e.g., '2026-05-14'
```

**Indian Financial Year**: The dashboard uses Indian FY (April–March). FY years are derived dynamically from the current date (e.g., if opened in May 2026, the current FY is `2026-27`).

---

## 2. Advertiser Agent Profiles

Each advertiser (buyer agent) has a fixed profile that governs budget scale, seasonal multipliers, ROAS baselines, and competitive exclusions.

| Advertiser | Annual Budget | IPL Multiplier | Festive Multiplier | ROAS Base | Gender Targets | Sub-Brands |
|---|---|---|---|---|---|---|
| **Flipkart** | ₹90 Cr | 1.5× | 3.5× | 5.5 | Both, M, F | Flipkart Minutes, Flipkart Fashion, Cleartrip, Shopsy, Mobiles |
| **Amazon India** | ₹100 Cr | 1.2× | 4.0× | 5.2 | Both, M, F | Amazon Prime, Amazon Fresh, Amazon Pay, Daily Essentials |
| **Jio** | ₹6 Cr | 3.0× | 1.2× | 4.5 | Both | JioAirFiber, JioMart, Jio5G, AJIO |
| **HUL** | ₹150 Cr | 1.8× | 1.5× | 4.8 | F, Both | Lakme, Dove, Surf Excel, Ponds, Tresemmé, Knorr, Horlicks |
| **HDFC Bank** | ₹15 Cr | 2.0× | 1.5× | 5.0 | Both, M | Credit Cards, Home Loans, PayZapp, HDFC Life, Personal Loans |

### Seasonal Multipliers

- **IPL Season** (Mar, Apr, May): Budget is multiplied by `ipl_multiplier`
- **Festive Season** (Oct, Nov): Budget is multiplied by `festive_multiplier`
- **Base Months**: 1.0× multiplier

### Monthly Budget Calculation

```
monthlyBase = base_annual_budget / 12
budgetPool  = monthlyBase × seasonal_multiplier
```

---

## 3. Publisher Inventory Definitions

Each publisher has a defined set of device × format slots that campaigns can buy into.

### JioHotstar
| Device | Formats |
|---|---|
| Android | Video Pre-roll, Video Mid-roll, Billboard |
| iOS | Video Pre-roll, Video Mid-roll, Billboard |
| CTV | Video Pre-roll, Video Mid-roll |
| Website | Billboard |

### Myntra
| Device | Formats |
|---|---|
| Android | Billboard |
| iOS | Billboard |

### NDTV
| Device | Formats |
|---|---|
| Website | Billboard, Video Pre-roll, Video Mid-roll |

### ESPNcricinfo
| Device | Formats |
|---|---|
| Website | Billboard, Video Pre-roll, Video Mid-roll |

### Amazon.in
| Device | Formats |
|---|---|
| Website | Billboard, Display, Video Pre-roll, Video Mid-roll |
| Android | Billboard, Display, Video Pre-roll, Video Mid-roll |
| iOS | Billboard, Display, Video Pre-roll, Video Mid-roll |

---

## 4. Publisher Viewership Data

These values drive the **Viewership Portal** metrics and crucially the **Fill Rate** calculation.

| Publisher | Total Viewers (MAU) | DAU | Avg Watch Time (min) | Peak Concurrency | Retention % | Monthly Inventory (derived) |
|---|---|---|---|---|---|---|
| **JioHotstar** | 450M | 110M | 55 | 65M | 82% | 36.3B |
| **Myntra** | 45M | 8M | 12 | 1.2M | 65% | 576M |
| **NDTV** | 60M | 12M | 18 | 2.2M | 42% | 1.30B |
| **ESPNcricinfo** | 75M | 18M | 22 | 8.5M | 52% | 2.38B |
| **Amazon.in** | 250M | 32M | 28 | 4.5M | 58% | 5.38B |

### Rationale for Key Decisions

- **JioHotstar (110M DAU, 55 min)**: Post-merger of Hotstar + JioCinema in 2024. IPL alone drives 65M peak concurrency. 55 min reflects OTT binge-watching sessions plus live sports.
- **Myntra (8M DAU, 12 min)**: E-commerce app. DAU reflects daily active shoppers (from ~45M MAU). Avg session time is 12 min of ad-eligible browsing — shorter than video OTT because it's product scrolling, not video watching.
- **NDTV (12M DAU, 18 min)**: Digital news across web + app. 18 min includes article reading + embedded video clips. Higher than pure text sites due to NDTV's strong video + live news coverage.
- **ESPNcricinfo (18M DAU, 22 min)**: Cricket content hub. IPL/ICC seasons inflate DAU massively. 22 min reflects match-day score tracking + highlights + analysis articles.
- **Amazon.in (32M DAU, 28 min)**: E-commerce + MiniTV streaming. 28 min blends product shopping sessions with MiniTV short-form content.

### Device Breakdown (% of traffic)

| Publisher | Mobile | CTV | Web |
|---|---|---|---|
| JioHotstar | 72% | 24% | 4% |
| Myntra | 95% | 0% | 5% |
| NDTV | 55% | 5% | 40% |
| ESPNcricinfo | 40% | 2% | 58% |
| Amazon.in | 82% | 12% | 6% |

### Content Performance (per publisher)

**JioHotstar**: IPL Live Broadcast (65M viewers), Disney+ Originals (42M), HBO & Warner Bros Suite (35M), Jio Cinema Originals (28M)

**Myntra**: EORS Live Launch (4.5M), Fashion Superstar S4 (1.2M), Creator Studio Live (850K), Style Casting (300K)

**NDTV**: Election Results Live (8.5M), Prime Time with Ravish (2.5M), Gadgets 360 Show (1.2M), NDTV Food Special (800K)

**ESPNcricinfo**: T20 World Cup Live (25M), Match Day Analysis (8.5M), Cricinfo Insights (4.2M), Historical Archives (1.5M)

**Amazon.in**: Mirzapur Season 3 (35M), The Family Man (28M), MiniTV: Physics Wallah (12M), Amazon Live Commerce (5.5M)

---

## 5. Campaign Generation Rules

Campaigns are generated per advertiser, per month, spanning FY 2023-24 through May 2026.

### Campaign Count Formula

```
campaignCount = floor(budgetPool / 15,000,000) + 3
cappedCount   = min(campaignCount, 25)    // Browser performance cap
budgetPerCamp = budgetPool / cappedCount
```

This means: **1 campaign per ~₹1.5 Crore of monthly budget**, with a minimum of 3 campaigns and a maximum of 25 per month.

### Campaign Status Rules

- **All months before the current month**: `status = 'completed'`
- **Current month**: `status = 'active'` by default
  - Exception: Every 3rd campaign (`i % 3 === 0`) is marked `completed` (~30% of current month campaigns are short burst campaigns that finished early)
  - Completed current-month campaigns have adjusted dates: end before today (SYSTEM_DATE - 1)

### Campaign ID Format

```
{AGENT_ID}-{YYYY}-{MM}-C{index}
Example: FLIPKART-2026-05-C3
```

### Publisher Assignment

Publishers are assigned using round-robin with an agent-specific offset to ensure even distribution:

```
agentOffset = indexOf(agentId in AGENT_PROFILES)
publisher = PUBLISHERS[(monthIndex + campaignIndex + agentOffset) % 5]
```

Exclusions are then applied (see [Section 13](#13-competitive-exclusions)).

### Date Ranges

```
startDay = (campaignIndex % 10) + 1     // Days 1-10
endDay   = (campaignIndex % 10) + 15    // Days 15-25
```

For completed current-month campaigns, dates are shifted earlier to end before SYSTEM_DATE.

---

## 6. CPM Benchmarks

Cost Per Mille (₹ per 1,000 impressions) by format and device:

| Format / Device | Base CPM (₹) | Jitter Factor |
|---|---|---|
| **CTV (any format)** | 750 | ±10% |
| **Video Mid-roll** | 280 | ±20% |
| **Video Pre-roll** | 180 | ±20% |
| **Billboard** | 180 | ±10% |
| **Display** | 120 | ±15% |
| **Default** | 50 | ±15% |

> **Note**: CTV overrides all format CPMs — CTV inventory is premium regardless of format.

### Target Impressions Calculation

```
targetImpressions = floor((budget / cpm) × 1000)
targetReach = floor(targetImpressions × 0.8)    // 80% unique reach assumption
```

---

## 7. ROAS Calculation Model

ROAS is calculated through a **3-layer multiplicative model**:

### Layer 1: Funnel Position

| Device / Format | ROAS Multiplier | Rationale |
|---|---|---|
| CTV or Billboard | 0.3× | Upper funnel: awareness only, not direct response |
| Video Pre-roll or Mid-roll | 0.5× | Mid funnel: consideration |
| Display / Default | 1.0× | Lower funnel: performance, retains full base |

### Layer 2: Content Context (Halo Effect)

| Content Type | ROAS Multiplier | Rationale |
|---|---|---|
| IPL Live Broadcast | 2.0× | Live sports halo: 2-3× higher search lift, +40% conversion |
| Commerce Events (EORS, Great Indian Festival, Live Commerce, Amazon Fashion Week) | 1.5× | High-intent shopping context |
| Other content | 1.0× | No additional lift |

### Layer 3: Premium Inventory

| Condition | ROAS Multiplier | Rationale |
|---|---|---|
| JioHotstar + CTV | 1.2× | Affluent urban household, big screen, higher basket sizes |

### Final ROAS

```
roas = roas_base × funnel_multiplier × content_multiplier × premium_multiplier
roas = jitter(roas, ±8%)
```

---

## 8. CTR / Click Model

Click-through rates are format and device-dependent. CTV and mid-roll are **zero-click** environments.

| Format / Device | CTR | Clicks Formula |
|---|---|---|
| **CTV (any)** | 0.00% | 0 clicks (non-clickable living room) |
| **Video Mid-roll** | 0.00% | 0 clicks (deep in content, no overlay) |
| **Video Pre-roll** | 0.50% | `impressions × 0.005 ± 15%` |
| **Display** | 0.30% | `impressions × 0.003 ± 15%` |
| **Billboard** | 0.10% | `impressions × 0.001 ± 15%` |
| **Fallback** | 0.20% | `impressions × 0.002 ± 15%` |

---

## 9. Pacing & Delivery Model

### Active Campaigns

Delivery is based on elapsed time + a random pacing factor:

```
timeRatio    = clamp(elapsed / totalDuration, 0.05, 1.0)
pacingFactor = gaussianRandom(mean=1.0, stdev=0.10)    // ~0.8 to 1.2
deliveryPct  = clamp(timeRatio × pacingFactor, 0.01, 1.0)
impressions  = floor(targetImpressions × deliveryPct)
```

**Underpacing flag**: Set when `pacingFactor < 0.80` (roughly bottom ~2.5% of the distribution).

### Completed Campaigns

```
deliveryPct = min(gaussianRandom(0.995, 0.01), 1.01)    // ~98.5% to 101%
```

This means completed campaigns deliver approximately 100% (±1%) of their target impressions.

### Spend Tracking

```
spend = jitter(budget × deliveryPct × 0.99, ±1%)
```

The 0.99 factor accounts for programmatic efficiency — actual spend is slightly below budget due to auction savings.

---

## 10. Fill Rate Formula

**Used in**: Publisher Dashboard → Performance Metrics card

```
Fill Rate = (Delivered Impressions / Monthly Inventory) × 100

Monthly Inventory = DAU × AvgWatchTime(min) × adSlotsPerMin × 30

adSlotsPerMin = 0.2    // 1 ad opportunity per 5 minutes of viewing
```

### Expected Fill Rates by Publisher

| Publisher | DAU | AvgWT | Inventory | Expected Fill Rate |
|---|---|---|---|---|
| JioHotstar | 110M | 55 min | 36.3B | 2–5% (massive scale, low fill is industry-normal) |
| Myntra | 8M | 12 min | 576M | 40–65% |
| NDTV | 12M | 18 min | 1.30B | 25–45% |
| ESPNcricinfo | 18M | 22 min | 2.38B | 10–20% |
| Amazon.in | 32M | 28 min | 5.38B | 5–15% |

### Design Decision: `adSlotsPerMin = 0.2`

This is an OTT industry benchmark: **1 ad break per 5 minutes** of video content. This rate accounts for the fact that:
- Not all watch time has ad breaks (e.g., subscription content, live pauses)
- Ad pods contain multiple ads, but we're counting slot opportunities, not ad pods
- E-commerce platforms like Myntra have ad impressions from product page views, which roughly approximate to this rate when normalized per minute of session time

---

## 11. Geographic Targeting Model

Campaigns are assigned geography types using a **weighted probability distribution** that mirrors actual JioHotstar/Hotstar campaign patterns:

| Geography Type | Weight | % of Total |
|---|---|---|
| Pan-India | 6 | ~37.5% |
| Metros | 3 | ~18.75% |
| Tier 2 Cities | 2 | ~12.5% |
| Tier 3 Cities | 1 | ~6.25% |
| South Region | 2 | ~12.5% |
| HSM (Hindi Speaking Markets) | 1 | ~6.25% |
| Maharashtra (single state) | 1 | ~6.25% |

### City Lists

**Metros (8)**: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad

**Tier 2 (30)**: Jaipur, Lucknow, Chandigarh, Indore, Kochi, Patna, Surat, Nagpur, Bhopal, Visakhapatnam, Coimbatore, Vadodara, Thiruvananthapuram, Agra, Madurai, Varanasi, Nashik, Rajkot, Mysore, Jodhpur, Raipur, Ranchi, Guwahati, Amritsar, Vijayawada, Dehradun, Mangalore, Aurangabad, Bhubaneswar, Meerut

**Tier 3 (30)**: Jalandhar, Udaipur, Aligarh, Bareilly, Moradabad, Gorakhpur, Bikaner, Jammu, Dharamshala, Shimla, Pondicherry, Guntur, Nellore, Warangal, Solapur, Kolhapur, Belgaum, Hubli, Tirupati, Salem, Tiruchirappalli, Jamshedpur, Dhanbad, Siliguri, Durgapur, Ajmer, Gwalior, Ujjain, Rohtak, Panipat

### Regional Clusters

| Cluster | States |
|---|---|
| **South** | Tamil Nadu, Karnataka, Kerala, Andhra Pradesh, Telangana |
| **HSM** | Uttar Pradesh, Madhya Pradesh, Rajasthan, Bihar, Jharkhand, Chhattisgarh, Uttarakhand, Haryana, Maharashtra, Gujarat, Punjab, West Bengal, Odisha, Assam, Goa, Himachal Pradesh, Jammu & Kashmir, Delhi NCR, Sikkim, Meghalaya, Tripura, Manipur, Mizoram, Nagaland, Arunachal Pradesh |

### Line Item Breakdown Rules

| Campaign Geo | Line Item Generation |
|---|---|
| Pan-India | 1 national line item |
| Metros | 1 line item per metro city (8 items) |
| Tier 2 | 1 line item per Tier 2 city (30 items) |
| Tier 3 | 1 line item per Tier 3 city (30 items) |
| Regional Cluster | 1 line item per state in the cluster |
| Single State (with cities) | 1 line item per city + "Rest of State" (if `i % 3 !== 0`) |
| Single State (whole) | 1 line item for the state (if `i % 3 === 0`) |

---

## 12. Content Targeting Rules

Each publisher has 4 flagship content properties. Content is assigned to line items in a round-robin pattern:

```
contentLabel = PUBLISHER_SHOWS[publisher][idCounter % 4]
```

| Publisher | Content Slot 0 | Content Slot 1 | Content Slot 2 | Content Slot 3 |
|---|---|---|---|---|
| JioHotstar | IPL Live Broadcast | Koffee with Karan | Big Boss OTT | Hotstar Specials |
| Myntra | End of Reason Sale Preview | Myntra Fashion Superstar | Live Commerce | Sneaker Drop Live |
| NDTV | Left Right & Centre | Prime Time News | Morning News Desk | Tech Guru |
| ESPNcricinfo | Match Day Live | T20 Timeout | Match Highlights | Cricket Analysis |
| Amazon.in | Great Indian Festival | Amazon MiniTV Shows | Tech Launchpad Live | Amazon Fashion Week |

### Content-Targeted Campaign Detection

A campaign is considered "content-targeted" (shown in pink in the UI) only when **all line items within the campaign share the same content property**. If line items are spread across different content slots, the campaign is labeled as **Run of Network (RON)**.

---

## 13. Competitive Exclusions

### Agent-Level Exclusions

| Agent | Excluded Publishers | Reason |
|---|---|---|
| Flipkart | Amazon.in | Direct competitor — no advertising on rival platform |
| Amazon | Myntra (Flipkart-owned) | Direct competitor — Myntra is a Flipkart subsidiary |

### Brand-Level Exclusions

| Agent | Brand | Excluded Publisher | Reason |
|---|---|---|---|
| Amazon | Amazon Prime | JioHotstar | Amazon Prime Video competes with JioHotstar for OTT subscribers |
| Jio | JioMart | Myntra, Amazon.in | JioMart competes with both e-commerce platforms |

### Fallback Logic

When an exclusion forces a publisher change:
```
neutralPublishers = PUBLISHERS.filter(p => !allExclusions.includes(p))
fallback = randomSelect(neutralPublishers) || "NDTV"    // NDTV as final fallback
```

---

## 14. Publisher Data Pivot Logic

The Publisher Dashboard (seller view) pivots the advertiser-centric data to show metrics **from the publisher's perspective**.

### How It Works (`usePublisherData.js`)

1. For each publisher in `PUBLISHERS`, scan **all 5 advertisers**
2. Filter each advertiser's `active_buys` and `past_buys` for line items where `buy.publisher === pubName`
3. Attach the advertiser identity (`advertiser`, `advertiserDomain`, `advertiserId`) to each buy
4. Aggregate metrics: total budget, spend, impressions, clicks, reach

### Period Filtering

Both dashboards filter campaigns by the selected timeframe:

```
activeBuys = activeData.active_buys.filter(buy => {
  const bStart = new Date(buy.start_date);
  const bEnd = new Date(buy.end_date);
  return bStart <= periodRange.end && bEnd >= periodRange.start;
});
```

This means switching from "May" to "April" will show completely different campaign sets. Only "Yearly" view shows all campaigns.

---

## Appendix: Statistical Utilities

### Gaussian Random

Used for pacing variance simulation:

```javascript
const gaussianRandom = (mean = 0, stdev = 1) => {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
};
```

### Jitter

Used to add ±variance to values:

```javascript
const jitter = (val, factor = 0.15) => {
  const change = val * factor * (Math.random() * 2 - 1);
  return Math.floor(val + change);
};
```

---

## Appendix: Age Groups

The following age groups are cycled through for campaign targeting:

```
["18-34", "18-44", "24-60", "18+", "24+", "All Age Groups"]
```

---

*Last updated: 2026-05-13*
