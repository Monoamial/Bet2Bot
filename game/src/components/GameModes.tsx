// The Play tab: a game-mode select. Classic four-action Limit stays the default,
// introductory game; the other modes introduce variable betting (No-Limit), a
// carried stack (Survival), and a full table (6-Max).

import { useState } from "react";
import type { MutableRefObject } from "react";
import type { EngineBridge } from "../pyodide/bridge";
import { LivePlay } from "./LivePlay";

export interface GameMode {
  key: string;
  icon: string;
  title: string;
  tag: string;              // one-phrase hook shown on the card
  desc: string;
  betting: "limit" | "no_limit";
  stack?: number;           // chips per seat per hand
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
    desc: "Bet any amount, up to your whole stack. 100 big blinds each, refilled every hand — learn sizing without going broke.",
    betting: "no_limit",
    stack: 200,
    intro: "You have 200 chips (100 big blinds) each hand. Use the presets or the slider to size your bets.",
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
  const mode = MODES.find((m) => m.key === modeKey) ?? null;

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
            <button key={m.key} className="module-card" onClick={() => setModeKey(m.key)}>
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
      <LivePlay
        key={mode.key}
        bridgeRef={bridgeRef}
        ready={ready}
        betting={mode.betting}
        stack={mode.stack}
        carry={mode.carry}
        opponents={mode.opponents}
        autoStart={!!mode.opponents}
      />
    </div>
  );
}
