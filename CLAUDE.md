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
   award) used for animated replays (Campaign) and live rendering (Play). Showdown
   events also carry `best_five` (the exact five playing cards per revealed seat), so
   live play can highlight winning cards and explain the hand category alongside losers.
   `LivePlay` presents the event stream **one event at a time** (with Skip to decision),
   including blinds, per-street runout, chips/bet stacks, and pot awards; keep human
   input gated until playback reaches a decision.
6. Campaign objectives live in `game/src/campaign/objectives.ts`: each level has a
   named progression check and optional stretch stars. Existing Limit gates retain
   strict bb/100 > 10; the fourth level runs `run_session` with a 50-chip carried
   No-Limit stack vs the Over-folder and requires 200 hands without busting.
   The graph switches from net winnings to stack for this level. The Campaign
   persists personal-best objective stars in `b2b.campaign.bestStars.v1`; result
   screens still score the current run independently.
7. Campaign results are multi-output: `run_match(curate=K)` keeps the player's K biggest
   wins/losses as **curated replays** (bounded-memory top-K heaps), and `run_level`
   returns the bankroll **timeline** that `WinningsGraph.tsx` animates, plus richer
   per-bot stats (win %, showdown %, biggest win/loss). `Stats.record` also
   aggregates each complete hand's net once by its ending street and once by the
   player's final made-hand tier, even without replay capture; the Results panel
   displays these as **outcome** breakdowns, not per-street EV/causal leaks.

Opponents live in `poker/bots/` and are registered in `game_api.OPPONENTS`.
The free-play picker includes three explicitly exploitable archetypes in
`poker/bots/archetypes.py`: River Bluffer, Over-folder, and Trapper; these do not
silently change the Campaign's original opponent order.

Postflop block rules can set an optional `raiseSize` (`small`/half pot, `pot`,
`overbet`/double pot), which `StrategyBot` interprets as a No-Limit raise-to after
calling; the engine clamps it to the legal window. Limit ignores size metadata and
legacy bare raises retain their usual pot-sized No-Limit default. A single optional
`preflopRaiseSize` applies to all raised classes in the grid in No-Limit; individual
class sizing is not yet exposed. See `game/src/strategy/model.ts`.

**Formats, stacks & game modes.** The engine plays **Limit or No-Limit**
(`GameConfig.betting`) with optional **stacks** (`GameConfig.stack`, or per-seat
`stacks=` on `play_hand(_gen)`) — all-ins, short calls, and layered **side pots** are
handled; with no stack configured, play is the classic unlimited teaching game and
behaves exactly as before. NL raises carry an amount ("raise TO X chips this street":
`"raise:12"` or `("raise", 12)`; a bare `"raise"` is a pot-sized raise), clamped to
`[min_raise_to, max_raise_to]` on the GameState. `run_session` (`poker/match.py`) is the
fixed-stack roll: seat 0 carries one stack until bust or the hand cap; opponents refill.
`tools/calibrate_objectives.py` can compare baseline and taught policies across seeds,
printing a recommended bb/100 or survival-hands threshold **only if** their 90th/10th
percentile bands do not overlap; it does not silently edit live objectives.
`InteractiveMatch` takes a *list* of opponents (multiway), `stack=`, and `carry=`
(survival). The Play tab (`GameModes.tsx`) exposes these as **game modes** — Classic
Limit (default, introductory), No-Limit and Pot-Limit heads-up (sized bet controls
in `LivePlay.tsx`; Pot-Limit caps raises at the pot after calling), Survival,
and a 6-max Limit table with seats around the felt and the dealer button
rotating. The campaign's Survivor boss uses the same session primitive with a
smaller, 50-chip stack and a calibrated counter-strategy hint. One documented simplification: ANY raise reopens
action (no special under-raise all-in rule).

The **Academy** (Learn tab) is data-driven from `game/src/academy/lessons.ts`: MODULES of
lessons (read / quiz / hand / **scenario drill** / live play / bridge), rendered by
`Academy.tsx` with per-module progress in localStorage. Scenario drills
(`ScenarioDrill.tsx`) serve one-attempt decision spots with a score. Scored
quiz/hand/drill lessons earn 1–3 mastery stars (best per lesson persists in
`b2b.academy.mastery` separately from completion), shown on the lesson and module map. Four scenario
lessons use curated rank-changing variants (`academy/randomize.ts`); pairs that teach
position share the same deal, and one attempt keeps its cards until Retry. The
standalone Puzzles tab uses the same safe templates, with a local practice rating and
streak (`b2b.puzzles.v1`); missed templates are queued for retry after a few
other puzzles. This is a practice score, **not** calibrated Elo. Play
lessons can pin the dealer button (`InteractiveMatch(fixed_button=...)`) for
in/out-of-position drills. A new **Read the opponent** module practices range inference
against the River Bluffer, Over-folder, and Trapper; its spots have tested,
rank-changing variants. A **Read the board** module introduces dry/wet textures,
flush completion, and contextual hand strength (with authored introductory spots). Value/discipline lesson bridges pre-fill only the matching
rules in a **copy** of the current campaign strategy (`applyLessonBridge`), leaving
unrelated user choices untouched; the basic bridge only navigates. The sixth module
adds No-Limit price/pot-odds content (`SizingDrill.tsx`) and two live hands with
sized raises; previous introductory Limit lessons are intentionally unchanged.

## Conventions
- **Teaching project** → favor readable, well-commented code over cleverness.
- Keep the engine **pure Python / dependency-light** so it keeps running in Pyodide
  (matplotlib is only used by the offline `poker/plotting.py`). The Pyodide runtime
  is already self-hosted from `game/public/pyodide` by `bundle_runtime.mjs`, not
  fetched from a CDN; `bundle_engine.mjs` fingerprints the engine files in the
  manifest, and the worker requests the manifest without browser caching then
  fetches Python files with that content version in the URL. This avoids stale
  engine/JS mismatches on GitHub Pages after a deploy.
- **All engine changes must keep `pytest` green**; the Pages build runs Python
  tests and `cd game && npm test` (Node's TypeScript-stripping unit tests) before
  deployment, then builds with `--base=/Bet2Bot/`. The generator refactor is covered by
  parity tests — don't diverge batch vs interactive behavior.
- The Campaign stays **Limit heads-up** (the four-action introductory game); formats,
  stacks, and multiway live behind **game modes** and engine config, not level defaults.
- Pot-odds is a weak lever in Limit (a single bet is almost always a cheap call) — it's
  supported in the interpreter but de-emphasized in the campaign unlocks.
