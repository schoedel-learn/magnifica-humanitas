#!/usr/bin/env node
/**
 * Regenerates the favicon set in site/public from the master icon.
 *
 *   cd site && node scripts/build-favicons.mjs
 *
 * Why a script rather than a one-off conversion: the master is a single raster PNG and the set
 * has to stay consistent with it. Re-run this after replacing the master (bump SRC's file if the
 * name changes) and every size is rebuilt from the same source with the same sampling.
 *
 * The .ico is assembled here by hand because sharp cannot write the ICO container. The format
 * allows PNG payloads (valid in every browser that ran after Vista), so each size is resized
 * once and embedded as-is.
 *
 * SIZE CEILING: the master is 50x50 — the largest that exists. 16/32/48 are downscales and stay
 * crisp. apple-touch-icon at 180 is a 3.6x upscale and reads soft on a phone home screen; supply
 * a master of 512px or more and re-run to fix it.
 *
 * GROUND: the icon is drawn for a dark background — its rays are cream, so on a white tab bar
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

const master = await readFile(SRC);
await mkdir(OUT, { recursive: true });

function png(size, flattenTo) {
  let img = sharp(master).resize(size, size, { fit: 'contain' });
  if (flattenTo) img = img.flatten({ background: flattenTo });
  return img.png({ compressionLevel: 9 }).toBuffer();
}

await writeFile(path.join(OUT, 'favicon-32.png'), await png(32));
await writeFile(path.join(OUT, 'apple-touch-icon.png'), await png(180, TOUCH_BG));

const entries = [];
for (const size of ICO_SIZES) entries.push({ size, buf: await png(size) });

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

console.log(`wrote favicon.ico (${ICO_SIZES.join(', ')}), favicon-32.png, apple-touch-icon.png on ${TOUCH_BG}`);
