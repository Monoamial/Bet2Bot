import {
  ACTION_STYLE, Action, AdvancedRule, OppType, PotOdds, Position, TIER_INFO,
  TIER_ORDER, Tier, Unlocks,
} from "../strategy/model";

const ACTIONS: Action[] = ["fold", "check", "call", "raise"];

function Select<T extends string>({
  value, onChange, options, anyLabel,
}: {
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: { value: T; label: string }[];
  anyLabel: string;
}) {
  return (
    <select
      className="adv-select"
      value={value ?? ""}
      onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
    >
      <option value="">{anyLabel}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function AdvancedRules({
  rules, onChange, unlocks,
}: {
  rules: AdvancedRule[];
  onChange: (rules: AdvancedRule[]) => void;
  unlocks: Unlocks;
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
          <span className="adv-then">→</span>
          <select
            className="adv-select"
            value={r.action}
            onChange={(e) => update(i, { action: e.target.value as Action })}
          >
            {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_STYLE[a].label}</option>)}
          </select>
          <button className="adv-remove" onClick={() => remove(i)} aria-label="Remove rule">×</button>
        </div>
      ))}

      <button className="mini adv-add" onClick={add}>+ Add rule</button>
    </div>
  );
}
