/**
 * The Plasgain app mark, drawn to PNG.
 *
 * One source for every icon the app ships — the desktop installer, the home
 * screen on a phone, the browser tab — so they cannot drift apart. The geometry
 * is traced from the inline SVG favicon in index.html, which was the only
 * brand mark this repository held.
 *
 * Placeholder art: drop the real Plasgain logo in over the generated files and
 * none of this needs to run again.
 */
import { deflateSync } from "node:zlib";

const INK = [0x08, 0x0a, 0x09]; // #080A09
const BRAND = [0x00, 0xa6, 0x51]; // #00A651

/** The favicon's viewBox is 32 units square; every figure below is in those units. */
const VIEW = 32;
const SAMPLES = 4; // supersampling per axis, so the curves do not stair-step

/** Rounded rect (0,0,32,32) with r=4, matching the favicon's background. */
function inRoundedTile(x, y) {
  const r = 4;
  if (x < 0 || y < 0 || x > VIEW || y > VIEW) return false;
  const cx = x < r ? r : x > VIEW - r ? VIEW - r : x;
  const cy = y < r ? r : y > VIEW - r ? VIEW - r : y;
  if (cx === x || cy === y) return true;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/**
 * The "P": a stem, a block beside it, and a semicircular bowl, less the counter.
 * Traced from the favicon path so every rendering of the mark is identical.
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

/**
 * @param {number} size pixels square
 * @param {object} [options]
 * @param {boolean} [options.fullBleed] Fill the whole square instead of using
 *   rounded corners. Android masks maskable icons into its own shape and iOS
 *   applies its own squircle, so both want the ground edge to edge — rounded
 *   corners of our own would be visibly clipped inside theirs.
 * @param {number} [options.glyphScale] Shrink the glyph about the centre, to
 *   keep it inside the safe zone those masks crop to.
 */
export function renderRgba(size, options = {}) {
  const { fullBleed = false, glyphScale = 1 } = options;
  const pixels = Buffer.alloc(size * size * 4);
  const step = VIEW / size / SAMPLES;
  const centre = VIEW / 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let ground = 0;
      let glyph = 0;

      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = (px * VIEW) / size + (sx + 0.5) * step;
          const y = (py * VIEW) / size + (sy + 0.5) * step;
          if (!(fullBleed || inRoundedTile(x, y))) continue;
          ground++;

          const gx = (x - centre) / glyphScale + centre;
          const gy = (y - centre) / glyphScale + centre;
          if (inGlyph(gx, gy)) glyph++;
        }
      }

      if (ground === 0) continue; // transparent outside the tile
      const offset = (py * size + px) * 4;
      const glyphRatio = glyph / ground;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.round(
          INK[channel] * (1 - glyphRatio) + BRAND[channel] * glyphRatio
        );
      }
      pixels[offset + 3] = Math.round((ground / (SAMPLES * SAMPLES)) * 255);
    }
  }
  return pixels;
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

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

export function encodePng(size, rgba) {
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

/** Convenience: render and encode in one call. */
export function makeIcon(size, options) {
  return encodePng(size, renderRgba(size, options));
}
