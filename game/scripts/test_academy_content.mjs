import assert from 'node:assert/strict';
import test from 'node:test';
import { MODULES } from '../src/academy/lessons.ts';
import { randomizeScenario } from '../src/academy/randomize.ts';

const allIds = MODULES.flatMap(m => m.lessons.map(l => `${m.id}/${l.id}`));

test('all Academy lesson IDs are unique and scenario cards valid across modules', () => {
  assert.equal(new Set(allIds).size, allIds.length);
  for (const module of MODULES) {
    for (const lesson of module.lessons) {
      if (lesson.kind === 'scenario') {
        const dealt = randomizeScenario(lesson, 101);
        assert.equal(dealt.spots.length, lesson.spots.length);
        for (const spot of dealt.spots) assert.equal(spot.choices.filter(c => c.verdict === 'good').length, 1);
      }
      if (lesson.kind === 'sizing') {
        for (const spot of lesson.spots) {
          const cards = [...spot.hole,...spot.board];
          assert.equal(new Set(cards).size, cards.length);
          assert.ok(spot.stack > 0 && spot.pot > 0 && spot.toCall >= 0);
          assert.equal(spot.choices.filter(c=>c.verdict==='good').length,1);
        }
      }
    }
  }
});

test('introductory sizing lesson uses mathematically sound prices', () => {
  const sizing=MODULES.find(m=>m.id==='sizing');
  assert.ok(sizing);
  const drill=sizing.lessons.find(l=>l.id==='size-drill');
  assert.equal(drill.kind,'sizing');
  const [value, bluff, draw]=drill.spots;
  assert.equal(value.pot,20); assert.equal(15/value.pot,.75);
  assert.equal(bluff.pot,10); assert.equal(5/(bluff.pot+5),1/3);
  assert.equal(draw.toCall/(draw.pot+draw.toCall),.25);
  assert.ok(9/46 < .25);
});

test('board-texture spots really have the hole-card suits described in the lesson', () => {
  const module = MODULES.find(m=>m.id==='board-texture');
  const drill = module.lessons.find(l=>l.id==='texture-drill');
  assert.equal(drill.kind,'scenario');
  const [dry, wet, turn, river] = drill.spots;
  assert.equal(new Set(dry.board.map(card=>card[1])).size,3,'dry board is rainbow');
  assert.ok(wet.board.every(card=>card[1]==='h'),'wet flop is three hearts');
  assert.ok(wet.hole.every(card=>card[1]!=='h'),'hero truly lacks a heart');
  assert.equal(turn.board.filter(card=>card[1]==='h').length,3,'turn completes third heart');
  assert.equal(river.board.filter(card=>card[1]==='h').length,4,'river completes fourth heart');
  assert.ok(river.hole.every(card=>card[1]!=='h'),'hero holds no heart');
});
