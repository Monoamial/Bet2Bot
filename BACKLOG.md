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
| A2 | More lesson content: pot odds/equity, hand reading, board texture, bankroll — as modules in `academy/lessons.ts` (position, value betting, and discipline vs aggression are done) | P1 | M |
| A5 | **Drills**: repeatable, randomized single-concept practice with scoring / streaks / mastery (the scenario drill is fixed-sequence; randomize/generate spots) | P1 | L |
| A6 | Per-lesson & per-module mastery (stars beyond completion) | P2 | S |
| A7 | "Now teach your bot" bridges: a lesson drops the matching block into the builder (bridges currently jump to the Campaign; make them pre-fill rules) | P1 | M |

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
Goal: evolve past bb/100 as *the* measure.

| ID | Task | Pri | Size |
|----|------|-----|------|
| D1 | **Fixed-stack rolls**: start a stack, bust/survive over a session — a more visceral, game-like outcome | P1 | L |
| D2 | Objective framework: data-driven named objectives (bankroll / EV / constraints / stars) that levels & drills compose from | P1 | L |
| D3 | Auto-calibrate objective thresholds from a playtest harness (robust under randomization) | P2 | M |

## E — Formats & table expansion
Goal: grow beyond heads-up Limit.

| ID | Task | Pri | Size |
|----|------|-----|------|
| E1 | **Open betting formats** — No-Limit / Pot-Limit: bet sizing in the action API, engine, and builder | P2 | L |
| E2 | **Multiway tables** (e.g. 6-max): side pots, multi-opponent position dynamics | P2 | L |
| E3 | Surface table config (blinds, stacks, players, format) in the UI | P2 | S |

## F — Interactive play enhancements
| ID | Task | Pri | Size |
|----|------|-----|------|
| F1 | Step-through animation pacing for opponent actions in live play | P2 | M |
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
| H2 | Deploy as a static site (shareable link) | P1 | S |
| H3 | Self-host Pyodide (drop the CDN dependency; CSP-friendly) | P2 | S |
| H4 | Lint/format config (eslint + prettier) for the web app | P2 | S |
| H5 | Keep objective gates meaningful under full randomization (ties to D2/D3) | P1 | S |

---

## Board
- **Now:** A2 remaining lesson content · A5 randomized drills.
- **Next:** B1 creative roster · B2 gated builder · D1 fixed-stack rolls ·
  D2 objective framework · F2 coaching · H1 shared table component · A7 builder bridges.
- **Later:** E1/E2 formats & multiway · G mixed frequencies / draws / board texture ·
  H2 deploy · PVP ladder.
