import { useState } from "react";
import type { Lesson, SizingSpot } from "../academy/lessons";
import { drillStars } from "../academy/mastery";
import { CardBack, CardView } from "./Card";
import { Avatar } from "../assets/Avatar";

function SizingDecision({ spot, picked, onPick }: {
  spot: SizingSpot;
  picked: SizingSpot["choices"][number] | null;
  onPick: (choice: SizingSpot["choices"][number]) => void;
}) {
  return <div className="scripted">
    <div className="drill-tag">{spot.tag}</div>
    <div className="mini-felt">
      <div className="mini-seat"><Avatar kind="default" size={36} /><div className="hand"><CardBack small /><CardBack small /></div></div>
      <div className="mini-board">{spot.board.map((card, i) => <CardView key={i} card={card} small />)}</div>
      <div className="mini-pot">POT {spot.pot}{spot.toCall > 0 ? ` · to call ${spot.toCall}` : ""}</div>
      <div className="mini-seat"><div className="hand"><CardView card={spot.hole[0]} /><CardView card={spot.hole[1]} /></div><div className="mini-you">You · {spot.stack} chips</div></div>
    </div>
    <p className="scripted-situation">{spot.situation}</p>
    <div className="scripted-choices">
      {spot.choices.map((choice) => <button key={choice.label} className={`scripted-btn${picked === choice ? " picked" : ""}`}
        disabled={picked !== null} onClick={() => onPick(choice)}>{choice.label}</button>)}
    </div>
    {picked && <div className={`scripted-feedback ${picked.verdict}`}>
      <b>{picked.verdict === "good" ? "Good price." : picked.verdict === "ok" ? "Reasonable, but…" : "Not this time."}</b> {picked.feedback}
    </div>}
  </div>;
}

export function SizingDrill({ lesson, onSolved, onMastery }: {
  lesson: Extract<Lesson, { kind: "sizing" }>;
  onSolved: () => void;
  onMastery?: (stars: number) => void;
}) {
  const [index, setIndex] = useState(-1);
  const [picked, setPicked] = useState<SizingSpot["choices"][number] | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  function next() {
    if (index + 1 === lesson.spots.length) {
      setFinished(true); onMastery?.(drillStars(score, lesson.spots.length)); onSolved();
    }
    else { setIndex((i) => i + 1); setPicked(null); }
  }
  if (index < 0) return <div>
    {lesson.intro.map((p, i) => <p className="academy-p" key={i}>{p}</p>)}
    <button className="run" onClick={() => setIndex(0)}>Start sizing drill →</button>
  </div>;
  if (finished) return <div className="drill-summary">
    <div className="drill-score">{score} / {lesson.spots.length}</div>
    <p className="academy-p">The price matters, not just the action. Look at the pot and think about who will call before you move on.</p>
    <button className="ghost" onClick={() => { setIndex(0); setPicked(null); setScore(0); setFinished(false); }}>↺ Review the prices</button>
  </div>;
  const spot = lesson.spots[index];
  return <div>
    <div className="drill-head"><span className="drill-progress">Price {index + 1} of {lesson.spots.length}</span>
      <span className="drill-running">✓ {score} correct</span></div>
    <SizingDecision key={index} spot={spot} picked={picked} onPick={(choice) => {
      if (picked) return;
      setPicked(choice);
      if (choice.verdict === "good") setScore((s) => s + 1);
    }} />
    {picked && <div className="drill-next"><button className="run" onClick={next}>
      {index + 1 === lesson.spots.length ? "See your score →" : "Next price →"}
    </button></div>}
  </div>;
}
