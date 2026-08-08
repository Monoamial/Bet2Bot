import type { Level } from "../campaign/levels";
import { Avatar } from "../assets/Avatar";

export function LessonPanel({ level }: { level: Level }) {
  return (
    <div className="panel">
      <h2>{level.title}</h2>
      <div className="body lesson">
        <div className="opponent-card">
          <Avatar kind={level.opponent} size={56} />
          <div>
            <div className="opponent-name">{level.opponentLabel}</div>
            <div className="opponent-blurb">{level.blurb}</div>
          </div>
        </div>
        <div className="objective">🎯 {level.objective}</div>
        {level.lesson.map((p, i) => <p key={i}>{p}</p>)}
        {level.hint && (
          <details>
            <summary>Stuck? Show a hint</summary>
            <p style={{ marginTop: 8 }}>{level.hint}</p>
          </details>
        )}
      </div>
    </div>
  );
}
