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

Opponents live in `poker/bots/` and are registered in `game_api.OPPONENTS`.

## Conventions
- **Teaching project** → favor readable, well-commented code over cleverness.
- Keep the engine **pure Python / dependency-light** so it keeps running in Pyodide
  (matplotlib is only used by the offline `poker/plotting.py`).
- **All engine changes must keep `pytest` green**; the generator refactor is covered by
  parity tests — don't diverge batch vs interactive behavior.
- Limit Hold'em, heads-up-focused; intentional simplifications: **no all-in / side pots**
  (see `poker/engine.py` header).
- Pot-odds is a weak lever in Limit (a single bet is almost always a cheap call) — it's
  supported in the interpreter but de-emphasized in the campaign unlocks.
