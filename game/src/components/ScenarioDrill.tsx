// The "apply-it" drill (backlog A3): a served sequence of decision spots that vary the
// CONTEXT around a concept (e.g. the same hand in vs out of position). Unlike a
// ScriptedHand, each spot allows exactly ONE attempt — pick, read why, move on — and
// the run ends with a score + retry. Completing the drill (any score) unlocks Continue.

import { useMemo, useState } from "react";
import type { Lesson, Spot, SpotChoice } from "../academy/lessons";
import { randomizeScenario } from "../academy/randomize";
import { drillStars } from "../academy/mastery";
import { CardView, CardBack } from "./Card";
import { Avatar } from "../assets/Avatar";
import { ACTION_STYLE, Action } from "../strategy/model";

// Render choices in the canonical action order (like a real poker UI), so the
// correct answer isn't always the first button.
const ACTION_ORDER: Action[] = ["fold", "check", "call", "raise"];

export function SpotView({ spot, picked, onPick }: {
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

      <div className="puzzle-facts" aria-label="Decision facts">
        <span>Street <b>{spot.board.length === 0 ? "Preflop" : spot.board.length === 3 ? "Flop" : spot.board.length === 4 ? "Turn" : "River"}</b></span>
        {spot.opponent && <span>Opponent <b>{spot.opponent}</b></span>}
        {spot.position && <span>Position <b>{spot.position === "in-position" ? "In position" : "Out of position"}</b></span>}
        {spot.seat && <span>Seat <b>{spot.seat === "button" ? "Button" : spot.seat}</b></span>}
        {spot.stack != null && <span>Your stack <b>{spot.stack} chips</b></span>}
        <span>Pot <b>{spot.pot} chips</b></span>
        <span>To call <b>{spot.toCall} chips</b></span>
        <span>Options shown <b>{[...spot.choices].sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action))
          .map((choice) => ACTION_STYLE[choice.action].label).join(" · ")}</b></span>
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

function makeDealSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Date.now() ^ Math.floor(Math.random() * 0x1_0000_0000)) >>> 0;
}

export function ScenarioDrill({ lesson, onSolved, onMastery }: {
  lesson: Extract<Lesson, { kind: "scenario" }>;
  onSolved: () => void;
  onMastery?: (stars: number) => void;
}) {
  const [seed, setSeed] = useState(makeDealSeed);
  // Keep the seeded deal fixed through every render/answer in this attempt.
  const randomizedLesson = useMemo(() => randomizeScenario(lesson, seed), [lesson, seed]);
  const [index, setIndex] = useState(-1); // -1 = intro screen
  const [picked, setPicked] = useState<SpotChoice | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = randomizedLesson.spots.length;

  function pick(c: SpotChoice) {
    if (picked) return;
    setPicked(c);
    if (c.verdict === "good") setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      onMastery?.(drillStars(score, total));
      onSolved(); // completing the drill unlocks Continue, whatever the score
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  }

  function retry() {
    const nextSeed = makeDealSeed();
    setSeed(nextSeed === seed ? (seed + 1) >>> 0 : nextSeed);
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
            ? "Perfect — you read every situation correctly. Try the same ideas in live hands; some will need richer bot rules later."
            : solid
              ? "Solid. Before you retry, recall the opponent, your hand, and the price in any spot you missed."
              : "The concept hasn't clicked yet — that's what drills are for. Run it again and read the situation before the cards."}
        </p>
        <div className="drill-summary-actions">
          <button className="ghost" onClick={retry}>↺ Run the drill again</button>
        </div>
      </div>
    );
  }

  const spot = randomizedLesson.spots[index];
  return (
    <div>
      <div className="drill-head">
        <span className="drill-progress">Spot {index + 1} of {total}</span>
        <span className="drill-running">✓ {score} correct</span>
      </div>
      <SpotView key={`${seed}-${index}`} spot={spot} picked={picked} onPick={pick} />
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
