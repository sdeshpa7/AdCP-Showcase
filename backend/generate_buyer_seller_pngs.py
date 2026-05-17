import os
from PIL import Image, ImageDraw, ImageFont

def draw_wrapped_text(draw, text, x, y, max_width_pixels, font, fill_color, line_spacing=24):
    words = text.split(' ')
    lines = []
    current_line = []
    for word in words:
        test_line = ' '.join(current_line + [word])
        # check width of test line using draw.textbbox
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

def create_buyer_diagram():
    # Dimensions: 1200 x 950
    width, height = 1200, 950
    img = Image.new('RGB', (width, height), '#FAF9F6')
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 34, index=1) # Bold
        font_tool = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22, index=1) # Bold/Medium
        font_skill_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18, index=1) # Bold
        font_skill = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17, index=0) # Regular
    except Exception:
        font_title = ImageFont.load_default()
        font_tool = ImageFont.load_default()
        font_skill_bold = ImageFont.load_default()
        font_skill = ImageFont.load_default()

    # --- Draw Main Header ---
    draw.rounded_rectangle([40, 40, 1160, 120], radius=15, fill="#E8F0FE", outline="#1A73E8", width=3)
    draw.text((80, 60), "🏢 BUYER AGENT (DSP) ORCHESTRATION STACK", fill="#0D47A1", font=font_title)
    
    # --- Draw Tool 1 ---
    # get_products
    draw.rounded_rectangle([60, 150, 1140, 290], radius=10, fill="#FFFFFF", outline="#1A73E8", width=2)
    draw.rounded_rectangle([75, 170, 350, 215], radius=6, fill="#E8F0FE", outline="#1A73E8", width=1)
    draw.text((90, 180), "Tool: get_products()", fill="#0D47A1", font=font_tool)
    
    draw.text((380, 170), "• Skill: Brief Ingestion & Catalog Discovery", fill="#333333", font=font_skill_bold)
    desc1 = "Ingests the brand strategy campaign brief, registers publisher SSP end-points, and queries target seller services to fetch raw, available inventories."
    draw_wrapped_text(draw, desc1, 400, 200, 700, font_skill, "#5F6368", line_spacing=24)

    # --- Draw Tool 2 ---
    # create_media_buy
    draw.rounded_rectangle([60, 310, 1140, 750], radius=10, fill="#FFFFFF", outline="#1A73E8", width=2)
    draw.rounded_rectangle([75, 330, 350, 375], radius=6, fill="#E8F0FE", outline="#1A73E8", width=1)
    draw.text((90, 340), "Tool: create_media_buy()", fill="#0D47A1", font=font_tool)
    
    # Skill 1: Gemma
    draw.text((380, 330), "• Skill: LLM Relevance Scoring (via evaluate_products() using gemma-3-27b-it)", fill="#0D47A1", font=font_skill_bold)
    desc2_1 = "Invokes the gemma-3-27b-it reasoning model to audit publisher channel metadata, category contexts, and safety descriptions to output context relevance scores (0-10 scale)."
    draw_wrapped_text(draw, desc2_1, 400, 355, 700, font_skill, "#5F6368", line_spacing=23)
    
    # Skill 2: Negotiation
    draw.text((380, 435), "• Skill: Relevance-Price Bid Negotiation", fill="#333333", font=font_skill_bold)
    desc2_2 = "Programmatically calculates dynamic bids and custom campaign placements by matching the LLM scores against active pacing limits and pricing tiers."
    draw_wrapped_text(draw, desc2_2, 400, 460, 700, font_skill, "#5F6368", line_spacing=23)
    
    # Skill 3: Pacing / Safety
    draw.text((380, 540), "• Skill: Pacing & Safety Controls (BudgetManager)", fill="#333333", font=font_skill_bold)
    desc2_3 = "Enforces strict financial boundaries, computes daily pacing targets, and executes safeguard controls including a maximum 50% single-publisher budget cap."
    draw_wrapped_text(draw, desc2_3, 400, 565, 700, font_skill, "#5F6368", line_spacing=23)

    # Skill 4: Contract execution
    draw.text((380, 645), "• Skill: Contract Signing & Execution", fill="#333333", font=font_skill_bold)
    desc2_4 = "Finalizes bid parameters, validates dynamic package schedules, and programmatically signs and submits the secure media buy contract transaction."
    draw_wrapped_text(draw, desc2_4, 400, 670, 700, font_skill, "#5F6368", line_spacing=23)

    # --- Draw Tool 3 ---
    # get_media_buy_delivery
    draw.rounded_rectangle([60, 770, 1140, 910], radius=10, fill="#FFFFFF", outline="#1A73E8", width=2)
    draw.rounded_rectangle([75, 790, 420, 835], radius=6, fill="#E8F0FE", outline="#1A73E8", width=1)
    draw.text((90, 800), "Tool: get_media_buy_delivery()", fill="#0D47A1", font=font_tool)
    
    draw.text((450, 790), "• Skill: Pacing & Performance Auditing", fill="#333333", font=font_skill_bold)
    desc3 = "Aggregates click-through CTR performance, registers impressions pacing ratios, and compiles optimization data feeds to verify active spending efficiencies."
    draw_wrapped_text(draw, desc3, 470, 820, 630, font_skill, "#5F6368", line_spacing=24)

    img.save('/Users/sourabh/Documents/Publishing/AdCP/docs/buyer_agent_presentation_schematic.png', 'PNG')
    print("Saved Buyer diagram with perfect text wrapping.")

def create_seller_diagram():
    # Dimensions: 1200 x 950
    width, height = 1200, 950
    img = Image.new('RGB', (width, height), '#FAF9F6')
    draw = ImageDraw.Draw(img)
    
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 34, index=1) # Bold
        font_tool = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22, index=1) # Bold/Medium
        font_skill_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18, index=1) # Bold
        font_skill = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17, index=0) # Regular
    except Exception:
        font_title = ImageFont.load_default()
        font_tool = ImageFont.load_default()
        font_skill_bold = ImageFont.load_default()
        font_skill = ImageFont.load_default()

    # --- Draw Main Header ---
    draw.rounded_rectangle([40, 40, 1160, 120], radius=15, fill="#FEF7E0", outline="#F9AB00", width=3)
    draw.text((80, 60), "📰 SELLER AGENT (SSP) ORCHESTRATION STACK", fill="#E37400", font=font_title)
    
    # --- Draw Tool 1 ---
    # _brand_safety_check
    draw.rounded_rectangle([60, 150, 1140, 290], radius=10, fill="#FFFFFF", outline="#F9AB00", width=2)
    draw.rounded_rectangle([75, 170, 360, 215], radius=6, fill="#FEF7E0", outline="#F9AB00", width=1)
    draw.text((90, 180), "Tool: _brand_safety_check()", fill="#E37400", font=font_tool)
    
    draw.text((390, 170), "• Skill: Brand Safety Check & Domain Risk Auditing (using Grok-3 LLM)", fill="#E37400", font=font_skill_bold)
    desc1 = "Coordinates publisher protection audits by prompting Grok-3 mini to evaluate advertiser reputation domain, brand category, and zero-shot risk exclusions."
    draw_wrapped_text(draw, desc1, 410, 200, 690, font_skill, "#5F6368", line_spacing=24)

    # --- Draw Tool 2 ---
    # create_media_buy
    draw.rounded_rectangle([60, 310, 1140, 540], radius=10, fill="#FFFFFF", outline="#F9AB00", width=2)
    draw.rounded_rectangle([75, 330, 360, 375], radius=6, fill="#FEF7E0", outline="#F9AB00", width=1)
    draw.text((90, 340), "Tool: create_media_buy()", fill="#E37400", font=font_tool)
    
    # Skill 1: CPM Floor check
    draw.text((390, 330), "• Skill: Dynamic Floor CPM Validation", fill="#333333", font=font_skill_bold)
    desc2_1 = "Compares incoming campaign bids against current live CPM dynamic floor valuations to maximize publisher inventory monetization values."
    draw_wrapped_text(draw, desc2_1, 410, 355, 690, font_skill, "#5F6368", line_spacing=24)
    
    # Skill 2: Programmatic Contract Writing
    draw.text((390, 435), "• Skill: Programmatic Contract Ledger Writing", fill="#333333", font=font_skill_bold)
    desc2_2 = "Secures campaign compliance matches and commits verified, signed programmatic ledger entries directly to the stateful publisher SQLite store."
    draw_wrapped_text(draw, desc2_2, 410, 460, 690, font_skill, "#5F6368", line_spacing=24)

    # --- Draw Tool 3 ---
    # get_media_buy_delivery
    draw.rounded_rectangle([60, 560, 1140, 710], radius=10, fill="#FFFFFF", outline="#F9AB00", width=2)
    draw.rounded_rectangle([75, 580, 420, 625], radius=6, fill="#FEF7E0", outline="#F9AB00", width=1)
    draw.text((90, 590), "Tool: get_media_buy_delivery()", fill="#E37400", font=font_tool)
    
    draw.text((450, 580), "• Skill: Real-Time Pacing Telemetry", fill="#333333", font=font_skill_bold)
    desc3 = "Tracks live delivery scheduling pacing and programmatically generates synthetic impressions and CTR click distribution events."
    draw_wrapped_text(draw, desc3, 470, 610, 630, font_skill, "#5F6368", line_spacing=24)

    # --- Draw Tool 4 ---
    # _handle_get_dashboard
    draw.rounded_rectangle([60, 730, 1140, 880], radius=10, fill="#FFFFFF", outline="#F9AB00", width=2)
    draw.rounded_rectangle([75, 750, 420, 795], radius=6, fill="#FEF7E0", outline="#F9AB00", width=1)
    draw.text((90, 760), "Tool: _handle_get_dashboard()", fill="#E37400", font=font_tool)
    
    draw.text((450, 750), "• Skill: Dashboard Yield Metrics Aggregator", fill="#333333", font=font_skill_bold)
    desc4 = "Aggregates revenue yields, dynamic eCPM averages, and rankings of high-spending programmatic buyers for active publisher display cockpits."
    draw_wrapped_text(draw, desc4, 470, 780, 630, font_skill, "#5F6368", line_spacing=24)

    img.save('/Users/sourabh/Documents/Publishing/AdCP/docs/seller_agent_presentation_schematic.png', 'PNG')
    print("Saved Seller diagram with perfect text wrapping.")

if __name__ == '__main__':
    create_buyer_diagram()
    create_seller_diagram()
