import type { BotSummaryRow } from "../engine-api/types";

const STREETS = ["preflop", "flop", "turn", "river"];
const TIERS = ["Preflop (unmade)", "High card", "One pair", "Two pair / trips", "Straight or better"];

function Breakdown({ title, data, order }: {
  title: string;
  data: Record<string, { hands: number; net: number }>;
  order: string[];
}) {
  return <div className="breakdown-group">
    <b>{title}</b>
    <table className="stats">
      <thead><tr><th>Group</th><th>Hands</th><th>Net chips</th></tr></thead>
      <tbody>{order.filter((name) => data[name]?.hands).map((name) => (
        <tr key={name}>
          <td>{name === "preflop" ? "Preflop" : name[0].toUpperCase() + name.slice(1)}</td>
          <td>{data[name].hands}</td>
          <td className={data[name].net >= 0 ? "good-net" : "bad-net"}>
            {data[name].net >= 0 ? "+" : ""}{data[name].net}
          </td>
        </tr>
      ))}</tbody>
    </table>
  </div>;
}

/** Outcomes by category, not a causal per-street EV calculation. Each hand
 * contributes its *entire* net to one finishing street and one final made tier.
 */
export function LeakBreakdown({ player }: { player: BotSummaryRow }) {
  if (!player.by_end_street || !player.by_final_tier) return null;
  return <details className="leak-breakdown">
    <summary>Where did the chips go?</summary>
    <p>Each hand's whole net is grouped by the street where it ended and by your
      hand's strength then. These are outcomes, not the value of bets on that
      particular street or proof a decision was correct.</p>
    <div className="breakdown-columns">
      <Breakdown title="Ending street" data={player.by_end_street} order={STREETS} />
      <Breakdown title="Your hand at finish" data={player.by_final_tier} order={TIERS} />
    </div>
  </details>;
}
