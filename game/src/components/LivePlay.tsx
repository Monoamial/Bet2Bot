import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { EngineBridge } from "../pyodide/bridge";
import type { InteractivePayload, LivePending, PokerEvent } from "../engine-api/types";
import { CardBack, CardView } from "./Card";
import { TableFelt } from "../assets/TableFelt";
import { Avatar } from "../assets/Avatar";
import { ACTION_STYLE, Action } from "../strategy/model";

const OPPONENTS = [
  { key: "caller", label: "The Caller" },
  { key: "rock", label: "The Rock" },
  { key: "maniac", label: "The Maniac" },
  { key: "tight_aggressive", label: "The Shark" },
  { key: "profiler", label: "The Profiler" },
];
const ACTION_ORDER: Action[] = ["fold", "check", "call", "raise"];

interface SeatView { cards: string[]; bubble: string; }
interface View {
  seats: Record<number, SeatView>;
  board: string[];
  pot: number;
  acting: number | null;
  winners: number[];
  hands: Record<number, string>;
}
const emptyView = (): View => ({ seats: {}, board: [], pot: 0, acting: null, winners: [], hands: {} });

function label(action: string, amount: number): string {
  if (action === "fold") return "folds";
  if (action === "check") return "checks";
  if (action === "call") return amount > 0 ? `calls ${amount}` : "calls";
  if (action === "raise") return `raises ${amount}`;
  return action;
}

function apply(view: View, events: PokerEvent[]): View {
  const v: View = { ...view, seats: { ...view.seats } };
  const seat = (i: number) => (v.seats[i] = v.seats[i] ?? { cards: [], bubble: "" });
  for (const e of events) {
    switch (e.type) {
      case "blinds":
        seat(e.sb_seat).bubble = "SB"; seat(e.bb_seat).bubble = "BB";
        v.pot = e.sb + e.bb; break;
      case "hole":
        seat(e.seat).cards = e.cards; break;
      case "action":
        v.acting = e.seat; seat(e.seat).bubble = label(e.action, e.amount); v.pot = e.pot; break;
      case "board":
        v.board = e.board; break;
      case "showdown":
        v.hands = e.hands; v.acting = null;
        for (const s of Object.keys(e.reveals)) seat(Number(s)).cards = e.reveals[Number(s)];
        break;
      case "award":
        v.winners = e.winners; v.acting = null;
        for (const w of e.winners) seat(w).bubble = "wins"; break;
    }
  }
  return v;
}

function Seat({ view, index, name, kind, isYou }: {
  view: View; index: number; name: string; kind: string; isYou: boolean;
}) {
  const s = view.seats[index] ?? { cards: [], bubble: "" };
  const cls = ["seat", view.acting === index ? "acting" : "", view.winners.includes(index) ? "winner" : ""].join(" ");
  return (
    <div className={cls}>
      <div className={`bubble${s.bubble ? "" : " empty"}`}>{s.bubble || "·"}</div>
      <div className="hand">
        {s.cards.length ? s.cards.map((c, i) => <CardView key={i} card={c} small />) : <><CardBack small /><CardBack small /></>}
      </div>
      <div className="seat-id">
        <Avatar kind={kind} size={34} />
        <div className="seat-meta">
          <div className="name">{isYou ? "You" : name}{!isYou && <span className="tag"> (AI)</span>}</div>
          {view.hands[index] && <div className="tag" style={{ fontSize: 12, color: "var(--muted)" }}>{view.hands[index]}</div>}
        </div>
      </div>
    </div>
  );
}

// The felt + action row, shared by the standalone Play tab and the embedded lesson.
function LiveTableBody({
  view, oppLabel, opponent, done, pending, busy, error, onDeal, onAct,
}: {
  view: View; oppLabel: string; opponent: string;
  done: InteractivePayload["done"]; pending: LivePending | null;
  busy: boolean; error: string | null;
  onDeal: () => void; onAct: (a: Action) => void;
}) {
  return (
    <>
      <div className="felt compact">
        <TableFelt />
        <div className="felt-content">
          <Seat view={view} index={1} name={oppLabel} kind={opponent} isYou={false} />
          <div className="board">
            {view.board.length
              ? view.board.map((c, i) => <CardView key={i} card={c} small />)
              : <span style={{ color: "#bfe9d0" }}>— preflop —</span>}
          </div>
          <div className="pot">POT {view.pot}</div>
          <Seat view={view} index={0} name="You" kind="you" isYou={true} />
        </div>
      </div>

      <div className="play-actions">
        {done ? (
          <div className={`banner ${done.youWon ? "win" : "lose"}`} style={{ flex: 1 }}>
            <span className="big">{done.handNet > 0 ? "🏆" : done.handNet < 0 ? "💸" : "🤝"}</span>
            <div style={{ flex: 1 }}>
              {done.handNet > 0 ? `You won +${done.handNet}` : done.handNet < 0 ? `You lost ${-done.handNet}` : "Split pot"}
            </div>
            <button className="run" onClick={onDeal} disabled={busy}>▶ Next hand</button>
          </div>
        ) : pending ? (
          <>
            <span className="play-turn">
              Your turn{pending.toCall > 0 ? ` — ${pending.toCall} to call` : ""}:
            </span>
            {ACTION_ORDER.filter((a) => pending.legal.includes(a)).map((a) => (
              <button key={a} className="scripted-btn" disabled={busy}
                style={{ background: ACTION_STYLE[a].bg, color: ACTION_STYLE[a].fg }}
                onClick={() => onAct(a)}>
                {ACTION_STYLE[a].label}
              </button>
            ))}
          </>
        ) : (
          <span className="play-turn">…</span>
        )}
      </div>
      {error && <div className="console">{error}</div>}
    </>
  );
}

export function LivePlay({
  bridgeRef, ready, fixedOpponent, autoStart, embedded, onHandDone,
}: {
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
  fixedOpponent?: string;
  autoStart?: boolean;
  embedded?: boolean;
  onHandDone?: (handNet: number) => void;
}) {
  const [opponent, setOpponent] = useState(fixedOpponent ?? "caller");
  const [view, setView] = useState<View>(emptyView());
  const [pending, setPending] = useState<LivePending | null>(null);
  const [done, setDone] = useState<InteractivePayload["done"]>(null);
  const [net, setNet] = useState<number[]>([0, 0]);
  const [hands, setHands] = useState(0);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const oppLabel = OPPONENTS.find((o) => o.key === opponent)?.label ?? opponent;

  function ingest(p: InteractivePayload, fresh: boolean) {
    if (p.error) { setError(p.error); return; }
    setError(null);
    setView((v) => apply(fresh ? emptyView() : v, p.events));
    setPending(p.pending);
    setDone(p.done);
    setNet(p.net);
    setHands(p.handsPlayed);
    if (p.done) onHandDone?.(p.done.handNet);
  }

  async function guard(fn: () => Promise<InteractivePayload>, fresh: boolean) {
    if (!bridgeRef.current || !ready || busy) return;
    setBusy(true);
    try { ingest(await fn(), fresh); }
    catch (e: any) { setError(e?.message ?? String(e)); }
    finally { setBusy(false); }
  }

  const newMatch = () => { setStarted(true); guard(() => bridgeRef.current!.humanNew(opponent), true); };
  const deal = () => guard(() => bridgeRef.current!.humanDeal(), true);
  const act = (a: Action) => guard(() => bridgeRef.current!.humanAct(a), false);

  useEffect(() => {
    if (autoStart && ready && !startedRef.current) {
      startedRef.current = true;
      newMatch();
    }
  }, [autoStart, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const chips = started ? (
    <span className="play-net">
      Your chips: <b style={{ color: net[0] >= 0 ? "var(--accent)" : "var(--danger)" }}>
        {net[0] >= 0 ? "+" : ""}{net[0]}
      </b> · hand {hands + (done ? 0 : 1)}
    </span>
  ) : null;

  const controls = fixedOpponent ? (
    <div className="play-controls">
      {chips}
      {started && <button className="ghost" onClick={newMatch} disabled={busy}>↺ Restart</button>}
      {!ready && <span className="play-net">engine loading…</span>}
    </div>
  ) : (
    <div className="play-controls">
      <label style={{ color: "var(--muted)" }}>Opponent</label>
      <select value={opponent} disabled={busy} onChange={(e) => setOpponent(e.target.value)}>
        {OPPONENTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <button className="run" onClick={newMatch} disabled={!ready || busy}>
        {ready ? (started ? "↺ New match" : "▶ Sit down") : "engine loading…"}
      </button>
      {chips}
    </div>
  );

  const body = started && (
    <LiveTableBody
      view={view} oppLabel={oppLabel} opponent={opponent}
      done={done} pending={pending} busy={busy} error={error}
      onDeal={deal} onAct={act}
    />
  );

  if (embedded) {
    return <div className="play-embedded">{controls}{body}</div>;
  }

  return (
    <div className="play-wrap">
      <div className="panel">
        <h2>Play vs a bot</h2>
        <div className="body">{controls}</div>
      </div>
      {started && <div className="panel"><div className="body">{body}</div></div>}
    </div>
  );
}
