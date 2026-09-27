import type { Lesson, Spot } from "./lessons";

export type ScenarioLesson = Extract<Lesson, { kind: "scenario" }>;
export type DealSeed = string | number;

type Deal = Pick<Spot, "hole" | "board">;
interface VariantGroup {
  /** Spot indexes which must share one deal (e.g. the in-position/out-of-position pair). */
  spots: readonly number[];
  options: readonly Deal[];
}

const deal = (hole: [string, string], board: string[]): Deal => ({ hole, board });

/**
 * A5 uses curated, rank-changing variants for the three current apply-it drills only.
 * Position keeps its paired spots identical and preserves the one-overcard pair, air,
 * open-ended draw, and overpair concepts; Value keeps top pair, trips, a missed flush,
 * and two pair; Discipline keeps the steal, top-pair fold, set, and ace-high fold spots.
 * Other lessons intentionally stay authored as-is: these are teaching templates, not a
 * poker solver. If editing an eligible drill, keep its copy generic and extend the tests
 * before adding ranks or changing a board length/action context.
 */
const VARIANTS: Record<string, readonly VariantGroup[]> = {
  "position-drill": [
    {
      spots: [0, 1],
      options: [
        deal(["8h", "8c"], ["Qs", "6d", "2c"]),
        deal(["6h", "6c"], ["Qd", "4s", "3c"]),
        deal(["5s", "5c"], ["Kd", "3h", "2c"]),
        deal(["9h", "9c"], ["As", "7d", "2s"]),
        deal(["4h", "4c"], ["Jd", "3s", "2c"]),
      ],
    },
    {
      spots: [2, 3],
      options: [
        deal(["6d", "5d"], ["Ks", "9d", "4c"]),
        deal(["7c", "4c"], ["Qs", "9h", "2d"]),
        deal(["8s", "3s"], ["Kd", "Jh", "6c"]),
        deal(["5h", "3h"], ["Ad", "9c", "2s"]),
        deal(["9c", "4d"], ["Qh", "7s", "2c"]),
      ],
    },
    {
      spots: [4],
      options: [
        deal(["Ts", "9s"], ["8s", "7d", "2c", "Kh"]),
        deal(["7h", "6h"], ["9c", "8d", "2s", "Kh"]),
        deal(["Jc", "Tc"], ["9d", "8s", "3h", "2d"]),
        deal(["8h", "7h"], ["6d", "5c", "As", "Kc"]),
        deal(["Qh", "Jh"], ["Tc", "9d", "4c", "2h"]),
      ],
    },
    {
      spots: [5],
      options: [
        deal(["Kd", "Kc"], ["9d", "5c", "2s"]),
        deal(["Ah", "Ad"], ["Jc", "7d", "3s"]),
        deal(["Qs", "Qc"], ["9h", "6d", "2c"]),
        deal(["Jd", "Jc"], ["8s", "5h", "2d"]),
        deal(["Ts", "Tc"], ["8d", "4c", "2h"]),
      ],
    },
  ],
  "value-drill": [
    {
      spots: [0],
      options: [
        deal(["Ad", "Jc"], ["Jh", "8s", "3d", "6c", "2h"]),
        deal(["Ah", "Tc"], ["Ts", "7d", "3c", "5h", "2s"]),
        deal(["Ah", "9c"], ["9s", "6d", "2c", "4h", "3s"]),
        deal(["Ah", "8c"], ["8h", "5s", "2d", "6c", "3h"]),
      ],
    },
    {
      spots: [1],
      options: [
        deal(["7h", "7d"], ["7s", "Kd", "2c"]),
        deal(["9h", "9d"], ["9s", "Kd", "2c"]),
        deal(["4h", "4c"], ["4s", "Qd", "2c"]),
        deal(["6s", "6c"], ["6h", "Ad", "2s"]),
      ],
    },
    {
      spots: [2],
      options: [
        deal(["Ah", "Qh"], ["9h", "6h", "2s", "Jc", "4d"]),
        deal(["Ac", "Jc"], ["9c", "5c", "2d", "8h", "4s"]),
        deal(["Ad", "Td"], ["Qd", "7d", "3s", "8c", "2h"]),
        deal(["As", "Ks"], ["Qs", "6s", "3d", "8h", "2c"]),
      ],
    },
    {
      spots: [3],
      options: [
        deal(["Kc", "Th"], ["Ts", "8d", "3c", "2h"]),
        deal(["Ah", "Jc"], ["Js", "9d", "4c", "2h"]),
        deal(["Qh", "9c"], ["9s", "6d", "3c", "2h"]),
        deal(["Kd", "8h"], ["8s", "5c", "2d", "4h"]),
      ],
    },
    {
      spots: [4],
      options: [
        deal(["Qd", "Js"], ["Qc", "Jd", "5h", "8s"]),
        deal(["Kd", "Tc"], ["Ks", "Th", "4h", "7s"]),
        deal(["9d", "8c"], ["9s", "8h", "3c", "5d"]),
        deal(["Ac", "Jd"], ["Ah", "Js", "5c", "8h"]),
      ],
    },
  ],
  "discipline-drill": [
    {
      spots: [0],
      options: [
        deal(["Jd", "8c"], []),
        deal(["Qh", "9c"], []),
        deal(["Th", "7c"], []),
        deal(["9h", "6c"], []),
        deal(["8s", "6d"], []),
      ],
    },
    {
      spots: [1],
      options: [
        deal(["Kh", "Qd"], ["Qs", "9c", "4d", "7h"]),
        deal(["Ac", "Jd"], ["Js", "8c", "3d", "6h"]),
        deal(["Qh", "Tc"], ["Ts", "8d", "3c", "6h"]),
        deal(["Kh", "Td"], ["Ts", "7d", "2c", "5h"]),
      ],
    },
    {
      spots: [2],
      options: [
        deal(["9s", "9d"], ["9h", "6s", "2d"]),
        deal(["8s", "8d"], ["8h", "5c", "2d"]),
        deal(["5s", "5d"], ["5h", "9c", "2s"]),
        deal(["Qs", "Qd"], ["Qh", "7c", "2d"]),
      ],
    },
    {
      spots: [3],
      options: [
        deal(["Ac", "8d"], ["Kd", "Ts", "6h", "3c", "Qh"]),
        deal(["Ah", "7d"], ["Kc", "9s", "5h", "2d", "Qc"]),
        deal(["As", "6c"], ["Kh", "9d", "4s", "2c", "Qd"]),
        deal(["Ad", "5c"], ["Jh", "8s", "4d", "2c", "Ks"]),
      ],
    },
  ],
};

/** Exposed for diagnostics/tests; unknown scenario IDs keep their authored cards. */
export const RANDOMIZED_SCENARIO_IDS = Object.keys(VARIANTS);

function hashSeed(seed: DealSeed): number {
  let hash = 0x811c9dc5;
  for (const char of String(seed)) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(seed: DealSeed): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function assertValidSpot(spot: Spot, lessonId: string, index: number): void {
  const cards = [...spot.hole, ...spot.board];
  if (spot.hole.length !== 2 || spot.board.length > 5 || cards.length > 7) {
    throw new Error(`Invalid card count in ${lessonId} spot ${index + 1}`);
  }
  for (const card of cards) {
    if (!/^[2-9TJQKA][shdc]$/.test(card)) {
      throw new Error(`Invalid card ${card} in ${lessonId} spot ${index + 1}`);
    }
  }
  if (new Set(cards).size !== cards.length) {
    throw new Error(`Duplicate card in ${lessonId} spot ${index + 1}`);
  }
}

/**
 * Pure and seeded: a seed always produces the same cards, and only cards change. The
 * component keeps this result fixed for a run; Retry creates a fresh seed for a new deal.
 */
export function randomizeScenario(lesson: ScenarioLesson, seed: DealSeed): ScenarioLesson {
  const spots = lesson.spots.map((spot) => ({
    ...spot,
    hole: [spot.hole[0], spot.hole[1]] as [string, string],
    board: [...spot.board],
    choices: spot.choices.map((choice) => ({ ...choice })),
  }));
  const groups = VARIANTS[lesson.id];

  if (groups) {
    const random = seededRandom(seed);
    for (const group of groups) {
      if (group.options.length === 0) throw new Error(`No deals configured for ${lesson.id}`);
      const option = group.options[Math.floor(random() * group.options.length)];
      for (const index of group.spots) {
        const spot = spots[index];
        if (!spot) throw new Error(`Missing ${lesson.id} spot ${index + 1}`);
        if (option.board.length !== spot.board.length) {
          throw new Error(`Board length changed in ${lesson.id} spot ${index + 1}`);
        }
        spot.hole = [option.hole[0], option.hole[1]];
        spot.board = [...option.board];
      }
    }
  }

  spots.forEach((spot, index) => assertValidSpot(spot, lesson.id, index));
  return { ...lesson, spots };
}
