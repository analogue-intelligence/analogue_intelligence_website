#!/usr/bin/env python3
"""
bake_textures.py — bakes the Analogue Intelligence texture set.

Everything the world renders with is a real, seamless PNG produced here, rather
than a canvas texture drawn at runtime. The look is oil-painted: each surface is
built from thousands of wrapped, elongated brush splats over a noise base, so
close up you see strokes rather than procedural gradient banding.

    python3 tools/bake_textures.py            # writes ./assets/textures/*.png

Most colour textures are baked near-neutral on purpose — the world tints them
per material, so one plaster map serves every wall colour in the building.
"""

import os
import math
import numpy as np
from PIL import Image

SIZE = 512
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "assets", "textures")
rng = np.random.default_rng(20260724)


# ----------------------------------------------------------------------------
# noise
# ----------------------------------------------------------------------------
def value_noise(size, freq):
    """Periodic value noise — lattice wraps, so the result tiles."""
    g = rng.random((freq, freq))
    ys = (np.arange(size) / size * freq)
    xs = (np.arange(size) / size * freq)
    y0 = np.floor(ys).astype(int) % freq
    x0 = np.floor(xs).astype(int) % freq
    y1 = (y0 + 1) % freq
    x1 = (x0 + 1) % freq
    fy = (ys - np.floor(ys))[:, None]
    fx = (xs - np.floor(xs))[None, :]
    sy = fy * fy * (3 - 2 * fy)
    sx = fx * fx * (3 - 2 * fx)
    a = g[np.ix_(y0, x0)]
    b = g[np.ix_(y0, x1)]
    c = g[np.ix_(y1, x0)]
    d = g[np.ix_(y1, x1)]
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy


def value_noise_aniso(size, fx, fy):
    """Periodic value noise with independent x/y frequencies — makes long grain."""
    g = rng.random((fy, fx))
    ys = np.arange(size) / size * fy
    xs = np.arange(size) / size * fx
    y0 = np.floor(ys).astype(int) % fy
    x0 = np.floor(xs).astype(int) % fx
    y1 = (y0 + 1) % fy
    x1 = (x0 + 1) % fx
    fyv = (ys - np.floor(ys))[:, None]
    fxv = (xs - np.floor(xs))[None, :]
    sy = fyv * fyv * (3 - 2 * fyv)
    sx = fxv * fxv * (3 - 2 * fxv)
    a, b = g[np.ix_(y0, x0)], g[np.ix_(y0, x1)]
    c, d = g[np.ix_(y1, x0)], g[np.ix_(y1, x1)]
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy


def fbm_aniso(size, fx=3, fy=48, octaves=4, gain=0.55):
    out = np.zeros((size, size))
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        out += amp * value_noise_aniso(size, max(2, int(fx * 2 ** o)), max(2, int(fy * 2 ** o)))
        norm += amp
        amp *= gain
    return out / norm


def fbm(size, base_freq=4, octaves=5, gain=0.5):
    out = np.zeros((size, size))
    amp, freq, norm = 1.0, base_freq, 0.0
    for _ in range(octaves):
        out += amp * value_noise(size, max(2, int(freq)))
        norm += amp
        amp *= gain
        freq *= 2
    return out / norm


def warp(field, wx, wy, amount):
    """Domain-warp a field by two noise fields (wraps)."""
    size = field.shape[0]
    yy, xx = np.mgrid[0:size, 0:size]
    sx = ((xx + wx * amount).round().astype(int)) % size
    sy = ((yy + wy * amount).round().astype(int)) % size
    return field[sy, sx]


def norm01(a):
    lo, hi = a.min(), a.max()
    return (a - lo) / (hi - lo + 1e-9)


# ----------------------------------------------------------------------------
# brush engine
# ----------------------------------------------------------------------------
def splat(canvas, cx, cy, angle, length, width, colour, alpha):
    """Composite one elongated gaussian brush stroke, wrapping at the edges."""
    size = canvas.shape[0]
    r = int(math.ceil(max(length, width) * 1.6)) + 1
    span = np.arange(-r, r + 1)
    vy, vx = np.meshgrid(span, span, indexing="ij")
    ca, sa = math.cos(angle), math.sin(angle)
    u = vx * ca + vy * sa
    v = -vx * sa + vy * ca
    g = np.exp(-((u / max(length, 0.6)) ** 2 + (v / max(width, 0.4)) ** 2))
    g = (g * alpha)[..., None]
    ys = (int(cy) + span) % size
    xs = (int(cx) + span) % size
    patch = canvas[np.ix_(ys, xs)]
    canvas[np.ix_(ys, xs)] = patch * (1 - g) + np.asarray(colour) * g


def paint(base_rgb, n, length, width, angle_fn, colour_fn, alpha=0.5, size=SIZE):
    """Lay down n brush strokes over an RGB float canvas."""
    canvas = np.asarray(base_rgb, dtype=np.float64).copy()
    for i in range(n):
        cx = rng.random() * size
        cy = rng.random() * size
        a = angle_fn(cx / size, cy / size)
        L = length * (0.5 + rng.random())
        W = width * (0.6 + rng.random() * 0.8)
        splat(canvas, cx, cy, a, L, W, colour_fn(cx / size, cy / size), alpha)
    return canvas


def field_to_rgb(field, c_lo, c_hi):
    """Map a scalar field onto a two-point colour ramp."""
    f = norm01(field)[..., None]
    return np.asarray(c_lo) * (1 - f) + np.asarray(c_hi) * f


def hexf(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def save(name, rgb):
    img = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))
    img.save(os.path.join(OUT, name + ".png"), optimize=True)
    print(f"  {name}.png")


def save_normal(name, height, strength=2.2, half=True):
    """Sobel a height field into a tangent-space normal map."""
    h = norm01(height)
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    nz = np.ones_like(h)
    ln = np.sqrt(dx ** 2 + dy ** 2 + nz ** 2)
    rgb = np.stack([(-dx / ln) * 0.5 + 0.5, (-dy / ln) * 0.5 + 0.5, (nz / ln) * 0.5 + 0.5], -1)
    img = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))
    if half:
        img = img.resize((rgb.shape[0] // 2, rgb.shape[1] // 2), Image.LANCZOS)
    img.save(os.path.join(OUT, name + ".png"), optimize=True)
    print(f"  {name}.png")


# ----------------------------------------------------------------------------
# surfaces
# ----------------------------------------------------------------------------
def t_wood(name, c_dark, c_light, planks=6, size=SIZE):
    """Plank flooring: grain runs the length of each plank, seams cut across."""
    # long, low-frequency-across / high-frequency-along grain
    grain = fbm_aniso(size, fx=2, fy=34, octaves=4)
    grain = warp(grain, fbm(size, 6, 3) - 0.5, fbm(size, 6, 3) - 0.5, 10)
    knots = fbm(size, 9, 3)
    height = norm01(grain * 0.78 + knots * 0.22)
    rgb = field_to_rgb(height, c_dark, c_light)

    ph = size // planks
    for i in range(planks):
        rgb[i * ph:(i + 1) * ph] *= 0.8 + rng.random() * 0.42   # per-plank tone
        rgb[i * ph:i * ph + 3] *= 0.42                          # seam shadow
        rgb[i * ph + 3:i * ph + 5] *= 1.12                      # bevel highlight
        cut = int(rng.random() * size)                          # butt joint
        rgb[i * ph + 3:(i + 1) * ph, cut:cut + 3] *= 0.5

    def ang(u, v):
        return (rng.random() - 0.5) * 0.06

    def col(u, v):
        row = min(int(v * size), size - 1)
        colm = min(int(u * size), size - 1)
        return np.clip(rgb[row, colm] * (0.62 + rng.random() * 0.72), 0, 1)

    rgb = paint(rgb, 6000, 30, 0.9, ang, col, alpha=0.3, size=size)
    save(name, rgb)
    save_normal(name + "_n", height, 1.5, half=True)


def t_plaster(name, size=SIZE):
    """Neutral painted plaster — mottled, patchy, slightly damp at the edges."""
    f = fbm(size, 3, 6)
    f = warp(f, fbm(size, 5, 3) - 0.5, fbm(size, 5, 3) - 0.5, 18)
    rgb = field_to_rgb(f, hexf("#b4ada2"), hexf("#f2efe7"))

    def ang(u, v):
        return math.pi * (0.15 + rng.random() * 0.7)

    def col(u, v):
        g = 0.72 + rng.random() * 0.34
        return np.clip(np.array([g, g * 0.99, g * 0.96]), 0, 1)

    rgb = paint(rgb, 4200, 15, 5.0, ang, col, alpha=0.16, size=size)
    # a few darker patches, as if the paint aged unevenly
    for _ in range(26):
        splat(rgb, rng.random() * size, rng.random() * size,
              rng.random() * math.pi, 34 + rng.random() * 40, 22 + rng.random() * 26,
              hexf("#8d867b"), 0.13)
    save(name, rgb)
    save_normal(name + "_n", f, 0.8)


def t_concrete(name, size=SIZE):
    """Poured concrete for the robotics floor — pitted, cool, faintly stained."""
    f = fbm(size, 5, 6) * 0.7 + fbm(size, 22, 3) * 0.3
    rgb = field_to_rgb(f, hexf("#63656a"), hexf("#a3a29c"))
    # aggregate pits
    for _ in range(2600):
        splat(rgb, rng.random() * size, rng.random() * size, rng.random() * 6.28,
              1.2 + rng.random() * 1.8, 1.0 + rng.random() * 1.4,
              hexf("#4c4e53") if rng.random() < 0.6 else hexf("#bdbcb4"), 0.4)
    # expansion joints
    for k in (0, size // 2):
        rgb[k:k + 3, :] *= 0.7
        rgb[:, k:k + 3] *= 0.7

    def ang(u, v):
        return rng.random() * math.pi

    def col(u, v):
        g = 0.55 + rng.random() * 0.35
        return np.array([g * 0.97, g * 0.98, g])

    rgb = paint(rgb, 2400, 12, 6, ang, col, alpha=0.12, size=size)
    save(name, rgb)
    save_normal(name + "_n", f, 1.6)


def t_tile(name, size=SIZE, cells=4):
    """Lobby floor: worn chequer, hand-set, with grout that isn't quite straight."""
    yy, xx = np.mgrid[0:size, 0:size]
    cs = size // cells
    parity = ((xx // cs + yy // cs) % 2).astype(float)
    wob = (fbm(size, 8, 3) - 0.5) * 6
    grout = (((xx + wob) % cs < 3) | ((yy + wob) % cs < 3)).astype(float)

    dirt = fbm(size, 4, 5)
    light = hexf("#ddd5c1") * (0.82 + 0.3 * dirt[..., None])
    dark = hexf("#3f4f4a") * (0.82 + 0.3 * dirt[..., None])
    rgb = light * (1 - parity[..., None]) + dark * parity[..., None]
    rgb = rgb * (1 - grout[..., None] * 0.55) + hexf("#8d8776") * grout[..., None] * 0.55

    # wear: brighter scuffs where feet would fall
    for _ in range(1500):
        splat(rgb, rng.random() * size, rng.random() * size, rng.random() * 6.28,
              5 + rng.random() * 12, 3 + rng.random() * 6,
              hexf("#e8e2d2"), 0.06 + rng.random() * 0.08)
    save(name, rgb)
    save_normal(name + "_n", 1 - grout * 0.9 + dirt * 0.1, 2.4)


def t_stone(name, size=SIZE):
    """Cut slate for stair treads and the lobby threshold."""
    cell = fbm(size, 7, 3)
    f = fbm(size, 4, 6) * 0.6 + cell * 0.4
    rgb = field_to_rgb(f, hexf("#4a4c52"), hexf("#8b8a86"))
    for _ in range(900):
        splat(rgb, rng.random() * size, rng.random() * size, rng.random() * 6.28,
              10 + rng.random() * 26, 1.0 + rng.random() * 2.0,
              hexf("#3c3e44"), 0.16)
    save(name, rgb)
    save_normal(name + "_n", f, 1.9)


def t_fabric(name, base, size=SIZE):
    """Woven upholstery — visible warp and weft, slightly fuzzy."""
    yy, xx = np.mgrid[0:size, 0:size]
    weave = (np.sin(xx * 0.9) * np.sin(yy * 0.9)) * 0.5 + 0.5
    f = fbm(size, 8, 4) * 0.5 + weave * 0.5
    rgb = np.asarray(base)[None, None, :] * (0.7 + 0.55 * f[..., None])
    for _ in range(2200):
        splat(rgb, rng.random() * size, rng.random() * size,
              (0 if rng.random() < 0.5 else math.pi / 2) + (rng.random() - .5) * .2,
              6 + rng.random() * 8, 0.7,
              np.asarray(base) * (0.6 + rng.random() * 0.8), 0.2)
    save(name, rgb)


def t_rug(name, size=SIZE):
    """A worn kilim: medallion field, bordered, faded unevenly."""
    yy, xx = np.mgrid[0:size, 0:size]
    u = xx / size
    v = yy / size
    field = hexf("#8a3a34")
    rgb = np.repeat(np.repeat(field[None, None, :], size, 0), size, 1).astype(float)

    border = ((u < .09) | (u > .91) | (v < .09) | (v > .91))
    inner = ((u < .14) | (u > .86) | (v < .14) | (v > .86)) & ~border
    rgb[border] = hexf("#2f4a4a")
    rgb[inner] = hexf("#c9a24a")

    # diamond medallions across the field
    for cx, cy in [(0.5, 0.5), (0.5, 0.22), (0.5, 0.78), (0.26, 0.5), (0.74, 0.5)]:
        d = np.abs(u - cx) + np.abs(v - cy)
        rgb[d < 0.09] = hexf("#20423f")
        rgb[d < 0.055] = hexf("#c9a24a")
        rgb[d < 0.022] = hexf("#8a3a34")

    fade = fbm(size, 4, 5)
    rgb *= (0.66 + 0.5 * fade[..., None])
    for _ in range(3000):
        splat(rgb, rng.random() * size, rng.random() * size, 0 + (rng.random() - .5) * .25,
              5 + rng.random() * 9, 0.8, hexf("#e6ddc6") * (0.4 + rng.random() * 0.7), 0.10)
    save(name, rgb)


def t_metal(name, size=SIZE):
    """Brushed steel for robot chassis, lab frames, the espresso machine."""
    streak = fbm(size, 3, 4)
    streak = np.repeat(streak[:, :1], size, axis=1) * 0.35 + streak * 0.65
    rgb = field_to_rgb(streak, hexf("#6d7278"), hexf("#c2c6c9"))
    for _ in range(4000):
        splat(rgb, rng.random() * size, rng.random() * size, 0.0,
              22 + rng.random() * 30, 0.55,
              hexf("#d6dade") if rng.random() < 0.5 else hexf("#585d63"), 0.13)
    save(name, rgb)
    save_normal(name + "_n", streak, 0.7)


def t_paper(name, size=SIZE):
    """Laid paper for notices, prints, book pages."""
    f = fbm(size, 6, 5)
    rgb = field_to_rgb(f, hexf("#d8cfb4"), hexf("#f4eeda"))
    yy = np.mgrid[0:size, 0:size][0]
    rgb *= (1 - 0.035 * (np.sin(yy * 0.55) * 0.5 + 0.5))[..., None]
    for _ in range(1200):
        splat(rgb, rng.random() * size, rng.random() * size, rng.random() * 6.28,
              8 + rng.random() * 14, 5 + rng.random() * 8, hexf("#cdc3a6"), 0.05)
    save(name, rgb)


def t_canvas(name, size=SIZE):
    """Primed artist canvas for the studio easels."""
    yy, xx = np.mgrid[0:size, 0:size]
    weave = ((np.sin(xx * 1.6) * np.sin(yy * 1.6)) * 0.5 + 0.5)
    f = weave * 0.55 + fbm(size, 10, 4) * 0.45
    rgb = field_to_rgb(f, hexf("#cfc7b2"), hexf("#f6f2e6"))
    save(name, rgb)
    save_normal(name + "_n", f, 1.1)


def t_books(name, size=SIZE):
    """A run of spines — used as a single map across shelf fronts."""
    rgb = np.repeat(np.repeat(hexf("#241d18")[None, None, :], size, 0), size, 1).astype(float)
    spines = [hexf(c) for c in ["#7d3a2e", "#2f4f4a", "#8a6a2d", "#3b3a5c", "#6b3450",
                                "#495c33", "#a35c2c", "#33454f", "#7a2f3a", "#5c5346"]]
    x = 0
    while x < size:
        w = int(9 + rng.random() * 26)
        col = spines[int(rng.random() * len(spines))] * (0.7 + rng.random() * 0.55)
        top = int(rng.random() * 40)
        rgb[top:, x:x + w] = col
        rgb[top:, x:x + 2] *= 0.55                              # shadow gap
        if rng.random() < 0.55:                                  # gold band
            b = int(size * (0.18 + rng.random() * 0.3))
            rgb[b:b + 4, x + 3:x + w - 2] = hexf("#c9a24a")
        x += w
    f = fbm(size, 5, 4)
    rgb *= (0.7 + 0.5 * f[..., None])
    for _ in range(2500):
        splat(rgb, rng.random() * size, rng.random() * size, math.pi / 2 + (rng.random() - .5) * .2,
              9 + rng.random() * 14, 0.8, hexf("#0f0c0a"), 0.08)
    save(name, rgb)


def t_brush_overlay(name, size=SIZE):
    """Screen-space brush grain the post pass multiplies over the frame."""
    rgb = np.repeat(np.repeat(np.array([0.5, 0.5, 0.5])[None, None, :], size, 0), size, 1)
    for _ in range(7000):
        g = 0.5 + (rng.random() - 0.5) * 0.85
        splat(rgb, rng.random() * size, rng.random() * size,
              rng.random() * math.pi, 8 + rng.random() * 26, 1.0 + rng.random() * 2.4,
              np.array([g, g, g]), 0.24)
    save(name, rgb)


def t_grain(name, size=256):
    """Fine paper grain for the film-grain term."""
    n = rng.random((size, size))
    n = 0.6 * n + 0.4 * norm01(fbm(size, 64, 2))
    save(name, np.repeat(n[..., None], 3, -1))


def t_grass(name, size=SIZE):
    """Lawn. Clumped tone variation first, then thousands of short blades laid
    down at slightly random angles so it reads as grass rather than green fuzz
    when the camera is thirty units up."""
    clump = fbm(size, 3, 4) * 0.55 + fbm(size, 9, 3) * 0.45
    clump = warp(clump, fbm(size, 5, 2), fbm(size, 5, 2), 14)
    f = norm01(clump)
    rgb = field_to_rgb(f, hexf("#4d6b32"), hexf("#8fae52"))

    # dry patches, so the lawn is not a single flat hue
    dry = norm01(fbm(size, 2, 3))
    rgb = rgb * (1 - 0.28 * dry[..., None]) + \
        np.asarray(hexf("#b3a860"))[None, None, :] * (0.28 * dry[..., None])

    # blades: mostly upright, a few leaning, in three tones
    tones = [hexf("#3f5c28"), hexf("#6f9440"), hexf("#a8c268")]
    for _ in range(14000):
        t = tones[int(rng.random() * 3)]
        splat(rgb, rng.random() * size, rng.random() * size,
              -math.pi / 2 + (rng.random() - .5) * 1.1,
              3.5 + rng.random() * 5.5, 0.55 + rng.random() * 0.5,
              np.asarray(t) * (0.85 + rng.random() * 0.4), 0.5)

    # the odd clover / daisy, at a density you notice only up close
    for _ in range(240):
        splat(rgb, rng.random() * size, rng.random() * size, rng.random() * 6.28,
              1.6, 1.6, hexf("#e8e2c4"), 0.5)
    save(name, rgb)
    save_normal(name + "_n", f, 1.1)


def main():
    os.makedirs(OUT, exist_ok=True)
    print("baking →", OUT)
    t_wood("wood_floor", hexf("#4a3320"), hexf("#9a7040"), planks=6)
    t_wood("wood_dark", hexf("#2c1f14"), hexf("#5d422a"), planks=3)
    t_plaster("plaster")
    t_concrete("concrete")
    t_tile("tile")
    t_stone("stone")
    t_grass("grass")
    t_fabric("fabric", hexf("#8a8577"))
    t_rug("rug")
    t_metal("metal")
    t_paper("paper")
    t_canvas("canvas")
    t_books("books")
    t_brush_overlay("brush")
    t_grain("grain")
    print("done.")


if __name__ == "__main__":
    main()
