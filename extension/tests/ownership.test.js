import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireOwnership } from '../ownership.js';

test('only one dashboard may own writes until its session ends',async () => {
  let held = false;
  const locks = {async request(name,options,callback) {assert.equal(name,'linkvault-library');assert.equal(options.ifAvailable,true);if (held) return callback(null);held = true;try {return await callback({name});} finally {held = false;}}};
  const first = await acquireOwnership(locks), second = await acquireOwnership(locks);
  assert.equal(first.owned,true);assert.equal(second.owned,false);first.release();await new Promise(resolve => setImmediate(resolve));
  const third = await acquireOwnership(locks);assert.equal(third.owned,true);third.release();
});
test('unsupported ownership API fails closed rather than risking conflicting writes',async () => {
  await assert.rejects(acquireOwnership(undefined),/single-writer/i);
});
