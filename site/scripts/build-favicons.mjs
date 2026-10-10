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
 * WHY THE MARK IS CROPPED. The master's artwork is portrait — 36x50 inside a 50x50 canvas, its
 * rays reaching the top edge and a thin stem leaving the bottom. Scaled to fit inside a SQUARE
 * favicon it therefore filled the full height but only 72% of the width, which is what made it
 * read as a small smudge in a browser tab. So the art is trimmed to its own bounding box and
 * scaled until its WIDTH fills FILL of the canvas, then cropped to a square around the centre:
 * the chalice, the host and the body of the rays now fill the icon, and what leaves the frame is
 * the ends of the extremities — the tall thin centre ray above and the stem below, both of which
 * the master already bleeds off its own edges. Lower FILL to bring the extremities back.
 *
 * The .ico is assembled here by hand because sharp cannot write the ICO container. The format
 * allows PNG payloads (valid in every browser that ran after Vista), so each size is resized
 * once and embedded as-is.
 *
 * SIZE CEILING: the master is 50x50 — the largest that exists. After the crop its artwork is
 * 36px wide, so 16/32 stay crisp and 48 and the 180px touch icon are upscales that read soft.
 * A master of 512px or more would fix that; nothing else in this file would change.
 *
 * GROUND: the mark is drawn for a dark background — its rays are cream, so on a white tab bar
 * they nearly disappear. iOS renders a transparent home-screen icon on black, so the touch icon
 * is flattened onto the site's own theme colour instead, the same #252525 Base.astro declares.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../../ops/brand/agentes-fidei-icon.png');
const OUT = path.resolve(here, '../public');
const TOUCH_BG = '#252525';
const ICO_SIZES = [16, 32, 48];
const ALPHA_FLOOR = 8; // ignore the near-invisible edge pixels when finding the art
const FILL = 0.96; // share of the canvas width the artwork occupies after cropping

const master = await readFile(SRC);
await mkdir(OUT, { recursive: true });

// Locate the artwork ourselves rather than with sharp's trim(): trim keys off the corner pixel
// and is unreliable for an alpha-only border, and this also lets FILL be reasoned about exactly.
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

const box = await artBox(master);
const trimmed = await sharp(master).extract(box).png().toBuffer();

async function render(size, flattenTo) {
  // 1. scale the trimmed art so its width is FILL of the canvas
  const targetW = Math.max(1, Math.round(size * FILL));
  const scaled = await sharp(trimmed).resize({ width: targetW }).png().toBuffer();
  const { height: scaledH } = await sharp(scaled).metadata();

  // 2. crop the overflow to a square of targetW, centred: the extremities leave the frame evenly
  const side = Math.min(targetW, scaledH);
  const top = Math.max(0, Math.round((scaledH - side) / 2));
  const cropped = await sharp(scaled)
    .extract({ left: 0, top, width: side, height: side })
    .png()
    .toBuffer();

  // 3. pad back to the exact canvas (transparent), then optionally flatten for the touch icon
  const pad = Math.max(0, Math.round((size - side) / 2));
  const right = Math.max(0, size - side - pad);
  let out = sharp(cropped).extend({
    top: pad,
    bottom: right,
    left: pad,
    right,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (flattenTo) out = out.flatten({ background: flattenTo });
  return out.png({ compressionLevel: 9 }).toBuffer();
}

await writeFile(path.join(OUT, 'favicon-32.png'), await render(32));
await writeFile(path.join(OUT, 'apple-touch-icon.png'), await render(180, TOUCH_BG));

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
  `art ${box.width}x${box.height} in ${box.left},${box.top} · fill ${FILL} · ` +
    `wrote favicon.ico (${ICO_SIZES.join(', ')}), favicon-32.png, apple-touch-icon.png on ${TOUCH_BG}`,
);
