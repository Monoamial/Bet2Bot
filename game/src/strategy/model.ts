// The block-strategy data model (mirrors poker/strategy.py) plus helpers to compile it
// into the engine's JSON policy and to compute display stats.

export type Action = "fold" | "check" | "call" | "raise";
export type Tier = "monster" | "twoPairPlus" | "pair" | "nothing";

export type Position = "ip" | "oop";
export type OppType = "loose" | "tight";
export type PotOdds = "cheap" | "expensive";

// An override rule using unlocked conditions. Higher priority than the base table.
export interface AdvancedRule {
  tier: Tier;
  position?: Position;
  oppType?: OppType;
  potOdds?: PotOdds;
  action: Action;
}

export interface StreetPolicyData {
  // per-tier action, split by whether we're first to act or facing a bet
  table: Record<Tier, { first: Action; facing: Action }>;
  advanced?: AdvancedRule[];
}

export interface Strategy {
  preflop: Record<string, Action>; // 169 hand classes -> action
  flop: StreetPolicyData;
  turn: StreetPolicyData;
  river: StreetPolicyData;
}

export interface Unlocks {
  facingBet: boolean;
  position: boolean;
  potOdds: boolean;
  oppType: boolean;
}

export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
export const TIER_ORDER: Tier[] = ["monster", "twoPairPlus", "pair", "nothing"];

export const TIER_INFO: Record<Tier, { label: string; example: string }> = {
  monster: { label: "Monster", example: "straight or better" },
  twoPairPlus: { label: "Two pair / trips", example: "e.g. two pair, three of a kind" },
  pair: { label: "A pair", example: "any single pair" },
  nothing: { label: "Nothing", example: "just high card" },
};

export const ACTION_STYLE: Record<Action, { bg: string; fg: string; label: string }> = {
  raise: { bg: "#E24B4A", fg: "#ffffff", label: "Raise" },
  call: { bg: "#1D9E75", fg: "#ffffff", label: "Call" },
  check: { bg: "#2f7fa6", fg: "#ffffff", label: "Check" },
  fold: { bg: "#39414d", fg: "#c7ced8", label: "Fold" },
};

/** Canonical class for the grid cell at (row, col), rows/cols over RANKS (A..2). */
export function classAt(r: number, c: number): string {
  const hi = RANKS[Math.min(r, c)];
  const lo = RANKS[Math.max(r, c)];
  if (r === c) return hi + hi;
  return c > r ? `${hi}${lo}s` : `${hi}${lo}o`;
}

export function combosAt(r: number, c: number): number {
  if (r === c) return 6; // pair
  return c > r ? 4 : 12; // suited : offsuit
}

export function allHandClasses(): string[] {
  const out: string[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(classAt(r, c));
  return out;
}

/** Percentage of all starting hands that aren't folded preflop (VPIP). */
export function vpip(preflop: Record<string, Action>): number {
  let combos = 0;
  for (let r = 0; r < 13; r++)
    for (let c = 0; c < 13; c++)
      if (preflop[classAt(r, c)] !== "fold") combos += combosAt(r, c);
  return Math.round((combos / 1326) * 100);
}

// Starting postflop street: check when first to act (so the player must add value
// raises to win), with sensible defaults for facing a bet.
function starterStreet(): StreetPolicyData {
  return {
    table: {
      monster: { first: "check", facing: "raise" },
      twoPairPlus: { first: "check", facing: "call" },
      pair: { first: "check", facing: "call" },
      nothing: { first: "check", facing: "fold" },
    },
  };
}

/** The starting strategy: play every hand, check/call — break-even until you add raises. */
export function defaultStrategy(): Strategy {
  const preflop: Record<string, Action> = {};
  for (const cls of allHandClasses()) preflop[cls] = "call";
  return {
    preflop,
    flop: starterStreet(),
    turn: starterStreet(),
    river: starterStreet(),
  };
}

// --- Preflop presets --------------------------------------------------------
// r,c index into RANKS (0 = A .. 12 = 2). Diagonal = pairs, c>r = suited, else offsuit.
function tightAction(r: number, c: number): Action {
  const hi = Math.min(r, c), lo = Math.max(r, c);
  if (r === c) return r <= 6 ? "raise" : "call"; // 88+ raise, 77-22 call
  if (c > r) { // suited
    if (hi === 0) return lo <= 4 ? "raise" : "call"; // AKs-ATs raise, rest call
    if (hi === 1) return lo <= 4 ? "raise" : (lo <= 8 ? "call" : "fold");
    if (hi === 2) return lo <= 4 ? "raise" : (lo <= 6 ? "call" : "fold");
    if (hi === 3) return lo <= 4 ? "raise" : (lo <= 6 ? "call" : "fold");
    if (lo === hi + 1 && hi >= 4) return "call"; // suited connectors
    return "fold";
  }
  if (hi === 0) return lo <= 2 ? "raise" : (lo <= 4 ? "call" : "fold");
  if (hi === 1) return lo <= 2 ? "raise" : (lo <= 3 ? "call" : "fold");
  if (hi === 2) return lo <= 3 ? "call" : "fold";
  return "fold";
}

function looseAction(r: number, c: number): Action {
  const hi = Math.min(r, c), lo = Math.max(r, c);
  if (r === c) return r <= 4 ? "raise" : "call"; // TT+ raise, rest call
  if (c > r) return hi <= 1 && lo <= 4 ? "raise" : "call"; // suited: call almost all
  if (hi <= 1 && lo <= 2) return "raise"; // AKo/AQo/KQo raise
  return lo <= 8 ? "call" : "fold"; // offsuit: call down to small gaps
}

export function presetPreflop(kind: "tight" | "loose"): Record<string, Action> {
  const out: Record<string, Action> = {};
  const fn = kind === "tight" ? tightAction : looseAction;
  for (let r = 0; r < 13; r++)
    for (let c = 0; c < 13; c++) out[classAt(r, c)] = fn(r, c);
  return out;
}

function compileStreet(p: StreetPolicyData) {
  const rules: { when: Record<string, unknown>; action: Action }[] = [];
  // Advanced conditional rules take priority over the base table.
  for (const r of p.advanced ?? []) {
    const when: Record<string, unknown> = { handTier: r.tier };
    if (r.position) when.position = r.position;
    if (r.oppType) when.oppType = r.oppType;
    if (r.potOdds) when.potOdds = r.potOdds;
    rules.push({ when, action: r.action });
  }
  for (const t of TIER_ORDER) {
    rules.push({ when: { handTier: t, facingBet: true }, action: p.table[t].facing });
    rules.push({ when: { handTier: t, facingBet: false }, action: p.table[t].first });
  }
  return { rules, default: "check" as Action };
}

/** Compile the block strategy into the JSON policy StrategyBot expects. */
export function compileStrategy(s: Strategy) {
  return {
    preflop: s.preflop,
    flop: compileStreet(s.flop),
    turn: compileStreet(s.turn),
    river: compileStreet(s.river),
  };
}

export function clone(s: Strategy): Strategy {
  return JSON.parse(JSON.stringify(s));
}
