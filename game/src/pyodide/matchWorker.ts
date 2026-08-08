/// <reference lib="webworker" />
/// <reference types="vite/client" />
// Web Worker: loads Pyodide + the poker engine, then serves RPC calls (run a level,
// or drive an interactive human-vs-bot match). Running off the main thread keeps the UI
// responsive and lets the main thread terminate a runaway bot.

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodide: any = null;
let api: any = null;

function post(msg: any) {
  (self as unknown as Worker).postMessage(msg);
}

// Respect Vite's base path so the engine also loads when the app is served from a
// subpath (e.g. GitHub Pages at /Bet2Bot/). BASE_URL is "/" in dev.
const ENGINE_BASE = `${import.meta.env.BASE_URL}engine`;

async function loadEngine() {
  const manifest = await (await fetch(`${ENGINE_BASE}/manifest.json`)).json();
  const root = "/engine_root";
  for (const rel of manifest.files as string[]) {
    const source = await (await fetch(`${ENGINE_BASE}/${rel}`)).text();
    const full = `${root}/${rel}`;
    pyodide.FS.mkdirTree(full.slice(0, full.lastIndexOf("/")));
    pyodide.FS.writeFile(full, source);
  }
  pyodide.runPython(`import sys; sys.path.insert(0, "${root}")`);
  api = pyodide.runPython(`
import json
from poker.game_api import run_level, run_session, human_new, human_deal, human_act

class _Api:
    def run(self, req_json):
        r = json.loads(req_json)
        return json.dumps(run_level(
            opponent=r["opponent"], strategy=r["strategy"], hands=r["hands"],
            seed=r.get("seed"), capture=r.get("capture", 6), config=r.get("config")))
    def run_session(self, req_json):
        r = json.loads(req_json)
        return json.dumps(run_session(
            opponent=r["opponent"], strategy=r["strategy"], stack=r["stack"],
            max_hands=r.get("maxHands", 500), seed=r.get("seed"),
            capture=r.get("capture", 6), config=r.get("config")))
    def human_new(self, req_json):
        r = json.loads(req_json)
        return json.dumps(human_new(
            r["opponents"], seed=r.get("seed"), config=r.get("config"),
            fixed_button=r.get("fixedButton"), stack=r.get("stack"),
            carry=r.get("carry", False)))
    def human_deal(self):
        return json.dumps(human_deal())
    def human_act(self, action):
        return json.dumps(human_act(action))

_Api()
`);
}

async function init() {
  post({ type: "status", message: "loading Python runtime…" });
  const mod = await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`);
  pyodide = await mod.loadPyodide({ indexURL: PYODIDE_URL });
  post({ type: "status", message: "loading poker engine…" });
  await loadEngine();
  post({ type: "ready" });
}

const ready = init().catch((e) => {
  post({ type: "error", message: `Failed to start: ${e?.message ?? e}` });
});

function dispatch(cmd: string, p: any): string {
  switch (cmd) {
    case "run":
      return api.run(JSON.stringify(p));
    case "run_session":
      return api.run_session(JSON.stringify(p));
    case "human_new":
      return api.human_new(JSON.stringify(p));
    case "human_deal":
      return api.human_deal();
    case "human_act":
      return api.human_act(p.action);
    default:
      throw new Error(`unknown cmd: ${cmd}`);
  }
}

self.onmessage = async (event: MessageEvent<any>) => {
  await ready;
  const { id, cmd, payload } = event.data;
  if (!api) { post({ id, type: "error", message: "engine not ready" }); return; }
  try {
    post({ id, type: "result", data: JSON.parse(dispatch(cmd, payload)) });
  } catch (e: any) {
    post({ id, type: "error", message: e?.message ?? String(e) });
  }
};
