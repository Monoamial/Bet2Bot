import assert from "node:assert/strict";
import test from "node:test";
import { MODULES } from "../src/academy/lessons.ts";
import { RANDOMIZED_SCENARIO_IDS, randomizeScenario } from "../src/academy/randomize.ts";

const scenarios = MODULES.flatMap((module) => module.lessons.filter((lesson) => lesson.kind === "scenario"));
const byId = new Map(scenarios.map((lesson) => [lesson.id, lesson]));
const seeds = Array.from({ length: 1024 }, (_, index) => index);
const expectedSpotVariantCounts = {
  "position-drill": [5, 5, 5, 5, 5, 5],
  "value-drill": [4, 4, 4, 4, 4],
  "discipline-drill": [5, 4, 4, 4],
  "reading-drill": [4, 4, 4, 4],
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
    assert.ok([0, 3, 4, 5].includes(spot.board.length), `${lesson.id} spot ${index + 1}: valid Hold'em street`);
    const cards = [...spot.hole, ...spot.board];
    assert.ok(cards.every((card) => /^[2-9TJQKA][shdc]$/.test(card)), `${lesson.id} spot ${index + 1}: valid card codes`);
    assert.equal(new Set(cards).size, cards.length, `${lesson.id} spot ${index + 1}: no duplicate cards`);
  }
}

function assertNoPairedRanks(spot) {
  const ranks = [...spot.hole, ...spot.board].map(rank);
  assert.equal(new Set(ranks).size, ranks.length);
}

function assertNoMadeStraight(spot) {
  const ranks = new Set([...spot.hole, ...spot.board].map(rankValue));
  const runs = [
    [12, 0, 1, 2, 3],
    ...Array.from({ length: 9 }, (_, start) => Array.from({ length: 5 }, (__, offset) => start + offset)),
  ];
  assert.ok(!runs.some((run) => run.every((value) => ranks.has(value))), "no five-card straight is made");
}

function assertNoFlush(spot) {
  const counts = new Map();
  for (const card of [...spot.hole, ...spot.board]) counts.set(suit(card), (counts.get(suit(card)) ?? 0) + 1);
  assert.ok(Math.max(...counts.values()) < 5, "no five-card flush is made");
}

function assertHighCard(spot) {
  assertNoPairedRanks(spot);
  assertNoMadeStraight(spot);
  assertNoFlush(spot);
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
  assertNoMadeStraight(spot);
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
      assert.match(pairSpot.situation, /pocket pair under one overcard/i);
      assertHighCard(lesson.spots[2]);
      assert.match(lesson.spots[2].situation, /no pair/i);
      assertHighCard(lesson.spots[3]);
      assert.match(lesson.spots[3].situation, /no pair/i);
      assertOpenEndedDraw(lesson.spots[4]);
      assert.match(lesson.spots[4].situation, /open-ended straight draw with eight river cards/i);
      const overpair = lesson.spots[5];
      assert.equal(rank(overpair.hole[0]), rank(overpair.hole[1]));
      assert.ok(overpair.board.every((card) => rankValue(overpair.hole[0]) > rankValue(card)), "pocket pair stays an overpair");
      assert.match(overpair.situation, /overpair/i);
      break;
    }
    case "value-drill": {
      assertTopPairWithKicker(lesson.spots[0]);
      assert.match(lesson.spots[0].situation, /top pair, top kicker/i);
      assertPocketSet(lesson.spots[1]);
      assert.match(lesson.spots[1].situation, /flopped a set/i);
      const missedFlush = lesson.spots[2];
      assertHighCard(missedFlush);
      assert.match(missedFlush.situation, /no pair/i);
      assert.ok(missedFlush.hole.some((card) => rank(card) === "A"), "ace-high is preserved");
      const suitCounts = new Map();
      for (const card of [...missedFlush.hole, ...missedFlush.board]) {
        suitCounts.set(suit(card), (suitCounts.get(suit(card)) ?? 0) + 1);
      }
      assert.ok([...suitCounts.values()].includes(4), "the river leaves a four-card flush draw missed");
      assertTopPairWithKicker(lesson.spots[3]);
      assert.match(lesson.spots[3].situation, /top pair/i);
      assertTopTwoPair(lesson.spots[4]);
      assert.match(lesson.spots[4].situation, /two pair/i);
      break;
    }
    case "reading-drill": {
      const rock = lesson.spots[0];
      assert.equal(rank(rock.hole[0]), rank(rock.hole[1]), "Rock spot has a pocket pair");
      assert.equal(rock.board.filter(card => rankValue(card) > rankValue(rock.hole[0])).length, 2);
      assert.match(rock.situation, /two higher board cards/i);
      const bluffCatch = lesson.spots[1];
      assert.equal(bluffCatch.board.length, 5);
      assert.equal(rank(bluffCatch.hole[0]), rank(bluffCatch.hole[1]), "bluff-catcher is a modest pair");
      assert.match(bluffCatch.situation, /pocket pair/i);
      assert.ok(bluffCatch.board.every(card => rank(card) !== rank(bluffCatch.hole[0])));
      const folder = lesson.spots[2];
      assertHighCard(folder);
      assert.match(folder.situation, /not made a pair/i);
      const trapper = lesson.spots[3];
      assert.equal(trapper.board.length, 4);
      assert.ok(trapper.hole.some(card => rank(card) === rank(trapper.board[0])), "trapper spot keeps top pair");
      assert.match(trapper.situation, /top pair/i);
      break;
    }
    case "discipline-drill": {
      const steal = lesson.spots[0];
      assert.equal(steal.board.length, 0, "the steal remains preflop");
      assert.notEqual(suit(steal.hole[0]), suit(steal.hole[1]), "the steal remains offsuit");
      assert.equal(rank(steal.hole[0]) === rank(steal.hole[1]), false, "the steal remains unpaired");
      assert.match(steal.situation, /non-premium starting hand/i);
      assertTopPairWithKicker(lesson.spots[1]);
      assert.match(lesson.spots[1].situation, /top pair, good kicker/i);
      assertPocketSet(lesson.spots[2]);
      assert.match(lesson.spots[2].situation, /flopped a set/i);
      const highCard = lesson.spots[3];
      assertHighCard(highCard);
      assert.match(highCard.situation, /no pair/i);
      break;
    }
  }
}

function assertCardAgnosticCopy(lesson) {
  const rankHigh = /\b(?:ace|king|queen|jack|ten|nine|eight|seven|six|five|four|three|two)[ -]high\b/i;
  const suitName = /\b(?:hearts?|diamonds?|clubs?|spades?)\b/i;
  const boardTexture = /\b(?:dry|wet|rainbow|connected|monotone|raggedy)\s+(?:board|flop|runout)\b/i;
  const copy = [lesson.title, ...lesson.intro,
    ...lesson.spots.flatMap((spot) => [spot.tag, spot.situation, ...spot.choices.map((choice) => choice.feedback)]),
  ].join(" ");
  assert.doesNotMatch(copy, rankHigh, `${lesson.id}: avoid hard-coded hand ranks`);
  assert.doesNotMatch(copy, suitName, `${lesson.id}: avoid hard-coded suits`);
  assert.doesNotMatch(copy, boardTexture, `${lesson.id}: avoid stale board texture`);
}

test("eligible list names only concept-verified drills; new scenarios can stay authored", () => {
  assert.deepEqual(RANDOMIZED_SCENARIO_IDS, ["position-drill", "value-drill", "discipline-drill", "reading-drill"]);
  assert.ok(scenarios.length >= RANDOMIZED_SCENARIO_IDS.length);
  for (const id of RANDOMIZED_SCENARIO_IDS) assert.ok(byId.has(id));
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
      assertCardAgnosticCopy(first);
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

  const authoredTextureDrill = byId.get("texture-drill");
  const authoredCards = cardSignature(authoredTextureDrill);
  assert.equal(cardSignature(randomizeScenario(authoredTextureDrill, 1)), authoredCards);
  assert.equal(cardSignature(randomizeScenario(authoredTextureDrill, 2)), authoredCards);
});

test("duplicate cards in an incoming drill are rejected instead of being dealt", () => {
  const malformed = structuredClone(byId.get("position-drill"));
  malformed.id = "unlisted-test-drill";
  malformed.spots[0].board[0] = malformed.spots[0].hole[0];
  assert.throws(() => randomizeScenario(malformed, 1), /Duplicate card/);
});

const expectedSpotContext = {
  "position-drill": [
    { position: "in-position" },
    { position: "out-of-position" },
    { position: "in-position" },
    { position: "out-of-position" },
    { position: "in-position" },
    { position: "out-of-position" },
  ],
  "value-drill": Array.from({ length: 5 }, () => ({ opponent: "Caller" })),
  "discipline-drill": [
    { opponent: "Shark", seat: "button" },
    { opponent: "Shark" },
    { opponent: "Shark" },
    { opponent: "Shark" },
  ],
  "reading-drill": [
    { opponent: "Rock" },
    { opponent: "River Bluffer" },
    { opponent: "Over-folder" },
    { opponent: "Trapper" },
  ],
  "texture-drill": [
    { opponent: "Caller" },
    { opponent: "Shark" },
    { opponent: "Caller" },
    { opponent: "Shark" },
  ],
};

test("scenario context labels are explicit only where authored", () => {
  assert.deepEqual([...scenarios.map((lesson) => lesson.id)].sort(), Object.keys(expectedSpotContext).sort());
  for (const [id, expected] of Object.entries(expectedSpotContext)) {
    const lesson = byId.get(id);
    assert.equal(lesson.spots.length, expected.length, `${id}: expected spot count`);
    for (const [index, context] of expected.entries()) {
      const spot = lesson.spots[index];
      assert.equal(spot.opponent, context.opponent, `${id} spot ${index + 1}: opponent`);
      assert.equal(spot.position, context.position, `${id} spot ${index + 1}: position`);
      assert.equal(spot.seat, context.seat, `${id} spot ${index + 1}: seat`);
      assert.equal(spot.stack, undefined, `${id} spot ${index + 1}: no undocumented stack`);
    }
  }
});

test("partial boards are rejected instead of being labeled as a street", () => {
  const source = structuredClone(byId.get("position-drill"));
  source.id = "unlisted-invalid-board-length";
  for (const boardLength of [1, 2]) {
    const malformed = structuredClone(source);
    malformed.spots[0].board = malformed.spots[0].board.slice(0, boardLength);
    assert.throws(() => randomizeScenario(malformed, 1), /Invalid card or board count/);
  }
});
