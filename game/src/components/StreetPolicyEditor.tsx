import {
  ACTION_STYLE, Action, AdvancedRule, StreetPolicyData, TIER_INFO, TIER_ORDER, Tier,
  Unlocks,
} from "../strategy/model";
import { AdvancedRules } from "./AdvancedRules";

const FIRST_ACTIONS: Action[] = ["check", "raise"];
const FACING_ACTIONS: Action[] = ["fold", "call", "raise"];

function ActionChoice({
  options, value, onChange,
}: {
  options: Action[]; value: Action; onChange: (a: Action) => void;
}) {
  return (
    <div className="choice">
      {options.map((a) => {
        const on = value === a;
        return (
          <button
            key={a}
            className={`choice-btn${on ? " on" : ""}`}
            style={on ? { background: ACTION_STYLE[a].bg, color: ACTION_STYLE[a].fg } : {}}
            onClick={() => onChange(a)}
          >
            {ACTION_STYLE[a].label}
          </button>
        );
      })}
    </div>
  );
}

export function StreetPolicyEditor({
  policy, onChange, unlocks,
}: {
  policy: StreetPolicyData;
  onChange: (next: StreetPolicyData) => void;
  unlocks: Unlocks;
}) {
  const showFacing = unlocks.facingBet;
  const showAdvanced = unlocks.position || unlocks.oppType || unlocks.potOdds;

  function set(tier: Tier, key: "first" | "facing", action: Action) {
    const table = { ...policy.table, [tier]: { ...policy.table[tier], [key]: action } };
    // When the "facing a bet" column is locked, keep both in sync off the single choice.
    if (!showFacing && key === "first") table[tier] = { first: action, facing: action };
    onChange({ ...policy, table });
  }

  function setAdvanced(advanced: AdvancedRule[]) {
    onChange({ ...policy, advanced });
  }

  return (
    <div>
    <table className="policy-table">
      <thead>
        <tr>
          <th>If your hand is…</th>
          <th>{showFacing ? "…and no bet yet" : "…do this"}</th>
          {showFacing && <th>…and facing a bet</th>}
        </tr>
      </thead>
      <tbody>
        {TIER_ORDER.map((tier) => (
          <tr key={tier}>
            <td>
              <div className="tier-name">{TIER_INFO[tier].label}</div>
              <div className="tier-eg">{TIER_INFO[tier].example}</div>
            </td>
            <td>
              <ActionChoice
                options={FIRST_ACTIONS}
                value={policy.table[tier].first}
                onChange={(a) => set(tier, "first", a)}
              />
            </td>
            {showFacing && (
              <td>
                <ActionChoice
                  options={FACING_ACTIONS}
                  value={policy.table[tier].facing}
                  onChange={(a) => set(tier, "facing", a)}
                />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
    {showAdvanced && (
      <AdvancedRules
        rules={policy.advanced ?? []}
        onChange={setAdvanced}
        unlocks={unlocks}
      />
    )}
    </div>
  );
}
