// TypeScript mirrors of the JSON-able structures the Python engine returns.
// See poker/engine.py (event schema) and poker/game_api.py (run_level result).

export type PokerEvent =
  | { type: "blinds"; button: number; sb_seat: number; sb: number; bb_seat: number; bb: number; players: number }
  | { type: "hole"; seat: number; cards: [string, string] }
  | { type: "action"; seat: number; street: string; action: string; amount: number; pot: number; to_call: number; explain?: string | null }
  | { type: "board"; street: string; cards: string[]; board: string[] }
  | { type: "showdown"; board: string[]; reveals: Record<number, string[]>; hands: Record<number, string> }
  | { type: "award"; winners: number[]; pot: number; net: number[] };

export interface BotSummaryRow {
  name: string;
  hands: number;
  net: number;
  bb100: number;
  vpip: number;
  pfr: number;
  af: number | null;
  showdowns_won: number;
  illegal: number;
}

export interface LevelResult {
  error: string | null;
  players: string[];
  player_index: number;
  opponent_index: number;
  summary: BotSummaryRow[];
  replays: PokerEvent[][];
  player_net: number;
  player_bb100: number;
  hands: number;
}

// Messages exchanged with the worker. `strategy` is the compiled engine policy
// (see compileStrategy in strategy/model.ts).
export interface RunRequest {
  strategy: unknown;
  opponent: string;
  hands: number;
  seed?: number; // omitted → a fresh random deck each run
  capture: number;
  config?: Record<string, number>;
}

export type WorkerOut =
  | { type: "status"; message: string }
  | { type: "ready" }
  | { type: "result"; data: LevelResult }
  | { type: "error"; message: string };

// Interactive (human-in-the-seat) play — see poker/interactive.py.
export interface LivePending {
  legal: string[];
  toCall: number;
  pot: number;
  street: string;
  hole: string[];
  board: string[];
  betSize: number;
}

export interface InteractivePayload {
  error?: string;
  events: PokerEvent[];
  pending: LivePending | null;
  done: { winners: number[]; handNet: number; youWon: boolean } | null;
  net: number[];
  handsPlayed: number;
  button: number;
  humanSeat: number;
}
