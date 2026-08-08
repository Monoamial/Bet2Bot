import type { LevelResult } from "../engine-api/types";
import type { Level } from "../campaign/levels";

export function StatsPanel({
  result, level, onNext, nextLabel,
}: {
  result: LevelResult;
  level: Level;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const won = result.player_bb100 > level.winBb100;
  const you = result.summary[result.player_index];

  return (
    <div className="panel">
      <h2>Results — {result.hands} hands</h2>
      <div className="body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className={`banner ${won ? "win" : "lose"}`}>
          <span className="big">{won ? "🏆" : "💪"}</span>
          <div style={{ flex: 1 }}>
            <div>{won ? `You beat ${level.opponentLabel}!` : "Not yet — keep tuning."}</div>
            <div style={{ fontWeight: 400, color: "var(--muted)" }}>
              Your win rate: {you.bb100.toFixed(1)} bb/100 (net {you.net} chips)
            </div>
          </div>
          {won && onNext && (
            <button className="run" onClick={onNext}>▶ {nextLabel}</button>
          )}
        </div>

        <table className="stats">
          <thead>
            <tr>
              <th>Bot</th><th>Net</th><th>bb/100</th><th>VPIP%</th>
              <th>PFR%</th><th>AF</th><th>SD won</th><th>Illegal</th>
            </tr>
          </thead>
          <tbody>
            {result.summary.map((r, i) => (
              <tr key={r.name} className={i === result.player_index ? "you" : ""}>
                <td>{i === result.player_index ? "You" : r.name}</td>
                <td>{r.net}</td>
                <td>{r.bb100.toFixed(1)}</td>
                <td>{r.vpip.toFixed(0)}</td>
                <td>{r.pfr.toFixed(0)}</td>
                <td>{r.af === null ? "∞" : r.af.toFixed(2)}</td>
                <td>{r.showdowns_won}</td>
                <td>{r.illegal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {you.illegal > 0 && (
          <div className="status err">
            ⚠ Your bot returned {you.illegal} illegal/broken action(s); the engine
            substituted a safe one each time.
          </div>
        )}
      </div>
    </div>
  );
}
