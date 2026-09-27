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

import type { Action } from "../strategy/model";

export interface SpotChoice { action: Action; verdict: "good" | "ok" | "bad"; feedback: string }

export interface SizingSpot {
  hole: [string, string]; board: string[];
  pot: number; toCall: number; stack: number; tag: string; situation: string;
  choices: { label: string; verdict: "good" | "ok" | "bad"; feedback: string }[];
}

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
      compare?: { a: string[]; b: string[]; labelA?: string; labelB?: string };
      options: { label: string; correct?: boolean; feedback: string }[];
    }
  | {
      kind: "hand"; id: string; title: string;
      hole: [string, string]; board: string[]; pot: number; toCall: number;
      situation: string;
      choices: SpotChoice[];
    }
  | { kind: "scenario"; id: string; title: string; intro: string[]; spots: Spot[] }
  | { kind: "sizing"; id: string; title: string; intro: string[]; spots: SizingSpot[] }
  | {
      kind: "play"; id: string; title: string; body: string[]; opponent: string;
      fixedButton?: 0 | 1;   // pin the dealer button: 0 = you (in position postflop)
      betting?: "limit" | "no_limit"; // lessons default to introductory Limit
      stack?: number;        // starting chips per seat (No-Limit lessons)
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
    {
      kind: "read", id: "same-category", title: "The kicker breaks the tie",
      body: [
        "You just played real hands. Often both players make the same kind of hand. One pair doesn't always tie with one pair: compare the rank of the pair, then the highest remaining card (the kicker), then the next kicker.",
        "Your best five cards can come from your hand, the shared board, or both. If the board already gives both players the same best five, you split the pot — suits never break a tie in Hold'em.",
      ],
    },
    {
      kind: "quiz", id: "which-kicker", title: "Same pair, different kicker",
      prompt: "Both hands have a pair of aces. Compare the remaining cards from highest to lowest — which five-card hand wins?",
      compare: {
        a: ["As", "Ah", "Kc", "9d", "3s"],
        b: ["Ac", "Ad", "Qc", "Jd", "Ts"],
      },
      options: [
        { label: "Hand A — king kicker", correct: true,
          feedback: "Correct. The pair ties, then A's king beats B's queen before the smaller kickers matter." },
        { label: "Hand B — three higher-looking kickers",
          feedback: "Compare kickers in order, not as a total: king beats queen. The other cards can't rescue B." },
        { label: "They tie because both have aces",
          feedback: "Hand types and pair rank tie, so the highest unused card decides it: king beats queen." },
      ],
    },
    {
      kind: "quiz", id: "board-plays", title: "When the board plays",
      prompt: "The board is 5-6-7-8-9. Neither player has a ten. Both displays show the same best five board cards. Who wins?",
      compare: {
        a: ["5h", "6s", "7d", "8c", "9h"],
        b: ["5h", "6s", "7d", "8c", "9h"],
      },
      options: [
        { label: "They split the pot", correct: true,
          feedback: "Yes. The board itself is a nine-high straight; both players use the same five cards, so they split." },
        { label: "Hand A — hearts beat the other suits",
          feedback: "Suit doesn't break poker ties. Those five board cards are literally the same hand for both players." },
        { label: "Whoever held higher hole cards",
          feedback: "Hole cards only matter if they improve your best five. Here the shared board makes the same straight for both." },
      ],
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
            "A pocket pair under one overcard. Your opponent checked. You act last — what's the move?",
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
            "Same pocket pair, same board — but now you're first to act, with no idea where they stand. What's the move?",
          choices: [
            { action: "check", verdict: "good",
              feedback: "Right. Out of position with a fragile pocket pair, check — you learn what they do before building a pot you can't control. That's the whole lesson: same hand, different seat, different action." },
            { action: "raise", verdict: "ok",
              feedback: "Defensible, but you're betting into the dark — if they raise, a small pair hates its life. Checking first to act keeps the pot small while you're unsure." },
          ],
        },
        {
          hole: ["6d", "5d"], board: ["Ks", "9d", "4c"], pot: 4, toCall: 0,
          tag: "IN POSITION — they checked to you",
          situation:
            "You have no pair — just a high-card hand. But your opponent just checked, and you act last. What's the move?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "Good. They advertised weakness and you close the street — a bet here takes the pot down often enough to profit even with no pair. Bluffing works best in position." },
            { action: "check", verdict: "ok",
              feedback: "Fine — a free card costs nothing. But notice the opportunity: after they check, a position bluff at this small pot prints money over time." },
          ],
        },
        {
          hole: ["6d", "5d"], board: ["Ks", "9d", "4c"], pot: 4, toCall: 0,
          tag: "OUT OF POSITION — you act first",
          situation:
            "Same unpaired hand, same board — but you act first. Still feel like bluffing?",
          choices: [
            { action: "check", verdict: "good",
              feedback: "Correct. Bluffing into a player who hasn't told you anything is burning chips — they could be sitting on top pair. Out of position, give up cheap with air." },
            { action: "raise", verdict: "bad",
              feedback: "That's a bluff into the unknown — when it gets called or raised you've torched chips with a weak high-card hand. The exact same bluff was good IN position, after they checked. Seat first, then action." },
          ],
        },
        {
          hole: ["Ts", "9s"], board: ["8s", "7d", "2c", "Kh"], pot: 8, toCall: 0,
          tag: "IN POSITION — they checked to you",
          situation:
            "Turn. You have an open-ended straight draw with eight river cards that complete it, but no made hand yet. They checked. What's the move?",
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
            "A pocket pair is an overpair to this raggedy board. You act first. Does being out of position change anything?",
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
            "You flopped a set — a monster. Tempting to act weak and 'trap'… but against a station, what's right?",
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
      cta: "Add value rules & face the Caller →",
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
            "A middling offsuit hand. But you're on the button, and this opponent folds most hands to a raise. What's the move?",
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
            "You flopped a set and the Shark bets. Discipline means folding one pair to aggression… is this that?",
          choices: [
            { action: "raise", verdict: "good",
              feedback: "No — discipline is for MARGINAL hands. Three of a kind is a monster: raise for value while it likes its overpair or top pair. Fold one pair; raise real hands." },
            { action: "call", verdict: "ok",
              feedback: "You could trap a street, but in Limit the pot grows by fixed bets — start charging now. Two more streets of value beat one." },
            { action: "fold", verdict: "bad",
              feedback: "That's not discipline, that's panic. You have a set — the Shark's 'strength' is exactly what pays you off here." },
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
        "This bridge will set 'A pair → Fold' facing bets on each street. Your other rules stay intact. Then widen your preflop RAISE range yourself to steal — the builder's preflop grid does not yet distinguish button from blind.",
        "This is precisely the recipe for Campaign Level 2 — the Shark.",
      ],
      cta: "Add discipline rule & face the Shark →",
      action: "campaign",
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 6 — No-Limit sizing: the action can be correct while the PRICE is wrong.
// ---------------------------------------------------------------------------------

const BET_SIZING: Module = {
  id: "sizing",
  icon: "🪙",
  title: "Bet sizes & pot odds",
  blurb: "No-Limit decisions: choose your price, charge callers, and know when a call pays.",
  lessons: [
    {
      kind: "read", id: "why-size", title: "The size is part of the decision",
      body: [
        "Classic Limit has one raise size. In No-Limit, the same Raise decision can mean half a pot, a full pot, or your entire stack. You are setting a PRICE for the next player.",
        "For value, bet larger when a weaker hand will still call: a calling station that pays 20 chips is worth more than one that pays 5. But if a tight opponent folds everything to a huge bet, you can't get paid.",
        "For a bluff, choose the smallest bet that gets enough folds. Risking 20 to win 10 needs them to fold more often than risking 5 to win 10. Don't bluff someone who calls everything, however small the bet.",
        "The bet controls show 'raise TO' the total chips you put in this street, not 'raise BY'. If you already contributed 4 and raise to 12, you add 8 more chips.",
      ],
    },
    {
      kind: "quiz", id: "price-to-call", title: "What price are you getting?",
      prompt: "The pot has 12 chips after your opponent bets. It costs 4 more to call. How often must your hand win to break even on the call?",
      options: [
        { label: "25% — 4 to win 16", correct: true,
          feedback: "Right: call 4, and the final pot will be 16. You need 4 ÷ 16 = 25% equity to break even (before future betting)." },
        { label: "33% — 4 divided by 12",
          feedback: "The pot grows when you call. Divide your 4-chip call by the 16-chip final pot, not the current 12." },
        { label: "50% — every call is a coin flip",
          feedback: "Your price depends on the pot and call size. Here you risk 4 to win 16, so 25% is enough." },
      ],
    },
    {
      kind: "sizing", id: "size-drill", title: "Choose a price, not just an action",
      intro: [
        "The answers below are teaching heuristics, not rigid poker laws. Read your opponent's tendency, the pot, and the cost before sizing.",
        "One attempt per spot. The cards and price shown stay fixed for this introductory drill.",
      ],
      spots: [
        {
          hole: ["Ah", "Kh"], board: ["Ks", "7c", "2d", "3h", "9c"], pot: 20, toCall: 0, stack: 100,
          tag: "RIVER — value vs a caller", situation:
            "You have top pair, top kicker. The Caller checks and calls almost anything with weaker pairs. How much should you bet for value?",
          choices: [
            { label: "Check", verdict: "bad", feedback: "A calling station won't bet for you. Checking leaves value on the table." },
            { label: "Bet 5 (¼ pot)", verdict: "ok", feedback: "You'll often get called, but this opponent would call more. Charge them while they still like their pair." },
            { label: "Bet 15 (¾ pot)", verdict: "good", feedback: "Good value size: weak pairs still call this opponent's favorite price, and you earn more than with a tiny bet." },
            { label: "All-in 100 (5× pot)", verdict: "bad", feedback: "Too much to assume even a calling station pays off with any pair. A large-but-callable bet beats a shove." },
          ],
        },
        {
          hole: ["Qh", "Jh"], board: ["7s", "4d", "2c"], pot: 10, toCall: 0, stack: 100,
          tag: "FLOP — bluff vs an over-folder", situation:
            "You have no made hand. The Rock folds to ordinary bets on dry boards. If you bluff, which price risks the least while still pressuring them?",
          choices: [
            { label: "Check", verdict: "ok", feedback: "Checking costs nothing, but misses a profitable small steal against someone who over-folds." },
            { label: "Bet 5 (½ pot)", verdict: "good", feedback: "A half-pot bluff risks 5 to win 10, so it only needs folds more than one third of the time." },
            { label: "Bet 10 (pot)", verdict: "ok", feedback: "A pot-size bluff needs folds over half the time. The small bet already gets this player to fold." },
            { label: "All-in 100", verdict: "bad", feedback: "Risking 100 to win 10 is unnecessary when a 5-chip bet works. Save your stack." },
          ],
        },
        {
          hole: ["9h", "8h"], board: ["Qh", "5h", "2d", "Kc"], pot: 12, toCall: 4, stack: 100,
          tag: "TURN — flush draw vs a bet", situation:
            "You have nine possible heart outs for a flush, but only one card remains. The pot is 12 after their 4-chip bet. Is calling for the flush alone worth this price?",
          choices: [
            { label: "Fold", verdict: "good", feedback: "Nine hearts among 46 unseen cards is about 20%, below the 25% price (4 ÷ 16). Without implied odds, fold." },
            { label: "Call 4", verdict: "bad", feedback: "A 20% one-card flush chance does not cover a 25% pot-odds price on its own. Future payoffs could change the answer, but aren't assumed here." },
            { label: "Raise to 20", verdict: "bad", feedback: "Turning a draw into a bluff is a different plan; this spot only asks if the immediate call pays for itself." },
          ],
        },
      ],
    },
    {
      kind: "play", id: "size-live", title: "Feel the prices at the table",
      body: [
        "Two hands against the Caller in No-Limit. You have 200 chips (100 big blinds), refilled each hand. Use half-pot/pot presets or the slider when betting; notice how the pot and your stack move by the amount you chose.",
        "The lesson unlocks after two hands, win or lose. The goal is to experiment with the price, not maximize short-run winnings.",
      ],
      opponent: "caller", betting: "no_limit", stack: 200, requireHands: 2,
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 7 — Hand reading: ranges are stories, not certainty.
// ---------------------------------------------------------------------------------

const HAND_READING: Module = {
  id: "hand-reading",
  icon: "🔎",
  title: "Read the opponent",
  blurb: "Connect an opponent's actions to the hands they might have — then respond.",
  lessons: [
    {
      kind: "read", id: "ranges-not-peeking", title: "Read a range, not two secret cards",
      body: [
        "You cannot see the opponent's hole cards. A good read narrows down a range — a set of possible hands — using what they've done, not a guess at their exact cards.",
        "The same bet means different things from different opponents. The Rock rarely risks chips without strength; the River Bluffer attacks when its river hand misses. First ask: who is acting? Then: what did their action say?",
        "Reads are uncertain. A fold can be right even when the opponent bluffed this once; a bluff-catch can be right even when you lose this time. Judge repeated decisions, not one revealed hand.",
      ],
    },
    {
      kind: "quiz", id: "same-bet-different-range", title: "Who is likely stronger?",
      prompt: "On the river, both the Rock and the River Bluffer bet into you. Which bet more reliably represents a made hand?",
      options: [
        { label: "The Rock's bet", correct: true,
          feedback: "Right. The Rock is tight; the River Bluffer often bets with high-card air. The action alone isn't the read — the opponent matters." },
        { label: "The River Bluffer's bet",
          feedback: "This opponent attacks even when its river hand missed. A bet from a tight Rock signals strength more often." },
        { label: "Every river bet means the same thing",
          feedback: "Opponents differ. Hand reading combines the action with what that player tends to do." },
      ],
    },
    {
      kind: "scenario", id: "reading-drill", title: "Follow their story",
      intro: [
        "Each spot tells you a player's tendency and the action they took. Name the likely *range* before choosing your response.",
        "These are learning examples, not guaranteed wins on one hand. One answer per spot, then read the reason.",
      ],
      spots: [
        {
          hole: ["9h", "9c"], board: ["As", "Kd", "4c"], pot: 8, toCall: 2,
          tag: "FLOP — the Rock raised preflop, then bet",
          situation: "Your pocket pair was decent before the flop; now two overcards appear. The Rock's narrow opening range contains many big aces and kings. What's the low-cost response?",
          choices: [
            { action: "fold", verdict: "good", feedback: "A tight range plus two overcards and a continuation bet spells trouble. It's okay to release a hand that was playable preflop." },
            { action: "call", verdict: "ok", feedback: "One cheap call might be defensible, but you're mostly hoping the Rock bluffed with two unpaired cards — not its usual line." },
            { action: "raise", verdict: "bad", feedback: "Turning a marginal pair into a bluff against a tight player who has announced strength builds the wrong pot." },
          ],
        },
        {
          hole: ["8h", "8d"], board: ["Kc", "7s", "3h", "2d", "6c"], pot: 12, toCall: 4,
          tag: "RIVER — the River Bluffer bets a missed board",
          situation: "You have a small pocket pair. This opponent bets river high-card hands instead of giving up. It fires again on a dry board. What does your pair do against that bluff-heavy range?",
          choices: [
            { action: "call", verdict: "good", feedback: "Bluff-catch. A small pair beats all the unpaired hands this opponent turns into river bets. You don't need a monster to call a frequent bluffer." },
            { action: "fold", verdict: "bad", feedback: "If you fold every pair, its no-pair river bluff succeeds too often. Their tendency makes a modest pair worth calling." },
            { action: "raise", verdict: "ok", feedback: "Your pair beats its bluffs already. Raising can make worse hands fold and get called by stronger ones; call to keep its bluff in." },
          ],
        },
        {
          hole: ["Qs", "Js"], board: ["8h", "4d", "2c", "9s"], pot: 10, toCall: 0,
          tag: "TURN — the Over-folder checks to you",
          situation: "You have only queen-high. The Over-folder releases weak pairs when facing pressure and has checked twice. Can you make its range fold?",
          choices: [
            { action: "raise", verdict: "good", feedback: "Target the tendency, not your hole cards. This player over-folds to bets — pressure wins pots without a showdown." },
            { action: "check", verdict: "ok", feedback: "Free cards are safe, but this is a missed steal against an opponent whose range gives up too much." },
          ],
        },
        {
          hole: ["Ac", "Jc"], board: ["As", "7h", "2d", "6s"], pot: 12, toCall: 4,
          tag: "TURN — the Trapper checked, then raised",
          situation: "Top pair felt good. But the Trapper checked a street, then raised your turn bet. It saves raises for three of a kind or better. What changed?",
          choices: [
            { action: "fold", verdict: "good", feedback: "Its line narrows the range sharply to monsters. Your top pair is good against random hands, not against a trapper's rare raise." },
            { action: "call", verdict: "bad", feedback: "You'd be paying off exactly the slow-play this bot is built to make. Respect the opponent's *sequence*, not only your pair." },
            { action: "raise", verdict: "bad", feedback: "Re-raising a trapper's rare strong raise with one pair puts extra chips in while behind." },
          ],
        },
      ],
    },
    {
      kind: "play", id: "read-live", title: "Try one read in real play",
      body: [
        "Play two hands against the River Bluffer. Watch the announcements: preflop action, streets, and its river betting tendency. If it bets with a dry-board miss, a modest made hand can call rather than automatically fold.",
        "The result of two hands is mostly luck; focus on whether you noticed *why* this opponent put chips in.",
      ],
      opponent: "river_bluffer", requireHands: 2,
    },
    {
      kind: "bridge", id: "reading-bridge", title: "Think like a profiler",
      body: [
        "A bot can only react to information it can observe: the board, actions, position, and showdowns. The Campaign's Profiler keeps its own record of showdowns; its opponent-type condition becomes available after earlier levels.",
        "Your hand-reading skill now has a home in the builder. The current rule blocks cannot directly recognize an opponent's exact river-bluff pattern, so this bridge leaves your saved strategy unchanged.",
      ],
      cta: "Back to the map",
    },
  ],
};

// ---------------------------------------------------------------------------------
// Module 8 — Board texture: cards change what opponents can plausibly hold.
// ---------------------------------------------------------------------------------

const BOARD_TEXTURE: Module = {
  id: "board-texture",
  icon: "🌊",
  title: "Read the board",
  blurb: "A dry flop and a connected, suited flop call for different levels of caution.",
  lessons: [
    {
      kind: "read", id: "dry-wet", title: "Dry boards, wet boards",
      body: [
        "The shared cards matter as much as your hole cards. K-7-2 in three suits is DRY: it offers few immediate straight or flush draws. J-T-9 in one suit is WET: many opponents can already have a straight or flush, and many more can draw to one.",
        "Board texture changes what counts as a strong hand. Top pair is comfortable on a dry board against an opponent who checks; it is much less comfortable when a tight player raises into three connected hearts.",
        "An overcard, a paired board, or a third/fourth card of one suit changes the story on later streets. Don't panic at every scary card; compare it with the opponent's line and your own best five.",
      ],
    },
    {
      kind: "quiz", id: "which-board-wetter", title: "Where are there more draws?",
      prompt: "Which flop makes it easier for many opponents to have a straight or flush draw (or already have a made flush)?",
      compare: {
        a: ["Kc", "7d", "2s"], b: ["Jh", "Th", "9h"],
        labelA: "Flop A — dry", labelB: "Flop B — connected + suited",
      },
      options: [
        { label: "Flop B — J♥ T♥ 9♥", correct: true,
          feedback: "Correct. Close ranks create straight possibilities and three hearts create flush possibilities. The K-7-2 rainbow flop is much quieter." },
        { label: "Flop A — K♣ 7♦ 2♠",
          feedback: "The ranks are far apart and all suits differ; far fewer draws connect with this board." },
        { label: "They are equally draw-heavy",
          feedback: "The overlap of J-T-9 and the three hearts makes Flop B much more coordinated." },
      ],
    },
    {
      kind: "scenario", id: "texture-drill", title: "Same poker, different board",
      intro: [
        "Look at the board before acting. A bet on a quiet flop and the same bet on a dangerous runout don't tell the same story.",
        "One attempt per spot; these first texture examples use authored cards. Read why after each choice.",
      ],
      spots: [
        {
          hole: ["Kh", "Qd"], board: ["Kc", "7s", "2h"], pot: 6, toCall: 0,
          tag: "DRY FLOP — the Caller checks",
          situation: "Top pair with a good kicker on a disconnected, rainbow board. The Caller checks and will pay off worse hands. What should you do?",
          choices: [
            { action: "raise", verdict: "good", feedback: "Value bet. Few draws can suddenly catch up, and this opponent will call with worse pairs." },
            { action: "check", verdict: "ok", feedback: "Checking keeps the pot small but gives up value against a player who calls almost anything." },
          ],
        },
        {
          hole: ["As", "Jd"], board: ["Jh", "Th", "9h"], pot: 12, toCall: 4,
          tag: "WET FLOP — the Shark raises",
          situation: "Top pair with no heart in your hand. The flop has three connected hearts and the tight Shark raised. How does the board change your one-pair hand?",
          choices: [
            { action: "fold", verdict: "good", feedback: "Respect this line. Straight and flush hands already exist; when this opponent raises a wet flop, one pair without a heart is rarely good enough." },
            { action: "call", verdict: "ok", feedback: "A cheap call can be defensible in some matchups, but here you will face more bets against a tight raiser on a dangerous board." },
            { action: "raise", verdict: "bad", feedback: "Re-raising a tight player's strength with one pair on a coordinated board overvalues your hand." },
          ],
        },
        {
          hole: ["Kc", "Kd"], board: ["Ks", "8h", "2h", "Jh"], pot: 10, toCall: 0,
          tag: "TURN — a third heart appears",
          situation: "You have three kings. A heart arrives, but the Caller checks and calls with lots of worse pairs. Does one scary card force a check?",
          choices: [
            { action: "raise", verdict: "good", feedback: "No. A flush is possible, not guaranteed. A set remains very strong; keep charging this station's many worse hands." },
            { action: "check", verdict: "ok", feedback: "Caution is understandable, but always checking when any draw completes costs value with a monster." },
          ],
        },
        {
          hole: ["Ac", "Ad"], board: ["Kh", "7h", "2c", "Jh", "4h"], pot: 16, toCall: 4,
          tag: "RIVER — four hearts, no heart in your hand",
          situation: "Your pocket aces were strong preflop. Four hearts are now on the board and the tight Shark bets the river. What does your hand really beat?",
          choices: [
            { action: "fold", verdict: "good", feedback: "Your best hand is still just one pair without a heart. A tight river bet on this runout usually signals a flush or better; don't pay it off." },
            { action: "call", verdict: "bad", feedback: "Pocket aces don't protect you from a completed flush. Read the five board cards and the opponent's river action." },
            { action: "raise", verdict: "bad", feedback: "This turns a one-pair hand into a costly bluff against a tight value range." },
          ],
        },
      ],
    },
    {
      kind: "play", id: "texture-live", title: "Read the runout live",
      body: [
        "Play two Limit hands against the Shark. Watch each new board card arrive separately and re-evaluate your best five on the flop, turn, and river.",
        "Don't overreact to every coordinated board: pair your read of the cards with what this specific opponent actually bets or checks.",
      ],
      opponent: "tight_aggressive", requireHands: 2,
    },
    {
      kind: "bridge", id: "texture-bridge", title: "What your bot can read so far",
      body: [
        "You read the board as a texture, but the current visual builder only knows made-hand tiers, position, and opponent type. Wet/dry texture conditions need their own tested engine rules before they can be dropped into a bot safely.",
        "For now, use this knowledge in Play mode. The current Campaign still starts with the simpler Limit game.",
      ],
      cta: "Back to the map",
    },
  ],
};

export const MODULES: Module[] = [
  HOW_POKER_WORKS,
  FIRST_DECISIONS,
  POSITION,
  VALUE_BETTING,
  DISCIPLINE,
  BET_SIZING,
  HAND_READING,
  BOARD_TEXTURE,
];
