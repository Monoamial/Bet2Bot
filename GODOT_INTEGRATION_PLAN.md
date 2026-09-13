# Bet2Bot × Godot Integration Plan

> A separate delivery plan for embedding Bet2Bot's bot-building and poker competition
> loop inside the student's top-down 2D Godot game. This plan is intentionally separate
> from `BACKLOG.md`, which continues to track the standalone Bet2Bot web game.

## 1. Goal

Turn the computer in the Godot game's computer room into the in-world place where the
player:

1. opens a poker-bot project,
2. creates or edits a strategy,
3. runs a quick validation/test,
4. enters that bot into a match against an NPC bot,
5. watches or reviews the result,
6. earns progression in the Godot game.

The integration should **reuse Bet2Bot's tested Python poker engine and strategy policy**,
not reimplement poker rules in GDScript. The Godot game remains responsible for world
navigation, dialogue, quests, unlocks, presentation, and save-game progression.

## 2. Current assets and constraints

### Bet2Bot already provides

- A pure, dependency-light Python poker engine in `poker/`.
- Limit and No-Limit Hold'em; stacks, all-ins, side pots, heads-up and multiway play.
- A stable JSON strategy-policy shape interpreted by `StrategyBot`.
- Named opponents registered in `poker/game_api.py`.
- Batch competition APIs (`run_level`, `run_session`) returning JSON-able results,
  metrics, timelines, and curated hand replays.
- An event stream for each replay: blinds, hole cards, actions, board, showdown, award.
- A React visual strategy builder, Academy, Campaign, and replay/results UI.

### Godot project

The Godot source is not currently present in the shared folder, so exact Godot version,
project structure, computer-interface implementation, and the existing Python runner API
still need to be inspected before implementation. This plan therefore establishes an
architecture and decision gates rather than assuming details that have not been seen.

## 3. Recommended product boundary

Use the student's existing computer UI as the **shell**, while Bet2Bot supplies the poker
application opened inside it.

### First integrated experience (vertical slice)

- Player walks into the computer room and interacts with the computer.
- Computer desktop shows a “PokerBot Lab” application.
- Player opens one starter bot, edits its strategy, and clicks **Test bot**.
- The bot plays a short deterministic match against **The Caller**.
- The application shows pass/fail, bankroll result, and one notable replay.
- On success, Godot receives a compact completion result, updates the quest/dialogue, and
  saves the bot policy and unlock.
- Exiting the computer cleanly restores normal top-down movement.

This proves the entire seam—world → computer → bot policy → Python engine → match result →
world progression—before porting the broader Academy/Campaign experience.

## 4. Architecture

```text
Godot world / quests / save game
        │
        │ opens PokerBot Lab, supplies player + unlock context
        ▼
Godot integration adapter
        │
        ├── strategy policy JSON  ───────────────┐
        ├── run request JSON                     │
        └── completion/result JSON               │
                                                ▼
Poker runtime boundary                    Bet2Bot Python engine
(run_match / validate_policy / replay)    StrategyBot + opponents
        │                                       │
        └──────── result + event-stream JSON ───┘
```

### Ownership

**Godot owns:**

- entering/leaving the computer,
- input focus and pause state,
- NPC dialogue, quests, rooms, rewards, and unlocks,
- authoritative save data,
- which PokerBot Lab features are currently available,
- importing/exporting the player's saved strategy policy.

**Bet2Bot owns:**

- poker legality and hand evaluation,
- strategy interpretation,
- opponent behavior,
- match simulation and metrics,
- replay event semantics,
- strategy schema version and validation.

**The adapter owns:**

- a small versioned JSON contract,
- translating Godot requests into Python calls,
- returning bounded, safe results,
- reporting errors without crashing the Godot scene,
- cancellation/time limits for user-authored code or long simulations.

## 5. Runtime decision: prove, then choose

There are three viable integration approaches. Do a small spike before committing.

### Option A — Embed the Bet2Bot web app in Godot

Use a WebView-capable Godot plugin and load a purpose-built `/embed` build of the React app.
Pyodide continues to execute the Python engine inside the web view.

**Advantages**

- Reuses the visual builder and replay/results UI with the least duplication.
- Keeps browser sandboxing around Python.
- Fastest route to feature parity with standalone Bet2Bot.

**Risks**

- Godot has no first-party universal WebView control; plugin support/export behavior must be
  tested on every target platform.
- Godot ↔ JavaScript messaging, focus, scaling, and offline asset packaging add complexity.
- The full site should not simply be iframe-like inside the game; it needs an embed shell.

### Option B — Godot-native UI with the Python engine as a subprocess

Godot serializes requests to JSON, invokes a bundled Python runtime/worker, and renders the
builder/results/replay in native Godot controls.

**Advantages**

- Best visual and input integration with the game.
- No WebView dependency.
- The existing computer's Python execution machinery may provide part of this bridge.

**Risks**

- Visual builder, table/replay, and results UI must be rebuilt in Godot.
- Shipping Python cross-platform is significant packaging work.
- Running arbitrary player Python requires process isolation, resource limits, and a strict
  API; a child process alone is not a security boundary.

### Option C — Sidecar/local service

A Python process exposes a local JSON protocol to Godot (stdio or localhost), while Godot
owns the UI. This is operationally similar to B but keeps a persistent engine process.

**Advantages:** fast repeated matches and clear separation.  
**Risks:** lifecycle, ports/firewalls if HTTP is used, packaging, and sandboxing.

### Recommendation

Start with **Option A as the primary spike** because it reuses the core bot-creation UX,
while testing **Option B's engine bridge in parallel** against the student's existing Python
runner. Choose after a one-day proof on the intended export target.

Selection criteria:

| Criterion | Weight |
|---|---:|
| Works in the intended exported build, offline | Must pass |
| Clean keyboard/mouse focus inside the computer | Must pass |
| Round-trip Godot ↔ poker app result messaging | Must pass |
| Student can understand and maintain the seam | High |
| Reuses builder/replay UI | High |
| Packaging size/startup time | Medium |
| Future arbitrary-Python safety | High |

Do **not** make the current computer-room Python executor the trusted competition runtime
until its isolation has been reviewed. Treat authored code as untrusted.

## 6. Integration contract

Create a versioned contract independent of React, Pyodide, or GDScript. Suggested envelope:

```json
{
  "protocol": "bet2bot-godot/v1",
  "id": "request-42",
  "type": "run_match",
  "payload": {
    "strategy": { "schemaVersion": 1, "preflop": {}, "flop": {}, "turn": {}, "river": {} },
    "opponents": ["caller"],
    "hands": 100,
    "seed": 12345,
    "config": { "betting": "limit" },
    "capture": 2
  }
}
```

Response:

```json
{
  "protocol": "bet2bot-godot/v1",
  "id": "request-42",
  "ok": true,
  "result": {
    "playerNet": 24,
    "playerBb100": 12.0,
    "objectivePassed": true,
    "summary": [],
    "replays": []
  }
}
```

### Contract rules

- Add an explicit `schemaVersion` to saved strategy policies before integration.
- Validate every inbound policy and return structured field errors.
- Match requests name opponents by stable IDs, never display labels.
- Development/tutorial matches may use fixed seeds; scored matches should derive the seed
  from Godot save/quest state and store it with the result.
- Bound hand count, replay count, and payload size.
- Send declarative outcomes back to Godot (`objectivePassed`, rewards/unlocks), but let Godot
  remain authoritative when applying progression.
- Replays remain event-stream JSON; Godot or the embedded web app can render them later.

## 7. Save-data model

Godot is authoritative. Store only portable domain data, not React state or Python objects.

```json
{
  "pokerBot": {
    "integrationVersion": 1,
    "policySchemaVersion": 1,
    "activeBotId": "starter",
    "bots": {
      "starter": {
        "name": "Starter Bot",
        "policy": {},
        "updatedAt": "..."
      }
    },
    "unlocks": ["preflop_grid", "flop_rules"],
    "completedChallenges": ["caller_intro"],
    "bestResults": { "caller_intro": { "score": 12, "seed": 12345 } }
  }
}
```

Add migrations at the Godot save boundary whenever the policy schema changes. Keep the
standalone Bet2Bot browser's localStorage completely separate.

## 8. Work plan

### Phase 0 — Discovery and integration decision

**Deliverables**

- Put the Godot project under source control or make it available in the shared workspace.
- Inventory Godot version, render mode, target OS/export platforms, project scenes, computer
  scene, input/pause behavior, save manager, dialogue/quest system, and Python runner.
- Trace the current computer interaction from world input to code execution and return.
- Make a 10-line Godot ↔ poker-engine round trip using JSON.
- Make a minimal embedded-web spike if the target supports a WebView plugin.
- Write `docs/architecture-decision.md`: choose embedded web or native/sidecar and record why.

**Exit test:** an exported build opens the computer, sends `{ "ping": true }`, receives a
response from the chosen runtime, and exits back to the world with input restored.

### Phase 1 — Extract a stable Poker SDK from Bet2Bot

Keep this adapter thin and independently testable.

**Deliverables**

- Add `poker/integration_api.py` with JSON-in/JSON-out functions:
  - `describe()` — protocol, strategy schema, supported modes, opponent IDs;
  - `validate_strategy(policy)`;
  - `run_match(request)`;
  - `run_session(request)`;
  - later, interactive hand functions if needed.
- Add explicit policy and protocol versions.
- Normalize errors (`code`, `message`, optional `field`) and eliminate Python tracebacks from
  user-facing responses.
- Add golden contract fixtures and pytest contract tests.
- Produce a distributable engine artifact appropriate to the chosen runtime:
  - Web: a self-contained embed build with Pyodide assets available offline;
  - Native: a versioned Python package/zip plus launcher and lockfile.

**Exit test:** the same fixture request produces a schema-valid deterministic response both
in pytest and through the selected Godot bridge.

### Phase 2 — Godot computer bridge

**Deliverables**

- A `PokerBotService` autoload or scene service with signals such as:
  - `runtime_ready(metadata)`;
  - `match_started(request_id)`;
  - `match_completed(request_id, result)`;
  - `match_failed(request_id, error)`;
  - `strategy_saved(bot_id, policy)`.
- Open/close lifecycle connected to the existing computer room.
- Loading, disabled, cancel, timeout, and recoverable error states.
- Keyboard/mouse focus capture while the computer is open; clean restoration on exit.
- Godot save integration for policy, unlocks, and completed challenge.

**Exit test:** opening/closing the interface repeatedly cannot duplicate workers, steal world
input, or lose saved policy; an engine failure returns to a usable computer UI.

### Phase 3 — Vertical slice: Caller challenge

**Deliverables**

- “PokerBot Lab” app icon/screen in the computer interface.
- One starter policy and a constrained first builder (preflop + simple postflop actions).
- One challenge definition: opponent `caller`, format `limit`, deterministic development seed,
  bounded hand count, clear pass condition.
- Run screen with progress; results with pass/fail, chips or bb/100, and one selected replay.
- Quest/NPC hook: completion signal, dialogue update, reward/unlock, saved result.

**Exit test:** from a fresh save, a player can discover the challenge, change the bot, run it,
understand the result, pass it with the intended exploit, leave the computer, and receive
world feedback.

### Phase 4 — Replay and learning feedback

**Deliverables**

- Consume Bet2Bot's event stream rather than inventing a second hand format.
- Step-by-step actions and board runout.
- Visible dealer button, stacks/bets/pot, winning five-card hand, named hand category.
- Curated biggest win/loss playback and concise coaching tied to the challenge concept.
- Skip/speed controls so repeated testing remains fast.

**Exit test:** the player can explain why the notable hand won or lost without reading raw
engine output.

### Phase 5 — Progression content and unlocks

**Deliverables**

- Data-driven challenge resources (Godot `.tres`, JSON, or embedded app content): opponent,
  rules, seed policy, objective, available builder blocks, rewards, dialogue hooks.
- Unlock builder concepts gradually, matching the concept ladder: value, discipline,
  position, opponent reads, sizing, multiway.
- Add challenge roster while preserving stable IDs.
- Add Academy-style optional drills only where they support in-world progression; do not port
  the entire standalone site by default.

**Exit test:** adding a new opponent/challenge is primarily data entry plus content, not a new
integration implementation.

### Phase 6 — Authored Python mode (optional, separate risk track)

The existing in-game Python editor is valuable, but visual-policy bot building should ship
first. Arbitrary Python competition is a separate engineering and security project.

**Deliverables**

- Define a tiny bot API (`act(state) -> action`) with JSON-safe state.
- Execute authored code outside the Godot process with CPU/wall-clock/memory/output limits.
- Remove filesystem, network, process, and unsafe import access; decide whether the game is
  strictly local/trusted or ever accepts shared code.
- Kill and recreate the worker after timeout/crash.
- Friendly diagnostics mapped back to editor lines.
- Never use local authored-code results for an online leaderboard without server-side reruns.

**Exit test:** infinite loops, exceptions, huge output, forbidden imports, and attempts to
read files fail safely without freezing or corrupting the game/save.

### Phase 7 — Packaging, QA, and release

**Deliverables**

- Offline export: no CDN requirement (including Pyodide if the web route wins).
- Automated tests for policy validation, bridge protocol, deterministic matches, save migration,
  and malformed messages.
- Export smoke tests on every intended platform.
- Performance budgets: computer-open latency, match duration, memory, result payload size.
- Attribution/licensing inventory for Python/Pyodide/WebView dependencies.
- Student-facing developer notes: how to add a challenge, opponent, block, and save migration.

**Exit test:** fresh and migrated saves pass an exported-build test; the whole vertical slice
works with networking disabled.

## 9. Separate integration backlog

This is intentionally not merged into `BACKLOG.md`.

| ID | Task | Pri | Size | Depends on |
|---|---|---:|---:|---|
| GI-01 | Obtain and inventory Godot project; document version, target exports, computer/Python/save/quest architecture | P0 | S | — |
| GI-02 | Spike WebView embed on target export and Godot↔JS messaging | P0 | S | GI-01 |
| GI-03 | Spike existing Python runner↔`poker/game_api` JSON round trip | P0 | S | GI-01 |
| GI-04 | Architecture decision record: embedded web vs native/sidecar | P0 | S | GI-02, GI-03 |
| GI-05 | Versioned strategy schema + validation | P0 | M | GI-04 |
| GI-06 | `poker/integration_api.py` JSON contract + golden tests | P0 | M | GI-05 |
| GI-07 | Build/package offline poker runtime for selected approach | P0 | M | GI-04, GI-06 |
| GI-08 | Godot `PokerBotService`: lifecycle, signals, timeout/errors | P0 | M | GI-07 |
| GI-09 | Integrate service into computer scene and input/pause flow | P0 | M | GI-08 |
| GI-10 | Godot save schema, policy persistence, migrations | P0 | M | GI-05, GI-08 |
| GI-11 | Caller vertical slice: starter bot, constrained builder, match, pass/fail | P0 | L | GI-09, GI-10 |
| GI-12 | Quest/dialogue/reward hook for Caller completion | P0 | M | GI-11 |
| GI-13 | Replay renderer/embedded replay using canonical event stream | P1 | L | GI-11 |
| GI-14 | Data-driven challenge resources and unlock gates | P1 | M | GI-11 |
| GI-15 | Add campaign roster/content to the in-world game | P1 | L | GI-14 |
| GI-16 | Export/offline/performance/accessibility QA | P1 | M | GI-12 |
| GI-17 | Sandboxed authored-Python bot API (optional) | P2 | XL | GI-03, GI-11 |

## 10. First execution slice

Because the student's project is not available yet, development starts in a disposable
reference harness containing **two parallel Godot projects**. Both use the same minimal
room/computer interaction but deliberately test different PokerBot Lab implementations:

- `webview-spike/` — embedded Bet2Bot route;
- `native-spike/` — Godot-native PokerBot Lab route.

These live outside the standalone Bet2Bot app (currently in the sibling working folder
`~/godot-bet2bot-spikes`, with a copy on the Mac under `Vassil_Game/godot-bet2bot-spikes`).
They are integration prototypes, not a third production game.

Execute in this order:

1. Finish **GI-02** in the reference room: install/test Godot WRY first on Apple Silicon,
   load an embed-oriented Bet2Bot page, and prove focus + JavaScript/GDScript messaging.
2. Continue **GI-03** in the native reference room: connect its starter rule UI to a fixed
   policy and a JSON call into `run_level("caller", ...)`.
3. Compare both in an exported macOS build: startup, focus, packaging, offline behavior,
   development complexity, and visual fit.
4. Complete **GI-04** using measured results. Native is the current product preference, but
   keep the web spike as a benchmark/fallback until the decision is recorded.
5. Complete **GI-05/GI-06** and lock the shared contract before deepening either UI.
6. Build **GI-11** (Caller vertical slice) in the selected reference project.
7. When the student's repository arrives, perform **GI-01**, map its actual systems, then
   transplant the tested computer/service scene rather than merging the disposable room.
8. Finish **GI-09/GI-10/GI-12** against the real world, save, dialogue, and quest systems.

Avoid porting all of Bet2Bot, polishing the disposable room, or supporting arbitrary Python
before the Caller vertical slice is playable end to end.

## 11. Information needed at kickoff

Collect these during GI-01 rather than guessing:

- Godot version and target platforms (desktop only? web? mobile?).
- Repository/location of the current Godot project.
- How the computer scene is opened and how world input is paused/restored.
- How its current Python interface executes code (embedded runtime, subprocess, API, other).
- Whether the computer app must work fully offline.
- Existing save, dialogue, and quest systems.
- Whether players type arbitrary Python, use a block builder, or both.
- Whether the desired builder should visually match Bet2Bot or the in-world computer OS.
- Scope of the first integrated challenge and desired reward/progression hook.
- Whether student-authored bots will ever be shared or submitted online.

## 12. Definition of done for the integration

- Poker rules and match outcomes come from one canonical engine (`poker/`), not parallel
  GDScript logic.
- The computer-room flow works in an exported build with networking disabled.
- The Godot world remains responsive and recoverable after runtime errors/timeouts.
- Strategy policies are versioned, validated, portable JSON and migrate with saves.
- A full first challenge changes world progression and survives restart.
- Replays/results are understandable to a learner, not raw logs.
- User-authored Python, if enabled, cannot freeze the game or access unrestricted host APIs.
- Integration work is tracked here, independently from standalone Bet2Bot development.
- Both repositories retain their own tests and documentation; shared contract fixtures catch
  drift between them.
