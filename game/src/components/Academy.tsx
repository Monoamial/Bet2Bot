// The Learn track (backlog A1): a module map — each module a short course of lessons —
// with per-module progress persisted in localStorage, and a lesson runner shared by
// every module. Lesson kinds are rendered here; drills live in ScenarioDrill.

import { useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import { MODULES, Lesson, Module } from "../academy/lessons";
import { attemptStars, bestStars } from "../academy/mastery";
import { HandRankChart } from "./HandRankChart";
import { ScriptedHand } from "./ScriptedHand";
import { ScenarioDrill } from "./ScenarioDrill";
import { SizingDrill } from "./SizingDrill";
import { LivePlay } from "./LivePlay";
import { CardView } from "./Card";
import type { EngineBridge } from "../pyodide/bridge";

// --- persisted progress: moduleId -> number of lessons completed (A8) -------------
const PROGRESS_KEY = "b2b.academy.progress";
const MASTERY_KEY = "b2b.academy.mastery";
type Mastery = Record<string, number>;

function loadMastery(): Mastery {
  try { return JSON.parse(localStorage.getItem(MASTERY_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveMastery(value: Mastery) {
  try { localStorage.setItem(MASTERY_KEY, JSON.stringify(value)); } catch { /* ignore */ }
}

function loadProgress(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveProgress(p: Record<string, number>) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function QuizView({ lesson, onSolved }: {
  lesson: Extract<Lesson, { kind: "quiz" }>;
  onSolved: (stars: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const chosen = picked === null ? null : lesson.options[picked];
  return (
    <div>
      {lesson.compare && (
        <div className="quiz-compare">
          <div>
            <div className="quiz-label">{lesson.compare.labelA ?? "Hand A"}</div>
            <div className="hand">{lesson.compare.a.map((c, i) => <CardView key={i} card={c} small />)}</div>
          </div>
          <div>
            <div className="quiz-label">{lesson.compare.labelB ?? "Hand B"}</div>
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
            onClick={() => {
              setPicked(i);
              if (o.correct) onSolved(attemptStars(mistakes, "good"));
              else setMistakes((n) => n + 1);
            }}
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

function ModuleMap({ progress, mastery, onOpen }: {
  progress: Record<string, number>;
  mastery: Mastery;
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
          const exercises = m.lessons.filter((lesson) =>
            ["quiz", "hand", "scenario", "sizing"].includes(lesson.kind));
          const earned = exercises.reduce((sum, lesson) => sum + (mastery[`${m.id}/${lesson.id}`] ?? 0), 0);
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
                  {exercises.length > 0 && ` · mastery ${earned}/${exercises.length * 3} stars`}
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

function ModuleRunner({ module, startAt, mastery, onExit, onComplete, onCampaign, onMastery, bridgeRef, ready }: {
  module: Module;
  startAt: number;
  mastery: Mastery;
  onExit: (lessonsDone: number) => void;
  onComplete: () => void;
  onCampaign: (bridgeId: string) => void;
  onMastery: (lessonId: string, stars: number) => void;
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
  const recordMastery = (stars: number) => onMastery(`${module.id}/${lesson.id}`, stars);
  const scoredLesson = ["quiz", "hand", "scenario", "sizing"].includes(lesson.kind);
  const lessonStars = mastery[`${module.id}/${lesson.id}`] ?? 0;

  useEffect(() => {
    setSolved(lesson.kind === "read" || lesson.kind === "bridge" || step < maxDone);
    setHandsDone(0);
  }, [step, lesson.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const done = Math.max(maxDone, step + 1);
    setMaxDone(done);
    if (isLast) {
      onExit(done);
      if (lesson.kind === "bridge" && lesson.action === "campaign") onCampaign(lesson.id);
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
        {scoredLesson && (
          <div className="lesson-mastery" aria-label={`Best mastery ${lessonStars} of 3 stars`}>
            Mastery {"★".repeat(lessonStars)}{"☆".repeat(3 - lessonStars)}
          </div>
        )}
        <div className="body">
          {lesson.kind === "read" && (
            <>
              {lesson.body.map((p, i) => <p key={i} className="academy-p">{p}</p>)}
              {lesson.visual === "handRanks" && <HandRankChart />}
            </>
          )}
          {lesson.kind === "quiz" && (
            <QuizView key={lesson.id} lesson={lesson} onSolved={(stars) => {
              recordMastery(stars); setSolved(true);
            }} />
          )}
          {lesson.kind === "hand" && (
            <ScriptedHand
              key={lesson.id}
              hole={lesson.hole} board={lesson.board} pot={lesson.pot} toCall={lesson.toCall}
              situation={lesson.situation} choices={lesson.choices}
              onSolved={(stars) => { recordMastery(stars); setSolved(true); }}
            />
          )}
          {lesson.kind === "scenario" && (
            <ScenarioDrill key={lesson.id} lesson={lesson} onSolved={() => setSolved(true)}
              onMastery={recordMastery} />
          )}
          {lesson.kind === "sizing" && (
            <SizingDrill key={lesson.id} lesson={lesson} onSolved={() => setSolved(true)}
              onMastery={recordMastery} />
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
                betting={lesson.betting}
                stack={lesson.stack}
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
                  : lesson.kind === "scenario" || lesson.kind === "sizing" ? "Finish the drill to continue" : "Answer to continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- top level ------------------------------------------------------------------------

export function Academy({ onStart, bridgeRef, ready }: {
  onStart: (bridgeId: string) => void;
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
}) {
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress);
  const [mastery, setMastery] = useState<Mastery>(loadMastery);
  const [openId, setOpenId] = useState<string | null>(null);

  const module = MODULES.find((m) => m.id === openId) ?? null;

  function record(moduleId: string, lessonsDone: number) {
    setProgress((p) => {
      const next = { ...p, [moduleId]: Math.max(p[moduleId] ?? 0, lessonsDone) };
      saveProgress(next);
      return next;
    });
  }

  function recordMastery(lessonId: string, stars: number) {
    setMastery((current) => {
      const next = { ...current, [lessonId]: bestStars(current[lessonId], stars) };
      saveMastery(next);
      return next;
    });
  }

  if (!module) {
    return (
      <div className="academy">
        <ModuleMap progress={progress} mastery={mastery} onOpen={(m) => setOpenId(m.id)} />
      </div>
    );
  }

  const done = progress[module.id] ?? 0;
  return (
    <ModuleRunner
      key={module.id}
      module={module}
      startAt={done >= module.lessons.length ? 0 : done}
      mastery={mastery}
      onExit={(lessonsDone) => { record(module.id, lessonsDone); setOpenId(null); }}
      onComplete={() => setOpenId(null)}
      onCampaign={onStart}
      onMastery={recordMastery}
      bridgeRef={bridgeRef}
      ready={ready}
    />
  );
}
