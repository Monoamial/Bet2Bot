// Copies the pure-Python poker engine into public/engine/ so the Pyodide worker can
// load it into its virtual filesystem. Also writes a manifest of the files to fetch.
//
// Runs before `npm run dev` / `npm run build` (package.json scripts), and again on any
// poker/*.py change via the Vite watcher plugin in vite.config.ts.

import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const engineSrc = join(here, "..", "..", "poker"); // ../../poker
const outDir = join(here, "..", "public", "engine");
const pokerOut = join(outDir, "poker");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".py")) out.push(relative(outDir, full));
  }
  return out;
}

export function bundleEngine() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(pokerOut, { recursive: true });
  cpSync(engineSrc, pokerOut, {
    recursive: true,
    filter: (src) => statSync(src).isDirectory() || src.endsWith(".py"),
  });
  const files = walk(pokerOut).map((p) => p.split("\\").join("/")).sort();
  // GitHub Pages may cache each unversioned .py URL even after a new JS bundle
  // ships. Version the URLs by content so new workers always load one engine.
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file).update("\0").update(readFileSync(join(outDir, file)));
  }
  const version = hash.digest("hex").slice(0, 12);
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ version, files }, null, 2));
  return files;
}

export const pokerDir = engineSrc;

// When run directly (npm run bundle-engine), do the copy and log.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = bundleEngine();
  console.log(`Bundled ${files.length} engine files into public/engine/`);
}
