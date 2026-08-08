import { useState } from "react";
import {
  ACTION_STYLE, Action, RANKS, allHandClasses, classAt, combosAt, presetPreflop, vpip,
} from "../strategy/model";

const PALETTE: Action[] = ["raise", "call", "fold"];

export function RangeGrid({
  preflop, onChange,
}: {
  preflop: Record<string, Action>;
  onChange: (next: Record<string, Action>) => void;
}) {
  const [selected, setSelected] = useState<Action>("raise");
  const [painting, setPainting] = useState(false);

  function paint(cls: string) {
    if (preflop[cls] === selected) return;
    onChange({ ...preflop, [cls]: selected });
  }

  function setAll(action: Action) {
    const next: Record<string, Action> = {};
    for (const cls of allHandClasses()) next[cls] = action;
    onChange(next);
  }

  return (
    <div
      onMouseUp={() => setPainting(false)}
      onMouseLeave={() => setPainting(false)}
    >
      <div className="palette-row">
        <div className="palette">
          {PALETTE.map((a) => (
            <button
              key={a}
              className={`chip${selected === a ? " on" : ""}`}
              onClick={() => setSelected(a)}
            >
              <span className="sw" style={{ background: ACTION_STYLE[a].bg }} />
              {ACTION_STYLE[a].label}
            </button>
          ))}
          <span className="sep" />
          <button className="mini" onClick={() => onChange(presetPreflop("tight"))}>Tight</button>
          <button className="mini" onClick={() => onChange(presetPreflop("loose"))}>Loose</button>
          <button className="mini" onClick={() => setAll("call")}>All call</button>
          <button className="mini" onClick={() => setAll("fold")}>All fold</button>
        </div>
        <div className="vpip">
          <div className="vpip-label">Hands you play</div>
          <div className="vpip-val">{vpip(preflop)}%</div>
        </div>
      </div>

      <div className="range-grid">
        {RANKS.map((_, r) =>
          RANKS.map((__, c) => {
            const cls = classAt(r, c);
            const action = preflop[cls] ?? "fold";
            const st = ACTION_STYLE[action];
            return (
              <div
                key={`${r}-${c}`}
                className="rg-cell"
                style={{ background: st.bg, color: st.fg }}
                title={`${cls} · ${combosAt(r, c)} combos`}
                onMouseDown={(e) => { e.preventDefault(); setPainting(true); paint(cls); }}
                onMouseEnter={() => { if (painting) paint(cls); }}
              >
                {cls}
              </div>
            );
          }),
        )}
      </div>

      <div className="hint-line">
        Diagonal = pairs · above = suited · below = offsuit · click or drag to paint
      </div>
    </div>
  );
}
