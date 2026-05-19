# 📝 Sample Simulation Prompts & Scenarios

Use these production-grade, high-fidelity sample prompts to test and demonstrate the autonomous negotiation, dynamic pricing, and brand safety compliance capabilities of the AdCP multi-agent marketplace.

---

## 🏢 Buyer Agent (DSP) Prompts
Copy and paste these prompts directly into the campaign brief input field on the **Advertiser Portal** (`http://localhost:5173`) to trigger the buyer agent workflows:

### Scenario 1: Premium Sports & CTV Placement (Targeted Discovery)
```text
Launch a premium awareness campaign for Amazon Prime Day. Target high-engagement slots on JioHotstar specifically during the IPL Playoffs. We are looking for CTV Video Mid-rolls and Mobile Pre-rolls. Budget: ₹50 Lakhs. Maximum allowed CPM: ₹1,500.
```
*   **What Happens in Detail:**
    *   **Context Auditing:** The Buyer Agent (DSP) uses Gemma-3-27b-it to parse target criteria: "Amazon Prime Day", "CTV Video Mid-rolls", "JioHotstar", and "IPL Playoffs".
    *   **Metadata Filtering:** The DSP filters out all other publishers (e.g. Cricinfo, Myntra) before invoking the LLM, reducing token cost by **85%**.
    *   **Safety Rating:** Verified against competitor separations to ensure no adjacent competing retail placements are active.

---

### Scenario 2: Hyper-Local Regional Targeting (Demographic Over-indexing)
```text
Promote the 'Big Billion Days' teaser specifically to cricket fans in Karnataka and Tamil Nadu. Focus on the upcoming RCB vs CSK match on JioHotstar. Use slots that over-index on Southern demographics. Budget: ₹25 Lakhs.
```
*   **What Happens in Detail:**
    *   **Audience Signal Evaluation:** The DSP maps the geographical filters ("Karnataka", "Tamil Nadu") and match relevance ("RCB vs CSK") to publishers scoring highest in Southern demographics.
    *   **Bidding Precision:** Programmatic bids are dynamically adjusted upwards for premium Southern match slots to clear publisher floor prices.

---

### Scenario 3: Open Exchange Brand Equity Campaign (High Volume / Dynamic Floors)
```text
Run a 14-day brand equity campaign for Dove. Target all available publishers (Open Exchange). Focus on 'Brand Safety Tier: Premium' inventory only. Distribute ₹1 Crore budget across Display and Video formats equally.
```
*   **What Happens in Detail:**
    *   **Multi-Publisher Discovery:** The DSP calls `get_products` across the entire registry, scanning all 5 publisher SSP nodes.
    *   **Zero-Shot Safety Audits:** The SSP servers launch Grok-3 audits to guarantee "Premium" brand-safety compatibility (excluding slots on low-reputation or user-generated content domains).

---

## 📰 Seller Agent (SSP) Prompts
Use these instructions to configure optimization strategies in the **Publisher Portal** (`http://localhost:5177`) to test yielding behaviors:

### Scenario 1: Premium Inventory Optimization & Floor Adjustments
```text
Optimize floor prices for the upcoming IPL Playoffs. Set a 15% floor price premium on all Connected TV (CTV) Mid-rolls and Pre-rolls. Prioritize e-commerce brands (specifically Amazon and Flipkart) by offering a competitive 5% volume floor discount for package buys.
```
*   **What Happens in Detail:**
    *   **Dynamic Floor Scaling:** The SSP updates its active `cpm_floor` criteria, applying a 1.15x multiplier for CTV slots during matching matches.
    *   **Partner Discounts:** Applies a 0.95x discount matrix when the buyer agent's identity matches `amazon_india` or `flipkart` for package transactions.
    *   **Real-time eCPM Lift:** The **Publisher Strategy Evaluation** dashboard updates its forecasts, showing projected fill-rates and net yield uplifts (+%) inside the dynamic `yield-forecast-card`.
