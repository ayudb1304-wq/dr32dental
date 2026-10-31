# Dr.32 Aesthetic Dental Care: website

One-page preview site for Dr. Apoorva's clinic in Horamavu Agara, Bengaluru. Built by Ayush as an unpaid preview to win the project; she hasn't approved it yet, so nothing here is final.

- Live: https://dr32dental.vercel.app. Every push to `main` redeploys on Vercel automatically.
- Plain HTML/CSS/JS with no build step. `index.html` is the page. `assets/js/site.js` runs the motion (GSAP 3.12.5 and ScrollTrigger, self-hosted).
- Fonts are self-hosted in `assets/fonts`: Young Serif for headings, Figtree for body text.
- Keep paths relative, keep it static, and keep `prefers-reduced-motion` working.

## Design tokens (keep new visuals inside these)

| Role | Hex |
| --- | --- |
| Porcelain (page background) | #F4F7F5 |
| Eucalyptus (primary) | #1E4A42 |
| Deep eucalyptus | #163A33 |
| Ink (text) | #1A2420 |
| Muted text | #4F5E58 |
| Mint | #D6EAE2 |
| Mint soft | #E8F3EE |
| Gum pink | #EBB7B0 |
| Lines | #D9E3DE |
| Star / gold | #C98A1B |

The mood is calm, clean and unhurried. The headline promise is "The dentist in Horamavu who listens before she treats."

## Clinic facts (do not invent others)

- Phone and WhatsApp: +91 93801 12096
- Address: 32, Banjara Layout Main Rd, Horamavu Agara, Bengaluru 560113
- Rated 5.0 from 43 Google reviews. Patient quotes on the page are real Google review text. Don't add or edit quotes.
- Timings are unknown, so the page says to message on WhatsApp.

## Next job: Higgsfield visuals

Goal: make the first impression feel premium with original illustrations, never fake photos.

1. **Seven treatment illustrations**, one per item in `.treat-list`:
   - Teeth cleaning
   - Root canal treatment
   - Dental implants
   - Tooth extraction
   - Fillings
   - Sensitivity and gum care
   - Children's dentistry

   Style: minimal, soft editorial illustration of a single tooth or simple object. Use only the palette above on a porcelain background. No text, no logos, no people. Make them square and small enough for a card.
2. **One 8–10 second vertical (9:16) launch reel** for her Instagram: the tooth-chart motif and colours, with no people. Keep it out of the page; it's a social asset to send her.

Rules:

- No AI-generated people, no fake doctor, and no fake clinic or patient photos. Patients would be misled. Real clinic photos come from Dr. Apoorva later.
- Save finished files to `assets/img/treatments/` as `.webp`, around 600×600 and under 80 KB each. Add them to the cards with `alt=""` (they're decorative) plus `width`, `height` and `loading="lazy"`.
- Keep raw downloads in `generated/`, which is git-ignored.
- Show Ayush the images before committing.

### Higgsfield API

- The key is in `.env` as `HF_API_KEY`. Read it from the environment. Never print it, log it or commit it.
- REST base: `https://api.higgsfield.ai`. Header: `Authorization: Key $HF_API_KEY`.
- Submit with `POST /<model-path>`. Then poll `GET /requests/<request_id>/status` until the status is `completed`, `failed`, `nsfw` or `canceled`. Results are in `images[].url` or `video.url`.
- Check model paths and input schemas in the docs index first: https://docs.higgsfield.ai/docs/llms.txt. Don't guess endpoints.
- Billing is pay-as-you-go. Ayush may have claimed launch discounts on one image model and two video models, so ask which ones before choosing a model.
- Run one test image before batching. Don't retry a POST blindly after a timeout.

## Before launch (only after she says yes)

- Remove the preview note bar at the top of `index.html`.
- Add her real photos, timings and a custom domain.
