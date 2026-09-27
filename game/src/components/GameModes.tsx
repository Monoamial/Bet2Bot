// The Play tab: a game-mode select. Classic four-action Limit stays the default,
// introductory game; the other modes introduce variable betting (No-Limit and
// Pot-Limit), selectable per-hand stack sizes, a carried stack (Survival), and a
// full table (6-Max).

import { useState } from "react";
import type { MutableRefObject } from "react";
import type { BettingFormat } from "../engine-api/types";
import type { EngineBridge } from "../pyodide/bridge";
import { LivePlay } from "./LivePlay";

export interface StackPreset {
  key: "short" | "standard";
  label: string;
  chips: number;
  bigBlinds: number;
}

export const HEADS_UP_STACK_PRESETS: StackPreset[] = [
  { key: "short", label: "Short stack · 20 BB", chips: 40, bigBlinds: 20 },
  { key: "standard", label: "Standard · 100 BB", chips: 200, bigBlinds: 100 },
];

export interface GameMode {
  key: string;
  icon: string;
  title: string;
  tag: string;              // one-phrase hook shown on the card
  desc: string;
  betting: BettingFormat;
  stack?: number;           // chips per seat per hand
  stackPresets?: StackPreset[]; // selectable stacks, reset for both seats each hand
  carry?: boolean;          // survival: the stack persists until you bust
  opponents?: string[];     // fixed table (multiway); omit = pick one opponent
  intro: string;            // one-liner shown above the table once selected
}

export const MODES: GameMode[] = [
  {
    key: "classic",
    icon: "🎓",
    title: "Classic Limit",
    tag: "The introductory game",
    desc: "Heads-up, four actions, fixed bet sizes. The game the Academy and Campaign teach — every decision is about hand strength, not sizing.",
    betting: "limit",
    intro: "Fixed bets: every raise is one unit. Pick your opponent and sit down.",
  },
  {
    key: "nl",
    icon: "🔥",
    title: "No-Limit Heads-Up",
    tag: "Variable betting",
    desc: "Bet any amount, up to your whole stack. Choose 20 or 100 big blinds each; both seats refill every hand.",
    betting: "no_limit",
    stack: 200,
    stackPresets: HEADS_UP_STACK_PRESETS,
    intro: "Choose 20 or 100 big blinds per seat. Both stacks reset to the selected amount every hand.",
  },
  {
    key: "pl",
    icon: "♣️",
    title: "Pot-Limit Heads-Up",
    tag: "Pot-capped sizing",
    desc: "Raise up to the pot after calling, or your whole stack if it is smaller. Choose 20 or 100 big blinds each; both seats refill every hand.",
    betting: "pot_limit",
    stack: 200,
    stackPresets: HEADS_UP_STACK_PRESETS,
    intro: "Choose 20 or 100 big blinds per seat; both stacks reset every hand. Raises are capped at the pot after your call.",
  },
  {
    key: "survival",
    icon: "💀",
    title: "Survival",
    tag: "One stack, no refills",
    desc: "No-Limit with a single 50-big-blind stack that carries hand to hand. Bust and it's game over — how long can you last?",
    betting: "no_limit",
    stack: 100,
    carry: true,
    intro: "One stack of 100 chips for the whole session. Your opponent refills every hand — you don't.",
  },
  {
    key: "sixmax",
    icon: "👥",
    title: "6-Max Table",
    tag: "Full table",
    desc: "You and five bots with different styles at one Limit table. Position, patience, and picking spots matter far more.",
    betting: "limit",
    opponents: ["tight_aggressive", "caller", "rock", "maniac", "profiler"],
    intro: "Five opponents, one pot. You'll be in early position five hands out of six — tighten up accordingly.",
  },
];

export function GameModes({ bridgeRef, ready }: {
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
}) {
  const [modeKey, setModeKey] = useState<string | null>(null);
  const [stackPresetKey, setStackPresetKey] = useState<StackPreset["key"]>("standard");
  const mode = MODES.find((m) => m.key === modeKey) ?? null;
  const stackPreset = mode?.stackPresets?.find((preset) => preset.key === stackPresetKey);
  const stack = stackPreset?.chips ?? mode?.stack;

  const selectMode = (key: string) => {
    setModeKey(key);
    setStackPresetKey("standard");
  };

  if (!mode) {
    return (
      <div className="module-map">
        <div className="module-map-head">
          <h2>Game modes</h2>
          <span className="module-map-sub">
            Start with Classic — the other modes layer on betting, stakes, and seats.
          </span>
        </div>
        <div className="module-grid">
          {MODES.map((m) => (
            <button key={m.key} className="module-card" onClick={() => selectMode(m.key)}>
              <div className="module-icon">{m.icon}</div>
              <div className="module-meta">
                <div className="module-title">
                  {m.title} <span className="mode-tag">{m.tag}</span>
                </div>
                <div className="module-blurb">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mode-play">
      <div className="academy-topline">
        <button className="ghost" onClick={() => setModeKey(null)}>← Modes</button>
        <span className="academy-module-name">{mode.icon} {mode.title}</span>
        <span className="mode-intro">{mode.intro}</span>
      </div>
      {mode.stackPresets && stackPreset && (
        <div className="panel">
          <div className="body">
            <div className="play-controls">
              <b id="starting-stack-title">Starting stack per seat</b>
              <div className="bet-presets" role="group" aria-labelledby="starting-stack-title">
                {mode.stackPresets.map((preset) => (
                  <button key={preset.key}
                    className={`bet-preset${preset.key === stackPreset.key ? " on" : ""}`}
                    aria-pressed={preset.key === stackPreset.key}
                    onClick={() => setStackPresetKey(preset.key)}>
                    {preset.label} · {preset.chips} chips
                  </button>
                ))}
              </div>
            </div>
            <p className="play-net" role="status" aria-live="polite" style={{ margin: "8px 0 0" }}>
              Each hand starts you and your opponent with {stackPreset.chips} chips ({stackPreset.bigBlinds} big blinds) each.
              Both seats refill to that amount after every hand; chips do not carry over.
            </p>
            <p className="play-net" style={{ margin: "4px 0 0" }}>
              Changing the stack starts a new match. Click Sit down to begin it.
            </p>
          </div>
        </div>
      )}
      <LivePlay
        key={`${mode.key}:${stack ?? "default"}`}
        bridgeRef={bridgeRef}
        ready={ready}
        betting={mode.betting}
        stack={stack}
        carry={mode.carry}
        opponents={mode.opponents}
        autoStart={!!mode.opponents}
      />
    </div>
  );
}
