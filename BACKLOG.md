# Bet2Bot — Backlog

A **register of open work** — what's left to build, organized so we can plan. This is
forward-looking only; it does not track "done." (What already exists and how it works is
documented in `CLAUDE.md`; the *why*/vision is in `DESIGN.md`.)

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
you apply it live. This is the current top priority.

| ID | Task | Pri | Size |
|----|------|-----|------|
| A2 | Individual content passes on the 5 existing modules — they're a decent skeleton but each needs dedicated work (depth, better spots, visuals); plus new topics: pot odds/equity, hand reading, board texture, bankroll | P1 | L |
| A5 | **Randomized drills within lessons**: concept drills deal different cards each attempt (generate/parameterize spots instead of the current fixed sequence) so repeating a drill actually teaches | P0 | L |
| A6 | Per-lesson & per-module mastery (stars beyond completion) | P2 | S |
| A7 | "Now teach your bot" bridges: a lesson drops the matching block into the builder (bridges currently jump to the Campaign; make them pre-fill rules) | P1 | M |
| A9 | **Puzzles section** (chess.com-style): a standalone tab serving randomized standalone decision spots across all learned concepts — rated/streaked, independent of any lesson | P0 | L |
| A10 | Now that variable betting is in the engine (NL game modes), rework lessons/drills to teach sizing (value sizing, bluff sizing, pot odds vs price) — pairs with E5 builder blocks | P1 | M |

## B — Campaign: creative bots & gated bot-building
Goal: a rich campaign that slowly teaches you to build a more effective bot, and *feels*
like improving. Each opponent is a creative, exploitable character.

| ID | Task | Pri | Size |
|----|------|-----|------|
| B1 | Roster of **creative bot archetypes** with distinct exploitable styles + personalities/avatars (Nit, Station, LAG, Maniac, Trapper, River-bluffer, Over-folder, Adaptive, Balanced) | P1 | L |
| B2 | **Gated builder**: reveal streets/conditions/tools gradually per level; re-tune gates as they change | P1 | M |
| B3 | More levels — each new tool/concept paired with a boss that punishes ignoring it | P1 | M |
| B4 | Progression feel: unlock moments, difficulty ramp, "you're improving" feedback/rewards | P1 | M |
| B5 | Creative boss ideas backlog (e.g. only-bluffs-rivers, over-folds-to-3bets, min-raise trapper) | P2 | S |

## C — Results & analytics (multi-output)
Goal: match results show more than one number.

| ID | Task | Pri | Size |
|----|------|-----|------|
| C4 | Leak breakdown: where chips came from / were lost (by street / hand tier) | P2 | M |

## D — Metrics rework
Goal: evolve past bb/100 as *the* measure. (The engine primitive exists: `run_session`
fixed-stack rolls power the Survival mode; what remains is campaign integration.)

| ID | Task | Pri | Size |
|----|------|-----|------|
| D2 | Objective framework: data-driven named objectives (bankroll / EV / constraints / stars) that levels & drills compose from — survival objectives ("last 200 hands on one stack") via `run_session` | P1 | L |
| D3 | Auto-calibrate objective thresholds from a playtest harness (robust under randomization) | P2 | M |

## E — Formats & table expansion
Goal: grow beyond heads-up Limit. (Engine + game modes shipped: No-Limit with sized
raises, stacks/all-ins/side pots, multiway, Survival; Classic Limit stays the default.)

| ID | Task | Pri | Size |
|----|------|-----|------|
| E3 | Surface table config (blinds, stacks, players, format) in the game-mode UI (custom mode) | P2 | S |
| E4 | **Pot-Limit** format (raise window capped at pot — the engine's default raise is already pot-sized) | P2 | S |
| E5 | Builder support for sized raises in No-Limit (small/pot/overbet blocks) so bots can play NL modes deliberately — pairs with A10 sizing lessons | P1 | M |
| E6 | Multiway position conditions in the builder (early/middle/late, not just IP/OOP) | P2 | M |
| E7 | **Elliptical multiway table layout**: seats arranged around the table (not an opponent row), with the dealer button chip visibly moving seat to seat each hand | P1 | M |
| E8 | **Game modes reach Campaign & Academy**: levels/lessons that run in NL, Survival, or 6-max once the supporting pieces exist (E5 builder sizing, A10 sizing lessons, D2 survival objectives) — e.g. a survival boss level, a 6-max positional module | P1 | L |

## F — Interactive play enhancements
| ID | Task | Pri | Size |
|----|------|-----|------|
| F1 | **Announce what's happening** in manual play: actions called out explicitly (not just bubble text), the runout dealt step by step (flop/turn/river land one at a time, not a silent board swap), and clear street transitions — the table should narrate the hand for a learner | P0 | M |
| F4 | **Showdown teaching moment**: highlight the winning hand over the losing one (the five cards that play, named categories side by side) to reinforce hand ordering every showdown | P0 | M |
| F5 | **Chip-stack visuals** in manual play: physical chip stacks per seat that shrink as you bet, bet/pot chips sliding to the middle, pots pushed to the winner — make stack sizes and bet sizes *visible*, not just numbers (especially for NL sizing intuition) | P0 | M |
| F2 | Post-hand coaching/diagnosis ("you paid off X% of rivers with one pair") | P1 | M |
| F3 | "Play vs any bot" sandbox polish (choose format/stack/opponent) | P2 | S |

## G — Deeper strategy model
| ID | Task | Pri | Size |
|----|------|-----|------|
| G1 | Mixed frequencies ("do X 30% of the time") in blocks + interpreter | P2 | L |
| G2 | Draw detection + draw tiers (flush/straight draws) in the postflop editor | P2 | L |
| G3 | Board-texture awareness (wet/dry) as a condition | P2 | L |

## H — Quality / infra / tech debt
| ID | Task | Pri | Size |
|----|------|-----|------|
| H1 | Extract a shared table component (PokerTable replay ↔ LivePlay dupe: Seat/reducer/felt) | P1 | M |
| H3 | Self-host Pyodide (drop the CDN dependency; CSP-friendly) | P2 | S |
| H4 | Lint/format config (eslint + prettier) for the web app | P2 | S |
| H5 | Keep objective gates meaningful under full randomization (ties to D2/D3) | P1 | S |

---

## Board
- **Now:** A5 randomized drills · A9 puzzles · F1 action announcements / step-by-step
  runout · F4 showdown highlighting · F5 chip-stack visuals.
- **Next:** E7 elliptical multiway layout + visible button · A10 sizing lessons + E5 NL
  builder blocks · A2 module content passes · B1 creative roster · B2 gated builder ·
  D2 objective framework (survival objectives) · F2 coaching · H1 shared table component ·
  A7 builder bridges.
- **Later:** E8 game modes in Campaign/Academy (after E5/A10/D2) · E3 custom tables ·
  E4 Pot-Limit · E6 multiway builder conditions · G mixed frequencies / draws / board
  texture · PVP ladder.
