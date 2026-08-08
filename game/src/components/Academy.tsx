// The Learn track (backlog A1): a module map — each module a short course of lessons —
// with per-module progress persisted in localStorage, and a lesson runner shared by
// every module. Lesson kinds are rendered here; drills live in ScenarioDrill.

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { MODULES, Lesson, Module } from "../academy/lessons";
import { HandRankChart } from "./HandRankChart";
import { ScriptedHand } from "./ScriptedHand";
import { ScenarioDrill } from "./ScenarioDrill";
import { LivePlay } from "./LivePlay";
import { CardView } from "./Card";
import type { EngineBridge } from "../pyodide/bridge";

// --- persisted progress: moduleId -> number of lessons completed (A8) -------------
const PROGRESS_KEY = "b2b.academy.progress";

function loadProgress(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveProgress(p: Record<string, number>) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

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

// --- the module map ----------------------------------------------------------------

function ModuleMap({ progress, onOpen }: {
  progress: Record<string, number>;
  onOpen: (m: Module) => void;
}) {
  const doneCount = MODULES.filter((m) => (progress[m.id] ?? 0) >= m.lessons.length).length;
  return (
    <div className="module-map">
      <div className="module-map-head">
        <h2>The Academy</h2>
        <span className="module-map-sub">
          Short courses that make you — and your bot — better. {doneCount}/{MODULES.length} complete.
        </span>
      </div>
      <div className="module-grid">
        {MODULES.map((m, i) => {
          const done = progress[m.id] ?? 0;
          const total = m.lessons.length;
          const complete = done >= total;
          return (
            <button key={m.id} className={`module-card${complete ? " complete" : ""}`} onClick={() => onOpen(m)}>
              <div className="module-icon">{m.icon}</div>
              <div className="module-meta">
                <div className="module-title">
                  <span className="module-num">{i + 1}.</span> {m.title} {complete && <span className="module-check">✓</span>}
                </div>
                <div className="module-blurb">{m.blurb}</div>
                <div className="module-bar">
                  <div className="module-bar-fill" style={{ width: `${(Math.min(done, total) / total) * 100}%` }} />
                </div>
                <div className="module-status">
                  {complete ? "Complete — review anytime" : done > 0 ? `Continue · ${done}/${total}` : `Start · ${total} lessons`}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- the lesson runner ---------------------------------------------------------------

function ModuleRunner({ module, startAt, onExit, onComplete, onCampaign, bridgeRef, ready }: {
  module: Module;
  startAt: number;
  onExit: (lessonsDone: number) => void;
  onComplete: () => void;
  onCampaign: () => void;
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
}) {
  const [step, setStep] = useState(Math.min(startAt, module.lessons.length - 1));
  const [maxDone, setMaxDone] = useState(startAt);
  const [solved, setSolved] = useState(false);
  const [handsDone, setHandsDone] = useState(0);

  const lesson = module.lessons[step];
  const isLast = step === module.lessons.length - 1;
  const needHands = lesson.kind === "play" ? (lesson.requireHands ?? 1) : 0;

  useEffect(() => {
    setSolved(lesson.kind === "read" || lesson.kind === "bridge" || step < maxDone);
    setHandsDone(0);
  }, [step, lesson.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const done = Math.max(maxDone, step + 1);
    setMaxDone(done);
    if (isLast) {
      onExit(done);
      if (lesson.kind === "bridge" && lesson.action === "campaign") onCampaign();
      else onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="academy">
      <div className="academy-topline">
        <button className="ghost" onClick={() => onExit(Math.max(maxDone, solved ? step + 1 : step))}>
          ← Map
        </button>
        <span className="academy-module-name">{module.icon} {module.title}</span>
        <div className="academy-progress">
          {module.lessons.map((_, i) => (
            <span key={i} className={`dot${i === step ? " on" : ""}${i < step ? " done" : ""}`} />
          ))}
        </div>
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
          {lesson.kind === "scenario" && (
            <ScenarioDrill key={lesson.id} lesson={lesson} onSolved={() => setSolved(true)} />
          )}
          {lesson.kind === "play" && (
            <>
              {lesson.body.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
              <LivePlay
                key={lesson.id}
                bridgeRef={bridgeRef}
                ready={ready}
                fixedOpponent={lesson.opponent}
                fixedButton={lesson.fixedButton}
                autoStart
                embedded
                onHandDone={() => setHandsDone((h) => {
                  const n = h + 1;
                  if (n >= needHands) setSolved(true);
                  return n;
                })}
              />
            </>
          )}
          {lesson.kind === "bridge" && lesson.body.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
        </div>

        <div className="academy-nav">
          <button className="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
          <span className="academy-count">{step + 1} / {module.lessons.length}</span>
          {lesson.kind === "bridge" ? (
            <button className="run" onClick={advance}>{lesson.cta}</button>
          ) : (
            <button className="run" disabled={!solved} onClick={advance}>
              {solved
                ? isLast ? "Finish module ✓" : "Next →"
                : lesson.kind === "play"
                  ? `Play ${needHands - handsDone} more hand${needHands - handsDone === 1 ? "" : "s"} to continue`
                  : lesson.kind === "scenario" ? "Finish the drill to continue" : "Answer to continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- top level ------------------------------------------------------------------------

export function Academy({ onStart, bridgeRef, ready }: {
  onStart: () => void;
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
}) {
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress);
  const [openId, setOpenId] = useState<string | null>(null);

  const module = MODULES.find((m) => m.id === openId) ?? null;

  function record(moduleId: string, lessonsDone: number) {
    setProgress((p) => {
      const next = { ...p, [moduleId]: Math.max(p[moduleId] ?? 0, lessonsDone) };
      saveProgress(next);
      return next;
    });
  }

  if (!module) {
    return (
      <div className="academy">
        <ModuleMap progress={progress} onOpen={(m) => setOpenId(m.id)} />
      </div>
    );
  }

  const done = progress[module.id] ?? 0;
  return (
    <ModuleRunner
      key={module.id}
      module={module}
      startAt={done >= module.lessons.length ? 0 : done}
      onExit={(lessonsDone) => { record(module.id, lessonsDone); setOpenId(null); }}
      onComplete={() => setOpenId(null)}
      onCampaign={onStart}
      bridgeRef={bridgeRef}
      ready={ready}
    />
  );
}
