import {
  ACTION_STYLE, Action, AdvancedRule, MixedAction, RaiseSize, RAISE_SIZES,
  StreetPolicyData, TIER_INFO, TIER_ORDER, Tier, Unlocks,
} from "../strategy/model";
import { ActionMixEditor } from "./ActionMixEditor";
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

function RaiseSizeChoice({
  value, onChange, label,
}: {
  value: RaiseSize | undefined;
  onChange: (size: RaiseSize) => void;
  label: string;
}) {
  return (
    <select
      className="adv-select"
      aria-label={label}
      title="Used in No-Limit; Classic Limit ignores sizing."
      value={value ?? "pot"}
      onChange={(e) => onChange(e.target.value as RaiseSize)}
    >
      {RAISE_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
    </select>
  );
}

export function StreetPolicyEditor({
  policy, onChange, unlocks, betting = "limit",
}: {
  policy: StreetPolicyData;
  onChange: (next: StreetPolicyData) => void;
  unlocks: Unlocks;
  betting?: "limit" | "no_limit";
}) {
  const showFacing = unlocks.facingBet;
  const showAdvanced = unlocks.position || unlocks.oppType || unlocks.potOdds || unlocks.history;

  function set(tier: Tier, key: "first" | "facing", action: Action) {
    const row = { ...policy.table[tier], [key]: action };
    const mixKey = key === "first" ? "firstMix" : "facingMix";
    if (row[mixKey]?.action === action) delete row[mixKey];
    // When the "facing a bet" column is locked, keep both columns' choices in sync.
    if (!showFacing && key === "first") {
      row.facing = action;
      row.facingMix = row.firstMix;
    }
    const table = { ...policy.table, [tier]: row };
    onChange({ ...policy, table });
  }

  function setMix(tier: Tier, key: "first" | "facing", mix?: MixedAction) {
    const row = { ...policy.table[tier] };
    if (key === "first") {
      if (mix && mix.action !== row.first) row.firstMix = mix;
      else delete row.firstMix;
      if (!showFacing) {
        if (row.firstMix) row.facingMix = row.firstMix;
        else delete row.facingMix;
      }
    } else if (mix && mix.action !== row.facing) row.facingMix = mix;
    else delete row.facingMix;
    const table = { ...policy.table, [tier]: row };
    onChange({ ...policy, table });
  }

  function setRaiseSize(tier: Tier, key: "first" | "facing", size: RaiseSize) {
    const sizeKey = key === "first" ? "firstRaiseSize" : "facingRaiseSize";
    const table = { ...policy.table, [tier]: { ...policy.table[tier], [sizeKey]: size } };
    if (!showFacing && key === "first") {
      table[tier] = { ...table[tier], firstRaiseSize: size, facingRaiseSize: size };
    }
    onChange({ ...policy, table });
  }

  function setAdvanced(advanced: AdvancedRule[]) {
    onChange({ ...policy, advanced });
  }

  return (
    <div>
      {betting === "no_limit" && <div className="adv-empty">
        Raise sizes are measured against the pot after calling: Small (½ pot), Pot, or Overbet (2× pot).
        The engine clamps raises to the legal minimum and your remaining stack.
      </div>}
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
                {unlocks.mix && (
                  <ActionMixEditor
                    action={policy.table[tier].first}
                    mix={policy.table[tier].firstMix}
                    options={FIRST_ACTIONS}
                    label={`${TIER_INFO[tier].label} when no bet is out`}
                    betting={betting}
                    onChange={(mix) => setMix(tier, "first", mix)}
                  />
                )}
                {betting === "no_limit" && policy.table[tier].first === "raise" && (
                  <RaiseSizeChoice
                    value={policy.table[tier].firstRaiseSize}
                    label={`Raise size for ${TIER_INFO[tier].label} when no bet yet`}
                    onChange={(size) => setRaiseSize(tier, "first", size)}
                  />
                )}
              </td>
              {showFacing && (
                <td>
                  <ActionChoice
                    options={FACING_ACTIONS}
                    value={policy.table[tier].facing}
                    onChange={(a) => set(tier, "facing", a)}
                  />
                  {unlocks.mix && (
                    <ActionMixEditor
                      action={policy.table[tier].facing}
                      mix={policy.table[tier].facingMix}
                      options={FACING_ACTIONS}
                      label={`${TIER_INFO[tier].label} when facing a bet`}
                      betting={betting}
                      onChange={(mix) => setMix(tier, "facing", mix)}
                    />
                  )}
                  {betting === "no_limit" && policy.table[tier].facing === "raise" && (
                    <RaiseSizeChoice
                      value={policy.table[tier].facingRaiseSize}
                      label={`Raise size for ${TIER_INFO[tier].label} when facing a bet`}
                      onChange={(size) => setRaiseSize(tier, "facing", size)}
                    />
                  )}
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
          betting={betting}
        />
      )}
    </div>
  );
}
