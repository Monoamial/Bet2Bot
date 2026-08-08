import { useState } from "react";
import { CardView, CardBack } from "./Card";
import { Avatar } from "../assets/Avatar";
import { ACTION_STYLE, Action } from "../strategy/model";

type Choice = { action: Action; verdict: "good" | "ok" | "bad"; feedback: string };

export function ScriptedHand({
  hole, board, pot, toCall, situation, choices, onSolved,
}: {
  hole: [string, string];
  board: string[];
  pot: number;
  toCall: number;
  situation: string;
  choices: Choice[];
  onSolved: () => void;
}) {
  const [picked, setPicked] = useState<Choice | null>(null);

  function choose(c: Choice) {
    if (picked) return;
    setPicked(c);
    if (c.verdict !== "bad") onSolved();
  }

  return (
    <div className="scripted">
      <div className="mini-felt">
        <div className="mini-seat">
          <Avatar kind="default" size={36} />
          <div className="hand"><CardBack small /><CardBack small /></div>
        </div>
        <div className="mini-board">
          {board.map((c, i) => <CardView key={i} card={c} small />)}
        </div>
        <div className="mini-pot">POT {pot}{toCall > 0 ? ` · to call ${toCall}` : ""}</div>
        <div className="mini-seat">
          <div className="hand"><CardView card={hole[0]} /><CardView card={hole[1]} /></div>
          <div className="mini-you">You</div>
        </div>
      </div>

      <p className="scripted-situation">{situation}</p>

      <div className="scripted-choices">
        {choices.map((c) => {
          const isPicked = picked === c;
          const style = isPicked
            ? { background: ACTION_STYLE[c.action].bg, color: ACTION_STYLE[c.action].fg }
            : {};
          return (
            <button
              key={c.action}
              className={`scripted-btn${isPicked ? " picked" : ""}`}
              style={style}
              onClick={() => choose(c)}
              disabled={!!picked}
            >
              {ACTION_STYLE[c.action].label}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className={`scripted-feedback ${picked.verdict}`}>
          <b>{picked.verdict === "good" ? "Nice." : picked.verdict === "ok" ? "Okay." : "Not quite."}</b>{" "}
          {picked.feedback}
          {picked.verdict === "bad" && (
            <div className="retry" onClick={() => setPicked(null)}>↺ Try again</div>
          )}
        </div>
      )}
    </div>
  );
}
