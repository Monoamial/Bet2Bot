import { Level } from "../campaign/levels";
import { Avatar } from "../assets/Avatar";

export function LevelSelect({
  levels, index, cleared, onSelect,
}: {
  levels: Level[];
  index: number;
  cleared: Set<string>;
  onSelect: (i: number) => void;
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
            disabled={!isOpen}
            onClick={() => onSelect(i)}
          >
            <Avatar kind={lv.opponent} size={34} />
            <div className="level-card-meta">
              <div className="level-card-name">{lv.opponentLabel}</div>
              <div className="level-card-tag">
                {isClear ? "✓ cleared" : isOpen ? `Level ${i + 1}` : "🔒 locked"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
