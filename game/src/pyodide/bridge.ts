// Main-thread RPC wrapper around the Pyodide worker. Handles startup status, a
// wall-clock timeout for runaway bots (terminate + respawn), and typed calls for both
// level runs and interactive play.

import type { LevelResult, RunRequest } from "../engine-api/types";

const CALL_TIMEOUT_MS = 20_000;

interface Pending {
  resolve: (r: any) => void;
  reject: (e: Error) => void;
  timer: number;
}

export class EngineBridge {
  private worker: Worker | null = null;
  private ready = false;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private onStatus: (msg: string) => void;
  private onReady: () => void;

  constructor(opts: { onStatus?: (msg: string) => void; onReady?: () => void } = {}) {
    this.onStatus = opts.onStatus ?? (() => {});
    this.onReady = opts.onReady ?? (() => {});
    this.spawn();
  }

  private spawn() {
    this.worker = new Worker(new URL("./matchWorker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (e: MessageEvent<any>) => this.handle(e.data);
    this.worker.onerror = (e) => this.failAll(new Error(e.message || "worker error"));
  }

  private handle(msg: any) {
    if (msg.type === "status") { this.onStatus(msg.message); return; }
    if (msg.type === "ready") { this.ready = true; this.onReady(); return; }
    if (typeof msg.id === "number") {
      const p = this.pending.get(msg.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      if (msg.type === "result") p.resolve(msg.data);
      else p.reject(new Error(msg.message));
    }
  }

  private failAll(err: Error) {
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(err); }
    this.pending.clear();
  }

  private call<T>(cmd: string, payload: unknown): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        // Runaway bot: kill and rebuild the worker so the app stays usable.
        this.worker?.terminate();
        this.ready = false;
        this.failAll(new Error("The engine took too long (possible infinite loop). Restarted it."));
        this.spawn();
      }, CALL_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ id, cmd, payload });
    });
  }

  runLevel(req: RunRequest): Promise<LevelResult> {
    return this.call<LevelResult>("run", req);
  }
  /** fixedButton pins the dealer button (0 = you, 1 = opponent) every hand. */
  humanNew(opponent: string, seed?: number, fixedButton?: 0 | 1): Promise<any> {
    return this.call("human_new", {
      opponent, seed: seed ?? null, fixed_button: fixedButton ?? null,
    });
  }
  humanDeal(): Promise<any> {
    return this.call("human_deal", {});
  }
  humanAct(action: string): Promise<any> {
    return this.call("human_act", { action });
  }

  isReady() { return this.ready; }
}
