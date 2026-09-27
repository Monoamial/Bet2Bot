import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLessonBridge, defaultStrategy, compileStrategy } from '../src/strategy/model.ts';

test('value lesson adds only the strong first-to-act value bets', () => {
  const original=defaultStrategy();
  original.flop.table.nothing.first='call';
  const snapshot=structuredClone(original);
  const {strategy,description}=applyLessonBridge(original,'value-bridge');
  assert.ok(description?.includes('Value rule'));
  assert.deepEqual(original,snapshot,'source strategy unchanged');
  assert.equal(strategy.flop.table.nothing.first,'call');
  for(const street of ['flop','turn','river']) {
    for(const tier of ['pair','monster','twoPairPlus']) {
      assert.equal(strategy[street].table[tier].first,'raise');
      assert.equal(compileStrategy(strategy)[street].rules.find(r=>r.when.handTier===tier && r.when.facingBet===false)?.action,'raise');
    }
  }
});
test('discipline bridge preserves preflop grid and value rules', () => {
  const current=applyLessonBridge(defaultStrategy(),'value-bridge').strategy;
  const {strategy}=applyLessonBridge(current,'discipline-bridge');
  assert.deepEqual(strategy.preflop,current.preflop);
  for(const street of ['flop','turn','river']) {
    assert.equal(strategy[street].table.pair.first,'raise');
    assert.equal(strategy[street].table.pair.facing,'fold');
  }
});
test('basic bridge is navigation only', () => {
  const original=defaultStrategy();
  const result=applyLessonBridge(original,'bridge-campaign');
  assert.equal(result.strategy,original);
  assert.equal(result.description,null);
});
