#!/usr/bin/env node
/**
 * Regenerates the link-preview share cards in site/public from the brand master.
 *
 *   cd site && node scripts/build-og-cards.mjs
 *
 * Why a script rather than two committed PNGs and a screenshot: the cards carry the site's
 * typography, so they have to be rebuilt from the same fonts the site self-hosts the moment the
 * nameplate, the subtitle or the mark changes. Rendering is done in headless Chrome because the
 * brand families ship as woff2 — neither Pillow nor librsvg/rsvg (which sharp bundles) can load
 * that container, and the system has no Crimson Pro / Inter installed, so every alternative
 * route silently falls back to DejaVu and produces a card in the wrong typeface.
 *
 * 1200x630 is the size Facebook, LinkedIn, X and Discord all render a large card from. The
 * width/height are declared in Base.astro and MUST match these files: a mismatch makes some
 * scrapers drop the image, which is the failure this card exists to repair.
 *
 * VELLUM/VEIL. The master's "transparent" background sits at alpha 28, which is invisible on
 * white and reads as a dirty square halo over #252525 — exactly the ground these cards use. The
 * alpha is levelled against the corner value first, same as build-favicons.mjs does.
 *
 * Chrome is found via $CHROME, then the usual binary names. A missing Chrome is a hard error
 * rather than a silently blank card.
 */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const exec = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, '..');
const SRC = path.resolve(SITE, '../ops/brand/communion.png');
const OUT = path.resolve(SITE, 'public');
const FONTS = path.resolve(SITE, 'node_modules/@fontsource-variable');

const W = 1200;
const H = 630;
const GROUND = '#252525';
const YELLOW = '#FFE100';
const MIST = '#CFCFCF';
const RULE = '#7D7D7D';
const MARK_PX = 372;
const ALPHA_FLOOR = 8;

// The card's own sentence. Keep it short: it is read at thumbnail size in a feed, and the
// canonical description (the tagline) is far too long to set here.
const CARDS = [
  {
    file: 'og-card.png',
    lang: 'en',
    sub: "Essays and commentaries on Pope Leo XIV's encyclical<br>and on the Church&rsquo;s social doctrine",
  },
  {
    file: 'og-card-es.png',
    lang: 'es',
    sub: 'Ensayos y comentarios sobre la enc&iacute;clica del Papa Le&oacute;n XIV<br>y sobre la doctrina social de la Iglesia',
  },
];

// ---- the mark: level the alpha veil, trim to the artwork, scale up -------------------------
const master = await readFile(SRC);
const raw = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = raw;
const { width: w, height: h, channels: c } = info;
const corner = Math.max(
  data[3],
  data[(w - 1) * c + 3],
  data[(h - 1) * w * c + 3],
  data[((h - 1) * w + w - 1) * c + 3],
);
// A corner of 0 means already clean; >=250 means an opaque deliberate background. Anything
// between is a translucent veil and is levelled away without touching the object's own edge.
if (corner !== 0 && corner < 250) {
  const scale = 255 / (255 - corner);
  for (let i = 3; i < data.length; i += c) {
    data[i] = Math.min(255, Math.round(Math.max(0, data[i] - corner) * scale));
  }
}
let markBuf = await sharp(data, { raw: { width: w, height: h, channels: c } }).png().toBuffer();

const lv = await sharp(markBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = w, minY = h, maxX = -1, maxY = -1;
for (let y = 0; y < h; y += 1) {
  for (let x = 0; x < w; x += 1) {
    if (lv.data[(y * w + x) * c + 3] > ALPHA_FLOOR) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) throw new Error(`${SRC} appears to be fully transparent`);
markBuf = await sharp(markBuf)
  .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
  .resize(MARK_PX * 2, MARK_PX * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// ---- fonts and mark inlined, so the page needs no server and no file:// sibling access ----
const uri = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const serif = uri(await readFile(path.join(FONTS, 'crimson-pro/files/crimson-pro-latin-wght-normal.woff2')), 'font/woff2');
const sans = uri(await readFile(path.join(FONTS, 'inter/files/inter-latin-wght-normal.woff2')), 'font/woff2');
const mark = uri(markBuf, 'image/png');

const html = (lang, sub) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
@font-face { font-family:'Crimson Pro'; src:url(${serif}) format('woff2-variations'); font-weight:200 900; font-style:normal; }
@font-face { font-family:'Inter'; src:url(${sans}) format('woff2-variations'); font-weight:100 900; font-style:normal; }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:${W}px; height:${H}px; overflow:hidden; background:${GROUND};
  font-family:'Inter', sans-serif; }
/* The 3px Vatican-yellow band above the dark bar, scaled to the card. */
.band { position:absolute; top:0; left:0; width:${W}px; height:10px; background:${YELLOW}; }
.text { position:absolute; left:84px; top:0; height:${H}px; width:720px;
  display:flex; flex-direction:column; justify-content:center; }
.kicker { font-size:19px; font-weight:600; letter-spacing:.26em; text-transform:uppercase;
  color:${YELLOW}; margin-bottom:30px; }
/* The nameplate is branding, not a title reference, so it is roman rather than italic. */
.name { font-family:'Crimson Pro', serif; font-weight:500; font-size:106px; line-height:.94;
  color:#fff; letter-spacing:-.005em; }
.rule { width:132px; height:2px; background:${RULE}; margin:38px 0 30px; }
.sub { font-size:25px; line-height:1.5; color:${MIST}; }
.foot { position:absolute; left:84px; bottom:46px; font-size:19px; letter-spacing:.04em;
  color:${RULE}; }
.mark { position:absolute; right:76px; top:50%; transform:translateY(-50%);
  width:${MARK_PX}px; height:${MARK_PX}px; }
</style></head><body>
  <div class="band"></div>
  <div class="text">
    <div class="kicker">Agentes Fidei</div>
    <div class="name">Magnifici<br>Agentes Fidei</div>
    <div class="rule"></div>
    <div class="sub">${sub}</div>
  </div>
  <div class="foot">magnifica.agentesfidei.org</div>
  <img class="mark" src="${mark}" alt="">
</body></html>`;

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);
  for (const cmd of candidates) {
    if (cmd.includes('/') && existsSync(cmd)) return cmd;
    // `command -v` through a shell is the portable check for a bare binary name.
    const found = path.join('/usr/bin', cmd);
    if (!cmd.includes('/') && existsSync(found)) return found;
    const snap = path.join('/snap/bin', cmd);
    if (!cmd.includes('/') && existsSync(snap)) return snap;
  }
  throw new Error('No Chrome/Chromium found. Set $CHROME to the binary.');
}

const chrome = findChrome();
const dir = await mkdtemp(path.join(tmpdir(), 'og-cards-'));

try {
  for (const card of CARDS) {
    const page = path.join(dir, `${card.lang}.html`);
    await writeFile(page, html(card.lang, card.sub));
    const out = path.join(OUT, card.file);
    await exec(chrome, [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${W},${H}`,
      '--virtual-time-budget=4000', // let the woff2 faces decode before the capture
      `--screenshot=${out}`,
      `file://${page}`,
    ]);
    const meta = await sharp(out).metadata();
    if (meta.width !== W || meta.height !== H) {
      throw new Error(`${card.file} rendered ${meta.width}x${meta.height}, expected ${W}x${H}`);
    }
    console.log(`${card.file}  ${meta.width}x${meta.height}  ${(await readFile(out)).length} bytes`);
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
