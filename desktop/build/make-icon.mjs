/**
 * Renders the app mark to PNG for the desktop installer.
 *
 * The repository holds no image assets — the only brand mark is the inline SVG
 * favicon in index.html — and electron-builder needs a real raster file. This
 * redraws that same mark rather than inventing a second one, so the taskbar icon
 * matches the browser tab.
 *
 * It is a placeholder: drop the real Plasgain logo in as icon.png (512x512 or
 * larger, square) and this script never has to run again.
 *
 *   node desktop/build/make-icon.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INK = [0x08, 0x0a, 0x09]; // #080A09, the favicon's ground
const BRAND = [0x00, 0xa6, 0x51]; // #00A651, Plasgain green

/** The favicon's viewBox is 32 units square; every figure below is in those units. */
const VIEW = 32;
const SAMPLES = 4; // supersampling per axis, so curves do not stair-step

/** Rounded rect (0,0,32,32) with r=4, matching the favicon's background. */
function inBackground(x, y) {
  const r = 4;
  if (x < 0 || y < 0 || x > VIEW || y > VIEW) return false;
  const cx = x < r ? r : x > VIEW - r ? VIEW - r : x;
  const cy = y < r ? r : y > VIEW - r ? VIEW - r : y;
  if (cx === x || cy === y) return true; // straight edges and the middle
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r; // the four corners
}

/**
 * The "P": a stem, a block beside it, and a semicircular bowl, less the counter.
 * Traced from the favicon path so the two marks stay identical.
 */
function inGlyph(x, y) {
  const stem = x >= 9 && x <= 13 && y >= 8 && y <= 24;
  const block = x >= 13 && x <= 16.5 && y >= 8 && y <= 19;
  const bowl = x >= 16.5 && (x - 16.5) ** 2 + (y - 13.5) ** 2 <= 5.5 ** 2;
  if (!(stem || block || bowl)) return false;

  const counterBlock = x >= 13 && x <= 16.2 && y >= 11.1 && y <= 15.5;
  const counterArc = x >= 16.2 && (x - 16.2) ** 2 + (y - 13.3) ** 2 <= 2.2 ** 2;
  return !(counterBlock || counterArc);
}

function renderRgba(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const step = VIEW / size / SAMPLES;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let background = 0;
      let glyph = 0;

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px * VIEW) / size + (sx + 0.5) * step;
          const y = (py * VIEW) / size + (sy + 0.5) * step;
          if (!inBackground(x, y)) continue;
          background++;
          if (inGlyph(x, y)) glyph++;
        }
      }

      const total = SAMPLES * SAMPLES;
      const offset = (py * size + px) * 4;
      if (background === 0) continue; // stays fully transparent outside the tile

      // Coverage blends glyph over ground, so the curve edges are smooth.
      const glyphRatio = glyph / background;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.round(
          INK[channel] * (1 - glyphRatio) + BRAND[channel] * glyphRatio
        );
      }
      pixels[offset + 3] = Math.round((background / total) * 255);
    }
  }
  return pixels;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

function encodePng(size, rgba) {
  // One filter byte (0 = none) in front of every scanline, as the format requires.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const here = dirname(fileURLToPath(import.meta.url));
for (const size of [512, 256]) {
  const name = size === 512 ? "icon.png" : "icon-256.png";
  writeFileSync(join(here, name), encodePng(size, renderRgba(size)));
  console.log(`wrote desktop/build/${name} (${size}x${size})`);
}
