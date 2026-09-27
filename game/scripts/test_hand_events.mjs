import assert from 'node:assert/strict';
import test from 'node:test';
import {actionLabel} from '../src/util/handEvents.ts';

test('action labels distinguish raise-to street totals from newly added chips',()=>{
 const e={type:'action',action:'raise',amount:7,raise_to:12};
 assert.equal(actionLabel(e),'raises to 12');
 assert.equal(actionLabel({...e,raise_to:undefined}),'raises 7');
 assert.equal(actionLabel({...e,all_in:true}),'raises all-in to 12');
 assert.equal(actionLabel({...e,action:'call',amount:3,all_in:true}),'calls all-in for 3');
 assert.equal(actionLabel({...e,action:'call',amount:3,all_in:false}),'calls 3');
 assert.equal(actionLabel({...e,action:'check'}),'checks');
});
