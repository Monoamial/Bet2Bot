// The "apply-it" drill (backlog A3): a served sequence of decision spots that vary the
// CONTEXT around a concept (e.g. the same hand in vs out of position). Unlike a
// ScriptedHand, each spot allows exactly ONE attempt — pick, read why, move on — and
// the run ends with a score + retry. Completing the drill (any score) unlocks Continue.

import { useState } from "react";
import type { Lesson, Spot, SpotChoice } from "../academy/lessons";
import { CardView, CardBack } from "./Card";
import { Avatar } from "../assets/Avatar";
import { ACTION_STYLE, Action } from "../strategy/model";

// Render choices in the canonical action order (like a real poker UI), so the
// correct answer isn't always the first button.
const ACTION_ORDER: Action[] = ["fold", "check", "call", "raise"];

function SpotView({ spot, picked, onPick }: {
  spot: Spot;
  picked: SpotChoice | null;
  onPick: (c: SpotChoice) => void;
}) {
  return (
    <div className="scripted">
      <div className="drill-tag">{spot.tag}</div>
      <div className="mini-felt">
        <div className="mini-seat">
          <Avatar kind="default" size={36} />
          <div className="hand"><CardBack small /><CardBack small /></div>
        </div>
        <div className="mini-board">
          {spot.board.length
            ? spot.board.map((c, i) => <CardView key={i} card={c} small />)
            : <span className="mini-preflop">— preflop —</span>}
        </div>
        <div className="mini-pot">POT {spot.pot}{spot.toCall > 0 ? ` · to call ${spot.toCall}` : ""}</div>
        <div className="mini-seat">
          <div className="hand"><CardView card={spot.hole[0]} /><CardView card={spot.hole[1]} /></div>
          <div className="mini-you">You</div>
        </div>
      </div>

      <p className="scripted-situation">{spot.situation}</p>

      <div className="scripted-choices">
        {[...spot.choices]
          .sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action))
          .map((c) => {
          const isPicked = picked === c;
          const style = isPicked
            ? { background: ACTION_STYLE[c.action].bg, color: ACTION_STYLE[c.action].fg }
            : {};
          return (
            <button key={c.action}
              className={`scripted-btn${isPicked ? " picked" : ""}`}
              style={style} disabled={!!picked} onClick={() => onPick(c)}>
              {ACTION_STYLE[c.action].label}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className={`scripted-feedback ${picked.verdict}`}>
          <b>{picked.verdict === "good" ? "Nice." : picked.verdict === "ok" ? "Okay." : "Not quite."}</b>{" "}
          {picked.feedback}
        </div>
      )}
    </div>
  );
}

export function ScenarioDrill({ lesson, onSolved }: {
  lesson: Extract<Lesson, { kind: "scenario" }>;
  onSolved: () => void;
}) {
  const [index, setIndex] = useState(-1); // -1 = intro screen
  const [picked, setPicked] = useState<SpotChoice | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = lesson.spots.length;

  function pick(c: SpotChoice) {
    if (picked) return;
    setPicked(c);
    if (c.verdict === "good") setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      onSolved(); // completing the drill unlocks Continue, whatever the score
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  }

  function retry() {
    setIndex(0); setPicked(null); setScore(0); setFinished(false);
  }

  if (index === -1) {
    return (
      <div>
        {lesson.intro.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
        <button className="run" onClick={() => setIndex(0)}>▶ Start the drill ({total} spots)</button>
      </div>
    );
  }

  if (finished) {
    const perfect = score === total;
    const solid = score >= Math.ceil(total * 0.7);
    return (
      <div className="drill-summary">
        <div className="drill-score">{score} / {total}</div>
        <p className="academy-p">
          {perfect
            ? "Perfect — you read every seat correctly. This is exactly the judgment your bot rules will encode."
            : solid
              ? "Solid. Skim the spots you missed above in your mind — the seat badge is always the first thing to check."
              : "The concept hasn't clicked yet — that's what drills are for. Run it again and check the badge before the cards."}
        </p>
        <div className="drill-summary-actions">
          <button className="ghost" onClick={retry}>↺ Run the drill again</button>
        </div>
      </div>
    );
  }

  const spot = lesson.spots[index];
  return (
    <div>
      <div className="drill-head">
        <span className="drill-progress">Spot {index + 1} of {total}</span>
        <span className="drill-running">✓ {score} correct</span>
      </div>
      <SpotView key={index} spot={spot} picked={picked} onPick={pick} />
      {picked && (
        <div className="drill-next">
          <button className="run" onClick={next}>
            {index + 1 >= total ? "See your score →" : "Next spot →"}
          </button>
        </div>
      )}
    </div>
  );
}
