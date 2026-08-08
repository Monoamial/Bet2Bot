// Academy content — data-driven MODULES, each a short course of lessons: explainers,
// quizzes, scripted decision hands, interactive "apply-it" scenario drills, and live
// play vs a bot. Frontend-only (no Python needed for reads/quizzes/drills), so the
// Learn track loads instantly while Pyodide boots in the background.
//
// Lesson kinds:
//   read     — explainer paragraphs (optional visual)
//   quiz     — one multiple-choice question, retry until correct
//   hand     — a single scripted decision spot, retry until non-bad
//   scenario — an APPLY-IT DRILL: a served sequence of decision spots, one attempt
//              each, scored at the end (the same concept in different contexts)
//   play     — live hands vs a real bot (optionally position-pinned via fixedButton)
//   bridge   — hand-off card ("now teach your bot"); action "campaign" jumps there
//
// Add content by appending lessons to a module, or a new module to MODULES.

import { Action } from "../strategy/model";

export interface SpotChoice { action: Action; verdict: "good" | "ok" | "bad"; feedback: string }

// One served decision spot inside a scenario drill.
export interface Spot {
  hole: [string, string];
  board: string[];
  pot: number;
  toCall: number;
  tag: string;        // context badge on the felt, e.g. "IN POSITION — you act last"
  situation: string;
  choices: SpotChoice[];
}

export type Lesson =
  | { kind: "read"; id: string; title: string; body: string[]; visual?: "handRanks" }
  | {
      kind: "quiz"; id: string; title: string; prompt: string;
      compare?: { a: string[]; b: string[] };
      options: { label: string; correct?: boolean; feedback: string }[];
    }
  | {
      kind: "hand"; id: string; title: string;
      hole: [string, string]; board: string[]; pot: number; toCall: number;
      situation: string;
      choices: SpotChoice[];
    }
  | { kind: "scenario"; id: string; title: string; intro: string[]; spots: Spot[] }
  | {
      kind: "play"; id: string; title: string; body: string[]; opponent: string;
      fixedButton?: 0 | 1;   // pin the dealer button: 0 = you (in position postflop)
      requireHands?: number; // hands to finish before Continue unlocks (default 1)
    }
  | { kind: "bridge"; id: string; title: string; body: string[]; cta: string; action?: "campaign" };

export interface Module {
  id: string;
  icon: string;   // emoji shown on the module card
  title: string;
  blurb: string;
  lessons: Lesson[];
}

// ---------------------------------------------------------------------------------
// Module 1 — How poker works
// ---------------------------------------------------------------------------------

const HOW_POKER_WORKS: Module = {
  id: "basics",
  icon: "🃏",
  title: "How poker works",
  blurb: "The rules: hands, streets, and your four options — then sit down and play.",
  lessons: [
    {
      kind: "read",
      id: "intro",
      title: "Welcome to the felt",
      body: [
        "Poker is a betting game. You're dealt cards, and over a few rounds of betting you either make the best hand by showdown — or convince everyone else to fold.",
        "This game is Limit Texas Hold'em, one-on-one. Each hand you get two private cards; five shared cards come out in the middle. You win chips by making good decisions, not by getting lucky.",
        "First we'll learn the rules by playing a few hands. Then you'll teach a bot to play them for you.",
      ],
    },
    {
      kind: "read",
      id: "rankings",
      title: "Hand rankings",
      body: [
        "Your best five cards make your hand. Here's what beats what, strongest at the top.",
        "You don't need to memorize these — you'll get a feel for them as you play.",
      ],
      visual: "handRanks",
    },
    {
      kind: "quiz",
      id: "which-wins",
      title: "Which hand wins?",
      prompt: "A flush versus a straight — which one takes the pot?",
      compare: {
        a: ["Ah", "Jh", "8h", "5h", "2h"],
        b: ["9c", "8d", "7h", "6s", "5c"],
      },
      options: [
        { label: "Hand A — the flush", correct: true,
          feedback: "Right. A flush (five of one suit) beats a straight (five in a row)." },
        { label: "Hand B — the straight",
          feedback: "Close, but a flush outranks a straight — check the rankings chart." },
        { label: "They tie",
          feedback: "No — different hand types are compared by rank; the flush is higher." },
      ],
    },
    {
      kind: "read",
      id: "streets",
      title: "How a hand plays out",
      body: [
        "Two players post forced bets called blinds, then everyone gets two cards. Betting happens over four rounds:",
        "• Preflop — just your two cards.\n• The Flop — three shared cards appear.\n• The Turn — a fourth shared card.\n• The River — the fifth and final card.",
        "After the river, if two players remain, the best hand wins at showdown.",
      ],
    },
    {
      kind: "read",
      id: "actions",
      title: "Your options",
      body: [
        "On your turn you can:",
        "• Check — pass, if no one has bet (free to see the next card).\n• Call — match a bet to stay in.\n• Raise — put in more, pressuring your opponent.\n• Fold — give up the hand.",
        "'To call' is the number of chips you need to put in to stay in. If it's 0, checking is free.",
      ],
    },
    {
      kind: "play",
      id: "first-hands",
      title: "Play for real",
      body: [
        "Time to sit down. You're heads-up against the Caller — it calls a lot and never folds, so bet your strong hands for value and don't try to bluff it.",
        "Play at least two hands to continue. Stay as long as you like — your chip count is at the top.",
      ],
      opponent: "caller",
      requireHands: 2,
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 2 — First decisions
// ---------------------------------------------------------------------------------

const FIRST_DECISIONS: Module = {
  id: "first-decisions",
  icon: "🎯",
  title: "First decisions",
  blurb: "The three spots every hand comes down to: bet it, keep it, or let it go.",
  lessons: [
    {
      kind: "read",
      id: "three-spots",
      title: "Three decisions, over and over",
      body: [
        "Nearly every poker decision is one of three:",
        "• I'm probably ahead → bet and raise, so worse hands pay me.\n• I'm decent but unsure → call or check, keep the pot in control.\n• I'm probably behind → fold, and lose the minimum.",
        "The skill is telling those apart. Try the three classic versions.",
      ],
    },
    {
      kind: "hand",
      id: "value-bet",
      title: "Playing a monster",
      hole: ["As", "Ad"],
      board: ["Ac", "7d", "2s"],
      pot: 4,
      toCall: 0,
      situation:
        "You have three aces — a huge hand. It's the flop, your opponent checks to you. What do you do?",
      choices: [
        { action: "raise", verdict: "good",
          feedback: "Yes! With a monster you bet for value — get chips in while you're ahead." },
        { action: "check", verdict: "bad",
          feedback: "Too passive. Checking a monster wastes the chance to win a bigger pot." },
        { action: "fold", verdict: "bad",
          feedback: "Never fold the best possible hand!" },
      ],
    },
    {
      kind: "hand",
      id: "top-pair-call",
      title: "A hand worth keeping",
      hole: ["Ah", "Td"],
      board: ["Ts", "6c", "2d"],
      pot: 6,
      toCall: 2,
      situation:
        "You flopped top pair (a pair of tens) with an ace kicker — a genuinely good hand. Your opponent bets. What do you do?",
      choices: [
        { action: "call", verdict: "good",
          feedback: "Good. Top pair is usually best here — calling keeps weaker hands in and controls the pot." },
        { action: "raise", verdict: "ok",
          feedback: "Also fine — raising top pair for value puts your opponent to a decision." },
        { action: "fold", verdict: "bad",
          feedback: "Way too tight — top pair with a top kicker is far too strong to fold to one bet." },
      ],
    },
    {
      kind: "hand",
      id: "fold-air",
      title: "Knowing when to quit",
      hole: ["Kd", "Qc"],
      board: ["9c", "4s", "2d", "7h", "Js"],
      pot: 8,
      toCall: 4,
      situation:
        "It's the river. You have king-high — no pair, nothing. Your opponent bets into you. What do you do?",
      choices: [
        { action: "fold", verdict: "good",
          feedback: "Correct. With nothing and facing a bet, folding saves your chips." },
        { action: "call", verdict: "bad",
          feedback: "Calling with king-high almost never wins — you're just donating chips." },
        { action: "raise", verdict: "bad",
          feedback: "Bluff-raising here is wild; you have no hand and no plan. Fold." },
      ],
    },
    {
      kind: "bridge",
      id: "bridge-campaign",
      title: "Now teach a bot",
      body: [
        "You just made the three core decisions: bet your strong hands, keep your good ones, fold your weak ones under pressure.",
        "In the Campaign you'll turn those instincts into a bot — pick actions for whole groups of hands, then watch it play hundreds of hands against AI opponents. Come back here anytime: the strategy modules below make your bot sharper.",
      ],
      cta: "Start the Campaign →",
      action: "campaign",
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 3 — Position (the A4 worked example: apply-it scenarios + feel-it play)
// ---------------------------------------------------------------------------------

const POSITION: Module = {
  id: "position",
  icon: "🧭",
  title: "Position",
  blurb: "Acting last is an edge you can feel. Same cards, different seat, different play.",
  lessons: [
    {
      kind: "read",
      id: "position-power",
      title: "Position is power",
      body: [
        "Heads-up, the dealer button posts the small blind and acts FIRST before the flop — but LAST on the flop, turn, and river. Acting last is called being 'in position'.",
        "Why it matters: when you act last, you decide with more information every street. They checked? Weakness — you can bet. They bet? You can let a marginal hand go without guessing.",
        "Out of position it's reversed: you commit chips into the unknown, and strong opponents make your life miserable.",
        "The rule of thumb: position flips your MARGINAL decisions. Strong hands bet from anywhere; junk folds from anywhere. It's the middle of your range that plays looser and more aggressively in position, and more carefully out of it.",
      ],
    },
    {
      kind: "scenario",
      id: "position-drill",
      title: "Same hand, different seat",
      intro: [
        "Six spots. In each one, look at the badge on the table: it tells you whether you act LAST (in position) or FIRST (out of position) this street.",
        "You'll see the same holdings from both seats — pick the action that fits the seat. One try per spot.",
      ],
      spots: [
        {
          hole: ["8h", "8c"], board: ["Qs", "6d", "2c"], pot: 4, toCall: 0,
          tag: "IN POSITION — they checked to you",
          situation:
            "A pair of eights under one overcard. Your opponent checked. You act last — what's the move?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Yes. They showed weakness and your pair is likely best — bet, so ace-high and king-high pay to see the next card instead of catching it for free." },
            { action: "check", verdict: "ok",
              feedback: "Safe, but you're letting overcards peel a free card. When they check to you in position, a modest hand like this usually wants to bet." },
          ],
        },
        {
          hole: ["8h", "8c"], board: ["Qs", "6d", "2c"], pot: 4, toCall: 0,
          tag: "OUT OF POSITION — you act first",
          situation:
            "Same eights, same board — but now you're first to act, with no idea where they stand. What's the move?",
          choices: [
            { action: "check", verdict: "good",
              feedback: "Right. Out of position with a fragile pair, check — you learn what they do before building a pot you can't control. That's the whole lesson: same hand, different seat, different action." },
            { action: "raise", verdict: "ok",
              feedback: "Defensible, but you're betting into the dark — if they raise, an eight-pair hates its life. Checking first to act keeps the pot small while you're unsure." },
          ],
        },
        {
          hole: ["6d", "5d"], board: ["Ks", "9d", "4c"], pot: 4, toCall: 0,
          tag: "IN POSITION — they checked to you",
          situation:
            "You have nothing — six-high. But your opponent just checked, and you act last. What's the move?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Good. They advertised weakness and you close the street — a bet here takes the pot down often enough to profit even with six-high. Bluffing works best in position." },
            { action: "check", verdict: "ok",
              feedback: "Fine — a free card costs nothing. But notice the opportunity: after they check, a position bluff at this small pot prints money over time." },
          ],
        },
        {
          hole: ["6d", "5d"], board: ["Ks", "9d", "4c"], pot: 4, toCall: 0,
          tag: "OUT OF POSITION — you act first",
          situation:
            "Same six-high, same board — but you act first. Still feel like bluffing?",
          choices: [
            { action: "check", verdict: "good",
              feedback: "Correct. Bluffing into a player who hasn't told you anything is burning chips — they could be sitting on top pair. Out of position, give up cheap with air." },
            { action: "raise", verdict: "bad",
              feedback: "That's a bluff into the unknown — when it gets called or raised you've torched chips with six-high. The exact same bluff was good IN position, after they checked. Seat first, then action." },
          ],
        },
        {
          hole: ["Ts", "9s"], board: ["8s", "7d", "2c", "Kh"], pot: 8, toCall: 0,
          tag: "IN POSITION — they checked to you",
          situation:
            "Turn. You have an open-ended straight draw (any six or jack completes it) but no made hand yet. They checked. What's the move?",
          choices: [
            { action: "check", verdict: "good",
              feedback: "Nice — the free card is position's gift. You get to see the river for nothing with eight cards that make you a straight; no need to risk chips." },
            { action: "raise", verdict: "ok",
              feedback: "A semi-bluff is respectable — you can win right now, and you have outs when called. But taking the guaranteed free card is the simplest profit position offers." },
          ],
        },
        {
          hole: ["Kd", "Kc"], board: ["9d", "5c", "2s"], pot: 4, toCall: 0,
          tag: "OUT OF POSITION — you act first",
          situation:
            "Kings — an overpair to this raggedy board. You act first. Does being out of position change anything?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Exactly. Position flips MARGINAL decisions — this isn't one. Strong hands bet from any seat: charge worse pairs and draws now." },
            { action: "check", verdict: "ok",
              feedback: "A trap can work, but it risks a free card and wins a small pot when they check behind. With clearly-best hands, just bet — from either seat." },
          ],
        },
      ],
    },
    {
      kind: "play",
      id: "feel-ip",
      title: "Feel it: in position",
      body: [
        "You're pinned ON THE BUTTON against the Shark — a tight, aggressive bot. You will act last on every street after the flop, all match.",
        "Notice how much easier decisions feel: when it checks, take the pot; when it bets, you can fold your junk with a clear conscience. Play at least 3 hands.",
      ],
      opponent: "tight_aggressive",
      fixedButton: 0,
      requireHands: 3,
    },
    {
      kind: "play",
      id: "feel-oop",
      title: "Feel it: out of position",
      body: [
        "Same Shark — but now you're pinned OUT OF POSITION for every hand. You act first on every street after the flop, into the dark.",
        "Feel the squeeze: you check, it bets; you bet, it raises when it has it. Play at least 3 hands, and don't worry about the result — the discomfort IS the lesson.",
      ],
      opponent: "tight_aggressive",
      fixedButton: 1,
      requireHands: 3,
    },
    {
      kind: "bridge",
      id: "position-bridge",
      title: "Teach it to your bot",
      body: [
        "You just played both seats — and felt the difference. Your bot can use the same idea.",
        "In the Campaign (from Level 2), the builder unlocks the POSITION condition under Advanced rules: 'In position → play looser / more aggressive', 'Out of position → tighten up'. Exactly what you just did by hand.",
      ],
      cta: "Back to the map",
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 4 — Value betting (ties into Campaign Level 1: the Caller)
// ---------------------------------------------------------------------------------

const VALUE_BETTING: Module = {
  id: "value-betting",
  icon: "💰",
  title: "Value betting",
  blurb: "Winnings come from worse hands paying you. Make them pay — and never bluff a caller.",
  lessons: [
    {
      kind: "read",
      id: "where-money-comes-from",
      title: "Where winnings come from",
      body: [
        "You don't profit by winning hands — you profit when chips go in while you're ahead. A 'value bet' is a bet you make hoping to get CALLED by a worse hand.",
        "Against a player who calls too much (a 'calling station'), value betting is the entire game plan: bet every street with your good hands, because they'll pay you off with worse.",
        "The mirror rule: a station's calls make your BLUFFS worthless. Bluffing works by making better hands fold — a player who never folds can't be bluffed.",
        "In Limit Hold'em you can't bet huge, so you make it up in frequency: strong hand? Bet the flop, bet the turn, bet the river.",
      ],
    },
    {
      kind: "scenario",
      id: "value-drill",
      title: "Make the Caller pay",
      intro: [
        "Every spot in this drill is against a calling station: it calls with almost anything and never folds.",
        "Your job: squeeze value from good hands, and never waste a chip bluffing. One try per spot.",
      ],
      spots: [
        {
          hole: ["Ad", "Jc"], board: ["Jh", "8s", "3d", "6c", "2h"], pot: 12, toCall: 0,
          tag: "RIVER vs a calling station — they checked",
          situation:
            "Top pair, top kicker on the river. The station checks. Last chance to act — what's the move?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Yes — this is THE value bet. It will call with worse pairs, even ace-high. Checking back top pair against a station is leaving money on the table." },
            { action: "check", verdict: "bad",
              feedback: "You just skipped your last chance to charge a player who calls with anything. Against a station, good hands bet the river — always." },
          ],
        },
        {
          hole: ["7h", "7d"], board: ["7s", "Kd", "2c"], pot: 4, toCall: 0,
          tag: "FLOP vs a calling station — they checked",
          situation:
            "You flopped three sevens — a monster. Tempting to act weak and 'trap'… but against a station, what's right?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Right. Slowplaying exists to keep weak hands in the pot — a station stays in anyway! Start building the pot now: bet flop, turn, and river." },
            { action: "check", verdict: "bad",
              feedback: "Trapping a player who never folds accomplishes nothing — they'd have called every bet. You just made the final pot one street smaller." },
          ],
        },
        {
          hole: ["Ah", "Qh"], board: ["9h", "6h", "2s", "Jc", "4d"], pot: 10, toCall: 0,
          tag: "RIVER vs a calling station — your flush draw missed",
          situation:
            "Your flush draw bricked — you have ace-high. The station checks the river to you. Bluff it?",
          choices: [
            { action: "check", verdict: "good",
              feedback: "Correct. You cannot bluff someone who doesn't fold — it calls with any pair and beats you. Check, lose the minimum, move on." },
            { action: "raise", verdict: "bad",
              feedback: "That bet only gets called when you're beat. Bluffs need FOLDS to profit, and stations don't fold. Never bluff a calling station." },
          ],
        },
        {
          hole: ["Kc", "Th"], board: ["Ts", "8d", "3c", "2h"], pot: 8, toCall: 2,
          tag: "TURN vs a calling station — it suddenly BET",
          situation:
            "You have top pair. The station — who almost never bets, only calls — suddenly bets into you. What now?",
          choices: [
            { action: "call", verdict: "good",
              feedback: "Sensible. When a passive player wakes up with a bet, respect it — but top pair is still too strong to fold for one small bet in Limit. Call, and slow down." },
            { action: "raise", verdict: "bad",
              feedback: "Raising builds a pot exactly when the passive player finally has something. Their rare bets mean strength — value-raise your monsters, not one pair." },
            { action: "fold", verdict: "bad",
              feedback: "Too scared — one Limit bet with top pair getting 5:1 is a clear call, even against a suspicious line." },
          ],
        },
        {
          hole: ["Qd", "Js"], board: ["Qc", "Jd", "5h", "8s"], pot: 8, toCall: 0,
          tag: "TURN vs a calling station — they checked",
          situation:
            "Top two pair on the turn; the station checks. You already bet the flop and got called. Keep going?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Bet again — and again on the river. Against a station, a strong hand should charge EVERY street. Each skipped bet is a lost bet." },
            { action: "check", verdict: "bad",
              feedback: "Why stop? It called the flop with something worse and will call again. Value betting is a habit, not a one-off." },
          ],
        },
      ],
    },
    {
      kind: "bridge",
      id: "value-bridge",
      title: "Your bot can do this",
      body: [
        "The whole drill compresses to two block rules: strong hands RAISE (every street), and weak hands never bluff a caller.",
        "That's exactly how you beat Campaign Level 1 — set your made hands to Raise and let the Caller pay you off for 500 hands.",
      ],
      cta: "Beat the Caller →",
      action: "campaign",
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 5 — Discipline vs aggression (ties into Campaign Level 2: the Shark)
// ---------------------------------------------------------------------------------

const DISCIPLINE: Module = {
  id: "discipline",
  icon: "🛡️",
  title: "Discipline vs aggression",
  blurb: "Tight-aggressive players profit from your loose calls. Steal their blinds, refuse to pay them off.",
  lessons: [
    {
      kind: "read",
      id: "two-habits",
      title: "Two habits beat a Shark",
      body: [
        "A tight-aggressive player ('TAG', or Shark) folds its junk and bets hard with its good hands. It makes money in two ways: you fold too much when it has nothing preflop, and you CALL too much when it has it postflop.",
        "So beating it takes two habits:",
        "• STEAL — it folds a lot preflop, so raise a wide range and take its blinds without a fight.\n• DON'T PAY OFF — when a tight player bets and raises, it has it. One pair is usually no good; let it go.",
        "The discipline half feels bad — you'll fold hands that occasionally were winning. Do it anyway: paying off aggression is the most expensive leak in poker.",
      ],
    },
    {
      kind: "scenario",
      id: "discipline-drill",
      title: "Steal wide, fold smart",
      intro: [
        "Every spot is against a Shark: tight preflop, aggressive with strong hands, and it folds when it has nothing.",
        "Steal when it's likely weak; get out of the way when it tells you it's strong. One try per spot.",
      ],
      spots: [
        {
          hole: ["Jd", "8c"], board: [], pot: 3, toCall: 1,
          tag: "PREFLOP on the button — the Shark folds a lot",
          situation:
            "Jack-eight offsuit — mediocre. But you're on the button, and this opponent folds most hands to a raise. What's the move?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Steal! Against someone who folds a lot, a wide button raise prints chips even when your cards are nothing special. Aggression targets their WEAKNESS, not your strength." },
            { action: "call", verdict: "ok",
              feedback: "Playable, but limping in earns nothing from a folder. Raising wins the blinds outright the many times it folds — that's the point of stealing." },
            { action: "fold", verdict: "bad",
              feedback: "Too tight against this opponent. When they fold too much preflop, mediocre buttons become raises — free blinds add up fast." },
          ],
        },
        {
          hole: ["Kh", "Qd"], board: ["Qs", "9c", "4d", "7h"], pot: 10, toCall: 4,
          tag: "TURN — the tight Shark RAISED your bet",
          situation:
            "Top pair, good kicker. You bet the turn and the Shark raised. This player doesn't raise without a real hand. Now what?",
          choices: [
            { action: "fold", verdict: "good",
              feedback: "Disciplined. A tight player's raise says two pair or better — your one pair is beat, and calling down costs bets on two streets. This fold is where money is saved." },
            { action: "call", verdict: "bad",
              feedback: "This is 'paying off' — exactly how Sharks profit. When a tight-aggressive player raises, believe them: one pair is no good." },
            { action: "raise", verdict: "bad",
              feedback: "Re-raising one pair into shown strength is lighting chips on fire. Save aggression for when they're weak, not when they've announced strength." },
          ],
        },
        {
          hole: ["9s", "9d"], board: ["9h", "6s", "2d"], pot: 6, toCall: 2,
          tag: "FLOP — the Shark bet into you",
          situation:
            "You flopped three nines and the Shark bets. Discipline means folding one pair to aggression… is this that?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "No — discipline is for MARGINAL hands. Three of a kind is a monster: raise for value while it likes its overpair or top pair. Fold one pair; raise real hands." },
            { action: "call", verdict: "ok",
              feedback: "You could trap a street, but in Limit the pot grows by fixed bets — start charging now. Two more streets of value beat one." },
            { action: "fold", verdict: "bad",
              feedback: "That's not discipline, that's panic. You have three nines — the Shark's 'strength' is exactly what pays you off here." },
          ],
        },
        {
          hole: ["Ac", "8d"], board: ["Kd", "Ts", "6h", "3c", "Qh"], pot: 12, toCall: 4,
          tag: "RIVER — the Shark bets again",
          situation:
            "You called down with ace-high hoping to pair. The river bricks and the Shark bets a third time. It's 'only' 4 more chips into a pot of 12…",
          choices: [
            { action: "fold", verdict: "good",
              feedback: "Right. Pot odds tempt you, but a tight player betting three streets has you crushed — ace-high wins here almost never. 'Only 4 chips' three times a session is your whole win rate." },
            { action: "call", verdict: "bad",
              feedback: "The classic payoff. Each call is small; the habit is enormous. Against three barrels from a tight player, ace-high is a fold, full stop." },
          ],
        },
      ],
    },
    {
      kind: "bridge",
      id: "discipline-bridge",
      title: "Build the discipline in",
      body: [
        "As blocks: widen your preflop RAISE range (steal), keep value-raising your strong hands — and facing a bet, set 'A pair → Fold'. Your bot never gets stubborn; that's its superpower.",
        "This is precisely the recipe for Campaign Level 2 — the Shark.",
      ],
      cta: "Take on the Shark →",
      action: "campaign",
    },
  ],
};

export const MODULES: Module[] = [
  HOW_POKER_WORKS,
  FIRST_DECISIONS,
  POSITION,
  VALUE_BETTING,
  DISCIPLINE,
];
