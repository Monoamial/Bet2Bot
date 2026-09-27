import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLimitLevelObjectives,
  evaluateObjectives,
  maxObjectiveStars,
  SURVIVE_200_OBJECTIVE,
} from "../src/campaign/objectives.ts";

const campaignObjectives = createLimitLevelObjectives(10);

function levelResult(bb100, illegal = 0, overrides = {}) {
  return {
    error: null,
    player_bb100: bb100,
    player_index: 0,
    summary: [{ illegal }],
    ...overrides,
  };
}

function sessionResult(handsSurvived, busted) {
  return {
    ...levelResult(0, 0),
    hands_survived: handsSurvived,
    final_stack: busted ? 0 : 120,
    busted,
  };
}

test("campaign objective keeps the strict >10 gate and scores a stretch tier", () => {
  assert.equal(maxObjectiveStars(campaignObjectives), 2);
  assert.equal(evaluateObjectives(campaignObjectives, levelResult(10, 1)).stars, 0);
  assert.equal(evaluateObjectives(campaignObjectives, levelResult(10.01, 1)).stars, 1);
  assert.equal(evaluateObjectives(campaignObjectives, levelResult(20, 1)).stars, 1);
  assert.equal(evaluateObjectives(campaignObjectives, levelResult(20.01, 1)).stars, 2);
});

test("illegal-action constraints remain measurable without earning campaign stars", () => {
  const legalActionConstraint = [
    {
      id: "legal-actions",
      title: "Legal actions",
      tiers: [
        {
          id: "no-illegal-actions",
          label: "No illegal actions",
          stars: 1,
          checks: [
            {
              id: "illegal-actions-zero",
              label: "Illegal actions = 0",
              metric: "illegalActions",
              comparison: "eq",
              threshold: 0,
            },
          ],
        },
      ],
    },
  ];
  assert.equal(evaluateObjectives(legalActionConstraint, levelResult(0, 0)).stars, 1);
  assert.equal(evaluateObjectives(legalActionConstraint, levelResult(0, 1)).stars, 0);
  assert.equal(evaluateObjectives(legalActionConstraint, levelResult(0, 0, { summary: [] })).stars, 0);
});

test("missing, errored, or empty result criteria never grant campaign stars", () => {
  assert.equal(evaluateObjectives(campaignObjectives, null).stars, 0);
  assert.equal(evaluateObjectives(campaignObjectives, undefined).stars, 0);
  assert.equal(evaluateObjectives(campaignObjectives, levelResult(100, 0, { error: "engine error" })).stars, 0);
  assert.equal(evaluateObjectives(campaignObjectives, { player_bb100: 100, player_index: 0, summary: [{ illegal: 0 }] }).stars, 0);

  const emptyTier = evaluateObjectives([
    { id: "empty", title: "No criteria", tiers: [{ id: "free", label: "Free star", stars: 3, checks: [] }] },
  ], levelResult(100, 0));
  assert.equal(emptyTier.stars, 0);
  assert.equal(emptyTier.maxStars, 3);

  const invalidRate = evaluateObjectives(campaignObjectives, levelResult(Number.NaN, 0));
  assert.equal(invalidRate.stars, 0);
});

test("named survival objective gates on hands and bust status, not bb/100", () => {
  const completed = { ...sessionResult(200, false), player_bb100: -10000 };
  assert.equal(evaluateObjectives([SURVIVE_200_OBJECTIVE], completed).stars, 3);
  assert.equal(evaluateObjectives([SURVIVE_200_OBJECTIVE], sessionResult(250, false)).stars, 3);
  assert.equal(evaluateObjectives([SURVIVE_200_OBJECTIVE], sessionResult(200, true)).stars, 0);
  assert.equal(evaluateObjectives([SURVIVE_200_OBJECTIVE], sessionResult(199, false)).stars, 0);
  assert.equal(evaluateObjectives([SURVIVE_200_OBJECTIVE], levelResult(100, 0)).stars, 0);
});
