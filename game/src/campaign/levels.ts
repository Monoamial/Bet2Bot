// Campaign data. Levels unlock in order (see App: clearing a level unlocks the next).
// Each level exposes progressively more builder conditions via `unlocks`.

import { Strategy, Unlocks, defaultStrategy } from "../strategy/model";

export interface Level {
  id: string;
  title: string;
  opponent: string; // key in poker.game_api.OPPONENTS
  opponentLabel: string;
  blurb: string;
  hands: number;
  winBb100: number; // objective: player's bb/100 must exceed this
  objective: string;
  lesson: string[];
  hint: string;
  unlocks: Unlocks;
  starterStrategy: Strategy;
}

const U = (o: Partial<Unlocks>): Unlocks => ({
  facingBet: false, position: false, potOdds: false, oppType: false, ...o,
});

export const LEVELS: Level[] = [
  {
    id: "l1-caller",
    title: "Level 1 — The Calling Station",
    opponent: "caller",
    opponentLabel: "The Caller",
    blurb: "Calls every bet, never folds, never raises.",
    hands: 500,
    winBb100: 10,
    objective: "Comfortably beat the Caller (bb/100 > 10) over 500 random hands.",
    lesson: [
      "Meet the Caller: it calls any bet and never folds. Calling along with it just trades blinds — you win nothing.",
      "To beat a calling station you have to bet and raise when you're ahead. On the street tabs, set Raise on your strong made hands so you get paid off.",
      "Pick actions with the blocks, then hit Run. Watch the replay and your bb/100, then adjust.",
    ],
    hint: "On the Flop / Turn / River tabs, set 'A pair' and stronger to Raise when no bet yet. Leave 'Nothing' on Check.",
    unlocks: U({ facingBet: true }),
    starterStrategy: defaultStrategy(),
  },
  {
    id: "l2-tag",
    title: "Level 2 — The Shark",
    opponent: "tight_aggressive",
    opponentLabel: "Tight-Aggressive",
    blurb: "Folds weak hands, bets and raises its strong ones.",
    hands: 1500,
    winBb100: 10,
    objective: "Beat the Shark (bb/100 > 10) over 1,500 random hands.",
    lesson: [
      "The Shark folds junk and only puts chips in with good hands. Beating it comes down to two habits.",
      "First, steal: it folds a lot, so widen your preflop raising range to take its blinds. Second — and this is the big one — don't pay it off. When the Shark bets or raises, a single pair is usually beat, so set 'A pair → Fold' facing a bet and only continue with two pair or better.",
      "You've also unlocked the Position condition for Advanced rules — you can play a bit looser in position (acting last).",
    ],
    hint: "Preflop: raise wide to steal (try the Loose preset, then trim the worst hands). Postflop: raise your made hands when no one has bet, but set 'A pair → Fold' and 'Nothing → Fold' facing a bet so you stop paying off the Shark.",
    unlocks: U({ facingBet: true, position: true }),
    starterStrategy: defaultStrategy(),
  },
  {
    id: "l3-profiler",
    title: "Level 3 — The Profiler",
    opponent: "profiler",
    opponentLabel: "The Profiler",
    blurb: "Watches your showdowns and adapts to exploit you.",
    hands: 1500,
    winBb100: 10,
    objective: "Outwit the Profiler (bb/100 > 10) over 1,500 random hands.",
    lesson: [
      "The Profiler tracks the hands you show down and adapts: show only monsters and it folds to you; show junk and it calls you down.",
      "The same discipline that beat the Shark still works — steal wide and don't pay off its bets with one pair. That alone is enough to win.",
      "For extra edge you've unlocked the Opponent condition: add advanced rules like 'A pair, vs loose → Raise' (thin value against a station) and 'Nothing, vs tight → Check' (don't bluff a folder).",
    ],
    hint: "Reuse your Shark strategy: raise wide preflop, value-raise made hands, and fold one pair and worse to a bet. Then add a couple of 'vs loose / vs tight' advanced rules to squeeze out more.",
    unlocks: U({ facingBet: true, position: true, oppType: true }),
    starterStrategy: defaultStrategy(),
  },
];
