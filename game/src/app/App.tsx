import { useEffect, useRef, useState } from "react";
import { EngineBridge } from "../pyodide/bridge";
import { LEVELS } from "../campaign/levels";
import type { LevelResult } from "../engine-api/types";
import { Academy } from "../components/Academy";
import { GameModes } from "../components/GameModes";
import { LessonPanel } from "../components/LessonPanel";
import { LevelSelect } from "../components/LevelSelect";
import { StrategyBuilder } from "../components/StrategyBuilder";
import { PokerTable } from "../components/PokerTable";
import { StatsPanel } from "../components/StatsPanel";
import { Strategy, clone, compileStrategy } from "../strategy/model";

const LS = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; }
    catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

type View = "learn" | "play" | "campaign";

export function App() {
  const bridgeRef = useRef<EngineBridge | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("loading engine…");

  const [view, setView] = useState<View>(
    () => (LS.get("b2b.academyDone", false) ? "campaign" : "learn"),
  );
  const [levelIndex, setLevelIndex] = useState<number>(() => LS.get("b2b.level", 0));
  const [cleared, setCleared] = useState<Set<string>>(
    () => new Set(LS.get<string[]>("b2b.cleared", [])),
  );
  const [strategy, setStrategy] = useState<Strategy>(
    () => LS.get<Strategy | null>("b2b.strategy", null) ?? clone(LEVELS[0].starterStrategy),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LevelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  useEffect(() => { LS.set("b2b.view", view); }, [view]);

  function startCampaign() {
    LS.set("b2b.academyDone", true);
    setView("campaign");
  }
  function selectLevel(i: number) {
    setLevelIndex(i); setResult(null); setError(null);
  }

  async function run() {
    if (!bridgeRef.current || !ready || running) return;
    setRunning(true); setError(null);
    try {
      const res = await bridgeRef.current.runLevel({
        strategy: compileStrategy(strategy), opponent: level.opponent,
        hands: level.hands, capture: 6, // no seed → fresh random hands each run
      });
      if (res.error) { setError(res.error); setResult(null); }
      else {
        setResult(res);
        if (res.player_bb100 > level.winBb100 && !cleared.has(level.id)) {
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
    <div className="app">
      <div className="topbar">
        <h1><span className="logo">♠</span> Bet2Bot</h1>
        <div className="nav">
          <button className={view === "learn" ? "on" : ""} onClick={() => setView("learn")}>Learn</button>
          <button className={view === "play" ? "on" : ""} onClick={() => setView("play")}>Play</button>
          <button className={view === "campaign" ? "on" : ""} onClick={() => setView("campaign")}>Campaign</button>
        </div>
        <span className="level-pill">
          {view === "learn" ? "Academy" : view === "play" ? "Game modes" : level.title}
        </span>
        <div className="spacer" />
        <span className="status">{ready ? "● engine ready" : `○ ${status}`}</span>
      </div>

      {view === "learn" ? (
        <div className="learn-wrap">
          <Academy onStart={startCampaign} bridgeRef={bridgeRef} ready={ready} />
        </div>
      ) : view === "play" ? (
        <div className="learn-wrap">
          <div style={{ width: "100%", maxWidth: 820 }}>
            <GameModes bridgeRef={bridgeRef} ready={ready} />
          </div>
        </div>
      ) : (
        <div className="main">
          <div className="col">
            <div className="panel">
              <h2>Campaign</h2>
              <div className="body">
                <LevelSelect levels={LEVELS} index={levelIndex} cleared={cleared} onSelect={selectLevel} />
              </div>
            </div>
            <LessonPanel level={level} />
            <div className="panel builder-panel" style={{ flex: 1 }}>
              <h2>Your Strategy</h2>
              <StrategyBuilder strategy={strategy} onChange={setStrategy} unlocks={level.unlocks} />
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
                result={result} level={level}
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
