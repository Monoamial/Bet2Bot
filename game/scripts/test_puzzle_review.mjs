import assert from 'node:assert/strict';
import test from 'node:test';
import {updateReview,dueReview,candidateIds} from '../src/academy/puzzleReview.ts';

test('missed concept returns after other puzzles, then clears on a good answer',()=>{
 const queue=updateReview({},'position/0',false,1);
 assert.equal(queue['position/0'].dueAfter,4);
 assert.equal(dueReview(queue,['position/0','value/0'],3,'value/0'),null);
 assert.equal(dueReview(queue,['position/0','value/0'],4,'value/0'),'position/0');
 assert.equal(dueReview(queue,['position/0'],4,'position/0'),null);
 assert.equal(dueReview(queue,['value/0'],4,'value/0'),null);
 assert.deepEqual(updateReview(queue,'position/0',true,5),{});
});

test('repeated misses space out and updates do not mutate persisted record',()=>{
 const first=updateReview({},'read/2',false,1);
 const second=updateReview(first,'read/2',false,6);
 assert.equal(first['read/2'].misses,1);
 assert.equal(second['read/2'].misses,2);
 assert.equal(second['read/2'].dueAfter,9);
});

test('random selection cannot resurface a queued spot before its review is due',()=>{
 const queue=updateReview({},'pos/0',false,1);
 assert.deepEqual(candidateIds(queue,['pos/0','val/0','val/1'],2,'val/0'),['val/1']);
 assert.deepEqual(candidateIds(queue,['pos/0','val/0','val/1'],4,'val/1'),['pos/0']);
 assert.deepEqual(candidateIds(queue,['pos/0'],2,'pos/0'),['pos/0']); // one-spot topic stays playable
});
