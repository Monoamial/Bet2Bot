import assert from "node:assert/strict";
import test from "node:test";
import { compileStrategy, defaultStrategy } from "../src/strategy/model.ts";

function findRule(policy, predicate) {
  const rule = policy.rules.find(predicate);
  assert.ok(rule, "compiled policy contains the expected rule");
  return rule;
}

test("legacy raise policies compile without changing their action-only shape", () => {
  const policy = compileStrategy(defaultStrategy());
  const monsterFacing = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "monster" && rule.when.facingBet === true,
  );

  assert.deepEqual(monsterFacing, {
    when: { handTier: "monster", facingBet: true },
    action: "raise",
  });
  assert.equal(policy.flop.default, "check");
});

test("base and advanced sized raises compile as optional rule metadata", () => {
  const strategy = defaultStrategy();
  strategy.flop.table.monster.first = "raise";
  strategy.flop.table.monster.firstRaiseSize = "small";
  strategy.flop.table.pair.facing = "raise";
  strategy.flop.table.pair.facingRaiseSize = "overbet";
  strategy.flop.advanced = [
    { tier: "pair", position: "ip", action: "raise", raiseSize: "pot" },
    { tier: "nothing", action: "call", raiseSize: "overbet" },
  ];

  const policy = compileStrategy(strategy);
  const firstAction = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "monster" && rule.when.facingBet === false,
  );
  const facingAction = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "pair" && rule.when.facingBet === true,
  );
  const advancedRaise = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "pair" && rule.when.position === "ip",
  );
  const advancedCall = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "nothing",
  );

  assert.deepEqual(firstAction, {
    when: { handTier: "monster", facingBet: false },
    action: "raise",
    raiseSize: "small",
  });
  assert.deepEqual(facingAction, {
    when: { handTier: "pair", facingBet: true },
    action: "raise",
    raiseSize: "overbet",
  });
  assert.deepEqual(advancedRaise, {
    when: { handTier: "pair", position: "ip" },
    action: "raise",
    raiseSize: "pot",
  });
  assert.deepEqual(advancedCall, {
    when: { handTier: "nothing" },
    action: "call",
  });
});

test("preflop raise size is optional and preserves the 169-class legacy grid", () => {
  const strategy = defaultStrategy();
  strategy.preflop.AA = "raise";
  assert.equal(compileStrategy(strategy).preflopRaiseSize, undefined);
  strategy.preflopRaiseSize = "small";
  const compiled = compileStrategy(strategy);
  assert.equal(compiled.preflopRaiseSize, "small");
  assert.equal(compiled.preflop.AA, "raise");
  assert.equal(Object.keys(compiled.preflop).length, 170 - 1);
});

test("mixed base-table and advanced actions compile as optional weighted choices", () => {
  const strategy = defaultStrategy();
  strategy.flop.table.monster.first = "raise";
  strategy.flop.table.monster.firstMix = { action: "check", frequency: 30 };
  strategy.flop.table.monster.facing = "call";
  strategy.flop.table.monster.facingMix = {
    action: "raise", frequency: 20, raiseSize: "small",
  };
  strategy.flop.advanced = [
    { tier: "pair", action: "raise", mix: { action: "call", frequency: 35 } },
    { tier: "nothing", action: "check", mix: { action: "check", frequency: 40 } },
    { tier: "twoPairPlus", action: "call", mix: { action: "raise", frequency: 100 } },
  ];

  const policy = compileStrategy(strategy);
  const firstMix = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "monster" && rule.when.facingBet === false,
  );
  const facingMix = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "monster" && rule.when.facingBet === true,
  );
  const advancedMix = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "pair",
  );
  const duplicateAction = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "nothing",
  );
  const endpointFrequency = findRule(
    policy.flop,
    (rule) => rule.when.handTier === "twoPairPlus",
  );

  assert.deepEqual(firstMix, {
    when: { handTier: "monster", facingBet: false },
    action: "raise",
    mix: { action: "check", frequency: 30 },
  });
  assert.deepEqual(facingMix, {
    when: { handTier: "monster", facingBet: true },
    action: "call",
    mix: { action: "raise", frequency: 20, raiseSize: "small" },
  });
  assert.deepEqual(advancedMix, {
    when: { handTier: "pair" },
    action: "raise",
    mix: { action: "call", frequency: 35 },
  });
  assert.equal(duplicateAction.mix, undefined, "the alternate must differ from the main action");
  assert.equal(endpointFrequency.mix, undefined, "both choices must have a nonzero frequency");
});
