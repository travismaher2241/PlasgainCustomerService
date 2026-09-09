/**
 * Renders the home-screen and browser icons into public/icons/.
 *
 *   node scripts/make-web-icons.mjs
 *
 * Three shapes, because the platforms crop differently:
 *  - plain      the mark as drawn, rounded corners and all, for a browser tab
 *  - maskable   full bleed with the glyph pulled in, so Android can mask it to
 *               a circle, squircle or whatever the launcher uses without
 *               slicing the letter
 *  - apple      full bleed too: iOS rounds the corners itself, and rounding
 *               ours as well leaves a visible double edge
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeIcon } from "./icon.mjs";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const icons = [
  { file: "icon-192.png", size: 192, options: {} },
  { file: "icon-512.png", size: 512, options: {} },
  // Android crops maskable icons to the middle 80%, so the glyph is scaled to
  // sit inside that safe zone rather than losing its edges to the mask.
  { file: "maskable-192.png", size: 192, options: { fullBleed: true, glyphScale: 0.72 } },
  { file: "maskable-512.png", size: 512, options: { fullBleed: true, glyphScale: 0.72 } },
  { file: "apple-touch-icon.png", size: 180, options: { fullBleed: true, glyphScale: 0.82 } }
];

for (const { file, size, options } of icons) {
  writeFileSync(join(outDir, file), makeIcon(size, options));
  console.log(`wrote public/icons/${file} (${size}x${size})`);
}
