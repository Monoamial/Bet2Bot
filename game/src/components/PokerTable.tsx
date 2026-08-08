import { useEffect, useMemo, useState } from "react";
import type { CuratedReplay, PokerEvent } from "../engine-api/types";
import { CardBack, CardView } from "./Card";
import { TableFelt } from "../assets/TableFelt";
import { Avatar } from "../assets/Avatar";

interface SeatView {
  cards: string[];
  bubble: string;
  contributed: number;
}
interface TableView {
  button: number;
  players: number;
  seats: Record<number, SeatView>;
  board: string[];
  pot: number;
  acting: number | null;
  winners: number[];
  hands: Record<number, string>;
  explain: { seat: number; text: string } | null;
}

function actionLabel(action: string, amount: number): string {
  switch (action) {
    case "fold": return "folds";
    case "check": return "checks";
    case "call": return amount > 0 ? `calls ${amount}` : "calls";
    case "raise": return `raises ${amount}`;
    default: return action;
  }
}

function reduce(events: PokerEvent[], upto: number): TableView {
  const view: TableView = {
    button: 0, players: 2, seats: {}, board: [], pot: 0,
    acting: null, winners: [], hands: {}, explain: null,
  };
  const seat = (i: number) => (view.seats[i] ??= { cards: [], bubble: "", contributed: 0 });
  for (let i = 0; i <= upto && i < events.length; i++) {
    const e = events[i];
    switch (e.type) {
      case "blinds":
        view.button = e.button; view.players = e.players;
        seat(e.sb_seat).contributed += e.sb;
        seat(e.bb_seat).contributed += e.bb;
        seat(e.sb_seat).bubble = "SB"; seat(e.bb_seat).bubble = "BB";
        view.pot = e.sb + e.bb;
        break;
      case "hole":
        seat(e.seat).cards = e.cards;
        break;
      case "action":
        view.acting = e.seat;
        seat(e.seat).bubble = actionLabel(e.action, e.amount);
        seat(e.seat).contributed += e.amount;
        view.pot = e.pot;
        view.explain = e.explain ? { seat: e.seat, text: e.explain } : null;
        break;
      case "board":
        view.board = e.board;
        break;
      case "showdown":
        view.hands = e.hands; view.acting = null;
        break;
      case "award":
        view.winners = e.winners; view.acting = null;
        for (const w of e.winners) seat(w).bubble = "wins";
        break;
    }
  }
  return view;
}

function Seat({
  index, name, tag, view, isYou, avatarKind,
}: {
  index: number; name: string; tag?: string; view: TableView;
  isYou: boolean; avatarKind: string;
}) {
  const s = view.seats[index] ?? { cards: [], bubble: "", contributed: 0 };
  const cls = [
    "seat",
    view.acting === index ? "acting" : "",
    view.winners.includes(index) ? "winner" : "",
  ].join(" ");
  return (
    <div className={cls}>
      <div className={`bubble${s.bubble ? "" : " empty"}`}>{s.bubble || "·"}</div>
      <div className="hand">
        {s.cards.length
          ? s.cards.map((c, i) => <CardView key={i} card={c} />)
          : <><CardBack /><CardBack /></>}
      </div>
      <div className="seat-id">
        <Avatar kind={avatarKind} size={40} />
        <div className="seat-meta">
          <div className="name">
            {isYou ? "You" : name} {tag && <span className="tag">({tag})</span>}
          </div>
          <div className="tag" style={{ color: "var(--muted)", fontSize: 12 }}>
            in pot: {s.contributed}{view.hands[index] ? ` · ${view.hands[index]}` : ""}
          </div>
          {view.explain?.seat === index && (
            <div className="why"><i>rule:</i> {view.explain.text}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// "▲ Biggest win · hand #412 (+34)" — ranked within its kind (wins first).
function replayLabel(r: CuratedReplay, rank: number): string {
  const kind = r.kind === "win"
    ? (rank === 0 ? "▲ Biggest win" : `▲ Big win ${rank + 1}`)
    : (rank === 0 ? "▼ Biggest loss" : `▼ Big loss ${rank + 1}`);
  const net = r.net > 0 ? `+${r.net}` : `${r.net}`;
  return `${kind} · hand #${r.hand + 1} (${net})`;
}

export function PokerTable({
  replays, playerName, opponentName, playerIndex, opponentKind,
}: {
  replays: CuratedReplay[];
  playerName: string;
  opponentName: string;
  playerIndex: number;
  opponentKind: string;
}) {
  const [handIndex, setHandIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  const safeIndex = Math.min(handIndex, Math.max(0, replays.length - 1));
  const events = replays[safeIndex]?.events ?? [];
  const maxStep = Math.max(0, events.length - 1);

  // Reset to the start whenever a new set of replays or hand is selected.
  useEffect(() => { setStep(0); setPlaying(true); }, [handIndex, replays]);
  useEffect(() => { setHandIndex(0); }, [replays]);

  useEffect(() => {
    if (!playing) return;
    if (step >= maxStep) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, maxStep)), 750);
    return () => clearTimeout(t);
  }, [playing, step, maxStep]);

  const view = useMemo(() => reduce(events, step), [events, step]);
  const oppIndex = playerIndex === 0 ? 1 : 0;

  if (!replays.length) {
    return (
      <div className="panel table-panel">
        <h2>Table</h2>
        <div className="body">
          <div className="felt">
            <TableFelt />
            <div className="felt-content" style={{ justifyContent: "center" }}>
              <div style={{ color: "#d6efe0", margin: "auto" }}>
                Hit <b>Run</b> to watch your bot play.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel table-panel">
      <h2>Table — your biggest hands</h2>
      <div className="body">
        <div className="felt">
          <TableFelt />
          <div className="felt-content">
            <Seat index={oppIndex} name={opponentName} tag="AI" view={view}
              isYou={false} avatarKind={opponentKind} />
            <div className="board">
              {view.board.length
                ? view.board.map((c, i) => <CardView key={i} card={c} />)
                : <span style={{ color: "#bfe9d0" }}>— preflop —</span>}
            </div>
            <div className="pot">POT {view.pot}</div>
            <Seat index={playerIndex} name={playerName} view={view}
              isYou={true} avatarKind="you" />
          </div>
        </div>

        <div className="replay-controls">
          <label style={{ color: "var(--muted)" }}>Hand</label>
          <select value={safeIndex} onChange={(e) => setHandIndex(Number(e.target.value))}>
            {(() => {
              let winRank = 0, lossRank = 0;
              return replays.map((r, i) => (
                <option key={i} value={i}>
                  {replayLabel(r, r.kind === "win" ? winRank++ : lossRank++)}
                </option>
              ));
            })()}
          </select>
          <button onClick={() => setPlaying((p) => !p)}>
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <input
            className="scrub" type="range" min={0} max={maxStep} value={step}
            onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
          />
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            {step + 1}/{events.length}
          </span>
        </div>
      </div>
    </div>
  );
}
