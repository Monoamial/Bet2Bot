// Standalone Academy practice: short poker decisions from the authored lesson
// scenarios, re-dealt by their concept-safe variant pools. One attempt, then
// explanation and the next spot; practice rating/streak live on this device.
import { useState } from "react";
import { MODULES, type Spot, type SpotChoice } from "../academy/lessons";
import { randomizeScenario, type ScenarioLesson } from "../academy/randomize";
import { SpotView } from "./ScenarioDrill";

const KEY = "b2b.puzzles.v1";
interface Progress { rating: number; streak: number; best: number; solved: number }
const initialProgress: Progress = { rating: 800, streak: 0, best: 0, solved: 0 };

interface Template { id: string; moduleId: string; topic: string; lesson: ScenarioLesson; index: number }
const templates: Template[] = MODULES.flatMap((module) => module.lessons.flatMap((lesson) => {
  if (lesson.kind !== "scenario") return [];
  return lesson.spots.map((_, index) => ({
    id: `${module.id}/${lesson.id}/${index}`, moduleId: module.id,
    topic: module.title, lesson, index,
  }));
}));

function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved.rating === "number" && typeof saved.streak === "number"
      && typeof saved.best === "number" && typeof saved.solved === "number") return saved;
  } catch { /* private browsing may deny storage */ }
  return initialProgress;
}

function nextPuzzle(pool: Template[], previous?: string): { template: Template; spot: Spot } {
  const others = pool.filter((p) => pool.length === 1 || p.id !== previous);
  const template = others[Math.floor(Math.random() * others.length)];
  const seed = typeof crypto !== "undefined" && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint32Array(1))[0]
    : Math.floor(Math.random() * 0x1_0000_0000);
  return { template, spot: randomizeScenario(template.lesson, seed).spots[template.index] };
}

export function Puzzles() {
  const [topic, setTopic] = useState("all");
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [puzzle, setPuzzle] = useState(() => nextPuzzle(templates));
  const [picked, setPicked] = useState<SpotChoice | null>(null);
  const [change, setChange] = useState(0);
  const pool = topic === "all" ? templates : templates.filter((t) => t.moduleId === topic);

  function selectTopic(moduleId: string) {
    const selected = moduleId === "all" ? templates : templates.filter((t) => t.moduleId === moduleId);
    setTopic(moduleId);
    setPuzzle(nextPuzzle(selected));
    setPicked(null);
    setChange(0);
  }

  function answer(choice: SpotChoice) {
    if (picked) return;
    setPicked(choice);
    // A lightweight practice rating, not an opponent ELO: harder concepts
    // (later modules) confer slightly more when answered correctly.
    const difficulty = 800 + MODULES.findIndex((m) => m.id === puzzle.template.moduleId) * 80;
    const expected = 1 / (1 + Math.pow(10, (difficulty - progress.rating) / 400));
    const actual = choice.verdict === "good" ? 1 : choice.verdict === "ok" ? 0.5 : 0;
    const delta = Math.round(24 * (actual - expected));
    setChange(delta);
    const streak = choice.verdict === "good" ? progress.streak + 1 : 0;
    const updated = {
      rating: Math.max(100, progress.rating + delta), streak,
      best: Math.max(progress.best, streak), solved: progress.solved + 1,
    };
    setProgress(updated);
    try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch { /* play still works */ }
  }

  function next() {
    setPuzzle(nextPuzzle(pool, puzzle.template.id));
    setPicked(null);
    setChange(0);
  }

  return (
    <div className="puzzles-wrap">
      <div className="module-map-head">
        <h2>Poker puzzles</h2>
        <span className="module-map-sub">One decision at a time. Read the context, choose your action, then see why.</span>
      </div>
      <div className="puzzle-stats" aria-label="Practice progress">
        <span>Practice rating <b>{progress.rating}</b>{picked && <small className={change >= 0 ? "good" : "bad"}> {change >= 0 ? "+" : ""}{change}</small>}</span>
        <span>Streak <b>{progress.streak}</b></span>
        <span>Best <b>{progress.best}</b></span>
        <span>Attempted <b>{progress.solved}</b></span>
      </div>
      <div className="puzzle-topics" aria-label="Choose puzzle topic">
        <button className={topic === "all" ? "on" : ""} onClick={() => selectTopic("all")}>All concepts</button>
        {MODULES.filter((m) => templates.some((t) => t.moduleId === m.id)).map((m) => (
          <button key={m.id} className={topic === m.id ? "on" : ""}
            onClick={() => selectTopic(m.id)}>{m.title}</button>
        ))}
      </div>
      <div className="panel academy-card">
        <h2>{puzzle.template.topic} · Puzzle #{progress.solved + (picked ? 0 : 1)}</h2>
        <div className="body">
          <SpotView spot={puzzle.spot} picked={picked} onPick={answer} />
          {picked && (
            <div className="drill-next">
              <button className="run" onClick={next}>Next puzzle →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
