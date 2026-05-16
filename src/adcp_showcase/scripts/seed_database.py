"""
Seed Database Script — ports the JS history generation logic to Python.
Populates adcp.db with 3 years of transaction history for all 5 brands.
"""

import json
import sqlite3
import uuid
import random
import math
from datetime import datetime, timedelta

# --- Constants from useAgentData.js ---

SYSTEM_DATE = "2026-05-10"
PUBLISHERS = ["JioHotstar", "Myntra", "NDTV", "ESPNcricinfo", "Amazon.in"]

AGENT_PROFILES = {
    "flipkart": {
        "name": "Flipkart",
        "domain": "flipkart.com",
        "base_annual_budget": 900_000_000,
        "ipl_multiplier": 1.5,
        "festive_multiplier": 3.5,
        "roas_base": 5.5,
        "genders": ["Both", "M", "F"],
        "brands": ["Flipkart Minutes", "Flipkart Fashion", "Cleartrip", "Shopsy", "Mobiles"],
        "exclusions": ["Amazon.in"]
    },
    "amazon": {
        "name": "Amazon India",
        "domain": "amazon.in",
        "base_annual_budget": 1_000_000_000,
        "ipl_multiplier": 1.2,
        "festive_multiplier": 4.0,
        "roas_base": 5.2,
        "genders": ["Both", "M", "F"],
        "brands": ["Amazon Prime", "Amazon Fresh", "Amazon Pay", "Daily Essentials"],
        "exclusions": ["Myntra"],
        "brandExclusions": {"Amazon Prime": ["JioHotstar"]}
    },
    "jio": {
        "name": "Jio",
        "domain": "jio.com",
        "base_annual_budget": 60_000_000,
        "ipl_multiplier": 3.0,
        "festive_multiplier": 1.2,
        "roas_base": 4.5,
        "genders": ["Both"],
        "brands": ["JioAirFiber", "JioMart", "Jio5G", "AJIO"],
        "brandExclusions": {"JioMart": ["Myntra", "Amazon.in"]}
    },
    "hul": {
        "name": "HUL",
        "domain": "hul.co.in",
        "base_annual_budget": 1_500_000_000,
        "ipl_multiplier": 1.8,
        "festive_multiplier": 1.5,
        "roas_base": 4.8,
        "genders": ["F", "Both"],
        "brands": ["Lakme", "Dove", "Surf Excel", "Ponds", "Tresemmé", "Knorr", "Horlicks"]
    },
    "hdfc": {
        "name": "HDFC Bank",
        "domain": "hdfcbank.com",
        "base_annual_budget": 150_000_000,
        "ipl_multiplier": 2.0,
        "festive_multiplier": 1.5,
        "roas_base": 5.0,
        "genders": ["Both", "M"],
        "brands": ["Credit Cards", "Home Loans", "PayZapp", "HDFC Life", "Personal Loans"]
    }
}

PUBLISHER_INVENTORY = {
    "JioHotstar": [
        {"device": "Android", "format": "Video Pre-roll"},
        {"device": "Android", "format": "Video Mid-roll"},
        {"device": "Android", "format": "Billboard"},
        {"device": "iOS", "format": "Video Pre-roll"},
        {"device": "iOS", "format": "Video Mid-roll"},
        {"device": "iOS", "format": "Billboard"},
        {"device": "CTV", "format": "Video Pre-roll"},
        {"device": "CTV", "format": "Video Mid-roll"},
        {"device": "Website", "format": "Billboard"}
    ],
    "ESPNcricinfo": [
        {"device": "Website", "format": "Billboard"},
        {"device": "Website", "format": "Video Pre-roll"},
        {"device": "Website", "format": "Video Mid-roll"}
    ],
    "Myntra": [
        {"device": "Android", "format": "Billboard"},
        {"device": "iOS", "format": "Billboard"}
    ],
    "NDTV": [
        {"device": "Website", "format": "Billboard"},
        {"device": "Website", "format": "Video Pre-roll"},
        {"device": "Website", "format": "Video Mid-roll"}
    ],
    "Amazon.in": [
        {"device": "Website", "format": "Billboard"},
        {"device": "Website", "format": "Display"},
        {"device": "Website", "format": "Video Pre-roll"},
        {"device": "Website", "format": "Video Mid-roll"},
        {"device": "Android", "format": "Billboard"},
        {"device": "Android", "format": "Display"},
        {"device": "Android", "format": "Video Pre-roll"},
        {"device": "Android", "format": "Video Mid-roll"},
        {"device": "iOS", "format": "Billboard"},
        {"device": "iOS", "format": "Display"},
        {"device": "iOS", "format": "Video Pre-roll"},
        {"device": "iOS", "format": "Video Mid-roll"}
    ]
}

AGE_GROUPS = ["18-34", "18-44", "24-60", "18+", "24+", "All Age Groups"]
CAMPAIGN_GEO_TYPES = ["Pan-India", "Metros", "Tier 2", "Tier 3", "South", "HSM", "Maharashtra"]
PUBLISHER_SHOWS = {
    "JioHotstar": ["IPL Live Broadcast", "Koffee with Karan", "Big Boss OTT", "Hotstar Specials"],
    "Myntra": ["End of Reason Sale Preview", "Myntra Fashion Superstar", "Live Commerce", "Sneaker Drop Live"],
    "NDTV": ["Left Right & Centre", "Prime Time News", "Morning News Desk", "Tech Guru"],
    "ESPNcricinfo": ["Match Day Live", "T20 Timeout", "Match Highlights", "Cricket Analysis"],
    "Amazon.in": ["Great Indian Festival", "Amazon MiniTV Shows", "Tech Launchpad Live", "Amazon Fashion Week"]
}

# --- Helpers ---

def jitter(val, factor=0.15):
    change = val * factor * (random.random() * 2 - 1)
    return val + change

def gaussian_random(mean=0, stdev=1):
    return random.gauss(mean, stdev)

def get_valid_publisher(agent_id, preferred_pub, brand_name):
    profile = AGENT_PROFILES[agent_id]
    all_exclude = profile.get("exclusions", []) + profile.get("brandExclusions", {}).get(brand_name, [])
    if preferred_pub not in all_exclude:
        return preferred_pub
    neutrals = [p for p in PUBLISHERS if p not in all_exclude]
    return random.choice(neutrals) if neutrals else "NDTV"

# --- Core Generation Logic ---

class DBSeeder:
    def __init__(self, db_path="src/adcp_showcase/adcp.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._id_counter = 1

    def clear_tables(self):
        self.cursor.execute("DELETE FROM mediabuy")
        self.cursor.execute("DELETE FROM campaign")
        self.cursor.execute("DELETE FROM agent")
        self.cursor.execute("DELETE FROM simulationevent")
        self.conn.commit()

    def seed(self):
        print(f"🌱 Seeding database: {self.db_path}...")
        self.clear_tables()

        for agent_id, profile in AGENT_PROFILES.items():
            print(f"  🏢 Seeding brand: {profile['name']}...")
            
            # 1. Insert Agent
            self.cursor.execute(
                "INSERT INTO agent (id, name, domain, role, persona_json) VALUES (?, ?, ?, ?, ?)",
                (agent_id, profile['name'], profile['domain'], "buyer", json.dumps(profile))
            )

            # 2. Generate History
            history_data = self._generate_history_for_agent(agent_id)
            
            # 3. Batch Insert
            campaigns_seen = set()
            for item in history_data:
                # Insert Campaign if new
                if item['campaign_id'] not in campaigns_seen:
                    self.cursor.execute(
                        """INSERT INTO campaign (
                            id, agent_id, name, status, total_budget, spent, allocated, 
                            start_date, end_date, impressions, clicks, reach, roas, 
                            latest_reasoning, total_tokens, estimated_cost_inr
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            item['campaign_id'], agent_id, item['name'], item['status'],
                            item['budget'] * 1.2, # total budget slightly more than line item for demo
                            item['performance']['spend'], item['performance']['spend'],
                            item['start_date'], item['end_date'],
                            item['performance']['impressions'], item['performance']['clicks'],
                            item['performance']['reach'], item['performance']['roas'],
                            "Historical performance data.", 0, 0
                        )
                    )
                    campaigns_seen.add(item['campaign_id'])

                # Insert Media Buy (Line Item)
                self.cursor.execute(
                    """INSERT INTO mediabuy (
                        id, campaign_id, name, brand_name, status, publisher, device, format, 
                        deal_type, budget, target_impressions, target_reach, start_date, end_date, 
                        created_at, targeting_json, performance_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        item['id'], item['campaign_id'], item['name'], item['brand'],
                        item['status'], item['publisher'], item['device'], item['format'],
                        item['buy_type'], item['budget'], item['target_impressions'],
                        item['target_reach'], item['start_date'], item['end_date'],
                        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        json.dumps(item['targeting']),
                        json.dumps(item['performance'])
                    )
                )

        self.conn.commit()
        print("✅ Seeding complete.")

    def _generate_history_for_agent(self, agent_id):
        profile = AGENT_PROFILES[agent_id]
        now = datetime.strptime(SYSTEM_DATE, "%Y-%m-%d")
        
        data = []
        monthly_base = profile['base_annual_budget'] / 12

        # 3 years of history
        for year_offset in range(-3, 1):
            y = now.year + year_offset
            for month in range(1, 13):
                # FY starts in April in India, but we'll just do calendar months for simplicity
                if y == now.year and month > now.month:
                    continue

                date_prefix = f"{y}-{month:02d}"
                is_current_month = (y == now.year and month == now.month)
                
                multiplier = 1.0
                if month in [10, 11]: multiplier = profile['festive_multiplier']
                if month in [3, 4, 5]: multiplier = profile['ipl_multiplier']
                
                budget_pool = monthly_base * multiplier
                campaign_count = int(budget_pool / 15_000_000) + 3
                capped_count = min(campaign_count, 15) # Reduced from 25 to be faster
                budget_per_camp = budget_pool / capped_count

                for i in range(capped_count):
                    status = "active" if is_current_month else "completed"
                    if is_current_month and i % 3 == 0:
                        status = "completed"

                    brand = profile['brands'][i % len(profile['brands'])]
                    pub = random.choice(PUBLISHERS)
                    pub = get_valid_publisher(agent_id, pub, brand)
                    
                    inv_list = PUBLISHER_INVENTORY.get(pub, PUBLISHER_INVENTORY["NDTV"])
                    inv = random.choice(inv_list)
                    
                    target_params = {
                        "gender": random.choice(profile['genders']),
                        "age": random.choice(AGE_GROUPS),
                        "geography": random.choice(CAMPAIGN_GEO_TYPES)
                    }

                    camp_name = f"{brand} - {('Mega ' if multiplier > 1.5 else '')}Campaign {i+1}"
                    camp_id = f"{agent_id.upper()}-{date_prefix}-C{i+1}"
                    
                    start_day = (i % 10) + 1
                    end_day = start_day + 20
                    if status == "completed" and is_current_month:
                        start_day = max(1, (i % (now.day - 2)) + 1)
                        end_day = min(now.day - 1, start_day + 7)

                    start_date = f"{date_prefix}-{start_day:02d}"
                    end_date = f"{date_prefix}-{end_day:02d}"

                    # Determine buy type: ~25% of active buys are Open Exchange
                    buy_type = "open_exchange" if (status == 'active' and i % 4 == 1) else "direct"

                    data.append(self._create_line_item(
                        agent_id, camp_id, camp_name, f"Line Item {i+1}", status, pub,
                        inv['device'], inv['format'], budget_per_camp,
                        start_date, end_date, target_params, brand, buy_type
                    ))

        return data

    def _create_line_item(self, agent_id, camp_id, name, line_item_name, status, publisher, device, format, budget, start, end, target_params, brand_name, buy_type="direct"):
        profile = AGENT_PROFILES[agent_id]
        budget_val = jitter(budget)

        cpm = 50
        if format == 'Video Mid-roll': cpm = jitter(280, 0.2)
        elif format == 'Video Pre-roll': cpm = jitter(180, 0.2)
        elif format == 'Display': cpm = jitter(120, 0.15)
        elif device == 'CTV': cpm = jitter(750, 0.1)
        elif format == 'Billboard': cpm = jitter(180, 0.1)

        target_imps = int((budget_val / cpm) * 1000)
        
        delivery_pct = 1.0
        if status == 'active':
            # Simplified pacing for seeding
            delivery_pct = random.uniform(0.1, 0.8)
        else:
            delivery_pct = random.uniform(0.98, 1.02)

        impressions = int(target_imps * delivery_pct)
        content_label = random.choice(PUBLISHER_SHOWS.get(publisher, ["Run of Network"]))

        roas = profile['roas_base']
        if device == 'CTV' or format == 'Billboard': roas *= 0.3
        elif 'Video' in format: roas *= 0.5
        
        if content_label == 'IPL Live Broadcast': roas *= 2.0
        roas = jitter(roas, 0.08)

        clicks = 0
        if device != 'CTV' and 'Mid-roll' not in format:
            ctr = 0.002
            if 'Pre-roll' in format: ctr = 0.008
            elif 'Billboard' in format: ctr = 0.001
            clicks = int(impressions * jitter(ctr, 0.2))

        spend_total = budget_val * delivery_pct

        line_item_id = f"LI-{self._id_counter}"
        self._id_counter += 1
        
        return {
            "id": line_item_id,
            "campaign_id": camp_id,
            "name": name,
            "line_item_name": line_item_name,
            "brand": brand_name,
            "status": status,
            "publisher": publisher,
            "device": device,
            "format": format,
            "budget": budget_val,
            "target_impressions": target_imps,
            "target_reach": int(target_imps * 0.8),
            "start_date": start,
            "end_date": end,
            "targeting": {
                "gender": target_params['gender'],
                "age": target_params['age'],
                "geography": target_params['geography'],
                "content": content_label
            },
            "buy_type": buy_type,
            "performance": {
                "impressions": impressions,
                "reach": int(impressions * 0.8),
                "clicks": clicks,
                "spend": spend_total,
                "roas": round(roas, 2)
            }
        }

if __name__ == "__main__":
    import os
    # Ensure directory exists
    os.makedirs("src/adcp_showcase/scripts", exist_ok=True)
    seeder = DBSeeder()
    seeder.seed()
