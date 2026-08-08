// Animated winnings-over-time graph: the player's cumulative bankroll (in big
// blinds) after each hand, drawn left-to-right when a run finishes. Pure SVG —
// the line is revealed with a stroke-dashoffset transition, then the area fill
// and final value fade in.

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

export function WinningsGraph({ timeline, bigBlind }: { timeline: number[]; bigBlind: number }) {
  const [drawn, setDrawn] = useState(false);

  // Restart the draw animation whenever a new run's timeline arrives.
  useEffect(() => {
    setDrawn(false);
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(t);
  }, [timeline]);

  const g = useMemo(() => {
    const bb = timeline.map((v) => v / bigBlind);
    const pts = downsample(bb, MAX_POINTS);
    const hands = timeline.length;
    const lo = Math.min(0, ...bb);
    const hi = Math.max(0, ...bb);
    const span = hi - lo || 1;
    const x = (hand: number) =>
      PAD.left + ((W - PAD.left - PAD.right) * hand) / Math.max(1, hands - 1);
    const y = (v: number) =>
      PAD.top + (H - PAD.top - PAD.bottom) * (1 - (v - lo) / span);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.hand).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    const last = pts[pts.length - 1];
    const area = `${line}L${x(last.hand).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
    const final = bb[bb.length - 1];
    return { line, area, zeroY: y(0), endX: x(last.hand), endY: y(last.v), lo, hi, final, hands };
  }, [timeline, bigBlind]);

  if (timeline.length < 2) return null;
  const color = g.final >= 0 ? "#1D9E75" : "#E24B4A";

  return (
    <div className="winnings">
      <div className="winnings-title">
        Winnings over time <span className="unit">(big blinds)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="winnings-svg" role="img"
        aria-label={`Bankroll over ${g.hands} hands, finishing at ${g.final.toFixed(0)} big blinds`}>
        {/* zero line + y extents */}
        <line x1={PAD.left} y1={g.zeroY} x2={W - PAD.right} y2={g.zeroY}
          stroke="#39414d" strokeDasharray="4 4" />
        <text x={PAD.left - 6} y={g.zeroY + 4} textAnchor="end" className="axis">0</text>
        {g.hi > 0 && (
          <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" className="axis">
            +{Math.round(g.hi)}
          </text>
        )}
        {g.lo < 0 && (
          <text x={PAD.left - 6} y={H - PAD.bottom + 4} textAnchor="end" className="axis">
            {Math.round(g.lo)}
          </text>
        )}
        <text x={W - PAD.right} y={H - 4} textAnchor="end" className="axis">
          {g.hands.toLocaleString()} hands
        </text>
        <text x={PAD.left} y={H - 4} className="axis">hand 1</text>

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
          {g.final >= 0 ? "+" : ""}{g.final.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}
