/**
 * Renders the app mark to PNG for the desktop installer.
 *
 * The mark itself lives in scripts/icon.mjs, shared with the web icons so the
 * taskbar, the phone home screen and the browser tab cannot drift apart.
 *
 *   node desktop/build/make-icon.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { makeIcon } from "../../scripts/icon.mjs";

const here = dirname(fileURLToPath(import.meta.url));

for (const size of [512, 256]) {
  const name = size === 512 ? "icon.png" : "icon-256.png";
  writeFileSync(join(here, name), makeIcon(size));
  console.log(`wrote desktop/build/${name} (${size}x${size})`);
}
