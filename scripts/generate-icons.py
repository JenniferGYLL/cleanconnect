"""
Generates the CleanConnect PWA icon set from a simple vector-style mark
drawn directly with Pillow (no external image dependency).

Mark: a rounded square in the brand teal, with a bold white checkmark
(nods to the DO -> PROVE -> SEE "verified service" idea) and a small
gold dot accent in the corner (the app's existing "concierge" accent).

Run: python3 scripts/generate-icons.py
Outputs into public/icons/.
"""
import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

BRAND_500 = (20, 179, 145, 255)   # #14b391
BRAND_700 = (10, 113, 95, 255)    # #0a715f
GOLD_400 = (217, 171, 86, 255)    # #d9ab56
WHITE = (255, 255, 255, 255)


def rounded_square(size, radius_ratio, bg_top, bg_bottom):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(size * radius_ratio)

    # simple vertical gradient background, drawn row by row, then masked
    grad = Image.new("RGBA", (size, size), WHITE)
    gdraw = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(bg_top[0] + (bg_bottom[0] - bg_top[0]) * t)
        g = int(bg_top[1] + (bg_bottom[1] - bg_top[1]) * t)
        b = int(bg_top[2] + (bg_bottom[2] - bg_top[2]) * t)
        gdraw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)
    return img


def draw_checkmark(img, size, stroke_ratio=0.075, inset_ratio=0.30):
    draw = ImageDraw.Draw(img)
    inset = size * inset_ratio
    stroke = max(int(size * stroke_ratio), 6)

    p1 = (inset, size * 0.52)
    p2 = (size * 0.42, size * 0.70)
    p3 = (size - inset, size * 0.32)

    draw.line([p1, p2], fill=WHITE, width=stroke, joint="curve")
    draw.line([p2, p3], fill=WHITE, width=stroke, joint="curve")
    r = stroke / 2
    for p in (p1, p2, p3):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=WHITE)


def draw_gold_dot(img, size, radius_ratio=0.075):
    draw = ImageDraw.Draw(img)
    r = size * radius_ratio
    cx, cy = size * 0.82, size * 0.20
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD_400)


def make_icon(size, radius_ratio, out_name, maskable=False):
    bg_radius = radius_ratio if not maskable else 0  # maskable: safe-zone handled by padding
    canvas_size = size
    if maskable:
        # draw the mark at ~64% scale, centered, on a full-bleed square bg
        img = rounded_square(canvas_size, 0, BRAND_500, BRAND_700)
        inner = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        mark_size = int(canvas_size * 0.64)
        mark = rounded_square(mark_size, 0.22, BRAND_500, BRAND_700)
        draw_checkmark(mark, mark_size)
        draw_gold_dot(mark, mark_size)
        offset = (canvas_size - mark_size) // 2
        img.alpha_composite(mark, (offset, offset))
    else:
        img = rounded_square(canvas_size, bg_radius, BRAND_500, BRAND_700)
        draw_checkmark(img, canvas_size)
        draw_gold_dot(img, canvas_size)

    img.save(os.path.join(OUT_DIR, out_name))
    print(f"wrote {out_name} ({size}x{size}, maskable={maskable})")


def make_apple_touch_icon(size=180):
    # iOS applies its own rounding; icon must be fully opaque, no transparency
    img = Image.new("RGB", (size, size), BRAND_500[:3])
    img = img.convert("RGBA")
    bg = rounded_square(size, 0, BRAND_500, BRAND_700)
    img.alpha_composite(bg)
    draw_checkmark(img, size)
    draw_gold_dot(img, size)
    img.convert("RGB").save(os.path.join(OUT_DIR, "apple-touch-icon.png"))
    print("wrote apple-touch-icon.png (180x180, opaque)")


def make_favicon():
    sizes = [16, 32, 48]
    imgs = []
    for s in sizes:
        img = rounded_square(s, 0.22, BRAND_500, BRAND_700)
        draw_checkmark(img, s, stroke_ratio=0.11, inset_ratio=0.26)
        imgs.append(img)
    imgs[-1].save(
        os.path.join(OUT_DIR, "..", "favicon.ico"),
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=imgs[:-1],
    )
    print("wrote favicon.ico")


if __name__ == "__main__":
    make_icon(192, 0.22, "icon-192.png")
    make_icon(512, 0.22, "icon-512.png")
    make_icon(512, 0, "icon-maskable-512.png", maskable=True)
    make_apple_touch_icon(180)
    make_favicon()
