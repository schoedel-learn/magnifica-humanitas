#!/usr/bin/env node
/**
 * Regenerates the favicon set in site/public from the master icon.
 *
 *   cd site && node scripts/build-favicons.mjs
 *
 * Why a script rather than a one-off conversion: the master is a single raster PNG and the set
 * has to stay consistent with it. Re-run this after replacing the master and every size is
 * rebuilt from the same source with the same geometry.
 *
 * SHAPE. The artwork is trimmed to its own bounding box and then scaled to COVER a square of
 * FILL x the canvas, cropping the overflow evenly on the long side. Cover is the right fit for a
 * favicon: it is what makes the mark fill the icon whatever the master's aspect ratio. An
 * earlier master was portrait and, scaled to FIT instead, filled the full height but only 72% of
 * the width, which read as a smudge in a browser tab.
 *
 * VEIL. A master whose background is "transparent" is often only nearly so — this one's corners
 * sit at alpha 28, a faint square tint that is invisible on white and shows as a dirty halo over
 * the dark grounds below. The alpha channel is therefore levelled against the corner value
 * before anything else, which removes the veil and leaves the object's own soft edge intact.
 *
 * The .ico is assembled here by hand because sharp cannot write the ICO container. The format
 * allows PNG payloads (valid in every browser that ran after Vista), so each size is resized
 * once and embedded as-is.
 *
 * GROUND. Every icon is composited on the site's own #252525 — the colour Base.astro already
 * declares as the bar and as the theme — not just the home-screen icon. The mark is a pale cream
 * wafer with white highlights, so a transparent version disappears against a light browser tab:
 * rendered on white at 32px, the disc and its christogram wash out almost completely, while the
 * same pixels on #252525 read at once. On a dark browser the tile is indistinguishable from the
 * chrome, so the wafer appears to float — the transparent look, without the risk. Because the
 * disc is round, the tile's corners stay ground-coloured, which is what gives the icon its
 * circular edge without any masking.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../../ops/brand/communion.png');
const OUT = path.resolve(here, '../public');
const GROUND = '#252525';
const ICO_SIZES = [16, 32, 48];
const ALPHA_FLOOR = 8; // ignore near-invisible edge pixels when finding the art
const FILL = 0.96; // share of the canvas the artwork covers

const master = await readFile(SRC);
await mkdir(OUT, { recursive: true });

// Level the alpha channel against the corner value, removing a near-transparent background veil.
// A corner of 0 means the master is already clean; 250 or more means the background is opaque and
// deliberate, so it is left alone in either case.
async function levelAlpha(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const corner = Math.max(
    data[3],
    data[(w - 1) * c + 3],
    data[(h - 1) * w * c + 3],
    data[((h - 1) * w + w - 1) * c + 3],
  );
  if (corner === 0 || corner >= 250) return { buf, corner };
  const scale = 255 / (255 - corner);
  for (let i = 3; i < data.length; i += c) {
    data[i] = Math.min(255, Math.round(Math.max(0, data[i] - corner) * scale));
  }
  const out = await sharp(data, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
  return { buf: out, corner };
}

// Locate the artwork's own bounding box. Not sharp's trim(): trim keys off the corner pixel and
// is unreliable for an alpha-only border, and measuring here lets FILL be reasoned about exactly.
async function artBox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * c + 3] > ALPHA_FLOOR) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`${SRC} appears to be fully transparent`);
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const leveled = await levelAlpha(master);
const box = await artBox(leveled.buf);
const trimmed = await sharp(leveled.buf).extract(box).png().toBuffer();

async function render(size) {
  // 1. cover a square of FILL x the canvas — the long side overflows and is cropped evenly
  const side = Math.max(1, Math.round(size * FILL));
  const covered = await sharp(trimmed)
    .resize(side, side, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  // 2. pad back to the exact canvas, then composite on the ground (see GROUND above). Two passes
  // on purpose: sharp applies flatten() before extend(), so a single chain leaves the padding
  // transparent — the margin has to exist in a buffer before it can be flattened.
  const pad = Math.max(0, Math.round((size - side) / 2));
  const rest = Math.max(0, size - side - pad);
  const padded = await sharp(covered)
    .extend({
      top: pad,
      bottom: rest,
      left: pad,
      right: rest,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return sharp(padded)
    .flatten({ background: GROUND })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await writeFile(path.join(OUT, 'favicon-32.png'), await render(32));
await writeFile(path.join(OUT, 'apple-touch-icon.png'), await render(180));

const entries = [];
for (const size of ICO_SIZES) entries.push({ size, buf: await render(size) });

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = icon
header.writeUInt16LE(entries.length, 4);

const dir = [];
let offset = 6 + entries.length * 16;
for (const e of entries) {
  const d = Buffer.alloc(16);
  d.writeUInt8(e.size >= 256 ? 0 : e.size, 0); // width  (0 means 256)
  d.writeUInt8(e.size >= 256 ? 0 : e.size, 1); // height
  d.writeUInt8(0, 2); // palette entries
  d.writeUInt8(0, 3); // reserved
  d.writeUInt16LE(1, 4); // colour planes
  d.writeUInt16LE(32, 6); // bits per pixel
  d.writeUInt32LE(e.buf.length, 8); // payload bytes
  d.writeUInt32LE(offset, 12); // payload offset
  offset += e.buf.length;
  dir.push(d);
}

await writeFile(
  path.join(OUT, 'favicon.ico'),
  Buffer.concat([header, ...dir, ...entries.map((e) => e.buf)]),
);

console.log(
  `art ${box.width}x${box.height} at ${box.left},${box.top} · veil ${leveled.corner} · fill ${FILL} · ` +
    `wrote favicon.ico (${ICO_SIZES.join(', ')}), favicon-32.png, apple-touch-icon.png on ${GROUND}`,
);
