import assert from "node:assert/strict";
import test from "node:test";
import { compileStrategy, defaultStrategy } from "../src/strategy/model.ts";

function findRule(policy, predicate) {
  const rule = policy.rules.find(predicate);
  assert.ok(rule, "compiled policy contains the expected rule");
  return rule;
}

test("public current-hand history compiles true and false, while absence stays legacy", () => {
  const strategy = defaultStrategy();
  strategy.flop.advanced = [
    {
      tier: "pair",
      oppRaisedThisHand: true,
      action: "raise",
      mix: { action: "call", frequency: 25 },
    },
    { tier: "nothing", oppRaisedThisHand: false, action: "fold" },
    { tier: "monster", action: "check" },
  ];

  const policy = compileStrategy(strategy).flop;
  const raised = findRule(
    policy,
    (rule) => rule.when.handTier === "pair",
  );
  const notRaised = findRule(
    policy,
    (rule) => rule.when.handTier === "nothing",
  );
  const legacy = findRule(
    policy,
    (rule) => rule.when.handTier === "monster",
  );

  assert.deepEqual(raised, {
    when: { handTier: "pair", oppRaisedThisHand: true },
    action: "raise",
    mix: { action: "call", frequency: 25 },
  });
  assert.deepEqual(notRaised, {
    when: { handTier: "nothing", oppRaisedThisHand: false },
    action: "fold",
  });
  assert.deepEqual(legacy, {
    when: { handTier: "monster" },
    action: "check",
  });
});
