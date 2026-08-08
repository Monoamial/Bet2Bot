# Bet2Bot

A browser game that teaches poker by having you **build a bot from visual blocks** and
pit it against AI opponents — plus a **Learn** track (rules via playable hands) and a
**Play** mode (sit in the seat vs a bot). Teaching-first; see `DESIGN.md` for the vision
and `BACKLOG.md` for the SCRUM plan.

## Layout
- `poker/` — the Python engine (pure, dependency-light; runs in the browser via Pyodide).
- `game/` — the web app (Vite + React + TS). Engine is copied into `game/public/engine/`.
- `tests/` — pytest suite for the engine (`.venv/bin/python -m pytest`).
- `DESIGN.md` — living design doc (north star, tracks, concept ladder, roadmap).
- `BACKLOG.md` — SCRUM: epics, stories, sprint plan, Definition of Done.
- Root `equity_demo.py`, `Equitytest.py`, `run_simulation.py` — teaching/CLI scratch (keep).

## Run / test
```bash
.venv/bin/python -m pytest              # engine tests (create .venv + pip install -r requirements.txt first)
cd game && npm install && npm run dev   # web app on http://localhost:5173
cd game && npm run build                # type-check (tsc) + production build
```
Editing any `poker/*.py` auto-re-bundles the engine and reloads the page in dev (Vite
watcher in `game/vite.config.ts`). Outside dev, run `npm run bundle-engine`.

## Architecture (how a bot runs)
1. The visual builder produces a **Strategy** (TS types in `game/src/strategy/model.ts`);
   `compileStrategy()` turns it into a JSON **policy**.
2. A Pyodide **Web Worker** (`game/src/pyodide/matchWorker.ts`, driven by `bridge.ts`
   over an id-based RPC) calls `poker/game_api.py`.
3. `StrategyBot` (`poker/strategy.py`) interprets the policy and plays.
4. The hand itself is a **generator**, `play_hand_gen` (`poker/engine.py`), that yields
   whenever a seat must act. Two drivers consume it:
   - `play_hand` — batch play with bots (the Campaign, via `run_match`).
   - `InteractiveMatch` (`poker/interactive.py`) — human in one seat (Play / Academy).
5. `play_hand_gen` emits a JSON-able **event stream** (blinds/hole/action/board/showdown/
   award) used for animated replays (Campaign) and live rendering (Play).
6. Campaign results are multi-output: `run_match(curate=K)` keeps the player's K biggest
   wins/losses as **curated replays** (bounded-memory top-K heaps), and `run_level`
   returns the bankroll **timeline** that `WinningsGraph.tsx` animates, plus richer
   per-bot stats (win %, showdown %, biggest win/loss).

Opponents live in `poker/bots/` and are registered in `game_api.OPPONENTS`.

**Formats, stacks & game modes.** The engine plays **Limit or No-Limit**
(`GameConfig.betting`) with optional **stacks** (`GameConfig.stack`, or per-seat
`stacks=` on `play_hand(_gen)`) — all-ins, short calls, and layered **side pots** are
handled; with no stack configured, play is the classic unlimited teaching game and
behaves exactly as before. NL raises carry an amount ("raise TO X chips this street":
`"raise:12"` or `("raise", 12)`; a bare `"raise"` is a pot-sized raise), clamped to
`[min_raise_to, max_raise_to]` on the GameState. `run_session` (`poker/match.py`) is the
fixed-stack roll: seat 0 carries one stack until bust or the hand cap; opponents refill.
`InteractiveMatch` takes a *list* of opponents (multiway), `stack=`, and `carry=`
(survival). The Play tab (`GameModes.tsx`) exposes these as **game modes** — Classic
Limit (default, introductory), No-Limit heads-up (bet slider in `LivePlay.tsx`),
Survival, and a 6-max Limit table. One documented simplification: ANY raise reopens
action (no special under-raise all-in rule).

The **Academy** (Learn tab) is data-driven from `game/src/academy/lessons.ts`: MODULES of
lessons (read / quiz / hand / **scenario drill** / live play / bridge), rendered by
`Academy.tsx` with per-module progress in localStorage. Scenario drills
(`ScenarioDrill.tsx`) serve one-attempt decision spots with a score. Play lessons can pin
the dealer button (`InteractiveMatch(fixed_button=...)`) for in/out-of-position drills.

## Conventions
- **Teaching project** → favor readable, well-commented code over cleverness.
- Keep the engine **pure Python / dependency-light** so it keeps running in Pyodide
  (matplotlib is only used by the offline `poker/plotting.py`).
- **All engine changes must keep `pytest` green**; the generator refactor is covered by
  parity tests — don't diverge batch vs interactive behavior.
- The Campaign stays **Limit heads-up** (the four-action introductory game); formats,
  stacks, and multiway live behind **game modes** and engine config, not level defaults.
- Pot-odds is a weak lever in Limit (a single bet is almost always a cheap call) — it's
  supported in the interpreter but de-emphasized in the campaign unlocks.
