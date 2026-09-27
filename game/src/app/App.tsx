import { useEffect, useRef, useState } from "react";
import { EngineBridge } from "../pyodide/bridge";
import { LEVELS } from "../campaign/levels";
import { evaluateObjectives } from "../campaign/objectives";
import type { LevelResult, SessionResult } from "../engine-api/types";
import { Academy } from "../components/Academy";
import { Landing } from "../components/Landing";
import { GameModes } from "../components/GameModes";
import { BuildLab } from "../components/BuildLab";
import { Puzzles } from "../components/Puzzles";
import { LessonPanel } from "../components/LessonPanel";
import { LevelSelect } from "../components/LevelSelect";
import { StrategyBuilder } from "../components/StrategyBuilder";
import { PokerTable } from "../components/PokerTable";
import { StatsPanel } from "../components/StatsPanel";
import { Strategy, applyLessonBridge, clone, compileStrategy } from "../strategy/model";

const LS = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
    catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

type View = "home" | "learn" | "puzzles" | "play" | "build" | "campaign";

export function App() {
  const bridgeRef = useRef<EngineBridge | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("loading engine…");

  // Embedded hosts (Godot WebView) can request a clean, predictable entry screen
  // without touching the returning player's normal browser preference.
  const embedded = new URLSearchParams(window.location.search).get("embed") === "1";
  const [view, setView] = useState<View>(() => embedded ? "home" : LS.get<View>("b2b.view", "home"));
  const [levelIndex, setLevelIndex] = useState<number>(() => LS.get("b2b.level", 0));
  const [cleared, setCleared] = useState<Set<string>>(
    () => new Set(LS.get<string[]>("b2b.cleared", [])),
  );
  const [strategy, setStrategy] = useState<Strategy>(
    () => LS.get<Strategy | null>("b2b.strategy", null) ?? clone(LEVELS[0].starterStrategy),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LevelResult | SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaignNote, setCampaignNote] = useState<string | null>(null);
  const [bestStars, setBestStars] = useState<Record<string, number>>(
    () => LS.get("b2b.campaign.bestStars.v1", {}),
  );
  const [previousBest, setPreviousBest] = useState(0);

  const level = LEVELS[levelIndex];
  const hasNext = levelIndex < LEVELS.length - 1;

  useEffect(() => {
    bridgeRef.current = new EngineBridge({
      onStatus: setStatus,
      onReady: () => { setReady(true); setStatus("engine ready"); },
    });
  }, []);

  useEffect(() => { LS.set("b2b.strategy", strategy); }, [strategy]);
  useEffect(() => { LS.set("b2b.level", levelIndex); }, [levelIndex]);
  // Persist the tab, but never "home" — the landing page is a door, not a place.
  useEffect(() => { if (!embedded && view !== "home") LS.set("b2b.view", view); }, [view, embedded]);

  function startCampaign(bridgeId: string) {
    LS.set("b2b.academyDone", true);
    const update = applyLessonBridge(strategy, bridgeId);
    if (update.description) {
      setStrategy(update.strategy);
      setCampaignNote(update.description);
    }
    if (bridgeId === "value-bridge") setLevelIndex(0);
    if (bridgeId === "discipline-bridge" && cleared.has(LEVELS[0].id)) setLevelIndex(1);
    setResult(null);
    setView("campaign");
  }
  function selectLevel(i: number) {
    setLevelIndex(i); setResult(null); setError(null); setCampaignNote(null);
  }

  async function run() {
    if (!bridgeRef.current || !ready || running) return;
    setPreviousBest(bestStars[level.id] ?? 0);
    setRunning(true); setError(null); setCampaignNote(null);
    try {
      const request = {
        strategy: compileStrategy(strategy), opponent: level.opponent,
        hands: level.hands, capture: 6, // no seed → fresh random hands each run
      };
      const res: LevelResult | SessionResult = level.mode === "survival"
        ? await bridgeRef.current.runSession({
            ...request, stack: level.stack ?? 50, maxHands: level.hands,
            config: { betting: "no_limit" },
          })
        : await bridgeRef.current.runLevel(request);
      if (res.error) { setError(res.error); setResult(null); }
      else {
        setResult(res);
        const score = evaluateObjectives(level.objectives, res);
        if (score.stars > (bestStars[level.id] ?? 0)) {
          const next = { ...bestStars, [level.id]: score.stars };
          setBestStars(next);
          LS.set("b2b.campaign.bestStars.v1", next);
        }
        const gate = score.objectives.find((objective) => objective.id === level.progressionObjectiveId);
        if ((gate?.stars ?? 0) > 0 && !cleared.has(level.id)) {
          const next = new Set(cleared).add(level.id);
          setCleared(next);
          LS.set("b2b.cleared", [...next]);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally { setRunning(false); }
  }

  return (
    <div className={`app${embedded ? " embedded" : ""}`}>
      <div className="topbar">
        <h1 className="home-link" onClick={() => setView("home")} title="Home">
          <span className="logo">♠</span> Bet2Bot
        </h1>
        <div className="nav">
          <button className={view === "learn" ? "on" : ""} onClick={() => setView("learn")}>Learn</button>
          <button className={view === "puzzles" ? "on" : ""} onClick={() => setView("puzzles")}>Puzzles</button>
          <button className={view === "play" ? "on" : ""} onClick={() => setView("play")}>Play</button>
          <button className={view === "build" ? "on" : ""} onClick={() => setView("build")}>Build</button>
          <button className={view === "campaign" ? "on" : ""} onClick={() => setView("campaign")}>Campaign</button>
        </div>
        {view !== "home" && (
          <span className="level-pill">
            {view === "learn" ? "Academy" : view === "puzzles" ? "Practice" : view === "play" ? "Game modes" : view === "build" ? "Bot lab" : level.title}
          </span>
        )}
        <div className="spacer" />
        <span className="status">{ready ? "● engine ready" : `○ ${status}`}</span>
      </div>

      {view === "home" ? (
        <div className="learn-wrap">
          <Landing onEnter={setView} />
        </div>
      ) : view === "learn" ? (
        <div className="learn-wrap">
          <Academy onStart={startCampaign} bridgeRef={bridgeRef} ready={ready} />
        </div>
      ) : view === "puzzles" ? (
        <div className="learn-wrap"><Puzzles /></div>
      ) : view === "play" ? (
        <div className="learn-wrap">
          <div style={{ width: "100%", maxWidth: 820 }}>
            <GameModes bridgeRef={bridgeRef} ready={ready} />
          </div>
        </div>
      ) : view === "build" ? (
        <div className="learn-wrap"><BuildLab bridgeRef={bridgeRef} ready={ready} /></div>
      ) : (
        <div className="main">
          <div className="col">
            <div className="panel">
              <h2>Campaign</h2>
              <div className="body">
                <LevelSelect levels={LEVELS} index={levelIndex} cleared={cleared}
                  bestStars={bestStars} onSelect={selectLevel} disabled={running} />
              </div>
            </div>
            <LessonPanel level={level} />
            <div className="panel builder-panel" style={{ flex: 1 }}>
              <h2>Your Strategy</h2>
              {campaignNote && <div className="bridge-notice" role="status">{campaignNote}</div>}
              <StrategyBuilder
                strategy={strategy} onChange={setStrategy} unlocks={level.unlocks}
                betting={level.mode === "survival" ? "no_limit" : "limit"}
              />
              <div className="toolbar">
                <button className="run" onClick={run} disabled={!ready || running}>
                  {running ? "Running…" : ready ? `▶ Run ${level.hands.toLocaleString()} hands` : "engine loading…"}
                </button>
                <button className="ghost" onClick={() => setStrategy(clone(level.starterStrategy))} disabled={running}>
                  Reset strategy
                </button>
                <span className={`status${error ? " err" : ""}`}>
                  {running ? "Dealing…" : error ? "Error — see below" : ""}
                </span>
              </div>
              {error && <div className="console">{error}</div>}
            </div>
          </div>

          <div className="col">
            <PokerTable
              replays={result?.replays ?? []} playerName="You"
              opponentName={level.opponentLabel} playerIndex={result?.player_index ?? 0}
              opponentKind={level.opponent}
            />
            {result && (
              <StatsPanel
                result={result} level={level} previousBest={previousBest}
                onNext={hasNext ? () => selectLevel(levelIndex + 1) : undefined}
                nextLabel={hasNext ? `Next: ${LEVELS[levelIndex + 1].opponentLabel}` : undefined}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
