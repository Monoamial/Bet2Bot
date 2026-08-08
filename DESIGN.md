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

## Three tracks
1. **Learn (teach) — a rich Academy** (think chess.com): structured lesson *modules*, each
   with explainers, quizzes, and — crucially — **interactive drills** where you apply the
   idea live. E.g. a *position* module serves scenarios in different positions where the
   right choice depends on position, then lets you play a few hands at the two extremes
   (in position vs out) to *feel* the difference. Lessons hand concepts into bot-building.
2. **Build (experiment)** — the strategy editor + engine, revealed *gradually*. New verbs
   (conditions, GTO-flavored tools) unlock through progression so you slowly learn to build
   a more effective bot; it should feel like improving.
3. **Compete (challenge)** — a rich campaign of **creative, distinct bot archetypes**, each a
   puzzle with an exploitable flaw, behind a gated builder. Results are multi-output (not
   just a win rate): curated big win/loss hand runouts, an animated winnings-over-time graph,
   and a growing suite of metrics.

## The concept ladder (progression spine)
Each rung: a concept → the opponent that punishes ignorance of it → the tool that expresses
the fix. Editor complexity and lessons unlock along this ladder.

| # | Concept | Opponent (flaw) | Unlock |
|---|---|---|---|
| 0 | Rules of poker | — (Academy) | play hands manually |
| 1 | Value betting | Caller (never folds) | postflop raise tiers |
| 2 | Aggression + discipline | Shark/TAG (punishes payoffs) | position |
| 3 | Opponent adaptation | Profiler (adapts) | opponent reads |
| 4 | Trapping over-aggression | Maniac (raises everything) | (reuse tools) |
| 5 | Attacking weakness | Rock (folds too much) | (reuse tools) |
| 6 | Bluffing / balance | river-caller | mixed frequencies ("do X 30%") |
| 7 | Board texture / draws | overvalues top pair | draw tiers |
| 8 | Multiway | multiple opponents | multiway handling |

## Key design decisions
- **Tutorial = both** scripted lessons *and* a manual free-play mode (sit in the seat).
- **Editor gating**: reveal complexity gradually (start preflop-only / one street; unlock
  grid, streets, and conditions as concepts are taught). NOTE: gating streets on the tuned
  boss levels (2–3) changes their balance — re-tune thresholds when gating is applied there.
- **Objectives are data**: generalize `bb/100 > x` into named objectives computed over a
  run's stats/events. Grow a *suite* of metrics; each shifts the player's priorities.
- **Metrics rework**: move beyond bb/100 toward **fixed-stack rolls** (start a stack,
  bust/survive) as a more visceral, game-like measure; bb/100 becomes one lens, not the goal.
- **Format & table expansion** (later): open betting formats (**No-Limit / Pot-Limit**, which
  need bet sizing in the action API + builder) and **multi-opponent tables** (6-max: side
  pots, richer position). Design the block model and interpreter to grow into these.
- **Matches are fully random** (fresh deck each run); reproducible seeds remain available for
  tests. Objective thresholds must stay meaningful under variance.
- **Playing → encoding** is the pedagogical heart: each strategy lesson ends with "you just
  did this by hand — now teach your bot," dropping the matching block into the editor.
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
- **Deeper strategy model** — mixed frequencies, draws, board texture.
- **PVP ladder** — submit bots; sandboxed server matches; leaderboard + replays.
