// Bundle the minimal Pyodide runtime needed by Bet2Bot so exported Godot builds can
// run entirely offline. Keep this separate from the poker-engine bundler: these files
// come from the pinned `pyodide` npm package and change only on runtime upgrades.

import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "node_modules", "pyodide");
const destination = join(here, "..", "public", "pyodide");
const files = [
  "pyodide.mjs",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
for (const name of files) copyFileSync(join(source, name), join(destination, name));
console.log(`Bundled local Pyodide runtime (${files.length} files)`);
