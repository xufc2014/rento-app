"""Generate tab bar icon PNGs for the rento-app."""
from PIL import Image, ImageDraw
import os

ICON_SIZE = 81
OUTPUT_DIR = r"I:\Rento\rento-app\static\tab"

# Icon definitions: name -> (inactive_color, active_color, shape_type)
icons = {
    "home":          ("#7A7E83", "#007AFF", "house"),
    "room":          ("#7A7E83", "#007AFF", "grid"),
    "bill":          ("#7A7E83", "#007AFF", "dollar"),
    "settings":      ("#7A7E83", "#007AFF", "gear"),
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def draw_house(draw, color, cx, cy, s):
    # Roof triangle
    draw.polygon([(cx-s, cy-s*0.1), (cx, cy-s*0.7), (cx+s, cy-s*0.1)], fill=color)
    # Body rectangle
    draw.rectangle([cx-s*0.8, cy-s*0.1, cx+s*0.8, cy+s*0.6], fill=color)
    # Door
    draw.rectangle([cx-s*0.2, cy+s*0.1, cx+s*0.2, cy+s*0.6], fill=hex_to_rgb("#FFFFFF"))

def draw_grid(draw, color, cx, cy, s):
    # 2x2 grid of rooms
    gap = 4
    half = s * 0.35
    for row in [-1, 1]:
        for col in [-1, 1]:
            x1 = cx + col * (half + gap) - half
            y1 = cy + row * (half + gap) - half
            x2 = cx + col * (half + gap) + half
            y2 = cy + row * (half + gap) + half
            draw.rectangle([x1, y1, x2, y2], fill=color)

def draw_dollar(draw, color, cx, cy, s):
    # Circle with ¥ sign
    draw.ellipse([cx-s*0.6, cy-s*0.6, cx+s*0.6, cy+s*0.6], fill=color)
    # ¥ character using lines
    rgb_white = hex_to_rgb("#FFFFFF")
    lw = 3
    # Two horizontal lines
    draw.line([(cx-s*0.3, cy-s*0.05), (cx+s*0.3, cy-s*0.05)], fill=rgb_white, width=lw)
    draw.line([(cx-s*0.3, cy+s*0.2), (cx+s*0.3, cy+s*0.2)], fill=rgb_white, width=lw)
    # V shape (top part of ¥)
    draw.line([(cx, cy-s*0.5), (cx-s*0.3, cy-s*0.05)], fill=rgb_white, width=lw)
    draw.line([(cx, cy-s*0.5), (cx+s*0.3, cy-s*0.05)], fill=rgb_white, width=lw)
    # Vertical line
    draw.line([(cx, cy-s*0.5), (cx, cy+s*0.5)], fill=rgb_white, width=lw)

def draw_gear(draw, color, cx, cy, s):
    # Simplified gear: circle with teeth
    r_outer = s * 0.65
    r_inner = s * 0.35
    r_hole = s * 0.15
    teeth = 8
    import math
    for i in range(teeth):
        angle = 2 * math.pi * i / teeth
        a1 = angle - 0.2
        a2 = angle + 0.2
        # Tooth polygon
        pts = [
            (cx + r_inner * math.cos(a1), cy + r_inner * math.sin(a1)),
            (cx + r_outer * math.cos(angle - 0.12), cy + r_outer * math.sin(angle - 0.12)),
            (cx + r_outer * math.cos(angle + 0.12), cy + r_outer * math.sin(angle + 0.12)),
            (cx + r_inner * math.cos(a2), cy + r_inner * math.sin(a2)),
        ]
        draw.polygon(pts, fill=color)
    # Inner circle
    draw.ellipse([cx-r_inner, cy-r_inner, cx+r_inner, cy+r_inner], fill=color)
    # Center hole
    draw.ellipse([cx-r_hole, cy-r_hole, cx+r_hole, cy+r_hole], fill=hex_to_rgb("#FFFFFF"))

shape_drawers = {
    "house": draw_house,
    "grid": draw_grid,
    "dollar": draw_dollar,
    "gear": draw_gear,
}

os.makedirs(OUTPUT_DIR, exist_ok=True)

for name, (inactive_hex, active_hex, shape) in icons.items():
    for state, color_hex in [("inactive", inactive_hex), ("active", active_hex)]:
        suffix = "" if state == "inactive" else "-active"
        img = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        rgb = hex_to_rgb(color_hex)
        cx, cy = ICON_SIZE // 2, ICON_SIZE // 2
        s = ICON_SIZE // 2 - 8
        shape_drawers[shape](draw, rgb, cx, cy, s)
        filename = f"{name}{suffix}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        img.save(filepath, "PNG")
        print(f"Created: {filepath}")

print("All icons generated!")
