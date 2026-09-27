import {
  ACTION_STYLE, Action, AdvancedRule, OppType, PotOdds, Position, RaiseSize,
  RAISE_SIZES, TIER_INFO, TIER_ORDER, Tier, Unlocks,
} from "../strategy/model";
import { ActionMixEditor } from "./ActionMixEditor";

const ACTIONS: Action[] = ["fold", "check", "call", "raise"];

function Select<T extends string>({
  value, onChange, options, anyLabel, ariaLabel,
}: {
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: { value: T; label: string }[];
  anyLabel: string;
  ariaLabel?: string;
}) {
  return (
    <select
      className="adv-select"
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
    >
      <option value="">{anyLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function AdvancedRules({
  rules, onChange, unlocks, betting = "limit",
}: {
  rules: AdvancedRule[];
  onChange: (rules: AdvancedRule[]) => void;
  unlocks: Unlocks;
  betting?: "limit" | "no_limit";
}) {
  function update(i: number, patch: Partial<AdvancedRule>) {
    onChange(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rules.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rules, { tier: "pair", action: "raise" }]);
  }

  return (
    <div className="adv">
      <div className="adv-title">
        Advanced rules <span className="adv-sub">(override the table above; checked top-down)</span>
      </div>
      {unlocks.history && (
        <div className="adv-sub">
          Public current-hand action history means betting actions visible before this decision only—not hidden cards or a persistent opponent profile.
        </div>
      )}

      {rules.length === 0 && (
        <div className="adv-empty">No advanced rules yet.</div>
      )}

      {rules.map((r, i) => (
        <div key={i} className="adv-rule">
          <span className="adv-when">When</span>
          <Select<Tier>
            value={r.tier}
            onChange={(v) => update(i, { tier: (v ?? "pair") as Tier })}
            options={TIER_ORDER.map((t) => ({ value: t, label: TIER_INFO[t].label }))}
            anyLabel="A pair"
          />
          {unlocks.position && (
            <Select<Position>
              value={r.position}
              onChange={(v) => update(i, { position: v })}
              options={[{ value: "ip", label: "in position" }, { value: "oop", label: "out of position" }]}
              anyLabel="any position"
            />
          )}
          {unlocks.oppType && (
            <Select<OppType>
              value={r.oppType}
              onChange={(v) => update(i, { oppType: v })}
              options={[{ value: "loose", label: "vs loose" }, { value: "tight", label: "vs tight" }]}
              anyLabel="any opponent"
            />
          )}
          {unlocks.potOdds && (
            <Select<PotOdds>
              value={r.potOdds}
              onChange={(v) => update(i, { potOdds: v })}
              options={[{ value: "cheap", label: "cheap price" }, { value: "expensive", label: "expensive price" }]}
              anyLabel="any price"
            />
          )}
          {unlocks.history && (
            <>
              <span className="adv-when">Public actions this hand</span>
              <Select<string>
                ariaLabel={`Public current-hand action history for advanced rule ${i + 1}`}
                value={r.oppRaisedThisHand === undefined ? undefined : String(r.oppRaisedThisHand)}
                onChange={(v) => update(i, {
                  oppRaisedThisHand: v === undefined ? undefined : v === "true",
                })}
                options={[
                  { value: "true", label: "opponent raised" },
                  { value: "false", label: "no opponent raise" },
                ]}
                anyLabel="any history"
              />
            </>
          )}
          <span className="adv-then">→</span>
          <select
            className="adv-select"
            value={r.action}
            onChange={(e) => {
              const action = e.target.value as Action;
              update(i, { action, ...(action === r.mix?.action ? { mix: undefined } : {}) });
            }}
          >
            {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_STYLE[a].label}</option>)}
          </select>
          {betting === "no_limit" && r.action === "raise" && (
            <select
              className="adv-select"
              aria-label={`Raise size for advanced rule ${i + 1}`}
              title="Used in No-Limit; Classic Limit ignores sizing."
              value={r.raiseSize ?? "pot"}
              onChange={(e) => update(i, { raiseSize: e.target.value as RaiseSize })}
            >
              {RAISE_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
            </select>
          )}
          {unlocks.mix && (
            <ActionMixEditor
              action={r.action}
              mix={r.mix}
              options={ACTIONS}
              label={`advanced rule ${i + 1}`}
              betting={betting}
              onChange={(mix) => update(i, { mix })}
            />
          )}
          <button className="adv-remove" onClick={() => remove(i)} aria-label="Remove rule">×</button>
        </div>
      ))}

      <button className="mini adv-add" onClick={add}>+ Add rule</button>
    </div>
  );
}
