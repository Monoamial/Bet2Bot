import { useState } from "react";
import { RangeGrid } from "./RangeGrid";
import { StreetPolicyEditor } from "./StreetPolicyEditor";
import { Action, RaiseSize, RAISE_SIZES, Strategy, StreetPolicyData, Unlocks } from "../strategy/model";

type Street = "preflop" | "flop" | "turn" | "river";
const STREETS: Street[] = ["preflop", "flop", "turn", "river"];
const LABEL: Record<Street, string> = {
  preflop: "Preflop", flop: "Flop", turn: "Turn", river: "River",
};

export function StrategyBuilder({
  strategy, onChange, unlocks, betting = "limit",
}: {
  strategy: Strategy;
  onChange: (s: Strategy) => void;
  unlocks: Unlocks;
  betting?: "limit" | "no_limit";
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
          <>
            {betting === "no_limit" && <div className="adv-empty">
              Preflop raise size (for raised grid cells in No-Limit; Classic Limit ignores sizing):{" "}
              <select className="adv-select" aria-label="Preflop raise size"
                value={strategy.preflopRaiseSize ?? ""}
                onChange={(event) => onChange({ ...strategy,
                  preflopRaiseSize: event.target.value ? event.target.value as RaiseSize : undefined })}>
                <option value="">Auto (pot-sized)</option>
                {RAISE_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
              </select>
            </div>}
            <RangeGrid preflop={strategy.preflop} onChange={setPreflop} />
          </>
        ) : (
          <StreetPolicyEditor
            policy={strategy[tab]}
            onChange={(p) => setStreet(tab, p)}
            unlocks={unlocks}
            betting={betting}
          />
        )}
      </div>
    </div>
  );
}
