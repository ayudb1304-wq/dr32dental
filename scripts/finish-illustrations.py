#!/usr/bin/env python3
"""Finish the picked treatment illustrations for the site.

For each pick: lift near-black shadows to eucalyptus, pull the brightest facets towards mint so the
subject separates from the page, set the background to exact porcelain (keeping the faint ground
shadow), then save a 600x600 WebP under 80 KB to assets/img/treatments/<slug>.webp.

Usage: scripts/finish-illustrations.py            (writes assets + generated/illustrations/finished-sheet.png)
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "generated/illustrations"
OUT = ROOT / "assets/img/treatments"

# Ayush's picks (2026-10-31): cleaning b, root canal a (reworked to a cross-section), implants a, extraction a,
# fillings b (reworked to show a filling), gum care b, children's a. Each was then redrawn by Marketing Studio Image
# on a flat grey key background (scripts/illustrations.py rekey) because the white facets matched the white background.
PICKS = {slug: RAW / f"keyed/{slug}.png" for slug in (
    "teeth-cleaning", "root-canal", "dental-implants", "tooth-extraction",
    "fillings", "sensitivity-gum-care", "childrens-dentistry")}


def hexf(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


PORCELAIN, MINT, MINT_SOFT = hexf("#F4F7F5"), hexf("#D6EAE2"), hexf("#E8F3EE")
EUC, EUC_DEEP = hexf("#1E4A42"), hexf("#163A33")
import os
TILE = hexf(os.environ.get("TILE", "#D6EAE2"))   # mint: white facets blend into porcelain, so the art sits on a mint tile
HIGHLIGHT_REMAP = os.environ.get("HIGHLIGHT_REMAP", "0") == "1"
FILL = 0.78                                        # subject size as a share of the tile


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def finish(src: Path) -> Image.Image:
    a = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32) / 255
    H, W, _ = a.shape
    L = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    sat = a.max(-1) - a.min(-1)

    # Background: flood-fill the flat grey key from the frame edge.
    u8 = cv2.GaussianBlur((a * 255).astype(np.uint8), (3, 3), 0)
    m = np.zeros((H + 2, W + 2), np.uint8)
    for x, y in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)]:
        if m[y + 1, x + 1] == 0:
            # Fixed range: every pixel is compared with the seed's grey, so pale facets can never join
            # the background even where the outline has a hairline gap. The lower range admits the soft ground shadow.
            cv2.floodFill(u8.copy(), m, (x, y), (0, 0, 0), (34, 34, 34), (12, 12, 12),
                          4 | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE | (255 << 8))
    bg = m[1:-1, 1:-1] > 0
    subj = (~bg).astype(np.uint8)
    subj = cv2.morphologyEx(subj, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))   # drop specks
    subj = cv2.erode(subj, np.ones((3, 3), np.uint8), iterations=1)              # trim the grey anti-alias fringe
    alpha = cv2.GaussianBlur(subj.astype(np.float32), (0, 0), 0.9)[..., None]

    out = a.copy()
    # 1) Shadows: near-black facets become eucalyptus, keeping their relative steps.
    t = np.clip(L / 0.42, 0, 1)[..., None]
    darkest = EUC_DEEP * 0.1 + EUC * 0.9          # floor sits at eucalyptus, never black
    lightest = EUC * 0.55 + MINT * 0.45            # lightest shadow step, a soft eucalyptus-mint
    shadow_target = darkest * (1 - t) + lightest * t
    wd = (smoothstep(0.42, 0.12, L) * 0.92)[..., None]
    out = out * (1 - wd) + shadow_target * wd
    # 2) Highlights: the brightest, near-neutral facets move to mint so they stand off the porcelain page.
    u = np.clip((L - 0.80) / 0.20, 0, 1)[..., None]
    NEAR_WHITE = MINT_SOFT * 0.45 + 0.55            # #F5FAF7-ish: lighter than mint soft, cooler than paper white
    hi_target = MINT_SOFT * (1 - u) + NEAR_WHITE * u
    wh = (smoothstep(0.80, 0.97, L) * (1 - smoothstep(0.05, 0.15, sat)) * 0.85)[..., None]
    if HIGHLIGHT_REMAP:
        out = out * (1 - wh) + hi_target * wh

    # 3) Background: exact porcelain, scaled by the original brightness so the faint shadow survives.
    ref = np.median(L[bg]) if bg.any() else 1.0
    shade = np.clip(L / max(ref, 1e-3), 0, 1)[..., None]
    bg_col = TILE * (0.90 + 0.10 * shade)
    bg_col = np.where(shade >= 0.995, TILE, bg_col)

    final = out * alpha + bg_col * (1 - alpha)

    # 4) A hairline eucalyptus edge at low opacity separates pale facets from the page.
    m = (alpha[..., 0] > 0.5).astype(np.uint8)
    edge_px = cv2.morphologyEx(m, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)).astype(np.float32)
    edge_px = cv2.GaussianBlur(edge_px, (0, 0), 0.7)[..., None] * 0.30
    final = final * (1 - edge_px) + EUC * edge_px

    # 5) Crop square around the subject so it fills ~78% of the tile; pad with the tile colour if needed.
    ys, xs = np.where(alpha[..., 0] > 0.5)
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    side = int(max(xs.max() - xs.min(), ys.max() - ys.min()) / FILL)
    canvas = np.ones((side * 3, side * 3, 3), np.float32) * TILE
    ox, oy = int(side * 1.5 - cx), int(side * 1.5 - cy)
    canvas[oy:oy + H, ox:ox + W] = final
    c0 = int(side * 1.5 - side / 2)
    crop = canvas[c0:c0 + side, c0:c0 + side]
    img = Image.fromarray((np.clip(crop, 0, 1) * 255 + 0.5).astype(np.uint8))
    return img.resize((600, 600), Image.LANCZOS)


def save_webp(img: Image.Image, path: Path, limit=80_000):
    for q in (86, 82, 78, 74, 70, 65, 60):
        img.save(path, "WEBP", quality=q, method=6)
        if path.stat().st_size <= limit:
            return q
    return q


def main():
    if os.environ.get("COMPARE"):
        # scripts/finish-illustrations.py with COMPARE=1: tile options side by side, nothing written to assets
        global TILE
        rows = []
        for hexv in ("#F4F7F5", "#E8F3EE", "#D6EAE2"):
            TILE = hexf(hexv)
            rows.append([finish(src).resize((220, 220), Image.LANCZOS) for src in PICKS.values()])
        sheet = Image.new("RGB", (7 * 230 + 10, 3 * 230 + 10), (255, 255, 255))
        for r, row in enumerate(rows):
            for i, t in enumerate(row):
                sheet.paste(t, (10 + i * 230, 10 + r * 230))
        sheet.save(RAW / "tile-compare.png")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = []
    for slug, src in PICKS.items():
        img = finish(src)
        dst = OUT / f"{slug}.webp"
        q = save_webp(img, dst)
        img.resize((240, 240), Image.LANCZOS).save(OUT / f"{slug}-240.webp", "WEBP", quality=84, method=6)  # for 84-104px tiles
        print(f"{slug:22s} q={q} {dst.stat().st_size / 1000:.1f} KB")
        before = Image.open(src).convert("RGB").resize((300, 300), Image.LANCZOS)
        tiles.append((before, img.resize((300, 300), Image.LANCZOS)))
    sheet = Image.new("RGB", (len(tiles) * 310 + 10, 2 * 310 + 10), (255, 255, 255))
    for i, (b, f) in enumerate(tiles):
        sheet.paste(b, (10 + i * 310, 10))
        sheet.paste(f, (10 + i * 310, 320))
    sheet.save(RAW / "finished-sheet.png")


if __name__ == "__main__":
    main()
