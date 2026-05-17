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

def generate_efficiency_diagram():
    # Premium Light Layout: 1200 x 950
    width, height = 1200, 950
    img = Image.new('RGB', (width, height), '#FAF9F6')
    draw = ImageDraw.Draw(img)
    
    try:
        # Load fonts safely
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32, index=1)      # Bold
        font_subtitle = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 19, index=0)   # Regular
        font_col_header = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22, index=1) # Bold
        font_section = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18, index=1)    # Bold
        font_body_bold = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16, index=1)  # Bold
        font_body = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16, index=0)       # Regular
        font_stat = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 44, index=1)       # Heavy Bold
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_col_header = ImageFont.load_default()
        font_section = ImageFont.load_default()
        font_body_bold = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_stat = ImageFont.load_default()

    # --- Main Header Panel ---
    draw.rounded_rectangle([40, 40, 1160, 145], radius=15, fill="#E8F0FE", outline="#1A73E8", width=3)
    draw.text((70, 55), "💡 AdCP CONTEXT ENGINEERING & TOKEN EFFICIENCY", fill="#0D47A1", font=font_title)
    draw.text((70, 100), "Surgical Multi-Agent Context Structures vs. Monolithic LLM Processing", fill="#3C4043", font=font_subtitle)

    # ================= LEFT COLUMN: MONOLITHIC APPROACH =================
    # Card Border (Red warning styling)
    draw.rounded_rectangle([50, 210, 570, 910], radius=12, fill="#FFFFFF", outline="#F44336", width=2)
    # Header Accent Band
    draw.rounded_rectangle([50, 210, 570, 260], radius=12, fill="#FFEBEE", outline="#F44336", width=2)
    draw.text((80, 222), "❌ MONOLITHIC BIDDING WINDOW", fill="#C62828", font=font_col_header)

    # 1. Size Stat Callout
    draw.text((80, 280), "9,700+ TOKENS", fill="#C62828", font=font_stat)
    draw.text((80, 330), "Average size per evaluation transaction", fill="#757575", font=font_body)

    # 2. Key Drawbacks Details
    draw.text((80, 375), "⚠️ Major Structural Inefficiencies:", fill="#C62828", font=font_section)
    
    draw.text((80, 415), "• Raw Campaign Ingestion:", fill="#202124", font=font_body_bold)
    desc_l1 = "Dumps complete multi-page PDF strategy briefs, historical buyer budgets, and delivery checklists directly into the prompt context."
    draw_wrapped_text(draw, desc_l1, 95, 440, 410, font_body, "#5F6368", line_spacing=22)

    draw.text((80, 520), "• Full Inventory Catalog Ingestion:", fill="#202124", font=font_body_bold)
    desc_l2 = "Sends all available publisher placements (e.g. 84+ slots across ESPN, JioHotstar, NDTV) at once, forcing the LLM to scan irrelevant channels."
    draw_wrapped_text(draw, desc_l2, 95, 545, 410, font_body, "#5F6368", line_spacing=22)

    draw.text((80, 625), "• Conversational Fluff & Output Bloat:", fill="#202124", font=font_body_bold)
    desc_l3 = "No output constraints. The model responds with lengthy explanations and free-form paragraphs, adding ~1,800 tokens of redundant output."
    draw_wrapped_text(draw, desc_l3, 95, 650, 410, font_body, "#5F6368", line_spacing=22)

    draw.text((80, 730), "• DB Transaction Log Dumping:", fill="#202124", font=font_body_bold)
    desc_l4 = "Dumps raw historical SQL rows instead of aggregated pacing indices, consuming ~300 tokens per transaction history event."
    draw_wrapped_text(draw, desc_l4, 95, 755, 410, font_body, "#5F6368", line_spacing=22)

    draw.rounded_rectangle([70, 820, 550, 890], radius=8, fill="#FFEBEE", outline="#EF9A9A", width=1)
    draw.text((90, 835), "RESULT: Extreme API Cost, High Latency, & Drift", fill="#C62828", font=font_body_bold)


    # ================= RIGHT COLUMN: AdCP CONTEXT ENGINEERING =================
    # Card Border (Green check styling)
    draw.rounded_rectangle([630, 210, 1150, 910], radius=12, fill="#FFFFFF", outline="#4CAF50", width=2)
    # Header Accent Band
    draw.rounded_rectangle([630, 210, 1150, 260], radius=12, fill="#E8F5E9", outline="#4CAF50", width=2)
    draw.text((660, 222), "✔️ AdCP CONTEXT ARCHITECTURE", fill="#2E7D32", font=font_col_header)

    # 1. Size Stat Callout
    draw.text((660, 280), "1,400 TOKENS (85% SAVED)", fill="#2E7D32", font=font_stat)
    draw.text((660, 330), "Average size per evaluation transaction", fill="#757575", font=font_body)

    # 2. Key Optimizations Details
    draw.text((660, 375), "⚡ Surgical Decoupling Features:", fill="#2E7D32", font=font_section)

    draw.text((660, 415), "• Client-Side Pruning Filters:", fill="#202124", font=font_body_bold)
    desc_r1 = "Python filter layer drops irrelevant publisher slots (category mismatches, safety filters) BEFORE the LLM call, saving ~190 tokens per slot."
    draw_wrapped_text(draw, desc_r1, 675, 440, 410, font_body, "#5F6368", line_spacing=22)

    draw.text((660, 520), "• Structured JSON Schemas (Pydantic):", fill="#202124", font=font_body_bold)
    desc_r2 = "Constrains LLM output format to raw data parameters. Zero conversational padding, saving ~1,800 tokens of free-form generation."
    draw_wrapped_text(draw, desc_r2, 675, 545, 410, font_body, "#5F6368", line_spacing=22)

    draw.text((660, 625), "• BudgetManager Summary Indexes:", fill="#202124", font=font_body_bold)
    desc_r3 = "Feeds a concise pacing dictionary (6 key fields) rather than massive historical database logs, saving ~300 tokens per campaign transaction."
    draw_wrapped_text(draw, desc_r3, 675, 650, 410, font_body, "#5F6368", line_spacing=22)

    draw.text((660, 730), "• Micro-Brief Context Engineering:", fill="#202124", font=font_body_bold)
    desc_r4 = "Pushes dynamic target parameters only (budget, audience, channels) instead of full strategy documents, saving over 4.5k brief tokens."
    draw_wrapped_text(draw, desc_r4, 675, 755, 410, font_body, "#5F6368", line_spacing=22)

    draw.rounded_rectangle([650, 820, 1130, 890], radius=8, fill="#E8F5E9", outline="#A5D6A7", width=1)
    draw.text((670, 835), "RESULT: 85%+ Context Reduction, Max Precision", fill="#2E7D32", font=font_body_bold)

    # Save to docs folder
    output_path = '/Users/sourabh/Documents/Publishing/AdCP/docs/adcp_context_engineering_token_efficiency.png'
    img.save(output_path, 'PNG')
    print(f"Context engineering efficiency diagram saved successfully to {output_path}")

if __name__ == '__main__':
    generate_efficiency_diagram()
