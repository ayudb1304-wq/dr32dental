#!/usr/bin/env python3
"""Generate the seven treatment illustrations with Recraft V4.1 through the Higgsfield REST API.

One shared style prompt plus one subject line per treatment keeps the set consistent.
Each call returns one image; candidates are separate calls.

Usage:
  scripts/illustrations.py teeth-cleaning a          # one candidate
  scripts/illustrations.py all a b                   # every treatment, candidates a and b
Raw files land in generated/illustrations/<slug>-<candidate>.webp (git-ignored).
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENDPOINT = "recraft/v4.1/text-to-image"

STYLE = (
    "Minimal editorial illustration in a faceted low-poly style, matching a dental clinic logo drawn as a softly cut gemstone. "
    "One simple subject built from a small number of large flat facets, roughly 15 to 30, with crisp straight edges. "
    "Soft, diffused morning light from the upper left. Muted, desaturated colours only: porcelain white #F4F7F5 and pale mint #E8F3EE "
    "highlights, mint #D6EAE2 mid-tones, eucalyptus green #1E4A42 and deep eucalyptus #163A33 shadows (never black), "
    "and a few facets of muted gum pink #EBB7B0 used sparingly. "
    "Plain flat porcelain background #F4F7F5. The subject is centred and small, filling about half the frame, "
    "with generous empty space around it and only a very faint soft shadow beneath. "
    "Calm, clean, premium and reassuring. "
    "No text, no letters, no numbers, no logos, no people, no hands, no faces, no blood, no needles, no drills, "
    "no neon or saturated colours, no photographic realism, no background pattern."
)

SUBJECTS = {
    "teeth-cleaning": "Subject: a single faceted molar with a small soft-bristled toothbrush resting diagonally beside it, and two tiny four-point sparkles near the crown.",
    "root-canal": "Subject: a single faceted molar shown as a clean vertical cross-section, revealing two smooth mint root channels inside; calm and diagrammatic, not anatomical.",
    "dental-implants": "Subject: a single faceted tooth crown resting on a simple faceted implant post with a few gentle screw threads, the post in muted eucalyptus grey-green.",
    "tooth-extraction": "Subject: a single faceted molar floating gently just above a soft faceted mint cushion, as if lifted out with care, with a small gap of air between them.",
    "fillings": "Subject: a single faceted molar seen from a slight top-down angle, with one small facet on its chewing surface filled in pale mint as a neat, smooth patch.",
    "sensitivity-gum-care": "Subject: a single faceted molar rising from a soft faceted gum-pink base, with a small faceted eucalyptus leaf curving protectively beside it.",
    "childrens-dentistry": "Subject: a small, rounder faceted baby tooth beside a tiny faceted toy block and a small four-point star; playful but calm.",
}

# CLAUDE.md palette only. Porcelain is the background.
PALETTE = ["#F4F7F5", "#D6EAE2", "#E8F3EE", "#1E4A42", "#163A33", "#EBB7B0"]


def rgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def body(slug):
    return {
        "prompt": f"{STYLE} {SUBJECTS[slug]}",
        "aspect_ratio": "1:1",
        "resolution": "1k",
        "output_format": "webp",
        "colors": [{"rgb": rgb(h)} for h in PALETTE],
        "background_color": {"rgb": rgb("#F4F7F5")},
    }


def run(slug, cand):
    name = f"illustrations/{slug}-{cand}"
    out = subprocess.run(
        [str(ROOT / "scripts/hf-submit.sh"), name, ENDPOINT, json.dumps(body(slug))],
        capture_output=True, text=True,
    )
    tail = (out.stdout.strip().splitlines() or ["(no output)"])[-1]
    rid = next((l.split("=", 1)[1] for l in out.stdout.splitlines() if l.startswith("request_id=")), "?")
    return slug, cand, out.returncode, rid, tail if out.returncode == 0 else (out.stderr.strip() or tail)


REKEY_PROMPT = (
    "Edit this illustration. Keep the subject exactly the same: same faceted low-poly shapes, same facet layout, "
    "same composition, size, framing and camera angle. Make only these changes: "
    "1) replace the white background with a perfectly flat, solid neutral light grey #CCCCCC, edge to edge, no gradient, no vignette; "
    "2) recolour the darkest, near-black facets to eucalyptus green #1E4A42, keeping their light-to-dark steps; "
    "3) keep the white and pale mint facets as they are. "
    "No text, no letters, no people, no hands, no tools, no blood."
)


def rekey(slug, src_png):
    """Re-draw a picked illustration on a flat grey key background via Marketing Studio Image edit."""
    up = subprocess.run([str(ROOT / "scripts/hf-upload.sh"), str(src_png)], capture_output=True, text=True, check=True)
    body = {"prompt": REKEY_PROMPT, "image_urls": [up.stdout.strip()], "aspect_ratio": "1:1",
            "resolution": "1k", "quality": "high", "enhance_prompt": False}
    out = subprocess.run([str(ROOT / "scripts/hf-submit.sh"), f"illustrations/keyed/{slug}",
                          "marketing-studio/image", json.dumps(body)], capture_output=True, text=True)
    rid = next((l.split("=", 1)[1] for l in out.stdout.splitlines() if l.startswith("request_id=")), "?")
    tail = (out.stdout.strip().splitlines() or [out.stderr.strip()])[-1]
    return slug, out.returncode, rid, tail


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "rekey":
        # scripts/illustrations.py rekey slug=path/to/source.png [slug=...]
        from PIL import Image
        (ROOT / "generated/illustrations/keyed").mkdir(parents=True, exist_ok=True)
        jobs = []
        for arg in sys.argv[2:]:
            slug, src = arg.split("=", 1)
            if (ROOT / f"generated/illustrations/keyed/{slug}.png").exists():
                continue
            png = ROOT / f"generated/illustrations/keyed/{slug}-src.png"
            Image.open(ROOT / src).convert("RGB").save(png)
            jobs.append((slug, png))
        with ThreadPoolExecutor(max_workers=4) as pool:
            for slug, code, rid, msg in pool.map(lambda j: rekey(*j), jobs):
                print(f"{'ok ' if code == 0 else 'ERR'} {slug} request={rid} {msg}")
        return
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    slugs = list(SUBJECTS) if sys.argv[1] == "all" else [sys.argv[1]]
    cands = sys.argv[2:]
    (ROOT / "generated/illustrations").mkdir(parents=True, exist_ok=True)
    jobs = [(s, c) for s in slugs for c in cands
            if not (ROOT / f"generated/illustrations/{s}-{c}.webp").exists()]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for slug, cand, code, rid, msg in pool.map(lambda j: run(*j), jobs):
            print(f"{'ok ' if code == 0 else 'ERR'} {slug}-{cand} request={rid} {msg}")


if __name__ == "__main__":
    main()
