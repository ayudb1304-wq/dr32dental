// Builds the Dr.32 logo SVGs: a low-poly molar traced from her signboard + lettering outlined with opentype.js.
// Usage: NODE_PATH=<dir with opentype.js> FAVICON=favicon.svg node scripts/build-logo.js assets/img
// Fonts (all Open Font Licence, git-ignored): generated/fonts/PinyonScript-Regular.ttf,
// CormorantGaramond-SemiBold.ttf (instanced at wght 600), Figtree-Regular.ttf (instanced at wght 400).
// Output: logo-mark, logo-full and logo-horizontal SVGs, each plain and -inverse.
const fs = require('fs');
const path = require('path');
const ot = require('opentype.js');

const OUT = process.argv[2] || path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

// Palette (CLAUDE.md tokens only)
const P = {
  porcelain: '#F4F7F5', euc: '#1E4A42', deep: '#163A33', ink: '#1A2420',
  mint: '#D6EAE2', mintSoft: '#E8F3EE', pink: '#EBB7B0', white: '#FFFFFF',
};

// ---------- Low-poly molar, 200 x 240 box ----------
// Points (x,y). Crown top is a faceted occlusal surface with a 4-point star facet; two roots below.
// Geometry extracted from the signboard photo: silhouette by thresholding the pale tooth against the green
// background; facets by k-means colour clustering of the tooth pixels. Normalised to a 200 x 239 box.
const pt = {
  // rim: left corner, left shoulder kink, left cusp, shallow centre dip, right cusp, right shoulder kink, right corner
  TL: [0, 48.1], K1: [20.1, 19.6], Lp: [59, 0], Td: [100.7, 10.6], Rp: [162.6, 2], K2: [194.2, 20.1], TR: [200, 46],
  Ct: [100.7, 50.9], C2: [109.4, 119.4], S: [109.9, 169.8],   // crease: top, pale/beige break, slit top
  Lm: [100.1, 208.6], Rm: [114.8, 208.6],                      // slit flanks (opens downward)
  Lt: [89.2, 239.1], Rt: [125.5, 239.1],                       // root tips
  L2: [35.4, 179.9], L3: [51.8, 208.6],                        // left edge kinks
  Wk: [77.7, 174.1],                                           // dark/white break on the left panel
  G1: [172.7, 99.3], R1: [182.2, 133.8], R2: [155.1, 208.6],   // right strip inner kink, right edge kinks
  // star facet
  sL: [63.3, 27.3], sTL: [77.1, 12.9], sC: [102.2, 19.3], sTR: [130.4, 10.6], sR: [146.2, 22.2], sB: [100.7, 31.7],
  iLT: [80.6, 23], iRT: [124.3, 21.6], iRB: [109.9, 27.3], iLB: [89.8, 27.3],
};
const p = (k) => pt[k].join(',');
const poly = (keys, fill, op) =>
  `<polygon points="${keys.map(p).join(' ')}" fill="${fill}"${op != null ? ` fill-opacity="${op}"` : ''}/>`;

const silhouette = ['TL', 'K1', 'Lp', 'Td', 'Rp', 'K2', 'TR', 'R1', 'R2', 'Rt', 'Rm', 'S', 'Lm', 'Lt', 'L3', 'L2'];

const facets = [
  [['K1', 'Lp', 'Td', 'Rp', 'K2', 'Ct'], 'top'],                 // occlusal surface, pale
  [['TL', 'K1', 'Ct'], 'mid'], [['Ct', 'K2', 'TR'], 'mid'],      // shoulder facets on the top, darker
  [['TL', 'Ct', 'C2', 'S', 'Lm', 'Lt', 'Wk'], 'lo'],             // dark left panel, crease to root tip
  [['TL', 'Wk', 'Lt', 'L3', 'L2'], 'hi'],                        // white left panel
  [['Ct', 'TR', 'C2'], 'top'],                                   // pale triangle right of the crease
  [['C2', 'TR', 'G1', 'Rt', 'Rm', 'S'], 'blush'],                // beige lower right
  [['TR', 'R1', 'R2', 'Rt', 'G1'], 'mid'],                       // darker strip down the right edge
];
const star = ['sL', 'iLT', 'sTL', 'sC', 'sTR', 'iRT', 'sR', 'iRB', 'sB', 'iLB'];
const ridges = [];

// Colourways. 'light' = pale tooth on eucalyptus (as on the sign); 'dark' = eucalyptus tooth on porcelain.
const ways = {
  light: {
    base: P.porcelain,
    top: [P.mintSoft, 1], hi: [P.white, 1], mid: [P.euc, 0.32], lo: [P.euc, 0.62], blush: [P.pink, 0.42],
    star: [P.euc, 0.85], ridge: [P.euc, 0], bg: P.euc, text: P.porcelain, textSub: P.mint,
  },
  dark: {
    base: P.euc,
    top: [P.mint, 0.28], hi: [P.mint, 0.55], mid: [P.mint, 0.12], lo: [P.deep, 1], blush: [P.pink, 0.27],
    star: [P.mint, 0.9], ridge: [P.mint, 0], bg: P.porcelain, text: P.euc, textSub: P.euc,
  },
};

function toothGroup(way, x = 0, y = 0) {
  const w = ways[way];
  const parts = [];
  parts.push(`<polygon points="${silhouette.map(p).join(' ')}" fill="${w.base}"/>`);
  for (const [keys, shade] of facets) parts.push(poly(keys, w[shade][0], w[shade][1]));
  parts.push(poly(star, w.star[0], w.star[1]));
  parts.push(`<path d="${ridges.map(([a, b]) => `M${p(a)}L${p(b)}`).join('')}" fill="none" stroke="${w.ridge[0]}" stroke-opacity="${w.ridge[1]}" stroke-width="0.8" stroke-linecap="round"/>`);
  return `<g transform="translate(${x} ${y})">${parts.join('')}</g>`;
}

// ---------- Lettering ----------
const FONTS = process.env.LOGO_FONTS || path.resolve(__dirname, '../generated/fonts');
const script = ot.loadSync(path.join(FONTS, 'PinyonScript-Regular.ttf'));
const serif = ot.loadSync(path.join(FONTS, process.env.SERIF || 'CormorantGaramond-SemiBold.ttf'));
const sans = ot.loadSync(path.join(FONTS, 'Figtree-Regular.ttf'));

function textPath(font, text, x, y, size, opts = {}) {
  const pth = font.getPath(text, x, y, size, { kerning: true, letterSpacing: opts.letterSpacing || 0 });
  const bb = pth.getBoundingBox();
  const adv = font.getAdvanceWidth(text, size, { kerning: true, letterSpacing: opts.letterSpacing || 0 });
  return { d: pth.toPathData(2), bb, adv };
}
function round(n) { return Math.round(n * 100) / 100; }

// Compose "Dr." (script) + "32" (serif) on a shared baseline, measured so we can centre it.
function wordmark(fill, cx, baseline) {
  const sizeScript = 126, sizeSerif = (process.env.SERIF||'').includes('Young') ? 106 : 146;
  const dr = textPath(script, 'Dr.', 0, 0, sizeScript);
  const gap = 10;
  const num = textPath(serif, '32', 0, 0, sizeSerif, { letterSpacing: 0.01 });
  const total = (dr.bb.x2 - dr.bb.x1) + gap + (num.bb.x2 - num.bb.x1);
  const startX = cx - total / 2;
  const drX = startX - dr.bb.x1;
  const numX = startX + (dr.bb.x2 - dr.bb.x1) + gap - num.bb.x1;
  const d1 = textPath(script, 'Dr.', drX, baseline, sizeScript).d;
  const d2 = textPath(serif, '32', numX, baseline, sizeSerif, { letterSpacing: 0.01 }).d;
  return { svg: `<path d="${d1}" fill="${fill}"/><path d="${d2}" fill="${fill}"/>`, width: total };
}
function tagline(fill, cx, baseline) {
  const size = 34, ls = 0.14;
  const t = textPath(sans, 'AESTHETIC DENTAL CARE', 0, 0, size, { letterSpacing: ls });
  const w = t.bb.x2 - t.bb.x1;
  const x = cx - w / 2 - t.bb.x1;
  return { svg: `<path d="${textPath(sans, 'AESTHETIC DENTAL CARE', x, baseline, size, { letterSpacing: ls }).d}" fill="${fill}"/>`, width: w };
}

function svgDoc(w, h, inner, bg, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">` +
    (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') + inner + `</svg>\n`;
}

// Mark: 240x280 box with padding, tooth centred
function buildMark(way, withBg) {
  const w = ways[way];
  const W = 240, H = 280;
  const inner = toothGroup(way, (W - 200) / 2, (H - 239) / 2);
  return svgDoc(W, H, inner, withBg ? w.bg : null, 'Dr.32 tooth mark');
}
// Full lockup: tooth above "Dr. 32" above "AESTHETIC DENTAL CARE"
function buildFull(way, withBg) {
  const w = ways[way];
  const W = 560, H = 520;
  const cx = W / 2;
  const tooth = toothGroup(way, cx - 100, 26);
  const wm = wordmark(w.text, cx, 386);
  const tg = tagline(w.textSub, cx, 468);
  return svgDoc(W, H, tooth + wm.svg + tg.svg, withBg ? w.bg : null, 'Dr.32 Aesthetic Dental Care');
}

// Horizontal lockup: tooth left, "Dr. 32" over "AESTHETIC DENTAL CARE" on the right, left-aligned.
function buildHorizontal(way, withBg) {
  const w = ways[way];
  const k = 0.56;                       // tooth scale
  const toothW = 200 * k, toothH = 239 * k;
  const gapX = 22, x0 = toothW + gapX;
  const sS = 92, sN = 106;              // script "Dr." and serif "32" sizes
  const dr = textPath(script, 'Dr.', 0, 0, sS);
  const num = textPath(serif, '32', 0, 0, sN, { letterSpacing: 0.01 });
  const base1 = 72;
  const drX = x0 - dr.bb.x1;
  const numX = x0 + (dr.bb.x2 - dr.bb.x1) + 8 - num.bb.x1;
  const d1 = textPath(script, 'Dr.', drX, base1, sS).d;
  const d2 = textPath(serif, '32', numX, base1, sN, { letterSpacing: 0.01 }).d;
  const tS = 24, ls = 0.12, base2 = 128;
  const tg0 = textPath(sans, 'AESTHETIC DENTAL CARE', 0, 0, tS, { letterSpacing: ls });
  const tg = textPath(sans, 'AESTHETIC DENTAL CARE', x0 - tg0.bb.x1 + 2, base2, tS, { letterSpacing: ls });
  const right = Math.max(numX + num.bb.x2, tg.bb.x2);
  const W = Math.ceil(right + 2), H = Math.ceil(toothH + 2);
  const tooth = `<g transform="translate(0 1) scale(${k})">${toothGroup(way)}</g>`;
  return svgDoc(W, H, tooth + `<path d="${d1}" fill="${w.text}"/><path d="${d2}" fill="${w.text}"/><path d="${tg.d}" fill="${w.textSub}"/>`,
    withBg ? w.bg : null, 'Dr.32 Aesthetic Dental Care');
}
// Favicon: pale tooth on a eucalyptus rounded square, tight crop so it reads at 16px.
function buildFavicon() {
  const S = 64, k = 52 / 239;
  const tx = (S - 200 * k) / 2, ty = (S - 239 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" rx="14" fill="${P.euc}"/>` +
    `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})">${toothGroup('light')}</g></svg>\n`;
}

const files = {
  'logo-horizontal.svg': buildHorizontal('dark', false),
  'logo-horizontal-inverse.svg': buildHorizontal('light', false),

  // "eucalyptus on porcelain"
  'logo-mark.svg': buildMark('dark', false),
  'logo-full.svg': buildFull('dark', false),
  // "porcelain on eucalyptus"
  'logo-mark-inverse.svg': buildMark('light', true),
  'logo-full-inverse.svg': buildFull('light', true),
};
if (process.env.FAVICON) { fs.writeFileSync(process.env.FAVICON, buildFavicon()); console.log('favicon written'); }
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), svg);
  console.log(name, svg.length, 'bytes');
}
