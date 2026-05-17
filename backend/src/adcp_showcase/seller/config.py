"""
Publisher configurations — 5 major Indian digital publishers with
realistic inventory, audience demographics, and content signals.

All prices in INR (Indian Rupees). CPM benchmarks sourced from
Indian digital advertising industry reports (2025-2026):
- Display/Billboard: ₹40-₹200
- Video Pre-roll: ₹80-₹350
- Video Mid-roll: ₹100-₹500
- CTV Premium (Live Sports): ₹500-₹2,500
"""

from __future__ import annotations

from .models import (
    AdFormat, AudienceProfile, InventorySlot, Platform,
    PublisherConfig, PublisherProperty,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 1) JIOHOTSTAR
# ═══════════════════════════════════════════════════════════════════════════════

JIOHOTSTAR = PublisherConfig(
    publisher_id="jiohotstar",
    publisher_name="JioHotstar",
    domain="jiohotstar.com",
    category="streaming",
    description=(
        "India's largest streaming platform (JioCinema + Disney+ Hotstar merger). "
        "503M MAU. Home to IPL, English Premier League, Bigg Boss, HBO originals, "
        "and Bollywood blockbusters."
    ),
    platforms=[Platform.MOBILE_APP, Platform.CTV, Platform.WEBSITE],
    ad_formats=[AdFormat.BILLBOARD, AdFormat.VIDEO_PREROLL, AdFormat.VIDEO_MIDROLL],
    properties=[
        PublisherProperty(
            property_id="jh_mobile", property_name="JioHotstar Mobile App",
            platform=Platform.MOBILE_APP, inventory_share_pct=55.0,
            slots=[
                InventorySlot(
                    slot_id="jh_mob_preroll", slot_name="Mobile Pre-roll (Entertainment VOD)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=250.0, est_daily_impressions=25_000_000,
                    content_context="Bigg Boss episodes, Chiraiya, Mad For Each Other, Game of Thrones",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="jh_mob_midroll_cricket", slot_name="Mobile Mid-roll (Live IPL / EPL)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.VIDEO_MIDROLL,
                    floor_cpm=480.0, est_daily_impressions=12_000_000,
                    content_context="live IPL cricket matches, English Premier League football",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="jh_mob_preroll_highlights", slot_name="Mobile Pre-roll (Sports Highlights)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=320.0, est_daily_impressions=10_000_000,
                    content_context="IPL match highlights, EPL goal compilations, post-match analysis",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="jh_mob_billboard", slot_name="Mobile Billboard (App Home)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=120.0, est_daily_impressions=35_000_000,
                    content_context="app home screen, content discovery feed",
                    brand_safety_tier="premium",
                ),
            ],
        ),
        PublisherProperty(
            property_id="jh_ctv", property_name="JioHotstar CTV (Smart TVs)",
            platform=Platform.CTV, inventory_share_pct=40.0,
            slots=[
                InventorySlot(
                    slot_id="jh_ctv_preroll", slot_name="CTV Pre-roll (Movies & Series)",
                    platform=Platform.CTV, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=650.0, est_daily_impressions=8_000_000,
                    content_context="Bollywood blockbusters, HBO originals, Bigg Boss on big screen",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="jh_ctv_midroll_cricket", slot_name="CTV Mid-roll (Live IPL / EPL)",
                    platform=Platform.CTV, ad_format=AdFormat.VIDEO_MIDROLL,
                    floor_cpm=1200.0, est_daily_impressions=5_000_000,
                    content_context="live IPL cricket and EPL football on connected TVs — peak engagement",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="jh_ctv_preroll_highlights", slot_name="CTV Pre-roll (Sports Highlights VOD)",
                    platform=Platform.CTV, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=550.0, est_daily_impressions=4_000_000,
                    content_context="IPL and EPL highlight reels, post-match shows on big screen",
                    brand_safety_tier="premium",
                ),
            ],
        ),
        PublisherProperty(
            property_id="jh_web", property_name="JioHotstar Website",
            platform=Platform.WEBSITE, inventory_share_pct=5.0,
            slots=[
                InventorySlot(
                    slot_id="jh_web_billboard", slot_name="Website Billboard (Above the Fold)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=60.0, est_daily_impressions=1_500_000,
                    content_context="web browsing, content discovery",
                    brand_safety_tier="standard",
                ),
            ],
        ),
    ],
    audience=AudienceProfile(
        total_mau=503_000_000,
        gender_split={"male": 0.75, "female": 0.25},
        age_distribution={"18-24": 0.28, "25-34": 0.36, "35-44": 0.15, "45-54": 0.10, "55+": 0.11},
        geo_distribution={"north": 0.28, "south": 0.25, "west": 0.22, "east": 0.15, "central": 0.10},
        tier_distribution={"metro": 0.30, "tier_1": 0.25, "tier_2": 0.25, "tier_3": 0.20},
    ),
    content_signals={
        "live_sports": {
            "available": True,
            "properties": ["IPL (Indian Premier League)", "English Premier League"],
            "peak_events": "IPL: Mar-May, EPL: Aug-May",
        },
        "vod_sports": {
            "available": True,
            "content": ["IPL match highlights", "EPL goal compilations", "post-match analysis"],
        },
        "entertainment": {
            "reality_shows": ["Bigg Boss", "The 50", "Mad For Each Other"],
            "top_series": ["Chiraiya", "Love Beyond Wicket (LBW)", "Game of Thrones", "Modern Family"],
            "top_movies": ["Bollywood blockbusters", "HBO original films"],
            "kids": ["Doraemon", "Shinchan"],
        },
        "languages": ["hindi", "english", "tamil", "telugu", "bengali", "marathi"],
        "peak_hours": "19:00-23:00 IST",
        "viewer_intent": "lean-back entertainment, sports excitement, family viewing",
    },
)

# ═══════════════════════════════════════════════════════════════════════════════
# 2) CRICINFO
# ═══════════════════════════════════════════════════════════════════════════════

CRICINFO = PublisherConfig(
    publisher_id="cricinfo", publisher_name="ESPNcricinfo",
    domain="espncricinfo.com", category="sports",
    description="India's definitive cricket destination. 37M MAU. Live scores, commentary, highlights.",
    platforms=[Platform.WEBSITE],
    ad_formats=[AdFormat.BILLBOARD, AdFormat.VIDEO_PREROLL, AdFormat.VIDEO_MIDROLL],
    properties=[
        PublisherProperty(
            property_id="ci_web", property_name="ESPNcricinfo Website",
            platform=Platform.WEBSITE, inventory_share_pct=100.0,
            slots=[
                InventorySlot(
                    slot_id="ci_web_billboard_scores", slot_name="Scoreboard Billboard (Live Match Pages)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=220.0, est_daily_impressions=12_000_000,
                    content_context="live cricket scoreboards — highest user attention",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="ci_web_preroll_highlights", slot_name="Video Pre-roll (Match Highlights)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=280.0, est_daily_impressions=8_500_000,
                    content_context="post-match highlight videos",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="ci_web_midroll_analysis", slot_name="Video Mid-roll (Expert Analysis)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.VIDEO_MIDROLL,
                    floor_cpm=240.0, est_daily_impressions=4_200_000,
                    content_context="expert cricket analysis and interview segments",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="ci_web_billboard_articles", slot_name="Billboard (Article Pages)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=140.0, est_daily_impressions=15_000_000,
                    content_context="cricket news articles, editorials, stats",
                    brand_safety_tier="standard",
                ),
            ],
        ),
    ],
    audience=AudienceProfile(
        total_mau=37_000_000,
        gender_split={"male": 0.88, "female": 0.12},
        age_distribution={"18-24": 0.32, "25-34": 0.35, "35-44": 0.18, "45-54": 0.10, "55+": 0.05},
        geo_distribution={"north": 0.25, "south": 0.30, "west": 0.20, "east": 0.15, "central": 0.10},
        tier_distribution={"metro": 0.40, "tier_1": 0.25, "tier_2": 0.20, "tier_3": 0.15},
    ),
    content_signals={
        "primary_genres": ["cricket", "sports_news", "live_scores"],
        "live_sports": {"available": True, "properties": ["IPL", "ICC", "Ranji Trophy"]},
        "languages": ["english", "hindi"],
        "peak_hours": "10:00-22:00 IST (match days)",
        "viewer_intent": "active information seeking, high engagement, sports enthusiasm",
    },
)

# ═══════════════════════════════════════════════════════════════════════════════
# 3) MYNTRA
# ═══════════════════════════════════════════════════════════════════════════════

MYNTRA = PublisherConfig(
    publisher_id="myntra", publisher_name="Myntra",
    domain="myntra.com", category="fashion",
    description="India's leading fashion app. 80M peak MAU, 50% Gen Z, 70% new customers from Tier 2/3.",
    platforms=[Platform.MOBILE_APP],
    ad_formats=[AdFormat.BILLBOARD],
    properties=[
        PublisherProperty(
            property_id="my_app", property_name="Myntra Mobile App",
            platform=Platform.MOBILE_APP, inventory_share_pct=100.0,
            slots=[
                InventorySlot(
                    slot_id="my_app_billboard_home", slot_name="App Home Billboard (Hero Banner)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=180.0, est_daily_impressions=25_000_000,
                    content_context="app home screen — first thing users see after launch",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="my_app_billboard_category", slot_name="Category Page Billboard",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=120.0, est_daily_impressions=18_000_000,
                    content_context="category browsing pages (men, women, kids, beauty)",
                    brand_safety_tier="standard",
                ),
                InventorySlot(
                    slot_id="my_app_billboard_checkout", slot_name="Checkout Flow Billboard",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=350.0, est_daily_impressions=5_000_000,
                    content_context="checkout and order confirmation — high purchase intent",
                    brand_safety_tier="premium",
                ),
            ],
        ),
    ],
    audience=AudienceProfile(
        total_mau=80_000_000,
        gender_split={"male": 0.42, "female": 0.58},
        age_distribution={"18-24": 0.38, "25-34": 0.32, "35-44": 0.18, "45-54": 0.08, "55+": 0.04},
        geo_distribution={"north": 0.30, "south": 0.22, "west": 0.25, "east": 0.13, "central": 0.10},
        tier_distribution={"metro": 0.30, "tier_1": 0.20, "tier_2": 0.28, "tier_3": 0.22},
    ),
    content_signals={
        "primary_genres": ["fashion", "lifestyle", "beauty", "shopping"],
        "live_sports": {"available": False},
        "languages": ["english", "hindi"],
        "peak_hours": "10:00-14:00, 20:00-23:00 IST",
        "viewer_intent": "active shopping, high purchase intent, style discovery",
        "commerce_signals": {"avg_order_value_inr": 1800, "festive_multiplier": 3.0, "gen_z_share": 0.50},
    },
)

# ═══════════════════════════════════════════════════════════════════════════════
# 4) NDTV
# ═══════════════════════════════════════════════════════════════════════════════

NDTV = PublisherConfig(
    publisher_id="ndtv", publisher_name="NDTV",
    domain="ndtv.com", category="news",
    description="India's most trusted English news platform. 40M MAU. Politics, business, tech, lifestyle.",
    platforms=[Platform.WEBSITE],
    ad_formats=[AdFormat.BILLBOARD, AdFormat.VIDEO_PREROLL, AdFormat.VIDEO_MIDROLL],
    properties=[
        PublisherProperty(
            property_id="nd_web", property_name="NDTV Website",
            platform=Platform.WEBSITE, inventory_share_pct=100.0,
            slots=[
                InventorySlot(
                    slot_id="nd_web_billboard_homepage", slot_name="Homepage Billboard (Above the Fold)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=120.0, est_daily_impressions=3_500_000,
                    content_context="breaking news, top headlines — highest traffic page",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="nd_web_preroll_news", slot_name="Video Pre-roll (News Segments)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=160.0, est_daily_impressions=2_000_000,
                    content_context="video news reports, interviews, panel discussions",
                    brand_safety_tier="standard",
                ),
                InventorySlot(
                    slot_id="nd_web_midroll_shows", slot_name="Video Mid-roll (Prime Time Shows)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.VIDEO_MIDROLL,
                    floor_cpm=200.0, est_daily_impressions=1_000_000,
                    content_context="prime-time debate shows, in-depth analysis programs",
                    brand_safety_tier="standard",
                ),
                InventorySlot(
                    slot_id="nd_web_billboard_business", slot_name="Billboard (NDTV Profit / Business)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=250.0, est_daily_impressions=1_200_000,
                    content_context="NDTV Profit — markets, stocks, fintech, banking news",
                    brand_safety_tier="premium",
                ),
            ],
        ),
    ],
    audience=AudienceProfile(
        total_mau=40_000_000,
        gender_split={"male": 0.67, "female": 0.33},
        age_distribution={"18-24": 0.15, "25-34": 0.35, "35-44": 0.25, "45-54": 0.15, "55+": 0.10},
        geo_distribution={"north": 0.35, "south": 0.20, "west": 0.25, "east": 0.12, "central": 0.08},
        tier_distribution={"metro": 0.50, "tier_1": 0.25, "tier_2": 0.15, "tier_3": 0.10},
    ),
    content_signals={
        "primary_genres": ["news", "politics", "business", "technology", "lifestyle"],
        "live_sports": {"available": False},
        "languages": ["english", "hindi"],
        "peak_hours": "08:00-10:00, 20:00-23:00 IST",
        "viewer_intent": "information seeking, current affairs, professional context",
        "brand_safety_notes": "News content can be adjacent to sensitive events. Business section safest for finance.",
    },
)

# ═══════════════════════════════════════════════════════════════════════════════
# 5) AMAZON.IN
# ═══════════════════════════════════════════════════════════════════════════════

AMAZON_IN = PublisherConfig(
    publisher_id="amazon_in", publisher_name="Amazon.in",
    domain="amazon.in", category="e-commerce",
    description="India's 2nd largest e-commerce platform. 150M MAU. Shopping + Prime Video integration.",
    platforms=[Platform.WEBSITE, Platform.MOBILE_APP],
    ad_formats=[AdFormat.DISPLAY, AdFormat.BILLBOARD, AdFormat.VIDEO_PREROLL, AdFormat.VIDEO_MIDROLL],
    properties=[
        PublisherProperty(
            property_id="az_web", property_name="Amazon.in Website",
            platform=Platform.WEBSITE, inventory_share_pct=45.0,
            slots=[
                InventorySlot(
                    slot_id="az_web_billboard_home", slot_name="Homepage Billboard (Hero Carousel)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=250.0, est_daily_impressions=15_000_000,
                    content_context="homepage carousel — massive reach during sale events",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="az_web_display_search", slot_name="Sponsored Display (Search Results)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.DISPLAY,
                    floor_cpm=90.0, est_daily_impressions=45_000_000,
                    content_context="product search results — highest purchase intent",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="az_web_preroll_prime", slot_name="Video Pre-roll (Prime Video Web)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=350.0, est_daily_impressions=6_000_000,
                    content_context="Prime Video — movies, series, originals",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="az_web_midroll_prime", slot_name="Video Mid-roll (Prime Video Web)",
                    platform=Platform.WEBSITE, ad_format=AdFormat.VIDEO_MIDROLL,
                    floor_cpm=400.0, est_daily_impressions=3_500_000,
                    content_context="Prime Video long-form content mid-breaks",
                    brand_safety_tier="premium",
                ),
            ],
        ),
        PublisherProperty(
            property_id="az_app", property_name="Amazon.in Mobile App",
            platform=Platform.MOBILE_APP, inventory_share_pct=55.0,
            slots=[
                InventorySlot(
                    slot_id="az_app_billboard_home", slot_name="App Home Billboard",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.BILLBOARD,
                    floor_cpm=120.0, est_daily_impressions=8_000_000,
                    content_context="app home — deals, recommendations",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="az_app_display_browse", slot_name="Sponsored Display (Category Browsing)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.DISPLAY,
                    floor_cpm=60.0, est_daily_impressions=10_000_000,
                    content_context="product browsing — category pages, deals section",
                    brand_safety_tier="standard",
                ),
                InventorySlot(
                    slot_id="az_app_preroll_prime", slot_name="Video Pre-roll (Prime Video App)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.VIDEO_PREROLL,
                    floor_cpm=200.0, est_daily_impressions=3_000_000,
                    content_context="Prime Video mobile — casual viewing, originals",
                    brand_safety_tier="premium",
                ),
                InventorySlot(
                    slot_id="az_app_midroll_prime", slot_name="Video Mid-roll (Prime Video App)",
                    platform=Platform.MOBILE_APP, ad_format=AdFormat.VIDEO_MIDROLL,
                    floor_cpm=240.0, est_daily_impressions=1_500_000,
                    content_context="Prime Video mobile mid-roll — lean-back viewing",
                    brand_safety_tier="premium",
                ),
            ],
        ),
    ],
    audience=AudienceProfile(
        total_mau=150_000_000,
        gender_split={"male": 0.52, "female": 0.48},
        age_distribution={"18-24": 0.20, "25-34": 0.35, "35-44": 0.25, "45-54": 0.12, "55+": 0.08},
        geo_distribution={"north": 0.30, "south": 0.25, "west": 0.25, "east": 0.12, "central": 0.08},
        tier_distribution={"metro": 0.35, "tier_1": 0.25, "tier_2": 0.22, "tier_3": 0.18},
    ),
    content_signals={
        "primary_genres": ["e-commerce", "shopping", "entertainment"],
        "live_sports": {"available": False},
        "languages": ["english", "hindi", "tamil", "telugu", "kannada", "bengali"],
        "peak_hours": "10:00-14:00, 20:00-23:00 IST",
        "viewer_intent": "high purchase intent, deal hunting, entertainment",
        "commerce_signals": {"prime_members_share": 0.35, "sale_multiplier": 4.0, "avg_session_min": 12},
    },
)

# ═══════════════════════════════════════════════════════════════════════════════

PUBLISHERS: list[PublisherConfig] = [JIOHOTSTAR, CRICINFO, MYNTRA, NDTV, AMAZON_IN]


def get_publisher(publisher_id: str) -> PublisherConfig:
    for pub in PUBLISHERS:
        if pub.publisher_id == publisher_id:
            return pub
    raise ValueError(f"Unknown publisher_id: {publisher_id}. Available: {[p.publisher_id for p in PUBLISHERS]}")


def get_all_publishers() -> list[PublisherConfig]:
    return PUBLISHERS.copy()
