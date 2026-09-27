import assert from "node:assert/strict";
import test from "node:test";
import { MODULES } from "../src/academy/lessons.ts";
import { RANDOMIZED_SCENARIO_IDS, randomizeScenario } from "../src/academy/randomize.ts";

const scenarios = MODULES.flatMap((module) => module.lessons.filter((lesson) => lesson.kind === "scenario"));
const byId = new Map(scenarios.map((lesson) => [lesson.id, lesson]));
const seeds = Array.from({ length: 128 }, (_, index) => index);
const expectedSpotVariantCounts = {
  "position-drill": [5, 5, 5, 5, 5, 5],
  "value-drill": [4, 4, 4, 4, 4],
  "discipline-drill": [5, 4, 4, 4],
};
const rankValue = (card) => "23456789TJQKA".indexOf(card[0]);
const rank = (card) => card[0];
const suit = (card) => card[1];
const cardSignature = (lesson) => lesson.spots
  .map((spot) => `${spot.hole.join(",")}/${spot.board.join(",")}`)
  .join("|");
const stripCards = ({ hole, board, ...rest }) => rest;

function assertValidCards(lesson) {
  for (const [index, spot] of lesson.spots.entries()) {
    assert.equal(spot.hole.length, 2, `${lesson.id} spot ${index + 1}: exactly two hole cards`);
    assert.ok(spot.board.length <= 5, `${lesson.id} spot ${index + 1}: at most five board cards`);
    const cards = [...spot.hole, ...spot.board];
    assert.ok(cards.every((card) => /^[2-9TJQKA][shdc]$/.test(card)), `${lesson.id} spot ${index + 1}: valid card codes`);
    assert.equal(new Set(cards).size, cards.length, `${lesson.id} spot ${index + 1}: no duplicate cards`);
  }
}

function assertNoPairedRanks(spot) {
  const ranks = [...spot.hole, ...spot.board].map(rank);
  assert.equal(new Set(ranks).size, ranks.length);
}

function assertTopPairWithKicker(spot) {
  const holeRanks = spot.hole.map(rank);
  const boardRanks = spot.board.map(rank);
  const pairRank = holeRanks.find((holeRank) => boardRanks.includes(holeRank));
  assert.ok(pairRank, "one hole rank matches the board");
  const kicker = holeRanks.find((holeRank) => holeRank !== pairRank);
  assert.ok(rankValue(kicker) > rankValue(pairRank), "the other hole card is a higher kicker");
  assert.equal(Math.max(...boardRanks.map((value) => rankValue(value))), rankValue(pairRank), "the pair is top pair");
}

function assertPocketSet(spot) {
  assert.equal(rank(spot.hole[0]), rank(spot.hole[1]), "the hole cards are a pocket pair");
  assert.ok(spot.board.some((card) => rank(card) === rank(spot.hole[0])), "the board completes trips");
}

function assertTopTwoPair(spot) {
  const holeRanks = spot.hole.map(rank);
  const boardRanks = spot.board.map(rank);
  assert.notEqual(holeRanks[0], holeRanks[1]);
  assert.ok(holeRanks.every((holeRank) => boardRanks.includes(holeRank)), "each hole rank pairs on board");
  const topTwo = [...new Set(boardRanks)].sort((a, b) => rankValue(b) - rankValue(a)).slice(0, 2);
  assert.deepEqual(new Set(topTwo), new Set(holeRanks), "the hole cards make the board's top two pair");
}

function assertOpenEndedDraw(spot) {
  assert.equal(spot.board.length, 4, "the draw is on the turn");
  const cards = [...spot.hole, ...spot.board];
  const values = new Set(cards.map(rankValue));
  assert.equal(values.size, 6, "no rank is paired");
  const start = [...values].find((candidate) => [1, 2, 3].every((offset) => values.has(candidate + offset)));
  assert.ok(Number.isInteger(start), "four ranks are consecutive");
  const ends = [start - 1, start + 4];
  assert.ok(ends.every((value) => value >= 0 && value <= 12 && !values.has(value)), "both straight ends remain available");
  const availableOuts = ends.reduce((sum, value) => sum + 4 - cards.filter((card) => rankValue(card) === value).length, 0);
  assert.equal(availableOuts, 8, "eight cards complete the open-ended draw");
}

function assertScenarioSemantics(lesson) {
  switch (lesson.id) {
    case "position-drill": {
      for (const [first, second] of [[0, 1], [2, 3]]) {
        assert.deepEqual(lesson.spots[first].hole, lesson.spots[second].hole, "paired seat spots share a hand");
        assert.deepEqual(lesson.spots[first].board, lesson.spots[second].board, "paired seat spots share a board");
      }
      const pairSpot = lesson.spots[0];
      assert.equal(rank(pairSpot.hole[0]), rank(pairSpot.hole[1]));
      assert.equal(pairSpot.board.filter((card) => rankValue(card) > rankValue(pairSpot.hole[0])).length, 1, "exactly one board overcard");
      assertNoPairedRanks(lesson.spots[2]);
      assertOpenEndedDraw(lesson.spots[4]);
      const overpair = lesson.spots[5];
      assert.equal(rank(overpair.hole[0]), rank(overpair.hole[1]));
      assert.ok(overpair.board.every((card) => rankValue(overpair.hole[0]) > rankValue(card)), "pocket pair stays an overpair");
      break;
    }
    case "value-drill": {
      assertTopPairWithKicker(lesson.spots[0]);
      assertPocketSet(lesson.spots[1]);
      const missedFlush = lesson.spots[2];
      assertNoPairedRanks(missedFlush);
      assert.ok(missedFlush.hole.some((card) => rank(card) === "A"), "ace-high is preserved");
      const suitCounts = new Map();
      for (const card of [...missedFlush.hole, ...missedFlush.board]) {
        suitCounts.set(suit(card), (suitCounts.get(suit(card)) ?? 0) + 1);
      }
      assert.ok([...suitCounts.values()].includes(4), "the river leaves a four-card flush draw missed");
      assertTopPairWithKicker(lesson.spots[3]);
      assertTopTwoPair(lesson.spots[4]);
      break;
    }
    case "discipline-drill": {
      const steal = lesson.spots[0];
      assert.equal(steal.board.length, 0, "the steal remains preflop");
      assert.notEqual(suit(steal.hole[0]), suit(steal.hole[1]), "the steal remains offsuit");
      assert.equal(rank(steal.hole[0]) === rank(steal.hole[1]), false, "the steal remains unpaired");
      assertTopPairWithKicker(lesson.spots[1]);
      assertPocketSet(lesson.spots[2]);
      const aceHigh = lesson.spots[3];
      assert.ok(aceHigh.hole.some((card) => rank(card) === "A"), "the river decision remains ace-high");
      assertNoPairedRanks(aceHigh);
      break;
    }
  }
}

test("eligible lesson list is explicit and limited to current scenario drills", () => {
  assert.deepEqual(RANDOMIZED_SCENARIO_IDS, ["position-drill", "value-drill", "discipline-drill"]);
  assert.equal(scenarios.length, RANDOMIZED_SCENARIO_IDS.length);
});

for (const id of RANDOMIZED_SCENARIO_IDS) {
  test(`${id}: seeded variants are deterministic, replay-safe, and preserve answer logic`, () => {
    const source = byId.get(id);
    assert.ok(source, `lesson ${id} exists`);
    const original = structuredClone(source);
    const signatures = new Set();
    const perSpotVariants = source.spots.map(() => new Set());

    for (const seed of seeds) {
      const first = randomizeScenario(source, seed);
      const replay = randomizeScenario(source, seed);
      assert.deepEqual(replay, first, `same seed ${seed} reproduces the same deal`);
      assertValidCards(first);
      assertScenarioSemantics(first);
      assert.deepEqual(first.spots.map(stripCards), source.spots.map(stripCards), "copy, stage, pot, and choices are unchanged");
      assert.deepEqual(first.spots.map((spot) => spot.board.length), source.spots.map((spot) => spot.board.length), "street/board length is unchanged");
      signatures.add(cardSignature(first));
      first.spots.forEach((spot, index) => perSpotVariants[index].add(`${spot.hole.join(",")}/${spot.board.join(",")}`));
    }

    assert.deepEqual(source, original, "randomization never mutates the authored lesson");
    assert.ok(signatures.size > 1, "different seeds produce different complete deals");
    for (const [index, variants] of perSpotVariants.entries()) {
      assert.equal(variants.size, expectedSpotVariantCounts[id][index], `spot ${index + 1} reaches every curated variant`);
    }
  });
}

test("unlisted scenario IDs keep their authored deals", () => {
  const unlisted = structuredClone(byId.get("position-drill"));
  unlisted.id = "unlisted-test-drill";
  const original = cardSignature(unlisted);
  assert.equal(cardSignature(randomizeScenario(unlisted, 1)), original);
  assert.equal(cardSignature(randomizeScenario(unlisted, 2)), original);
});

test("duplicate cards in an incoming drill are rejected instead of being dealt", () => {
  const malformed = structuredClone(byId.get("position-drill"));
  malformed.id = "unlisted-test-drill";
  malformed.spots[0].board[0] = malformed.spots[0].hole[0];
  assert.throws(() => randomizeScenario(malformed, 1), /Duplicate card/);
});
