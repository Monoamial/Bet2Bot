# Bet2Bot — Backlog

A **register of open work** — what's left to build, organized so we can plan. This is
forward-looking only; it does not track "done." (What already exists and how it works is
documented in `CLAUDE.md`; the *why*/vision is in `DESIGN.md`. The staged
puzzle/stack/bot-lab execution plan is in `BUILDOUT_PLAN.md`.)

**How to use:** pick from the Board (Now → Next → Later); when a task ships, delete it from
this register rather than marking it complete. Keep entries as concrete, actionable ideas.

**Priority:** P0 (now) · P1 (next) · P2 (later). **Size:** S / M / L.

## Working agreement — Definition of Done
- `pytest` green; `cd game && npm run build` clean (tsc + build).
- New engine behavior covered by tests; batch vs interactive parity preserved.
- UI changes verified in the browser at a normal viewport.
- No dead code left behind; `CLAUDE.md` / `DESIGN.md` updated if architecture/vision moved.

---

## A — Academy: rich lessons & drills (chess.com-style)
Goal: a real learning section — structured modules that teach a concept, drill it, then let
you apply it live. The next learning slice follows the knockout/stack engine.

| ID | Task | Pri | Size |
|----|------|-----|------|
| A2 | Individual content passes on the 5 original modules — they're a decent skeleton but each needs dedicated work (depth, better spots, visuals); plus new topics: deeper equity and bankroll (hand reading/board texture now have first modules) | P1 | L |
| A7 | Extend the new value/discipline builder bridges to Position (needs a safe combined facing-bet + position rule) and No-Limit sizing once those campaigns exist; show a diff/confirmation when replacing a user's custom rule | P1 | M |
| A11 | Grow Puzzles beyond the curated Academy scenario pool: randomized pot-odds/board-texture spots, calibrated difficulty and more nuanced spaced repetition (missed templates now return after a few other puzzles; rating is still an uncalibrated practice score) | P1 | L |
| A14 | Add stack/short-stack and elimination puzzles using the shipped standardized fact panel; use actual legal action/raise windows from seeded engine states; teach bust-risk, all-ins, and side pots without claiming strategy-optimal choices from a generic solver. | P1 | L |
| A12 | Expand introductory No-Limit sizing module: more size/price spots, randomized pot-odds numbers (validated mathematically), and a bridge that pre-fills an NL builder rule once NL campaign play exists | P1 | M |

## B — Campaign: creative bots & gated bot-building
Goal: a rich campaign that slowly teaches you to build a more effective bot, and *feels*
like improving. Each opponent is a creative, exploitable character.

| ID | Task | Pri | Size |
|----|------|-----|------|
| B1 | Continue creative roster beyond the three new free-play styles (River Bluffer, Over-folder, Trapper): Nit/LAG/Adaptive/Balanced, dialogue/personality descriptions and themed campaign bosses | P1 | L |
| B2 | **Gated builder**: reveal streets/conditions/tools gradually per level; re-tune gates as they change | P1 | M |
| B3 | More levels — each new tool/concept paired with a boss that punishes ignoring it | P1 | M |
| B4 | Progression feel beyond the new personal-best stars: unlock moments, difficulty ramp, "you're improving" feedback/rewards | P1 | M |
| B5 | Creative boss ideas backlog (e.g. over-folds-to-3bets, min-raise trapper, check-raising paired boards) | P2 | S |
| B6 | Playtest/calibrate every new archetype with multiple seeds and candidate counter-strategies before promoting it to a Campaign level; the initial River Bluffer/Trapper versions are deliberately tough and an unchanged Level 1 strategy loses badly | P1 | M |

## C — Results & analytics (multi-output)
Goal: go beyond the shipped net/hand-tier and ending-street outcome groups toward
advice about *which decisions* lost value.

| ID | Task | Pri | Size |
|----|------|-----|------|
| C5 | Decision-level leak/EV analysis rather than outcome-only buckets: isolate costly calls, missed value, and pot odds with seeded test fixtures; current breakdown attributes each whole hand to its ending street and made tier | P1 | L |

## D — Metrics rework
Goal: evolve past bb/100 as *the* measure. The Campaign now has named objective
checks/stars, plus a fixed-stack 200-hand survival boss; more metrics and mastery remain.

| ID | Task | Pri | Size |
|----|------|-----|------|
| D3 | Extend `tools/calibrate_objectives.py` with authored candidate counter-policies per boss, larger held-out seed sets and automated level-threshold proposal/update; current diagnostic harness only recommends when baseline/counter percentiles separate | P2 | M |
| D4 | Extend the shipped named-objective/star framework to Academy drills and EV once an EV metric exists; Campaign already persists personal-best objective stars, while Academy tracks best lesson mastery separately | P1 | M |

## E — Formats & table expansion
Goal: grow beyond heads-up Limit. (Engine + game modes shipped: No-Limit with sized
raises, stacks/all-ins/side pots, multiway, Survival; Classic Limit stays the default.)

| ID | Task | Pri | Size |
|----|------|-----|------|
| E3 | Surface table config (blinds, stacks, players, format) in the game-mode UI (custom mode) | P2 | S |
| E6 | Multiway position conditions in the builder (early/middle/late, not just IP/OOP) | P2 | M |
| E10 | Optional per-hand-class No-Limit preflop raise sizes (current selector sets one size for all raised classes) | P2 | M |
| E11 | Update the versioned Godot integration API's format validation/descriptor to include Pot-Limit, after the Godot package is refreshed; the web engine/Play mode already support it | P2 | S |
| E12 | Finish true manual elimination mode: batch knockout core now carries **all** stacks, removes busted seats, rotates button and conserves chips with side pots (not yet a Play mode). Next implement matching interactive driver + stable seat IDs, live UI/player knockouts/last-survivor screen, batch/interactive parity and replay; don't enable stateful history bots until the seat-index contract is consistent. | P1 | L |
| E8 | Expand the new No-Limit sizing Academy module and Survival Campaign boss into further formats: 6-max positional Academy play, multiway campaign puzzles, and more NL bosses; calibrate objectives before gating | P1 | L |

## F — Interactive play enhancements
| ID | Task | Pri | Size |
|----|------|-----|------|
| F2 | Post-hand coaching/diagnosis ("you paid off X% of rivers with one pair") | P1 | M |
| F3 | "Play vs any bot" sandbox polish (choose format/stack/opponent) | P2 | S |

## G — Deeper strategy model
| ID | Task | Pri | Size |
|----|------|-----|------|
| G2 | Draw detection + draw tiers (flush/straight draws) in the postflop editor | P2 | L |
| G3 | Board-texture awareness (wet/dry) as a condition | P2 | L |
| G4 | Extend public current-hand opponent-raise condition to per-opponent counts and bounded cross-hand action frequencies with unknown/insufficient-sample state, stable seats after knockouts, transparent explanations, and lessons (first simple condition now available in Build lab only). | P1 | L |
| G6 | Grow the Build lab beyond its two independent saved bot policies and seeded heads-up Limit matches: format/stack controls, seat-swapped paired comparisons, animated replays, versioned import/export/reset, and policy validation. | P1 | L |
| G7 | Higher-complexity boss evaluation: calibrate policy counter-strategies on held-out seeds; expand opponent memory/draw/texture mechanics only after the shipped mixed-action and future richer history conditions have robust tests and clear builder affordances | P1 | L |

## H — Quality / infra / tech debt
| ID | Task | Pri | Size |
|----|------|-----|------|
| H1 | Extract a shared table component (PokerTable replay ↔ LivePlay dupe: Seat/reducer/felt) | P1 | M |
| H4 | Lint/format config (eslint + prettier) for the web app | P2 | S |
| H5 | Keep objective gates meaningful under full randomization (ties to D3/D4) | P1 | S |
| H6 | Make the current headless-browser smoke paths (manual modes, Academy modules, new survival boss) reproducible in CI without coupling the Python unit tests to a browser download | P2 | M |

---

## Board
- **Now:** E12 proper multi-player manual elimination → A14 stack/bust puzzles using engine states · G6 Build lab format/stack and symmetric comparison.
- **Next:** G4 richer history-aware conditions → G7 hard-opponent calibration · A2 original lesson passes · A11 richer puzzles · B2 gated-builder tuning · E8 additional formats.
- **Later:** A12 deeper sizing practice · B1/B3/B4 creative campaign · C5 decision-level leak diagnosis · D4 EV objectives · F2 coaching · H1 shared table · A7 bridges · E3 custom tables · E6 multiway conditions · E10 per-class sizing · E11 Godot API parity · G2/G3 draws/texture · PVP ladder.
