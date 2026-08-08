import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { LESSONS, Lesson } from "../academy/lessons";
import { HandRankChart } from "./HandRankChart";
import { ScriptedHand } from "./ScriptedHand";
import { LivePlay } from "./LivePlay";
import { CardView } from "./Card";
import type { EngineBridge } from "../pyodide/bridge";

function QuizView({ lesson, onSolved }: {
  lesson: Extract<Lesson, { kind: "quiz" }>;
  onSolved: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = picked === null ? null : lesson.options[picked];
  return (
    <div>
      {lesson.compare && (
        <div className="quiz-compare">
          <div>
            <div className="quiz-label">Hand A</div>
            <div className="hand">{lesson.compare.a.map((c, i) => <CardView key={i} card={c} small />)}</div>
          </div>
          <div>
            <div className="quiz-label">Hand B</div>
            <div className="hand">{lesson.compare.b.map((c, i) => <CardView key={i} card={c} small />)}</div>
          </div>
        </div>
      )}
      <p className="quiz-prompt">{lesson.prompt}</p>
      <div className="quiz-options">
        {lesson.options.map((o, i) => (
          <button
            key={i}
            className={`quiz-opt${picked === i ? (o.correct ? " good" : " bad") : ""}`}
            disabled={picked !== null && lesson.options[picked].correct}
            onClick={() => { setPicked(i); if (o.correct) onSolved(); }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {chosen && (
        <div className={`scripted-feedback ${chosen.correct ? "good" : "bad"}`}>
          {chosen.feedback}
          {!chosen.correct && <div className="retry" onClick={() => setPicked(null)}>↺ Try again</div>}
        </div>
      )}
    </div>
  );
}

export function Academy({ onStart, bridgeRef, ready }: {
  onStart: () => void;
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
}) {
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const lesson = LESSONS[step];
  const isLast = step === LESSONS.length - 1;

  useEffect(() => {
    setSolved(lesson.kind === "read" || lesson.kind === "bridge");
  }, [step, lesson.kind]);

  return (
    <div className="academy">
      <div className="academy-progress">
        {LESSONS.map((_, i) => (
          <span key={i} className={`dot${i === step ? " on" : ""}${i < step ? " done" : ""}`} />
        ))}
      </div>

      <div className="panel academy-card">
        <h2>{lesson.title}</h2>
        <div className="body">
          {lesson.kind === "read" && (
            <>
              {lesson.body.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
              {lesson.visual === "handRanks" && <HandRankChart />}
            </>
          )}
          {lesson.kind === "quiz" && (
            <QuizView key={lesson.id} lesson={lesson} onSolved={() => setSolved(true)} />
          )}
          {lesson.kind === "hand" && (
            <ScriptedHand
              key={lesson.id}
              hole={lesson.hole} board={lesson.board} pot={lesson.pot} toCall={lesson.toCall}
              situation={lesson.situation} choices={lesson.choices}
              onSolved={() => setSolved(true)}
            />
          )}
          {lesson.kind === "play" && (
            <>
              {lesson.body.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
              <LivePlay
                key={lesson.id}
                bridgeRef={bridgeRef}
                ready={ready}
                fixedOpponent={lesson.opponent}
                autoStart
                embedded
                onHandDone={() => setSolved(true)}
              />
            </>
          )}
          {lesson.kind === "bridge" && lesson.body.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
        </div>

        <div className="academy-nav">
          <button className="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
          <span className="academy-count">{step + 1} / {LESSONS.length}</span>
          {isLast ? (
            <button className="run" onClick={onStart}>{lesson.kind === "bridge" ? lesson.cta : "Start the Campaign →"}</button>
          ) : (
            <button className="run" disabled={!solved} onClick={() => setStep((s) => s + 1)}>
              {solved ? "Next →" : lesson.kind === "play" ? "Play a hand to continue" : "Answer to continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
