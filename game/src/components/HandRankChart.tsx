import { CardView } from "./Card";

const RANKS: { name: string; cards: string[] }[] = [
  { name: "Straight flush", cards: ["9h", "8h", "7h", "6h", "5h"] },
  { name: "Four of a kind", cards: ["Qs", "Qh", "Qd", "Qc", "3d"] },
  { name: "Full house", cards: ["Ts", "Th", "Td", "4s", "4h"] },
  { name: "Flush", cards: ["Ah", "Jh", "8h", "5h", "2h"] },
  { name: "Straight", cards: ["9c", "8d", "7h", "6s", "5c"] },
  { name: "Three of a kind", cards: ["7s", "7h", "7d", "Kc", "2d"] },
  { name: "Two pair", cards: ["As", "Ad", "9s", "9h", "4c"] },
  { name: "One pair", cards: ["Ks", "Kd", "Ts", "6h", "3c"] },
  { name: "High card", cards: ["Ad", "Jc", "9h", "6s", "2d"] },
];

export function HandRankChart() {
  return (
    <div className="rank-chart">
      {RANKS.map((r, i) => (
        <div key={r.name} className="rank-row">
          <div className="rank-num">{i + 1}</div>
          <div className="rank-name">{r.name}</div>
          <div className="rank-cards">
            {r.cards.map((c, j) => <CardView key={j} card={c} small />)}
          </div>
        </div>
      ))}
    </div>
  );
}
