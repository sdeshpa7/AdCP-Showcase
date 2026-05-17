import os
from PIL import Image, ImageDraw, ImageFont

def draw_wrapped_text(draw, text, x, y, max_width_pixels, font, fill_color, line_spacing=22):
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
    # Premium Dark Tech Theme: 1200 x 1000
    width, height = 1200, 1050
    img = Image.new('RGB', (width, height), '#0B0F19')
    draw = ImageDraw.Draw(img)
    
    try:
        # Load system fonts safely
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36, index=1)      # Bold
        font_subtitle = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20, index=0)   # Regular
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

    # --- Draw Main Header Panel ---
    draw.rounded_rectangle([40, 40, 1160, 140], radius=15, fill="#131C31", outline="#00E5FF", width=2)
    draw.text((70, 55), "⚡ AdCP PROTOCOL: AGENTIC WORKFLOW & LIFECYCLE STAGES", fill="#00E5FF", font=font_title)
    draw.text((70, 100), "Decentralized Real-Time Bidding & Context Auditing via Autonomous Multi-Agent Orchestration", fill="#8F9CAE", font=font_subtitle)
    
    stages = [
        {
            "num": "1",
            "title": "STAGE 1: BRIEF INGESTION & INVENTORY DISCOVERY",
            "actor": "Buyer DSP ➔ get_products() ➔ Seller SSP",
            "desc": "Buyer ingests the advertiser campaign brief and queries the seller registry. The publisher SSP compiles and returns active slot inventories containing content categories, ad formats, and devices.",
            "color": "#00E5FF"
        },
        {
            "num": "2",
            "title": "STAGE 2: CONTEXT AUDITING & SAFETY EVALUATION",
            "actor": "Buyer DSP (Gemma-3-27b) & Seller SSP (Grok-3)",
            "desc": "Gemma-3-27b scores category fit and semantic context (0-10 scale). Meanwhile, Grok-3 runs a zero-shot domain reputation and competitor separation check on the seller side to verify brand safety compliance.",
            "color": "#8D6E63"
        },
        {
            "num": "3",
            "title": "STAGE 3: DYNAMIC RELEVANCE-BASED PRICING",
            "actor": "Autonomous DSP Bidder & SSP Floor Engine",
            "desc": "Buyer calculates optimal bid valuation dynamically based on the semantic match score. Seller matches the incoming bid price against real-time publisher CPM floors to secure optimal yield placement.",
            "color": "#FFD54F"
        },
        {
            "num": "4",
            "title": "STAGE 4: PROGRAMMATIC TRANSACTION SIGNING",
            "actor": "Programmatic Agreement ➔ create_media_buy()",
            "desc": "Buyer DSP and Seller SSP programmatically sign the media buy agreement contract. The placement is committed directly to the shared, stateful SQLite transaction ledger (adcp.db) with unique contract IDs.",
            "color": "#00E676"
        },
        {
            "num": "5",
            "title": "STAGE 5: TELEMETRY, PACING & PERFORMANCE AUDIT",
            "actor": "Real-Time Telemetry Loop ➔ get_media_buy_delivery()",
            "desc": "The active campaign is launched. Seller generates real-time telemetry events (impressions, clicks, CTR distributions) while the Buyer tracks daily pacing limits to enforce strict dynamic guardrails.",
            "color": "#FF9100"
        }
    ]

    card_y = 170
    card_height = 145
    spacing = 25

    for i, stg in enumerate(stages):
        # Draw Card Container
        draw.rounded_rectangle([40, card_y, 1160, card_y + card_height], radius=12, fill="#111827", outline="#1F2937", width=2)
        
        # Draw Left Edge Accent Strip
        draw.rounded_rectangle([40, card_y, 50, card_y + card_height], radius=0, fill=stg["color"])
        
        # Draw Numbered Badge
        draw.rounded_rectangle([75, card_y + 20, 115, card_y + 60], radius=8, fill="#1F2937", outline=stg["color"], width=2)
        # Center number in badge
        draw.text((88, card_y + 27), stg["num"], fill=stg["color"], font=font_badge)
        
        # Draw Stage Header & Actors
        draw.text((140, card_y + 20), stg["title"], fill="#FFFFFF", font=font_stage)
        draw.text((140, card_y + 50), stg["actor"], fill=stg["color"], font=font_body_bold)
        
        # Draw Description Text
        draw_wrapped_text(draw, stg["desc"], 140, card_y + 78, 970, font_body, "#9CA3AF", line_spacing=22)
        
        # Draw Sequence Connecting Arrow (if not last stage)
        if i < len(stages) - 1:
            arrow_y = card_y + card_height + 5
            # Draw subtle vertical glowing dot connector line
            draw.line([(78, arrow_y), (78, arrow_y + 15)], fill="#374151", width=2)
            draw.line([(82, arrow_y), (82, arrow_y + 15)], fill="#374151", width=2)
            
        card_y += card_height + spacing

    # Save to workspace target output
    output_path = '/Users/sourabh/Documents/Publishing/AdCP/docs/adcp_workflow_lifecycle_stages.png'
    img.save(output_path, 'PNG')
    print(f"Pristine workflow diagram successfully saved to {output_path}")

if __name__ == '__main__':
    generate_workflow_diagram()
