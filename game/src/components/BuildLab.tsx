import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { PolicyMatchResult, PokerEvent } from "../engine-api/types";
import type { EngineBridge } from "../pyodide/bridge";
import { compileStrategy, type Unlocks } from "../strategy/model";
import { actionLabel } from "../util/handEvents";
import {
  BUILD_LAB_PRESETS, buildLabPresetLabel, createBuildLabBot, loadBuildLabBot,
  saveBuildLabBot, type BuildLabBotState, type BuildLabPresetId,
} from "../buildlab/policies";
import { StrategyBuilder } from "./StrategyBuilder";
import "../buildlab/BuildLab.css";

const LAB_UNLOCKS: Unlocks = {
  facingBet: true,
  position: true,
  potOdds: true,
  oppType: true,
  history: true,
  mix: true,
};
const MAX_HANDS = 500;
const MAX_SEED = 2_147_483_647;
const REPLAY_CAPTURE = 4;

interface SavedRun {
  result: PolicyMatchResult;
  hands: number;
  botA: string;
  botB: string;
}

function seatName(seat: number): string {
  if (seat === 0) return "Bot A";
  if (seat === 1) return "Bot B";
  return `Seat ${seat + 1}`;
}

function replayEventText(event: PokerEvent): string {
  switch (event.type) {
    case "blinds":
      return `${seatName(event.button)} has the button. ${seatName(event.sb_seat)} posts the ${event.sb} chip small blind; ${seatName(event.bb_seat)} posts the ${event.bb} chip big blind.`;
    case "hole":
      return `${seatName(event.seat)} receives ${event.cards.join(" and ")}.`;
    case "action":
      return `${seatName(event.seat)} ${actionLabel(event)} on the ${event.street}.`;
    case "board":
      return `${event.street} board: ${event.board.join(" ")}.`;
    case "showdown": {
      const hands = Object.entries(event.hands).map(([seat, hand]) => {
        const cards = event.reveals[Number(seat)]?.join(" ");
        return `${seatName(Number(seat))}: ${hand}${cards ? ` (${cards})` : ""}`;
      });
      return hands.length ? `Showdown — ${hands.join("; ")}.` : "Showdown.";
    }
    case "award": {
      const winners = event.winners.map(seatName).join(" and ");
      const nets = event.net.map((net, seat) => `${seatName(seat)} ${net >= 0 ? "+" : ""}${net}`).join("; ");
      return `${winners} win ${event.pot} chips. Net: ${nets}.`;
    }
  }
}

function replayLabel(replay: PolicyMatchResult["replays"][number]): string {
  const result = replay.net > 0 ? `+${replay.net}` : `${replay.net}`;
  return `${replay.kind === "win" ? "Bot A win" : "Bot A loss"} · hand ${replay.hand + 1} · ${result} chips`;
}

export function BuildLab({ bridgeRef, ready }: {
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
}) {
  const [botA, setBotA] = useState<BuildLabBotState>(() => loadBuildLabBot("a", "value"));
  const [botB, setBotB] = useState<BuildLabBotState>(() => loadBuildLabBot("b", "caller"));
  const [handsText, setHandsText] = useState("500");
  const [seedText, setSeedText] = useState("1");
  const [editorAOpen, setEditorAOpen] = useState(false);
  const [editorBOpen, setEditorBOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRun, setSavedRun] = useState<SavedRun | null>(null);
  const [replayIndex, setReplayIndex] = useState(0);

  useEffect(() => { saveBuildLabBot("a", botA); }, [botA]);
  useEffect(() => { saveBuildLabBot("b", botB); }, [botB]);

  function selectPreset(slot: "a" | "b", value: string) {
    const preset = BUILD_LAB_PRESETS.find((candidate) => candidate.id === value);
    if (!preset) return;
    const next = createBuildLabBot(preset.id);
    if (slot === "a") setBotA(next);
    else setBotB(next);
  }

  function editBotA(strategy: BuildLabBotState["strategy"]) {
    setBotA((current) => ({ ...current, preset: "custom", strategy }));
  }

  function editBotB(strategy: BuildLabBotState["strategy"]) {
    setBotB((current) => ({ ...current, preset: "custom", strategy }));
  }

  async function runMatch() {
    if (!bridgeRef.current || !ready || running) return;
    const hands = Number(handsText);
    if (!Number.isInteger(hands) || hands < 1 || hands > MAX_HANDS) {
      setError(`Choose a whole number of hands from 1 to ${MAX_HANDS}.`);
      return;
    }

    let seed: number | undefined;
    if (seedText.trim() !== "") {
      const parsedSeed = Number(seedText);
      if (!Number.isSafeInteger(parsedSeed) || parsedSeed < 0 || parsedSeed > MAX_SEED) {
        setError(`Use a whole seed from 0 to ${MAX_SEED}, or leave it blank for a random deal.`);
        return;
      }
      seed = parsedSeed;
    }

    setRunning(true);
    setError(null);
    setSavedRun(null);
    try {
      const result = await bridgeRef.current.runPolicyMatch({
        strategyA: compileStrategy(botA.strategy),
        strategyB: compileStrategy(botB.strategy),
        hands,
        seed,
        capture: REPLAY_CAPTURE,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSavedRun({
          result,
          hands,
          botA: buildLabPresetLabel(botA.preset),
          botB: buildLabPresetLabel(botB.preset),
        });
        setReplayIndex(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  const result = savedRun?.result ?? null;
  const replay = result?.replays[replayIndex] ?? null;

  return (
    <main className="build-lab" aria-labelledby="build-lab-title">
      <header className="build-lab-header">
        <h2 id="build-lab-title">Build lab</h2>
        <p>
          Choose two policies, edit their blocks independently, then compare them in a seeded heads-up match.
          Only Builder policies run here; no custom code is executed.
        </p>
      </header>

      <div className="build-lab-grid">
        <fieldset className="build-lab-panel" disabled={running}>
          <legend>Bot A</legend>
          <label className="build-lab-preset" htmlFor="build-lab-preset-a">
            Starting policy
            <select
              id="build-lab-preset-a"
              value={botA.preset}
              onChange={(event) => selectPreset("a", event.target.value)}
            >
              <option value="custom" disabled>Custom (edited)</option>
              {BUILD_LAB_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </label>
          <p className="build-lab-note">Bot A's policy is saved separately in this browser.</p>
          <details className="build-lab-editor" onToggle={(event) => setEditorAOpen(event.currentTarget.open)}>
            <summary>Edit Bot A blocks</summary>
            <p>All current Builder blocks are unlocked for this lab.</p>
            {editorAOpen && <StrategyBuilder strategy={botA.strategy} onChange={editBotA} unlocks={LAB_UNLOCKS} />}
          </details>
        </fieldset>

        <fieldset className="build-lab-panel" disabled={running}>
          <legend>Bot B</legend>
          <label className="build-lab-preset" htmlFor="build-lab-preset-b">
            Starting policy
            <select
              id="build-lab-preset-b"
              value={botB.preset}
              onChange={(event) => selectPreset("b", event.target.value)}
            >
              <option value="custom" disabled>Custom (edited)</option>
              {BUILD_LAB_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </select>
          </label>
          <p className="build-lab-note">Bot B has its own saved policy and does not overwrite Bot A.</p>
          <details className="build-lab-editor" onToggle={(event) => setEditorBOpen(event.currentTarget.open)}>
            <summary>Edit Bot B blocks</summary>
            <p>All current Builder blocks are unlocked for this lab.</p>
            {editorBOpen && <StrategyBuilder strategy={botB.strategy} onChange={editBotB} unlocks={LAB_UNLOCKS} />}
          </details>
        </fieldset>
      </div>

      <fieldset className="build-lab-panel build-lab-settings" disabled={running}>
        <legend>Match settings</legend>
        <div className="build-lab-settings-row">
          <label htmlFor="build-lab-hands">
            Hands (1–{MAX_HANDS})
            <input
              id="build-lab-hands"
              type="number"
              min={1}
              max={MAX_HANDS}
              step={1}
              value={handsText}
              onChange={(event) => setHandsText(event.target.value)}
              aria-describedby="build-lab-hands-help"
            />
          </label>
          <label htmlFor="build-lab-seed">
            Seed (optional)
            <input
              id="build-lab-seed"
              type="number"
              min={0}
              max={MAX_SEED}
              step={1}
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
              aria-describedby="build-lab-seed-help"
            />
          </label>
        </div>
        <p id="build-lab-hands-help" className="build-lab-note">The first slice uses heads-up Limit Hold'em and caps runs to keep the page responsive.</p>
        <p id="build-lab-seed-help" className="build-lab-note">Keep the same seed and policies to reproduce the same deal; leave blank for a fresh random run.</p>
      </fieldset>

      <div className="build-lab-actions">
        <button className="run" type="button" onClick={runMatch} disabled={!ready || running}>
          {running ? "Running match…" : ready ? "Run Bot A vs Bot B" : "Engine loading…"}
        </button>
        <span className="build-lab-status" role="status" aria-live="polite">
          {running ? "Playing the batch match. This may take a moment." : !ready ? "Waiting for the poker engine." : "Ready to run."}
        </span>
      </div>
      {error && <div className="build-lab-error" role="alert">{error}</div>}

      {result && savedRun && (
        <section className="build-lab-results" aria-labelledby="build-lab-results-title">
          <h3 id="build-lab-results-title">Results — {savedRun.hands} hands</h3>
          <p>
            Seed: {result.seed === null ? "random" : result.seed}. Bot A used {savedRun.botA}; Bot B used {savedRun.botB}.
            The table is heads-up Limit; button position rotates between seats.
          </p>
          <div className="build-lab-table-wrap">
            <table>
              <caption>Performance by policy</caption>
              <thead>
                <tr>
                  <th scope="col">Bot</th>
                  <th scope="col">Net chips</th>
                  <th scope="col">bb/100</th>
                  <th scope="col">Hands won</th>
                  <th scope="col">VPIP</th>
                  <th scope="col">PFR</th>
                  <th scope="col">Illegal actions</th>
                </tr>
              </thead>
              <tbody>
                {result.summary.map((row, index) => (
                  <tr key={row.name}>
                    <th scope="row">{index === 0 ? `Bot A — ${savedRun.botA}` : `Bot B — ${savedRun.botB}`}</th>
                    <td>{row.net > 0 ? `+${row.net}` : row.net}</td>
                    <td>{row.bb100.toFixed(1)}</td>
                    <td>{row.win_pct.toFixed(0)}%</td>
                    <td>{row.vpip.toFixed(0)}%</td>
                    <td>{row.pfr.toFixed(0)}%</td>
                    <td>{row.illegal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="build-lab-replay" aria-labelledby="build-lab-replay-title">
            <h3 id="build-lab-replay-title">Captured hands</h3>
            {result.replays.length > 0 && replay ? (
              <>
                <label htmlFor="build-lab-replay-picker">Choose a captured hand</label>
                <select
                  id="build-lab-replay-picker"
                  className="build-lab-replay-picker"
                  value={replayIndex}
                  onChange={(event) => setReplayIndex(Number(event.target.value))}
                >
                  {result.replays.map((item, index) => (
                    <option key={`${item.kind}-${item.hand}`} value={index}>{replayLabel(item)}</option>
                  ))}
                </select>
                <ol className="build-lab-event-list" aria-label="Selected hand events">
                  {replay.events.map((event, index) => <li key={index}>{replayEventText(event)}</li>)}
                </ol>
              </>
            ) : (
              <p className="build-lab-empty">No positive or negative hands were captured in this run.</p>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
