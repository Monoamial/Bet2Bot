import assert from 'node:assert/strict';
import test from 'node:test';
import { compileStrategy } from '../src/strategy/model.ts';
import {
  BUILD_LAB_PRESETS,
  createBuildLabBot,
  createBuildLabPreset,
  loadBuildLabBot,
  saveBuildLabBot,
} from '../src/buildlab/policies.ts';

const streets = ['flop', 'turn', 'river'];
const tiers = ['monster', 'twoPairPlus', 'pair', 'nothing'];

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test('Build Lab offers separate Builder-data policies based on existing styles', () => {
  assert.deepEqual(BUILD_LAB_PRESETS.map(({ id }) => id), ['starter', 'tight', 'loose', 'caller', 'folder', 'value']);
  for (const id of ['starter', 'tight', 'loose', 'caller', 'folder', 'value']) {
    const strategy = createBuildLabPreset(id);
    assert.equal(Object.keys(strategy.preflop).length, 169);
    assert.ok(compileStrategy(strategy).preflop);
  }

  const starter = createBuildLabPreset('starter');
  const tight = createBuildLabPreset('tight');
  const loose = createBuildLabPreset('loose');
  assert.equal(starter.preflop.AA, 'call');
  assert.notDeepEqual(tight.preflop, loose.preflop);
  assert.equal(tight.preflop['87o'], 'fold');
  assert.equal(loose.preflop['87o'], 'call');
});

test('caller, folder, and value presets compile to their intended postflop actions', () => {
  const caller = createBuildLabPreset('caller');
  const folder = createBuildLabPreset('folder');
  const value = createBuildLabPreset('value');

  for (const street of streets) {
    for (const tier of tiers) {
      assert.equal(caller[street].table[tier].first, 'check');
      assert.equal(caller[street].table[tier].facing, 'call');
      assert.equal(folder[street].table[tier].first, 'check');
      assert.equal(folder[street].table[tier].facing, 'fold');
    }
    for (const tier of ['monster', 'twoPairPlus', 'pair']) {
      assert.equal(value[street].table[tier].first, 'raise');
      assert.equal(value[street].table[tier].facing, 'raise');
    }
    assert.equal(value[street].table.nothing.first, 'check');
    assert.equal(value[street].table.nothing.facing, 'call');

    const compiled = compileStrategy(value)[street];
    assert.equal(compiled.rules.find(rule => rule.when.handTier === 'pair' && rule.when.facingBet === true).action, 'raise');
  }
});

test('Bot A and Bot B persist independently and restore cloned Builder strategies', () => {
  const storage = memoryStorage();
  const botA = createBuildLabBot('value');
  const botB = createBuildLabBot('caller');
  botA.strategy.flop.table.pair.first = 'check';
  botA.strategy.flop.table.pair.firstMix = { action: 'raise', frequency: 25, raiseSize: 'small' };
  saveBuildLabBot('a', botA, storage);
  saveBuildLabBot('b', botB, storage);

  const loadedA = loadBuildLabBot('a', 'starter', storage);
  const loadedB = loadBuildLabBot('b', 'starter', storage);
  assert.equal(loadedA.preset, 'value');
  assert.equal(loadedA.strategy.flop.table.pair.first, 'check');
  assert.deepEqual(loadedA.strategy.flop.table.pair.firstMix, { action: 'raise', frequency: 25, raiseSize: 'small' });
  assert.equal(loadedB.preset, 'caller');
  assert.equal(loadedB.strategy.flop.table.pair.facing, 'call');

  loadedA.strategy.flop.table.pair.facing = 'fold';
  assert.equal(loadBuildLabBot('a', 'starter', storage).strategy.flop.table.pair.facing, 'raise');
  assert.equal(loadBuildLabBot('b', 'starter', storage).strategy.flop.table.pair.facing, 'call');
});

test('missing or malformed saved policies fall back without breaking the lab', () => {
  const storage = memoryStorage();
  assert.equal(loadBuildLabBot('a', 'value', storage).preset, 'value');
  storage.setItem('b2b.buildLab.botA.v1', '{not json');
  assert.equal(loadBuildLabBot('a', 'tight', storage).preset, 'tight');
  storage.setItem('b2b.buildLab.botB.v1', JSON.stringify({ preset: 'starter', strategy: {} }));
  assert.equal(loadBuildLabBot('b', 'caller', storage).preset, 'caller');
});
