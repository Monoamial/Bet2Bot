// Academy content — data-driven lessons that teach the rules and first strategy ideas
// through short explainers, quizzes, and scripted playable hands. Frontend-only (no
// Python needed), so the Learn track loads instantly while Pyodide boots in the
// background. Add lessons by appending to LESSONS.

import { Action } from "../strategy/model";

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
      choices: { action: Action; verdict: "good" | "ok" | "bad"; feedback: string }[];
    }
  | { kind: "play"; id: string; title: string; body: string[]; opponent: string }
  | { kind: "bridge"; id: string; title: string; body: string[]; cta: string };

export const LESSONS: Lesson[] = [
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
    kind: "read",
    id: "position",
    title: "Position is power",
    body: [
      "Acting last is a real edge: you see what your opponent does before you have to decide.",
      "When you're 'in position' (you act after them) you can play more hands and make better decisions. When you're first to act ('out of position'), tighten up.",
      "You'll use this exact idea when you build bots in the Campaign.",
    ],
  },
  {
    kind: "play",
    id: "first-hands",
    title: "Play for real",
    body: [
      "Time to sit down. You're heads-up against the Caller — it calls a lot and never folds, so bet your strong hands for value and don't try to bluff it.",
      "Play at least one hand to continue. Stay as long as you like — your chip count is at the top.",
    ],
    opponent: "caller",
  },
  {
    kind: "bridge",
    id: "bridge",
    title: "Now teach a bot",
    body: [
      "You just made two key decisions: bet your strong hands, fold your weak ones facing pressure.",
      "In the Campaign you'll turn those instincts into a bot — pick actions for whole groups of hands, then watch it play thousands of hands against AI opponents.",
    ],
    cta: "Start the Campaign →",
  },
];
