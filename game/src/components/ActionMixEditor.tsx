import { Action, ACTION_STYLE, MixedAction, RAISE_SIZES, RaiseSize } from "../strategy/model";

function defaultAlternative(action: Action, options: Action[]): Action | undefined {
  const preferred = action === "raise" || action === "fold" ? "call" : "raise";
  return options.find((option) => option === preferred && option !== action)
    ?? options.find((option) => option !== action);
}

export function ActionMixEditor({
  action, mix, options, label, betting = "limit", onChange,
}: {
  action: Action;
  mix?: MixedAction;
  options: Action[];
  label: string;
  betting?: "limit" | "no_limit";
  onChange: (mix: MixedAction | undefined) => void;
}) {
  const alternatives = options.filter((option) => option !== action);

  if (!mix) {
    return (
      <button
        type="button"
        className="mini"
        aria-label={`Add mixed action for ${label}`}
        title="Choose an alternate action at a percentage; use the main action the rest of the time."
        onClick={() => {
          const alternate = defaultAlternative(action, options);
          if (alternate) onChange({ action: alternate, frequency: 30 });
        }}
      >
        + Mix
      </button>
    );
  }

  const configuredMix: MixedAction = mix;

  function setAlternate(nextAction: Action) {
    const next: MixedAction = { ...configuredMix, action: nextAction };
    if (nextAction !== "raise") delete next.raiseSize;
    onChange(next);
  }

  return (
    <div className="adv-rule">
      <span className="adv-when">Mix in</span>
      <select
        className="adv-select"
        aria-label={`Alternate action for ${label}`}
        value={configuredMix.action}
        onChange={(event) => setAlternate(event.target.value as Action)}
      >
        {alternatives.map((option) => (
          <option key={option} value={option}>{ACTION_STYLE[option].label}</option>
        ))}
      </select>
      <span className="adv-when">at</span>
      <input
        className="adv-select"
        type="number"
        min={1}
        max={99}
        step={1}
        aria-label={`Frequency of alternate action for ${label}`}
        value={configuredMix.frequency}
        onChange={(event) => {
          const frequency = event.currentTarget.valueAsNumber;
          if (Number.isFinite(frequency)) {
            onChange({ ...configuredMix, frequency: Math.round(Math.min(99, Math.max(1, frequency))) });
          }
        }}
      />
      <span className="adv-when">% of the time; otherwise {ACTION_STYLE[action].label}</span>
      {betting === "no_limit" && configuredMix.action === "raise" && (
        <select
          className="adv-select"
          aria-label={`Raise size for mixed action in ${label}`}
          title="Used in No-Limit; Classic Limit ignores sizing."
          value={configuredMix.raiseSize ?? "pot"}
          onChange={(event) => onChange({ ...configuredMix, raiseSize: event.target.value as RaiseSize })}
        >
          {RAISE_SIZES.map((size) => (
            <option key={size.value} value={size.value}>{size.label}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        className="adv-remove"
        aria-label={`Remove mixed action for ${label}`}
        onClick={() => onChange(undefined)}
      >
        ×
      </button>
    </div>
  );
}
