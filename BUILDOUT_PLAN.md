# Puzzle, stack, and bot-building buildout

This is the **web game's** staged feature plan, not `GODOT_INTEGRATION_PLAN.md`. Keep Classic Limit as the introduction. Do not mistake a one-carried-stack Survival session for a multi-player knockout.

## 1. Reliable learning spots (A13)

- Audit authored text and every permitted re-deal option against actual hole/board cards, pot, price, and position. Render a common facts strip; when a claim cannot be verified, use neutral text or keep the original authored deal.
- Test all curated options and seeded retries across Academy and Puzzles; prevent malformed cards/streets and duplicate cards. Do not turn a card-tied teaching answer into a generic best-play claim.
- Next: derive suitedness, made-hand category, draws, and board texture from shared tested poker logic before introducing broad procedural generation; show position, opponent and stack only when specified.

## 2. Stacks and knockouts (E13 → E12 → A14)

- Add short/standard per-hand stack presets to heads-up Play. Explicitly label refills, all-ins and how switching presets restarts a match.
- Build and test a **batch knockout core**: every seat carries chips; busted players are removed; button/blinds rotate over active seats; side pots and chip conservation hold even at simultaneous busts. Return stable global seat IDs and termination reason. This core alone does **not** create a playable manual knockout mode.
- Next, extend the interactive driver and worker payload with active-seat mapping and termination, then offer a manual 6-max elimination mode with visible stacks, busts and last-survivor screen. Match seeded batch outcomes/events against an interactive replay. Do not advertise this mode before that parity holds. Add bounded hand caps for classroom sessions.
- Only then build stack-pressure, all-in and side-pot puzzles from verified engine states, with explicit initial stacks, pot, legal raise windows, and outcome explanations rather than hand-wavy optimality.

## 3. Independent bot lab (G6)

- First slice: two independent, saved block policies (A and B), an optional match seed, bounded heads-up Limit run, comparison metrics and curated hand logs. No arbitrary Python is executed.
- Next: selectable format/stack, seat-swapped paired comparisons with the same deal seeds, animated shared-table replays, saved strategy versions plus export/import. Preserve policy schema versions on disk; validate imports and keep campaign progression independent of lab drafts.

## 4. Expressiveness for harder opponents (G5 → G4 → G7)

- Two-action frequency mixes use a **private bot decision RNG** seeded per seat, not the deck RNG. Validate percentages, preserve legacy policy and deal streams, annotate replay reasons, and expose controls in the builder.
- Add public action-history conditions with clear scope (this hand vs historical match), opponent seat identity and unknown/insufficient-sample states. Never infer hidden cards. Verify decisions and hooks stay aligned as player seats change in a knockout table.
- Introduce hard bosses **only after** a counter is expressible with those blocks and beats the starter on held-out seeded matches. Pair each new condition with an Academy lesson and a calibrated Campaign objective.

## Release gates

Every slice needs focused Python/Node tests, a production Vite build, a normal and narrow browser check, Pages deployment verification, and updated `BACKLOG.md`/`CLAUDE.md`. Godot's offline package is separate: web deployment does not refresh it automatically.
