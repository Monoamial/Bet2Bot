import assert from 'node:assert/strict';
import test from 'node:test';
import {drillStars, attemptStars, bestStars} from '../src/academy/mastery.ts';

test('drill mastery reflects correct fraction; completion alone still gets a star', () => {
  assert.equal(drillStars(6,6),3);
  assert.equal(drillStars(5,6),2);
  assert.equal(drillStars(3,6),1);
  assert.equal(drillStars(0,6),1);
  assert.equal(drillStars(0,0),0);
});
test('quiz/hand mastery rewards first tries and never regresses stored best', () => {
  assert.equal(attemptStars(0,'good'),3);
  assert.equal(attemptStars(1,'good'),2);
  assert.equal(attemptStars(4,'good'),1);
  assert.equal(attemptStars(0,'ok'),1);
  assert.equal(bestStars(3,1),3);
  assert.equal(bestStars(1,3),3);
});
