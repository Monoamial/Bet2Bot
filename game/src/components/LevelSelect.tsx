import { Level } from "../campaign/levels";
import { Avatar } from "../assets/Avatar";
import { maxObjectiveStars } from "../campaign/objectives";

export function LevelSelect({
  levels, index, cleared, bestStars, onSelect, disabled = false,
}: {
  levels: Level[];
  index: number;
  cleared: Set<string>;
  bestStars: Record<string, number>;
  onSelect: (i: number) => void;
  disabled?: boolean;
}) {
  const unlocked = (i: number) => i === 0 || cleared.has(levels[i - 1].id);

  return (
    <div className="level-select">
      {levels.map((lv, i) => {
        const isOpen = unlocked(i);
        const isClear = cleared.has(lv.id);
        const cls = [
          "level-card",
          i === index ? "on" : "",
          !isOpen ? "locked" : "",
        ].join(" ");
        return (
          <button
            key={lv.id}
            className={cls}
            disabled={!isOpen || disabled}
            onClick={() => onSelect(i)}
          >
            <Avatar kind={lv.opponent} size={34} />
            <div className="level-card-meta">
              <div className="level-card-name">{lv.opponentLabel}</div>
              <div className="level-card-tag">
                {isClear ? "✓ cleared" : isOpen ? `Level ${i + 1}${lv.mode === "survival" ? " · Survival" : ""}` : "🔒 locked"}
                {bestStars[lv.id] > 0 && ` · ★ ${bestStars[lv.id]}/${maxObjectiveStars(lv.objectives)}`}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
