# Bet2Bot — Design Doc (living)

> North star: **Teach poker cleanly, end-to-end, through play — while giving players an
> open sandbox to invent and test strategies.**

A browser game (Pyodide-hosted Python engine) where you learn poker by playing, then
express what you've learned as a *bot* built from visual blocks, and pit it against a
roster of AI opponents. Teaching-first; depth via gradual unlocks.

## The core loop
Read an opponent's flaw → express the counter (by hand, then as blocks) → watch it play →
tighten. The fun is the **exploit "aha."** Every opponent is a puzzle with a distinct flaw
and a distinct counter.

## Player-facing tracks and the bot builder
1. **Learn (teach) — a rich Academy** (think chess.com): structured lesson *modules*, each
   with explainers, quizzes, and — crucially — **interactive drills** where you apply the
   idea live. E.g. a *position* module serves scenarios in different positions where the
   right choice depends on position, then lets you play a few hands at the two extremes
   (in position vs out) to *feel* the difference. Lessons hand concepts into bot-building.
2. **Puzzles (practice)** — randomized one-decision spots with immediate feedback and a
   local practice score/streak. Initially they reuse authored Academy concepts; the
   difficulty scale is not yet a calibrated Elo system. Any randomized puzzle must
   show only facts that still match its actual cards and price; when we cannot derive
   or verify a claim, keep the authored deal rather than presenting misinformation.
3. **Play (experiment)** — sit at the table vs a chosen bot. Classic Limit is the
   introductory mode; sized No-Limit, a carried-stack survival table, and a six-seat
   table let students feel what changes before encoding it. Pot-Limit offers a sized
   intermediate format with raises capped by the pot.
4. **Build (sandbox)** — freely edit two independent visual strategies and run
   reproducible bot-versus-bot matches, without campaign unlocks. This is separate
   from authored Python bots: arbitrary code execution remains outside the browser
   sandbox until there is a safe runtime/security design.
5. **Campaign (build and challenge)** — the strategy editor + engine and a series of
   creative, exploitable bots. Blocks are revealed gradually and reused between bosses;
   campaign results combine objective stars, curated big win/loss replays, a graph, and
   per-bot metrics.

## The concept ladder (progression spine)
Each rung: a concept → the opponent that punishes ignorance of it → the tool that expresses
the fix. Editor complexity and lessons unlock along this ladder.

| # | Concept | Opponent (flaw) | Unlock |
|---|---|---|---|
| 0 | Rules of poker | — (Academy) | play hands manually |
| 1 | Value betting | Caller (never folds) | postflop raise tiers |
| 2 | Aggression + discipline | Shark/TAG (punishes payoffs) | position |
| 3 | Opponent adaptation | Profiler (adapts) | opponent reads |
| 4 | Survival through pressure | Over-folder (gives up too much) | No-Limit sizes, fixed stack |
| 5 | Trapping over-aggression | Maniac (raises everything) | (reuse tools) |
| 6 | Attacking weakness | Rock (folds too much) | (reuse tools) |
| 7 | Bluffing / balance | river-caller | mixed frequencies ("do X 30%") |
| 8 | Board texture / draws | overvalues top pair | draw tiers |
| 9 | Multiway | multiple opponents | multiway handling |

## Key design decisions
- **Tutorial = both** scripted lessons *and* a manual free-play mode (sit in the seat).
- **Editor gating**: reveal complexity gradually (start preflop-only / one street; unlock
  grid, streets, and conditions as concepts are taught). NOTE: gating streets on the tuned
  boss levels (2–3) changes their balance — re-tune thresholds when gating is applied there.
- **Objectives are data**: generalize `bb/100 > x` into named objectives computed over a
  run's stats/events. Grow a *suite* of metrics; each shifts the player's priorities.
- **Metrics rework**: move beyond bb/100 toward **fixed-stack rolls** (start a stack,
  bust/survive) as a more visceral, game-like measure; bb/100 becomes one lens, not the goal.
  The campaign now uses `run_session` for a 200-hand Over-folder Survival boss after
  three Limit levels. Named objective checks award per-run stars; future EV and drill
  objectives remain open.
- **Format & table expansion**: the engine now plays No-Limit (amount-carrying raises) and
  multiway with stacks/all-ins/side pots. These surface as **game modes** — Classic Limit
  stays the default, introductory game (simplest, still instructive); NL heads-up, Survival,
  Pot-Limit, and 6-max layer on. Short/deep stack presets are distinct from
  elimination: a true knockout table requires *every* player to carry chips and
  leave on bust, then a last-survivor result, not merely Survival's one human
  carried stack against bots that refill. The first NL sizing Academy module and postflop/preflop-size
  builder controls are in place; the latter are shown only for the Survival boss.
  Wider multiway lessons and further NL bosses remain open.
- **Matches are fully random** (fresh deck each run); reproducible seeds remain available for
  tests. Objective thresholds must stay meaningful under variance.
- **Playing → encoding** is the pedagogical heart: lessons end with "you just did
  this by hand — now teach your bot." Value and discipline bridges currently pre-fill
  matching blocks without overwriting unrelated saved strategy; position and sizing
  need more expressive conditions/No-Limit campaign contexts before equivalent bridges.
- **Pot odds is weak in Limit** (a single bet is almost always a "cheap" call) — de-emphasized
  as a block lever; kept in the interpreter.

## Architecture (see `CLAUDE.md` for current detail)
- Engine (`poker/`) runs in a Pyodide worker; block strategies compile to a JSON policy
  interpreted by `StrategyBot`. The hand is a generator driven by either bots (batch) or a
  human (interactive), emitting a JSON event stream used for replays and live play.
- The Academy is frontend-only, so it loads instantly while Pyodide boots.

## Themes (open work — see `BACKLOG.md`)
`BACKLOG.md` is the forward register of open tasks. Broad themes, roughly in intended order:
- **Rich Academy** — real lesson content, modules, and interactive drills.
- **Rich campaign** — creative bot archetypes + a gated builder that teaches bot-building.
- **Multi-output results** — curated big win/loss runouts + animated winnings graph + metrics.
- **Metrics rework** — fixed-stack rolls / objective framework beyond bb/100.
- **Format & table expansion** — No-Limit / Pot-Limit; multiway tables.
- **Deeper strategy model** — mixed frequencies and history-aware opponent reads
  with reproducible private bot randomness, then draws/board texture. New hard
  bosses must be beatable by a counter expressible in the visual editor.
- **PVP ladder** — submit bots; sandboxed server matches; leaderboard + replays.
