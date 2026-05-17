import os
from PIL import Image, ImageDraw, ImageFont

def draw_wrapped_text(draw, text, x, y, max_width_pixels, font, fill_color, line_spacing=24):
    words = text.split(' ')
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        width = bbox[2] - bbox[0]
        if width <= max_width_pixels:
            current_line.append(word)
        else:
            lines.append(' '.join(current_line))
            current_line = [word]
    if current_line:
        lines.append(' '.join(current_line))
    
    current_y = y
    for line in lines:
        draw.text((x, current_y), line, fill=fill_color, font=font)
        current_y += line_spacing
    return current_y

def generate_workflow_diagram():
    # Premium Light Tech Theme: 1200 x 1200 (extra height to guarantee no overflows)
    width, height = 1200, 1180
    img = Image.new('RGB', (width, height), '#FAF9F6')
    draw = ImageDraw.Draw(img)
    
    try:
        # Load system fonts safely
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 34, index=1)      # Bold
        font_subtitle = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 19, index=0)   # Regular
        font_badge = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22, index=1)      # Bold
        font_stage = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22, index=1)      # Bold
        font_body_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17, index=1)  # Bold
        font_body = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16, index=0)       # Regular
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_stage = ImageFont.load_default()
        font_body_bold = ImageFont.load_default()
        font_body = ImageFont.load_default()

    # --- Draw Main Header Panel (White / Light Blue Accent) ---
    draw.rounded_rectangle([40, 40, 1160, 145], radius=15, fill="#E8F0FE", outline="#1A73E8", width=3)
    draw.text((70, 55), "⚡ AdCP PROTOCOL: AGENTIC WORKFLOW & LIFECYCLE STAGES", fill="#0D47A1", font=font_title)
    draw.text((70, 100), "Decentralized Real-Time Bidding & Context Auditing via Autonomous Multi-Agent Orchestration", fill="#3C4043", font=font_subtitle)
    
    stages = [
        {
            "num": "1",
            "title": "STAGE 1: BRIEF INGESTION & INVENTORY DISCOVERY",
            "actor": "Buyer DSP ➔ get_products() ➔ Seller SSP",
            "desc": "Buyer ingests the advertiser campaign brief and queries the seller registry. The publisher SSP compiles and returns active slot inventories containing content categories, ad formats, and devices.",
            "color": "#1A73E8", # Royal Blue
            "fill": "#F1F3F4",
        },
        {
            "num": "2",
            "title": "STAGE 2: CONTEXT AUDITING & SAFETY EVALUATION",
            "actor": "Buyer DSP (Gemma-3-27b) & Seller SSP (Grok-3)",
            "desc": "Gemma-3-27b scores category fit and semantic context (0-10 scale). Meanwhile, Grok-3 runs a zero-shot domain reputation and competitor separation check on the seller side to verify brand safety compliance.",
            "color": "#9C27B0", # Purple
            "fill": "#F8F9FA",
        },
        {
            "num": "3",
            "title": "STAGE 3: DYNAMIC RELEVANCE-BASED PRICING",
            "actor": "Autonomous DSP Bidder & SSP Floor Engine",
            "desc": "Buyer calculates optimal bid valuation dynamically based on the semantic match score. Seller matches the incoming bid price against real-time publisher CPM floors to secure optimal yield placement.",
            "color": "#F29900", # Amber
            "fill": "#F8F9FA",
        },
        {
            "num": "4",
            "title": "STAGE 4: PROGRAMMATIC TRANSACTION SIGNING",
            "actor": "Programmatic Agreement ➔ create_media_buy()",
            "desc": "Buyer DSP and Seller SSP programmatically sign the media buy agreement contract. The placement is committed directly to the shared, stateful SQLite transaction ledger (adcp.db) with unique contract IDs.",
            "color": "#137333", # Green
            "fill": "#F8F9FA",
        },
        {
            "num": "5",
            "title": "STAGE 5: TELEMETRY, PACING & PERFORMANCE AUDIT",
            "actor": "Real-Time Telemetry Loop ➔ get_media_buy_delivery()",
            "desc": "The active campaign is launched. Seller generates real-time telemetry events (impressions, clicks, CTR distributions) while the Buyer tracks daily pacing limits to enforce strict dynamic guardrails.",
            "color": "#E8710A", # Orange
            "fill": "#F8F9FA",
        }
    ]

    card_y = 175
    card_height = 165 # Increased height to ensure text fits comfortably with generous breathing space
    spacing = 28

    for i, stg in enumerate(stages):
        # Draw Card Container (White fill with subtle soft gray border)
        draw.rounded_rectangle([40, card_y, 1160, card_y + card_height], radius=12, fill="#FFFFFF", outline="#DADCE0", width=2)
        
        # Draw Left Edge Accent Strip (Colored matching the stage theme)
        draw.rounded_rectangle([40, card_y, 52, card_y + card_height], radius=0, fill=stg["color"])
        
        # Draw Numbered Badge
        draw.rounded_rectangle([75, card_y + 20, 115, card_y + 60], radius=8, fill="#F1F3F4", outline=stg["color"], width=2)
        # Center number in badge
        draw.text((88, card_y + 27), stg["num"], fill=stg["color"], font=font_badge)
        
        # Draw Stage Header & Actors
        draw.text((140, card_y + 18), stg["title"], fill="#202124", font=font_stage)
        draw.text((140, card_y + 48), stg["actor"], fill=stg["color"], font=font_body_bold)
        
        # Draw Description Text (Wrapped inside container borders)
        draw_wrapped_text(draw, stg["desc"], 140, card_y + 78, 970, font_body, "#5F6368", line_spacing=24)
        
        # Draw Sequence Connecting Arrow (if not last stage)
        if i < len(stages) - 1:
            arrow_y = card_y + card_height + 4
            # Draw a premium, clean connecting dotted-line visual
            draw.line([(78, arrow_y), (78, arrow_y + 18)], fill="#BDC1C6", width=3)
            
        card_y += card_height + spacing

    # Save to docs folder target output
    output_path = '/Users/sourabh/Documents/Publishing/AdCP/docs/adcp_workflow_lifecycle_stages.png'
    img.save(output_path, 'PNG')
    print(f"Pristine white-theme workflow diagram successfully saved to {output_path}")

if __name__ == '__main__':
    generate_workflow_diagram()
