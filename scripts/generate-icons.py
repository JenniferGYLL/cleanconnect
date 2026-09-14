"""
Generates the DOT app icon set — the "Orbital Dot" mark (see
components/brand/DotMark.tsx for the canonical SVG version) rendered onto a
near-black rounded-square tile, matching the mark's own 0-32 coordinate
space so this stays a faithful raster copy of the real logo rather than a
separate reinterpretation.

Run: python3 scripts/generate-icons.py
Outputs into public/icons/ and public/favicon.ico.
"""
import os
from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

INK_950 = (11, 12, 13, 255)     # #0b0c0d
INK_900 = (23, 25, 27, 255)     # #17191b
ACCENT = (192, 122, 51, 255)    # #c07a33 — the DOT signal
FOAM = (245, 244, 240, 255)     # #f5f4f0

# Mark geometry, straight from DotMark.tsx's 0-32 viewBox.
PRIMARY = (13, 13, 4.2)      # x, y, r — accent, solid
SECONDARY = (24, 9.5, 2)     # foam, solid
TERTIARY = (20.5, 23, 1.8)   # foam, ring only


def rounded_square_bg(size, radius_ratio):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGBA", (size, size), INK_900)
    gdraw = ImageDraw.Draw(grad)
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(INK_950[0] + (INK_900[0] - INK_950[0]) * t)
        g = int(INK_950[1] + (INK_900[1] - INK_950[1]) * t)
        b = int(INK_950[2] + (INK_900[2] - INK_950[2]) * t)
        gdraw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    img.paste(grad, (0, 0), mask)
    return img


def draw_mark(img, size, scale_ratio=1.0, offset=(0, 0)):
    """Draws the Orbital Dot mark scaled into `size`, with an extra
    scale_ratio/offset so it can be shrunk + centered for maskable icons."""
    draw = ImageDraw.Draw(img)
    s = (size / 32) * scale_ratio
    ox, oy = offset

    def pt(x, y):
        return (ox + x * s, oy + y * s)

    p1 = pt(*PRIMARY[:2])
    p2 = pt(*SECONDARY[:2])
    p3 = pt(*TERTIARY[:2])

    # faint "surface" triangle
    tri_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    tri_draw = ImageDraw.Draw(tri_layer)
    tri_draw.polygon([p1, p2, p3], fill=(ACCENT[0], ACCENT[1], ACCENT[2], 40))
    img.alpha_composite(tri_layer)
    draw = ImageDraw.Draw(img)

    line_w = max(int(s * 1), 1)
    line_color = (FOAM[0], FOAM[1], FOAM[2], 150)
    draw.line([p1, p2], fill=line_color, width=line_w)
    draw.line([p1, p3], fill=line_color, width=line_w)

    # PIL's ellipse outline is drawn inward from the bounding box (unlike
    # SVG's centered stroke), so expand the bbox by half the stroke width
    # to keep the same visual ring thickness as the source SVG mark.
    ring_stroke = max(s * 1.3, 1)
    r2 = TERTIARY[2] * s + ring_stroke / 2
    draw.ellipse(
        [p3[0] - r2, p3[1] - r2, p3[0] + r2, p3[1] + r2],
        outline=FOAM,
        width=max(int(ring_stroke), 1),
    )

    r1 = SECONDARY[2] * s
    draw.ellipse([p2[0] - r1, p2[1] - r1, p2[0] + r1, p2[1] + r1], fill=FOAM)

    r0 = PRIMARY[2] * s
    draw.ellipse([p1[0] - r0, p1[1] - r0, p1[0] + r0, p1[1] + r0], fill=ACCENT)


def make_icon(size, radius_ratio, out_name, maskable=False):
    img = rounded_square_bg(size, radius_ratio if not maskable else 0)
    if maskable:
        # keep the mark inside the ~80% safe zone
        draw_mark(img, size, scale_ratio=0.62, offset=(size * 0.19, size * 0.19))
    else:
        draw_mark(img, size)
    img.save(os.path.join(OUT_DIR, out_name))
    print(f"wrote {out_name} ({size}x{size}, maskable={maskable})")


def make_apple_touch_icon(size=180):
    img = rounded_square_bg(size, 0)  # iOS applies its own rounding
    draw_mark(img, size)
    img.convert("RGB").save(os.path.join(OUT_DIR, "apple-touch-icon.png"))
    print("wrote apple-touch-icon.png (180x180, opaque)")


def make_favicon():
    sizes = [16, 32, 48]
    imgs = []
    for s in sizes:
        img = rounded_square_bg(s, 0.22)
        draw_mark(img, s)
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
