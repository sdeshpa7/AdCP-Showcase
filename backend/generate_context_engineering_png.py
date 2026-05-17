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
    # Premium Light Layout: 1200 x 1080 (extra height to support beautiful status pills and dynamic content)
    width, height = 1200, 1080
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
        font_pill = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 13, index=1)       # Bold for Pill Badges
    except Exception:
        font_title = ImageFont.load_default()
        font_subtitle = ImageFont.load_default()
        font_col_header = ImageFont.load_default()
        font_section = ImageFont.load_default()
        font_body_bold = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_stat = ImageFont.load_default()
        font_pill = ImageFont.load_default()

    # --- Main Header Panel ---
    draw.rounded_rectangle([40, 40, 1160, 145], radius=15, fill="#E8F0FE", outline="#1A73E8", width=3)
    draw.text((70, 55), "💡 AdCP CONTEXT ENGINEERING & TOKEN EFFICIENCY", fill="#0D47A1", font=font_title)
    draw.text((70, 100), "Surgical Multi-Agent Context Structures vs. Monolithic LLM Processing", fill="#3C4043", font=font_subtitle)

    # Bullet point definitions
    left_bullets = [
        ("• Raw Campaign Ingestion:", "Dumps complete multi-page PDF strategy briefs, historical buyer budgets, and delivery checklists directly into the prompt context."),
        ("• Full Inventory Catalog Ingestion:", "Sends all available publisher placements (e.g. 84+ slots across ESPN, JioHotstar, NDTV) at once, forcing the LLM to scan irrelevant channels."),
        ("• Conversational Fluff & Output Bloat:", "No output constraints. The model responds with lengthy explanations and free-form paragraphs, adding ~1,800 tokens of redundant output."),
        ("• DB Transaction Log Dumping:", "Dumps raw historical SQL rows instead of aggregated pacing indices, consuming ~300 tokens per transaction history event.")
    ]

    right_bullets = [
        ("• Client-Side Pruning Filters:", "Python filter layer drops irrelevant publisher slots (category mismatches, safety filters) BEFORE the LLM call, saving ~190 tokens per slot."),
        ("• Structured JSON Schemas (Pydantic):", "Constrains LLM output format to raw data parameters. Zero conversational padding, saving ~1,800 tokens of free-form generation."),
        ("• BudgetManager Summary Indexes:", "Feeds a concise pacing dictionary (6 key fields) rather than massive historical database logs, saving ~300 tokens per campaign transaction."),
        ("• Micro-Brief Context Engineering:", "Pushes dynamic target parameters only (budget, audience, channels) instead of full strategy documents, saving over 4.5k brief tokens.")
    ]

    # --- Render Column Content Dynamically to Guarantee Perfect Fitting ---
    
    # Left Column Content (Starting lower at 440 to accommodate status pill)
    col_x_left = 80
    col_width = 410
    current_y_left = 445
    
    draw.text((col_x_left, current_y_left), "⚠️ Major Structural Inefficiencies:", fill="#C62828", font=font_section)
    current_y_left += 35
    
    for title, desc in left_bullets:
        draw.text((col_x_left, current_y_left), title, fill="#202124", font=font_body_bold)
        current_y_left += 24
        current_y_left = draw_wrapped_text(draw, desc, col_x_left + 15, current_y_left, col_width - 15, font_body, "#5F6368", line_spacing=22)
        current_y_left += 16
        
    # Right Column Content (Starting lower at 440 to accommodate status pill)
    col_x_right = 660
    current_y_right = 445
    
    draw.text((col_x_right, current_y_right), "⚡ Surgical Decoupling Features:", fill="#2E7D32", font=font_section)
    current_y_right += 35
    
    for title, desc in right_bullets:
        draw.text((col_x_right, current_y_right), title, fill="#202124", font=font_body_bold)
        current_y_right += 24
        current_y_right = draw_wrapped_text(draw, desc, col_x_right + 15, current_y_right, col_width - 15, font_body, "#5F6368", line_spacing=22)
        current_y_right += 16

    # Determine maximum y-coordinate reached by bullet lists
    max_bullets_y = max(current_y_left, current_y_right)
    
    # --- Draw Results Callout Boxes dynamically below the bullet lists ---
    result_box_y = max_bullets_y + 15
    result_box_height = 65
    
    # Draw Left Column Result Box
    draw.rounded_rectangle([70, result_box_y, 550, result_box_y + result_box_height], radius=8, fill="#FFEBEE", outline="#EF9A9A", width=1)
    draw.text((90, result_box_y + 20), "RESULT: Extreme API Cost, High Latency, & Drift", fill="#C62828", font=font_body_bold)
    
    # Draw Right Column Result Box
    draw.rounded_rectangle([650, result_box_y, 1130, result_box_y + result_box_height], radius=8, fill="#E8F5E9", outline="#A5D6A7", width=1)
    draw.text((670, result_box_y + 20), "RESULT: 85%+ Context Reduction, Max Precision", fill="#2E7D32", font=font_body_bold)
    
    # Determine the dynamic Card Bottom Boundary
    card_bottom = result_box_y + result_box_height + 25

    # --- Draw Background Card Borders & Headers ---
    
    # --- Left Card Layout ---
    draw.rounded_rectangle([50, 210, 570, card_bottom], radius=12, fill=None, outline="#F44336", width=2)
    # Draw Header Accent Band
    draw.rounded_rectangle([50, 210, 570, 260], radius=12, fill="#FFEBEE", outline="#F44336", width=2)
    draw.text((80, 222), "❌ MONOLITHIC BIDDING WINDOW", fill="#C62828", font=font_col_header)
    # Stat Header
    draw.text((80, 275), "9,700+ TOKENS", fill="#C62828", font=font_stat)
    # Red status pill badge
    draw.rounded_rectangle([80, 335, 265, 365], radius=15, fill="#C62828")
    draw.text((105, 341), "UNOPTIMIZED BLOAT", fill="#FFFFFF", font=font_pill)
    # Subtitle
    draw.text((80, 385), "Average size per evaluation transaction", fill="#757575", font=font_body)

    # --- Right Card Layout (Surgical fitting with 85% Saved as Status Pill) ---
    draw.rounded_rectangle([630, 210, 1150, card_bottom], radius=12, fill=None, outline="#4CAF50", width=2)
    # Draw Header Accent Band
    draw.rounded_rectangle([630, 210, 1150, 260], radius=12, fill="#E8F5E9", outline="#4CAF50", width=2)
    draw.text((660, 222), "✔️ AdCP CONTEXT ARCHITECTURE", fill="#2E7D32", font=font_col_header)
    # Stat Header (No overflow: split cleanly into text and status pill below)
    draw.text((660, 275), "1,400 TOKENS", fill="#2E7D32", font=font_stat)
    # Gorgeous glowing green status pill badge for the 85% Saved metric
    draw.rounded_rectangle([660, 335, 845, 365], radius=15, fill="#2E7D32")
    draw.text((685, 341), "85% TOKENS SAVED", fill="#FFFFFF", font=font_pill)
    # Subtitle
    draw.text((660, 385), "Average size per evaluation transaction", fill="#757575", font=font_body)

    # Save to docs folder
    output_path = '/Users/sourabh/Documents/Publishing/AdCP/docs/adcp_context_engineering_token_efficiency.png'
    img.save(output_path, 'PNG')
    print(f"Context engineering efficiency diagram saved successfully to {output_path}")

if __name__ == '__main__':
    generate_efficiency_diagram()
