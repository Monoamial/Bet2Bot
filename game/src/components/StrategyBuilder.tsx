import { useState } from "react";
import { RangeGrid } from "./RangeGrid";
import { StreetPolicyEditor } from "./StreetPolicyEditor";
import { Action, Strategy, StreetPolicyData, Unlocks } from "../strategy/model";

type Street = "preflop" | "flop" | "turn" | "river";
const STREETS: Street[] = ["preflop", "flop", "turn", "river"];
const LABEL: Record<Street, string> = {
  preflop: "Preflop", flop: "Flop", turn: "Turn", river: "River",
};

export function StrategyBuilder({
  strategy, onChange, unlocks,
}: {
  strategy: Strategy;
  onChange: (s: Strategy) => void;
  unlocks: Unlocks;
}) {
  const [tab, setTab] = useState<Street>("preflop");

  function setPreflop(preflop: Record<string, Action>) {
    onChange({ ...strategy, preflop });
  }
  function setStreet(street: Street, policy: StreetPolicyData) {
    onChange({ ...strategy, [street]: policy });
  }

  return (
    <div className="builder">
      <div className="tabs">
        {STREETS.map((s) => (
          <button
            key={s}
            className={`tab${tab === s ? " on" : ""}`}
            onClick={() => setTab(s)}
          >
            {LABEL[s]}
          </button>
        ))}
      </div>

      <div className="builder-body">
        {tab === "preflop" ? (
          <RangeGrid preflop={strategy.preflop} onChange={setPreflop} />
        ) : (
          <StreetPolicyEditor
            policy={strategy[tab]}
            onChange={(p) => setStreet(tab, p)}
            unlocks={unlocks}
          />
        )}
      </div>
    </div>
  );
}
