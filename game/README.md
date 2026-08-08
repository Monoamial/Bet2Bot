# Bet2Bot — the game

A browser game where you write a poker bot in real Python and face a campaign of AI
opponents. The player's bot and the entire poker engine run **client-side in the browser
via Pyodide** (CPython → WebAssembly) — no server, no install.

## Run it

```bash
cd game
npm install
npm run dev        # opens on http://localhost:5173 (auto-bundles the engine first)
```

Then edit the bot in the in-game editor and hit **Run**. First load fetches the Pyodide
runtime from a CDN (a few seconds); afterwards runs are instant.

```bash
npm run build      # type-check + production build into dist/
```

## How it fits together

```
poker/ (Python engine)  ──bundle_engine.mjs──►  game/public/engine/  ──fetched by──►
  Pyodide worker (src/pyodide/matchWorker.ts)  ──runs──►  poker.game_api.run_level(...)
  ──returns JSON (stats + recorded hands)──►  React UI (table replay + stats)
```

- **`src/pyodide/`** — `matchWorker.ts` loads Pyodide + the engine and runs a level off
  the main thread; `bridge.ts` wraps it with a wall-clock timeout that kills and restarts
  a runaway bot.
- **`src/components/`** — `Editor` (CodeMirror), `PokerTable` (animated event replay),
  `StatsPanel`, `LessonPanel`.
- **`src/campaign/levels.ts`** — level data (opponent, objective, starter code, lesson).
  Add levels here.
- **`poker/game_api.py`** — the Python entry point the worker calls: compiles the player's
  `decide(state)` bot, runs a heads-up match vs a named opponent, returns a JSON-able
  result. The opponent roster reuses the premade bots in `poker/bots/`.

The engine emits a structured **event stream** (see `record_events` in
`poker/engine.py`) that the table animates. `scripts/bundle_engine.mjs` copies the Python
package into `public/engine/` and runs automatically before `dev`/`build`.

## Status

Milestone 1 (vertical slice): one playable level — beat **The Caller** — end to end.
Next: the full 5-level tutorial campaign, polish, then a PVP ladder (needs a backend to
sandbox other players' bot code). See the project plan.
