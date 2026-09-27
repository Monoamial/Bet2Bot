import type { LevelResult, SessionResult } from "../engine-api/types";
import type { Level } from "../campaign/levels";
import { evaluateObjectives } from "../campaign/objectives";
import { WinningsGraph } from "./WinningsGraph";

function Chip({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className={`chip${tone ? ` ${tone}` : ""}`}>
      <div className="chip-value">{value}</div>
      <div className="chip-label">{label}</div>
    </div>
  );
}

export function StatsPanel({
  result, level, previousBest = 0, onNext, nextLabel,
}: {
  result: LevelResult | SessionResult;
  level: Level;
  previousBest?: number;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const you = result.summary[result.player_index];
  const objectiveScore = evaluateObjectives(level.objectives, result);
  const gate = objectiveScore.objectives.find(
    (objective) => objective.id === level.progressionObjectiveId,
  );
  const won = (gate?.stars ?? 0) > 0;
  const session = "hands_survived" in result ? result : null;
  const starMarks = `${"★".repeat(objectiveScore.stars)}${"☆".repeat(Math.max(0, objectiveScore.maxStars - objectiveScore.stars))}`;

  return (
    <div className="panel">
      <h2>{session ? `Results — ${session.hands_survived}/${level.hands} hands` : `Results — ${result.hands} hands`}</h2>
      <div className="body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className={`banner ${won ? "win" : "lose"}`}>
          <span className="big">{won ? "🏆" : "💪"}</span>
          <div style={{ flex: 1 }}>
            <div>
              {session
                ? won ? `You survived ${session.hands_survived} hands!` : `Busted after ${session.hands_survived} hands — keep tuning.`
                : won ? `You beat ${level.opponentLabel}!` : "Not yet — keep tuning."}
            </div>
            <div style={{ fontWeight: 400, color: "var(--muted)" }}>
              {session
                ? `Final stack: ${session.final_stack} chips (${(session.final_stack / result.big_blind).toFixed(1)} bb) · started with ${session.start_stack}`
                : `Your win rate: ${you.bb100.toFixed(1)} bb/100 (net ${you.net} chips)`}
            </div>
          </div>
          {won && onNext && (
            <button className="run" onClick={onNext}>▶ {nextLabel}</button>
          )}
        </div>

        <div
          aria-label="Campaign objective score"
          style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <strong>Objective stars</strong>
            <span aria-label={`${objectiveScore.stars} of ${objectiveScore.maxStars} stars`}>
              {starMarks} {objectiveScore.stars}/{objectiveScore.maxStars}
              {objectiveScore.stars > previousBest && <b className="new-best"> New personal best</b>}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {objectiveScore.objectives.map((objective) => (
              <div key={objective.id}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {objective.title} <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                    ({objective.stars}/{objective.maxStars} stars)
                  </span>
                </div>
                {objective.tiers.map((tier) => (
                  <div key={tier.id} style={{ display: "flex", flexWrap: "wrap", gap: 6, color: "var(--muted)", fontSize: 12 }}>
                    <span aria-label={tier.passed ? "Met" : "Not met"}>{tier.passed ? "✓" : "○"}</span>
                    <span>{tier.label}</span>
                    <span>{tier.checks.map((check) => check.label).join(" · ")}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <WinningsGraph
          timeline={result.timeline} bigBlind={result.big_blind}
          startStack={session?.start_stack}
        />

        <div className="chips-row">
          {session ? (
            <Chip label="final stack"
              value={`${session.final_stack} (${(session.final_stack / result.big_blind).toFixed(1)} bb)`}
              tone={session.final_stack >= session.start_stack ? "good" : "bad"} />
          ) : (
            <Chip label="net chips" value={`${you.net >= 0 ? "+" : ""}${you.net}`}
              tone={you.net >= 0 ? "good" : "bad"} />
          )}
          <Chip label="hands won" value={`${you.win_pct.toFixed(0)}%`} />
          <Chip label="biggest pot won" value={`+${you.biggest_win}`} tone="good" />
          <Chip label="worst hand" value={`${you.biggest_loss}`} tone="bad" />
          <Chip label="went to showdown" value={`${you.showdown_pct.toFixed(0)}%`} />
          <Chip label="aggression" value={you.af === null ? "∞" : you.af.toFixed(1)} />
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
