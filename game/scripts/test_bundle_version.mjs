import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bundleEngine } from './bundle_engine.mjs';

test('engine manifest fingerprint is deterministic and depends on every Python file',()=>{
  bundleEngine();
  const manifest=JSON.parse(readFileSync(new URL('../public/engine/manifest.json',import.meta.url),'utf8'));
  const hash=createHash('sha256');
  for(const name of manifest.files){
    hash.update(name).update('\0').update(readFileSync(new URL(`../public/engine/${name}`,import.meta.url)));
  }
  assert.match(manifest.version,/^[0-9a-f]{12}$/);
  assert.equal(manifest.version,hash.digest('hex').slice(0,12));
  bundleEngine();
  const again=JSON.parse(readFileSync(new URL('../public/engine/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(again,manifest);
});
