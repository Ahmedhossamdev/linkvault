import test from 'node:test';
import assert from 'node:assert/strict';
import { startCapture } from '../capture-client.js';
function fixture(response) {
  const calls = [];
  return {calls,api:{tabs:{update:async id => calls.push(['focus',id]),sendMessage:async () => {calls.push(['start']);return response;}},scripting:{executeScript:async () => calls.push(['inject'])}}};
}
test('manual startup switches to the conversation only after successful collection begins',async () => {
  const f = fixture({ok:true});await startCapture(f.api,7,{auto:false});
  assert.deepEqual(f.calls,[['inject'],['start'],['focus',7]]);
});
test('failed manual startup does not bounce between tabs',async () => {
  const f = fixture({error:'Messages not loaded'});await assert.rejects(startCapture(f.api,7,{auto:false}),/Messages not loaded/);
  assert.deepEqual(f.calls,[['inject'],['start']]);
});
test('automatic startup activates only the original conversation tab',async () => {
  const f = fixture({ok:true});await startCapture(f.api,7,{auto:true});
  assert.deepEqual(f.calls,[['focus',7],['inject'],['start']]);
});
