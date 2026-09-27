// Animated winnings or survival-stack graph, drawn left-to-right when a run
// finishes. Limit runs plot cumulative net from zero; fixed-stack sessions plot
// the carried stack from its starting value. Pure SVG with a draw-in transition.

import { useEffect, useMemo, useState } from "react";

const W = 560;
const H = 170;
const PAD = { top: 14, right: 52, bottom: 20, left: 40 };
const MAX_POINTS = 400; // downsample long runs so the path stays light

function downsample(values: number[], max: number): { hand: number; v: number }[] {
  if (values.length <= max) return values.map((v, i) => ({ hand: i, v }));
  const out: { hand: number; v: number }[] = [];
  const stride = (values.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    const idx = Math.round(i * stride);
    out.push({ hand: idx, v: values[idx] });
  }
  return out;
}

export function WinningsGraph({ timeline, bigBlind, startStack }: {
  timeline: number[];
  bigBlind: number;
  startStack?: number;
}) {
  const [drawn, setDrawn] = useState(false);
  const isSession = startStack !== undefined;

  // Restart the draw animation whenever a new run's timeline arrives.
  useEffect(() => {
    setDrawn(false);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(t);
  }, [timeline]);

  const g = useMemo(() => {
    const bb = timeline.map((v) => v / bigBlind);
    const start = startStack === undefined ? undefined : startStack / bigBlind;
    // Session payloads carry the stack after each hand; prepend the initial stack
    // so the plotted line starts at the actual bankroll rather than zero.
    const values = start === undefined ? bb : [start, ...bb];
    const pts = downsample(values, MAX_POINTS);
    const hands = timeline.length;
    const baseline = start ?? 0;
    const lo = Math.min(baseline, ...values);
    const hi = Math.max(baseline, ...values);
    const flatSession = start !== undefined && hi === lo;
    const yLo = flatSession ? lo - 0.5 : lo;
    const yHi = flatSession ? hi + 0.5 : hi;
    const span = yHi - yLo || 1;
    const handSpan = start === undefined ? Math.max(1, hands - 1) : Math.max(1, hands);
    const x = (hand: number) =>
      PAD.left + ((W - PAD.left - PAD.right) * hand) / handSpan;
    const y = (v: number) =>
      PAD.top + (H - PAD.top - PAD.bottom) * (1 - (v - yLo) / span);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.hand).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    const last = pts[pts.length - 1];
    const area = `${line}L${x(last.hand).toFixed(1)},${y(baseline).toFixed(1)}L${x(0).toFixed(1)},${y(baseline).toFixed(1)}Z`;
    const final = bb[bb.length - 1];
    return {
      line, area, baselineY: y(baseline), endX: x(last.hand), endY: y(last.v),
      lo, hi, baseline, start, final, hands,
    };
  }, [timeline, bigBlind, startStack]);

  if (timeline.length < (isSession ? 1 : 2)) return null;
  const color = isSession
    ? (g.final >= (g.start ?? 0) ? "#1D9E75" : "#E24B4A")
    : (g.final >= 0 ? "#1D9E75" : "#E24B4A");

  return (
    <div className="winnings">
      <div className="winnings-title">
        {isSession ? "Stack over time" : "Winnings over time"} <span className="unit">(big blinds)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="winnings-svg" role="img"
        aria-label={isSession
          ? `Stack over ${g.hands} hands, starting at ${g.start?.toFixed(0)} and finishing at ${g.final.toFixed(0)} big blinds`
          : `Bankroll over ${g.hands} hands, finishing at ${g.final.toFixed(0)} big blinds`}>
        {/* The zero line is for net winnings; sessions use the starting stack as baseline. */}
        <line x1={PAD.left} y1={g.baselineY} x2={W - PAD.right} y2={g.baselineY}
          stroke="#39414d" strokeDasharray="4 4" />
        <text x={PAD.left - 6} y={g.baselineY + 4} textAnchor="end" className="axis">
          {isSession ? Math.round(g.baseline) : 0}
        </text>
        {g.hi > g.baseline && (
          <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" className="axis">
            {isSession ? Math.round(g.hi) : `+${Math.round(g.hi)}`}
          </text>
        )}
        {g.lo < g.baseline && (
          <text x={PAD.left - 6} y={H - PAD.bottom + 4} textAnchor="end" className="axis">
            {Math.round(g.lo)}
          </text>
        )}
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="axis">
          {g.hands.toLocaleString()} hands
        </text>
        <text x={PAD.left} y={H - 4} className="axis">{isSession ? "start" : "hand 1"}</text>

        {/* area fill fades in after the line draws */}
        <path d={g.area} fill={color} opacity={drawn ? 0.12 : 0}
          style={{ transition: "opacity 500ms ease 1100ms" }} />
        {/* the line itself, revealed left-to-right */}
        <path d={g.line} fill="none" stroke={color} strokeWidth={2}
          pathLength={1} strokeDasharray={1} strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: "stroke-dashoffset 1200ms ease-out" }} />
        {/* end marker + final value */}
        <circle cx={g.endX} cy={g.endY} r={3.5} fill={color} opacity={drawn ? 1 : 0}
          style={{ transition: "opacity 300ms ease 1150ms" }} />
        <text x={g.endX + 6} y={g.endY + 4} className="final" fill={color}
          opacity={drawn ? 1 : 0} style={{ transition: "opacity 300ms ease 1150ms" }}>
          {isSession ? g.final.toFixed(0) : `${g.final >= 0 ? "+" : ""}${g.final.toFixed(0)}`}
        </text>
      </svg>
    </div>
  );
}
