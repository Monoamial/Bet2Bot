// Live human-vs-bots play, in any game mode: classic Limit heads-up (the default),
// No-Limit with a bet slider, multiway tables, and survival (one carried stack).
// Renders payloads from poker/interactive.py via the Pyodide bridge.

import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { EngineBridge } from "../pyodide/bridge";
import type { InteractivePayload, LivePending, PokerEvent } from "../engine-api/types";
import { CardBack, CardView } from "./Card";
import { TableFelt } from "../assets/TableFelt";
import { Avatar } from "../assets/Avatar";
import { ACTION_STYLE, Action } from "../strategy/model";

export const OPPONENTS = [
  { key: "caller", label: "The Caller" },
  { key: "rock", label: "The Rock" },
  { key: "maniac", label: "The Maniac" },
  { key: "tight_aggressive", label: "The Shark" },
  { key: "profiler", label: "The Profiler" },
  { key: "river_bluffer", label: "The River Bluffer" },
  { key: "over_folder", label: "The Over-folder" },
  { key: "trapper", label: "The Trapper" },
];
const ACTION_ORDER: Action[] = ["fold", "check", "call", "raise"];

export function opponentLabel(key: string): string {
  return OPPONENTS.find((o) => o.key === key)?.label ?? key;
}

interface SeatView { cards: string[]; bubble: string; allIn: boolean }
interface View {
  button: number;
  stacks: number[] | null;
  announcement: string;
  bestFive: Record<number, string[]>;
  streetBets: Record<number, number>;
  lastBet: number | null;
  actionNumber: number;
  seats: Record<number, SeatView>;
  board: string[];
  pot: number;
  acting: number | null;
  winners: number[];
  hands: Record<number, string>;
}
const emptyView = (): View => ({ button: 0, stacks: null, announcement: "Waiting for the deal", bestFive: {}, streetBets: {}, lastBet: null, actionNumber: 0, seats: {}, board: [], pot: 0, acting: null, winners: [], hands: {} });

function label(e: Extract<PokerEvent, { type: "action" }>): string {
  const { action, amount } = e;
  if (action === "fold") return "folds";
  if (action === "check") return "checks";
  if (e.all_in) return `all-in ${amount}`;
  if (action === "call") return amount > 0 ? `calls ${amount}` : "calls";
  if (action === "raise") return e.raise_to ? `raises to ${e.raise_to}` : `raises ${amount}`;
  return action;
}

function apply(view: View, events: PokerEvent[], names: string[]): View {
  const v: View = { ...view, seats: { ...view.seats }, streetBets: { ...view.streetBets }, stacks: view.stacks?.slice() ?? null };
  const seat = (i: number) => (v.seats[i] = v.seats[i] ?? { cards: [], bubble: "", allIn: false });
  for (const e of events) {
    switch (e.type) {
      case "blinds":
        v.button = e.button; v.stacks = e.stacks?.slice() ?? null;
        v.streetBets[e.sb_seat] = e.sb;
        v.streetBets[e.bb_seat] = e.bb;
        v.lastBet = null;
        seat(e.sb_seat).bubble = "SB"; seat(e.bb_seat).bubble = "BB";
        v.pot = e.sb + e.bb;
        v.announcement = `${names[e.sb_seat]} ${e.sb_seat === 0 ? "post" : "posts"} ${e.sb} small blind · ${names[e.bb_seat]} ${e.bb_seat === 0 ? "post" : "posts"} ${e.bb} big blind`;
        break;
      case "hole":
        seat(e.seat).cards = e.cards; break;
      case "action": {
        const s = seat(e.seat);
        v.acting = e.seat; s.bubble = label(e); v.pot = e.pot;
        v.lastBet = e.amount > 0 ? e.seat : null;
        if (e.amount > 0) v.actionNumber++;
        if (e.amount > 0) v.streetBets[e.seat] = (v.streetBets[e.seat] ?? 0) + e.amount;
        v.announcement = `${names[e.seat]} ${e.seat === 0 ? s.bubble.replace(/s\b/, "") : s.bubble} · pot ${e.pot}`;
        if (e.stack != null && v.stacks) v.stacks[e.seat] = e.stack;
        if (e.all_in) s.allIn = true;
        break;
      }
      case "board":
        v.board = e.board; v.streetBets = {}; v.lastBet = null;
        v.announcement = `${e.street[0].toUpperCase()}${e.street.slice(1)}: ${e.cards.join(" ")} · pot ${v.pot}`;
        v.acting = null;
        break;
      case "showdown":
        v.hands = e.hands; v.bestFive = e.best_five ?? {}; v.acting = null;
        v.announcement = `Showdown · ${Object.entries(e.hands).map(([i, hand]) => `${names[Number(i)]}: ${hand}`).join(" · ")}`;
        for (const s of Object.keys(e.reveals)) seat(Number(s)).cards = e.reveals[Number(s)];
        break;
      case "award":
        v.winners = e.winners; v.acting = null;
        v.streetBets = {}; v.lastBet = null; v.pot = 0;
        if (e.stacks) v.stacks = e.stacks.slice();
        v.announcement = `${e.winners.map((w) => names[w]).join(" and ")} ${e.winners.length === 1 ? "wins" : "split"} the ${e.pot}-chip pot${e.winners.length === 1 && v.hands[e.winners[0]] ? ` with ${v.hands[e.winners[0]]}` : ""}`;
        for (const w of e.winners) seat(w).bubble = "wins"; break;
    }
  }
  return v;
}

function Chips({ amount, pot = false }: { amount: number; pot?: boolean }) {
  if (amount <= 0) return null;
  // Denominations are illustrative, while the adjacent label stays exact.
  // Capping the drawn stack avoids overflowing the table on a big NL pot.
  const count = Math.min(8, Math.max(1, Math.ceil(amount / 10)));
  return (
    <span className={`chips-visual${pot ? " pot-chips" : ""}`} aria-label={`${amount} chips`}>
      <span className="chips-stack" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => <i key={i} />)}
      </span>
      <span className="chips-amount">{amount}</span>
    </span>
  );
}

function Seat({ view, index, name, kind, isYou, stack, compact }: {
  view: View; index: number; name: string; kind: string; isYou: boolean;
  stack?: number | null; compact?: boolean;
}) {
  const s = view.seats[index] ?? { cards: [], bubble: "", allIn: false };
  const cls = [
    "seat", compact ? "compact" : "",
    view.acting === index ? "acting" : "",
    view.winners.includes(index) ? "winner" : "",
    view.winners.length && view.hands[index] && !view.winners.includes(index) ? "lost-showdown" : "",
  ].join(" ");
  return (
    <div className={cls}>
      {view.button === index && <span className="dealer-button" aria-label={`${name} has the dealer button`} title="Dealer button: acts last after the flop">D</span>}
      <div className={`bubble${s.bubble ? "" : " empty"}`}>{s.bubble || "·"}</div>
      <div className="hand">
        {s.cards.length ? s.cards.map((c, i) => (
          <span key={i} className={view.winners.length && view.hands[index]
            ? view.bestFive[index]?.includes(c) ? "playing-card" : "unused-card" : ""}>
            <CardView card={c} small />
          </span>
        )) : <><CardBack small /><CardBack small /></>}
      </div>
      <div className="seat-id">
        <Avatar kind={kind} size={compact ? 26 : 34} />
        <div className="seat-meta">
          <div className="name">{isYou ? "You" : name}{!isYou && <span className="tag"> (AI)</span>}</div>
          {stack != null && (
            <div className={`stack-chip${s.allIn ? " allin" : ""}`}>
              <Chips amount={stack} />
              <span>{s.allIn && stack === 0 ? "ALL-IN" : `${stack} chips`}</span>
            </div>
          )}
          {view.hands[index] && <div className="tag" style={{ fontSize: 12, color: "var(--muted)" }}>{view.hands[index]}</div>}
        </div>
      </div>
      {(view.streetBets[index] ?? 0) > 0 && !view.winners.length && (
        <div className={`seat-bet${view.lastBet === index ? " newly-bet" : ""}`}>
          <Chips amount={view.streetBets[index]} />
        </div>
      )}
      {view.winners.includes(index) && (
        <span className="pot-pushed" aria-label="Pot pushed to winner" title="Pot pushed to winner">
          <span aria-hidden="true">● ● ●</span> Pot awarded
        </span>
      )}
    </div>
  );
}

// --- No-Limit bet controls: presets + slider, in "raise TO" chips ----------------------
function BetControls({ pending, busy, onRaise }: {
  pending: LivePending; busy: boolean; onRaise: (to: number) => void;
}) {
  const { minRaiseTo, maxRaiseTo, pot, toCall, streetContrib } = pending;
  const [raiseTo, setRaiseTo] = useState(minRaiseTo);
  useEffect(() => setRaiseTo(minRaiseTo), [minRaiseTo, maxRaiseTo]);

  const clamp = (v: number) => Math.max(minRaiseTo, Math.min(Math.round(v), maxRaiseTo));
  const base = streetContrib + toCall;      // street total after just calling
  const potAfterCall = pot + toCall;
  const presets = [
    { label: "Min", value: minRaiseTo },
    { label: "½ pot", value: clamp(base + Math.round(potAfterCall / 2)) },
    { label: "Pot", value: clamp(base + potAfterCall) },
    { label: "All-in", value: maxRaiseTo },
  ];
  const allInOnly = minRaiseTo >= maxRaiseTo;
  const verb = toCall > 0 ? "Raise to" : "Bet";

  if (allInOnly) {
    return (
      <button className="scripted-btn" disabled={busy}
        style={{ background: ACTION_STYLE.raise.bg, color: ACTION_STYLE.raise.fg }}
        onClick={() => onRaise(maxRaiseTo)}>
        All-in {maxRaiseTo}
      </button>
    );
  }
  return (
    <div className="bet-controls">
      <div className="bet-presets">
        {presets.map((p) => (
          <button key={p.label} className={`bet-preset${raiseTo === p.value ? " on" : ""}`}
            disabled={busy} onClick={() => setRaiseTo(p.value)}>
            {p.label}
          </button>
        ))}
      </div>
      <input type="range" className="bet-slider" min={minRaiseTo} max={maxRaiseTo}
        value={raiseTo} disabled={busy}
        onChange={(e) => setRaiseTo(clamp(Number(e.target.value)))} />
      <button className="scripted-btn" disabled={busy}
        style={{ background: ACTION_STYLE.raise.bg, color: ACTION_STYLE.raise.fg }}
        onClick={() => onRaise(raiseTo)}>
        {verb} {raiseTo}
      </button>
    </div>
  );
}

// The felt + action row, shared by the standalone Play tab and the embedded lesson.
function LiveTableBody({
  view, names, kinds, players, done, busted, handsPlayed,
  pending, busy, error, onDeal, onAct, onRaise, onRestart, onSkip,
}: {
  view: View; names: string[]; kinds: string[]; players: number;
  done: InteractivePayload["done"]; busted: boolean; handsPlayed: number;
  pending: LivePending | null;
  busy: boolean; error: string | null;
  onDeal: () => void; onAct: (a: Action) => void; onRaise: (to: number) => void;
  onRestart: () => void; onSkip: () => void;
}) {
  const multiway = players > 2;
  const opponents = Array.from({ length: players - 1 }, (_, i) => i + 1);
  return (
    <>
      <div className="play-announcement" role="status" aria-live="polite">
        <span>{view.announcement}</span>
        {busy && <button className="ghost" onClick={onSkip}>Skip to decision →</button>}
      </div>
      <div className={`felt compact${multiway ? " multiway" : ""}`}>
        <TableFelt />
        <div className="felt-content">
          <div className={multiway ? "opp-row" : undefined}>
            {opponents.map((seatIndex) => (
              <Seat key={seatIndex} view={view} index={seatIndex}
                name={names[seatIndex]} kind={kinds[seatIndex]} isYou={false}
                stack={view.stacks ? view.stacks[seatIndex] : null} compact={multiway} />
            ))}
          </div>
          <div className="board">
            {view.board.length
              ? view.board.map((c, i) => (
                <span key={i} className={view.winners.length && Object.keys(view.bestFive).length
                  ? view.winners.some((w) => view.bestFive[w]?.includes(c)) ? "playing-card" : "unused-card" : ""}>
                  <CardView card={c} small />
                </span>
              ))
              : <span style={{ color: "#bfe9d0" }}>— preflop —</span>}
          </div>
          <div className="pot">{view.winners.length ? "POT AWARDED" : `POT ${view.pot}`} <Chips amount={view.pot} pot /></div>
          <Seat view={view} index={0} name="You" kind="you" isYou={true}
            stack={view.stacks ? view.stacks[0] : null} />
          {view.lastBet != null && (
            <span key={view.actionNumber} className={`chip-flight flight-seat-${view.lastBet}`}
              aria-hidden="true">●</span>
          )}
          {view.winners.map((seat) => (
            <span key={`award-${seat}`} className={`chip-award flight-seat-${seat}`}
              aria-hidden="true">●</span>
          ))}
        </div>
      </div>

      {view.winners.length > 0 && Object.keys(view.hands).length > 0 && (
        <div className="showdown-summary">
          {Object.entries(view.hands).map(([seat, hand]) => (
            <div key={seat} className={view.winners.includes(Number(seat)) ? "showdown-winner" : "showdown-loser"}>
              <b>{names[Number(seat)]}</b> — {hand}{view.winners.includes(Number(seat)) ? " · wins" : ""}
            </div>
          ))}
          <small>Bright cards make the best five-card hand; dimmed cards don't play.</small>
        </div>
      )}
      <div className="play-actions">
        {busted ? (
          <div className="banner lose" style={{ flex: 1 }}>
            <span className="big">💀</span>
            <div style={{ flex: 1 }}>
              Busted after {handsPlayed} hand{handsPlayed === 1 ? "" : "s"} — that's the
              whole stack. Session over.
            </div>
            <button className="run" onClick={onRestart} disabled={busy}>↺ New stack</button>
          </div>
        ) : done ? (
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
            {ACTION_ORDER.filter((a) => a !== "raise" && pending.legal.includes(a)).map((a) => (
              <button key={a} className="scripted-btn" disabled={busy}
                style={{ background: ACTION_STYLE[a].bg, color: ACTION_STYLE[a].fg }}
                onClick={() => onAct(a)}>
                {ACTION_STYLE[a].label}
                {a === "call" && pending.myStack != null && pending.toCall >= pending.myStack ? " (all-in)" : ""}
              </button>
            ))}
            {pending.legal.includes("raise") && (
              pending.betting === "no_limit"
                ? <BetControls pending={pending} busy={busy} onRaise={onRaise} />
                : (
                  <button className="scripted-btn" disabled={busy}
                    style={{ background: ACTION_STYLE.raise.bg, color: ACTION_STYLE.raise.fg }}
                    onClick={() => onAct("raise")}>
                    {ACTION_STYLE.raise.label}
                  </button>
                )
            )}
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
  bridgeRef, ready, opponents, betting = "limit", stack, carry,
  fixedOpponent, fixedButton, autoStart, embedded, onHandDone,
}: {
  bridgeRef: MutableRefObject<EngineBridge | null>;
  ready: boolean;
  opponents?: string[];      // fixed multiway table (no opponent picker)
  betting?: "limit" | "no_limit";
  stack?: number;            // chips per seat per hand
  carry?: boolean;           // survival: your stack persists until you bust
  fixedOpponent?: string;    // single fixed opponent (Academy lessons)
  fixedButton?: 0 | 1;       // pin the dealer button (0 = you: in position postflop)
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
  const [players, setPlayers] = useState(2);
  const [stacks, setStacks] = useState<number[] | null>(null);
  const [busted, setBusted] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const skipRef = useRef(false);

  const table = opponents ?? [fixedOpponent ?? opponent];
  const names = ["You", ...table.map(opponentLabel)];
  const kinds = ["you", ...table];

  async function ingest(p: InteractivePayload, fresh: boolean) {
    if (p.error) { setError(p.error); return; }
    setError(null);
    setPending(null);
    if (fresh) setView(emptyView());
    // Engine responses can contain several opponent actions and an entire all-in
    // runout. Show each meaningful event before allowing the next human decision.
    // Hole-card events are displayed immediately; streets and actions hold long
    // enough to read, even when the engine already finished the hand.
    skipRef.current = false;
    for (const event of p.events) {
      setView((v) => apply(v, [event], names));
      if (event.type === "hole") continue;
      const delay = event.type === "board" || event.type === "showdown" || event.type === "award" ? 900 : 600;
      if (!skipRef.current) {
        await new Promise<void>((resolve) => {
          const started = performance.now();
          const timer = window.setInterval(() => {
            if (skipRef.current || performance.now() - started >= delay) {
              window.clearInterval(timer);
              resolve();
            }
          }, 40);
        });
      }
    }
    setPending(p.pending);
    setDone(p.done);
    setNet(p.net);
    setHands(p.handsPlayed);
    setPlayers(p.players);
    setStacks(p.stacks);
    setBusted(p.busted);
    if (p.done) onHandDone?.(p.done.handNet);
  }

  async function guard(fn: () => Promise<InteractivePayload>, fresh: boolean) {
    if (!bridgeRef.current || !ready || busy) return;
    setBusy(true);
    try { await ingest(await fn(), fresh); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  const newMatch = () => {
    setStarted(true);
    guard(() => bridgeRef.current!.humanNew({
      opponents: table,
      fixedButton,
      config: betting === "no_limit" ? { betting } : undefined,
      stack, carry,
    }), true);
  };
  const deal = () => guard(() => bridgeRef.current!.humanDeal(), true);
  const act = (a: Action) => guard(() => bridgeRef.current!.humanAct(a), false);
  const raiseTo = (to: number) => guard(() => bridgeRef.current!.humanAct(`raise:${to}`), false);

  useEffect(() => {
    if (autoStart && ready && !startedRef.current) {
      startedRef.current = true;
      newMatch();
    }
  }, [autoStart, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const score = started ? (
    carry && stacks ? (
      <span className="play-net">
        Stack: <b style={{ color: stacks[0] > (stack ?? 0) ? "var(--accent)" : stacks[0] < (stack ?? 0) ? "var(--danger)" : "var(--text)" }}>
          {Math.max(stacks[0], 0)}
        </b> / {stack} · hand {hands + (done || busted ? 0 : 1)}
      </span>
    ) : (
      <span className="play-net">
        Your chips: <b style={{ color: net[0] >= 0 ? "var(--accent)" : "var(--danger)" }}>
          {net[0] >= 0 ? "+" : ""}{net[0]}
        </b> · hand {hands + (done ? 0 : 1)}
      </span>
    )
  ) : null;

  const controls = fixedOpponent || opponents ? (
    <div className="play-controls">
      {score}
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
      {score}
    </div>
  );

  const body = started && (
    <LiveTableBody
      view={view} names={names} kinds={kinds} players={players}
      done={done} busted={busted} handsPlayed={hands}
      pending={pending} busy={busy} error={error}
      onDeal={deal} onAct={act} onRaise={raiseTo} onRestart={newMatch}
      onSkip={() => { skipRef.current = true; }}
    />
  );

  if (embedded) {
    return <div className="play-embedded">{controls}{body}</div>;
  }

  return (
    <div className="play-wrap">
      {controls && <div className="panel"><div className="body">{controls}</div></div>}
      {started && <div className="panel"><div className="body">{body}</div></div>}
    </div>
  );
}
