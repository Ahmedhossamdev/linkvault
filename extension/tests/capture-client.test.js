import test from 'node:test';
import assert from 'node:assert/strict';
import { startCapture } from '../capture-client.js';
import * as captureClient from '../capture-client.js';
function fixture(response) {
  const calls = [];
  return {calls,api:{tabs:{get:async id => ({id,url:'https://www.linkedin.com/messaging/thread/source/'}),update:async id => calls.push(['focus',id]),sendMessage:async () => {calls.push(['start']);return response;}},scripting:{executeScript:async () => calls.push(['inject'])}}};
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

const recovery = /open.*conversation.*click.*toolbar icon.*from that tab/i;
test('source lookup returns the original conversation tab including its URL',async () => {
  assert.equal(typeof captureClient.getSourceTab,'function');
  const requested = [];
  const tab = {id:7,url:'https://www.linkedin.com/messaging/thread/source/?view=full',windowId:2};
  const api = {tabs:{get:async id => {requested.push(id);return tab;}}};
  assert.equal(await captureClient.getSourceTab(api,7),tab);
  assert.deepEqual(requested,[7]);
});

for (const id of [undefined,null,0,-1,1.5,'7',NaN,Infinity,Number.MAX_SAFE_INTEGER + 1]) {
  test(`invalid source ID ${String(id)} fails before any browser operation`,async () => {
    assert.equal(typeof captureClient.getSourceTab,'function');
    const f = fixture({ok:true});
    f.api.tabs.get = async () => assert.fail('Invalid IDs must not reach tabs.get');
    await assert.rejects(captureClient.getSourceTab(f.api,id),recovery);
    await assert.rejects(startCapture(f.api,id,{auto:true}),recovery);
    assert.deepEqual(f.calls,[]);
  });
}

for (const url of [undefined,'not a URL','https://www.linkedin.com/messaging/',
  'https://www.linkedin.com/messaging/thread/','https://www.linkedin.com/messaging/thread/source/extra',
  'https://linkedin.com/messaging/thread/source/','https://www.linkedin.com.evil.test/messaging/thread/source/',
  'https://example.com/messaging/thread/source/','http://www.linkedin.com/messaging/thread/source/',
  'https://www.linkedin.com:444/messaging/thread/source/','chrome-extension://linkvault/app.html?tab=7']) {
  test(`invalid source URL ${String(url)} never injects or focuses`,async () => {
    const f = fixture({ok:true});
    f.api.tabs.get = async () => ({id:7,url});
    for (const auto of [false,true]) await assert.rejects(startCapture(f.api,7,{auto}),recovery);
    assert.deepEqual(f.calls,[]);
  });
}

test('a closed source tab gives recovery instructions without selecting a replacement',async () => {
  assert.equal(typeof captureClient.getSourceTab,'function');
  const f = fixture({ok:true});
  f.api.tabs.get = async () => {throw new Error('No tab with id: 7.');};
  await assert.rejects(captureClient.getSourceTab(f.api,7),recovery);
  await assert.rejects(startCapture(f.api,7,{auto:false}),recovery);
  assert.deepEqual(f.calls,[]);
});

for (const tab of [undefined,null,{}, {id:7}]) {
  test(`missing tab response ${JSON.stringify(tab)} gives recovery instructions`,async () => {
    const f = fixture({ok:true});
    f.api.tabs.get = async () => tab;
    await assert.rejects(captureClient.getSourceTab(f.api,7),recovery);
    assert.deepEqual(f.calls,[]);
  });
}

test('a full conversation URL without a trailing slash is accepted',async () => {
  const f = fixture({ok:true});
  f.api.tabs.get = async () => ({id:7,url:'https://www.linkedin.com/messaging/thread/source'});
  await startCapture(f.api,7,{auto:false});
  assert.deepEqual(f.calls,[['inject'],['start'],['focus',7]]);
});

test('source closing after manual collection starts gives recovery instructions',async () => {
  const f = fixture({ok:true});
  f.api.tabs.update = async () => {throw new Error('No tab with id: 7.');};
  await assert.rejects(startCapture(f.api,7,{auto:false}),recovery);
  assert.deepEqual(f.calls,[['inject'],['start']]);
});

test('source frame disappearing during injection gives recovery instructions',async () => {
  const f = fixture({ok:true});
  f.api.scripting.executeScript = async () => {throw new Error('No frame with id 0 in tab 7.');};
  await assert.rejects(startCapture(f.api,7,{auto:false}),recovery);
  assert.deepEqual(f.calls,[]);
});

test('unrelated injection failures retain their original error',async () => {
  const f = fixture({ok:true});
  const error = new Error('Could not load file capture.js');
  f.api.scripting.executeScript = async () => {throw error;};
  await assert.rejects(startCapture(f.api,7,{auto:false}),actual => actual === error);
  assert.deepEqual(f.calls,[]);
});

for (const stage of ['focus','inject','start']) {
  test(`source closing during ${stage} reports recovery instructions`,async () => {
    const f = fixture({ok:true});
    const closed = async () => {throw new Error('No tab with id: 7.');};
    if (stage === 'focus') f.api.tabs.update = closed;
    if (stage === 'inject') f.api.scripting.executeScript = closed;
    if (stage === 'start') f.api.tabs.sendMessage = closed;
    await assert.rejects(startCapture(f.api,7,{auto:stage === 'focus'}),recovery);
  });
}

test('source error normalization is available to dashboard actions',() => {
  assert.equal(typeof captureClient.sourceTabError,'function');
  const error = captureClient.sourceTabError(new Error('No tab with id: 7.'));
  assert.ok(error instanceof Error);
  assert.match(error.message,recovery);
});
