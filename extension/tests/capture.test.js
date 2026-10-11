import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../capture.js',import.meta.url),'utf8');
function fixture() {
  let callback, observer, timer, elapsed = 0, interval = 2000, widgetStop;
  const widgetUpdates = [];
  const messages = [], replies = [];
  const body = {innerText:'First link',textContent:'First link',getClientRects:() => [1],querySelectorAll:() => [{href:'https://example.com/first',textContent:'First'}]};
  const event = {textContent:'First link',getAttribute:() => 'one',querySelector:selector => selector.includes('__body') ? body : null};
  const root = {isConnected:true,scrollHeight:1000,clientHeight:100,scrollTop:500,parentElement:null,getClientRects:() => [1],closest:() => null,contains:el => el === body,querySelectorAll:selector => selector.includes('__body') ? [body] : [event]};
  body.parentElement = root;body.closest = () => event;
  const document = {querySelectorAll:selector => selector.includes('__body') ? [body] : [root],body:{},documentElement:{}};
  const context = vm.createContext({document,location:{href:'https://www.linkedin.com/messaging/thread/one/'},
    getComputedStyle:() => ({overflowY:'scroll',visibility:'visible',display:'block'}),Event:class{},
    Date:{now:() => elapsed},
    LinkVaultProgress:{createWidget:(document,onStop) => {widgetStop = onStop;return {update:stats => widgetUpdates.push({...stats}),remove(){}};}},
    setInterval:(fn,delay) => {timer = fn;interval = delay;return 1;},clearInterval:() => {timer = null;},
    MutationObserver:class {constructor(fn){observer = fn;}observe(){}disconnect(){observer = null;}},
    chrome:{runtime:{onMessage:{addListener:fn => {callback = fn;}},sendMessage:async message => {messages.push(message);return {ok:true,totalLinks:new Set(messages.flatMap(m => (m.links || []).map(item => item.url))).size};}}},
  });
  root.dispatchEvent = () => {};
  vm.runInContext(script,context);
  return {root,event,body,document,context,messages,replies,widgetUpdates,async widgetStop(){widgetStop();await new Promise(resolve => setImmediate(resolve));},async command(message){callback(message,{},reply => replies.push(reply));await new Promise(resolve => setImmediate(resolve));return replies.at(-1);},async tick(){elapsed += interval;timer?.();await new Promise(resolve => setImmediate(resolve));},async mutate(){observer?.();await new Promise(resolve => setImmediate(resolve));},get timer(){return timer;},get interval(){return interval;}};
}
test('manual capture never scrolls and Stop saves the final loaded links',async () => {
  const f = fixture();
  assert.equal((await f.command({type:'start',auto:false,runId:1})).ok,true);
  await f.tick();assert.equal(f.root.scrollTop,500);
  f.body.querySelectorAll = () => [{href:'https://example.com/second',textContent:'Second'}];
  await f.mutate();await f.command({type:'stop'});
  const urls = f.messages.flatMap(message => message.links.map(item => item.url));
  assert.ok(urls.includes('https://example.com/first'));assert.ok(urls.includes('https://example.com/second'));
  assert.equal(f.messages.at(-1).running,false);assert.equal(f.timer,null);
});
test('automatic capture scrolls only the conversation and pauses at idle top',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});
  assert.equal(f.root.scrollTop,420);await f.tick();assert.equal(f.root.scrollTop,340);
  f.root.scrollTop = 0;
  for (let i = 0; i < 43; i++) await f.tick();
  assert.equal(f.timer,null);assert.equal(f.messages.at(-1).running,false);
  assert.match(f.messages.at(-1).status,/does not guarantee complete history/);
});
test('automatic capture does not count repeated messages as idle while above top',async () => {
  const f = fixture();f.root.scrollTop = 100000;
  await f.command({type:'start',auto:true,runId:1});
  for (let i = 0; i < 20; i++) await f.tick();
  assert.ok(f.timer);await f.command({type:'stop'});
});
test('changing the source conversation terminates capture',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});
  f.context.location.href = 'https://www.linkedin.com/messaging/thread/two/';
  await f.tick();assert.equal(f.timer,null);assert.match(f.messages.at(-1).status,/Conversation changed/);
});
test('collector stops if its dashboard can no longer acknowledge storage',async () => {
  const f = fixture();f.context.chrome.runtime.sendMessage = async () => ({error:'Storage full'});
  await f.command({type:'start',auto:true,runId:1});assert.equal(f.timer,null);
});
test('automatic collection reaches its time limit even with fresh messages',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});
  for (let i = 0; i < 800; i++) {f.body.innerText = `Message ${i}`;f.root.scrollTop = 500;await f.tick();}
  assert.equal(f.timer,null);assert.match(f.messages.at(-1).status,/10-minute limit/);
});
test('message-list-content layout is recognized even without the legacy containers',async () => {
  const f = fixture();
  f.document.querySelectorAll = selector => selector.includes('__body') ? [f.body] : selector.includes('.msg-s-message-list-content') ? [f.root] : [];
  assert.equal((await f.command({type:'start',auto:true,runId:1})).ok,true);
  assert.equal(f.root.scrollTop,420);
});
test('full messaging conversation takes precedence over a floating chat',async () => {
  const f = fixture();
  const floating = {...f.root,closest:selector => selector.includes('overlay') ? {} : null};
  f.root.closest = selector => selector.includes('main') ? {} : null;
  f.document.querySelectorAll = selector => selector.includes('__body') ? [f.body] : [f.root,floating];
  assert.equal((await f.command({type:'start',auto:true,runId:1})).ok,true);
  assert.equal(f.root.scrollTop,420);assert.equal(floating.scrollTop,500);
});
test('unknown container classes can be located from message bodies and their scroll parent',async () => {
  const f = fixture();
  f.document.querySelectorAll = selector => selector.includes('__body') ? [f.body] : [];
  assert.equal((await f.command({type:'start',auto:true,runId:1})).ok,true);
  assert.equal(f.root.scrollTop,420);
});
test('missing and ambiguous conversations have different diagnostic messages',async () => {
  const f = fixture();f.document.querySelectorAll = () => [];
  assert.match((await f.command({type:'start',auto:true,runId:1})).error,/No conversation messages found/);
  const other = {...f.root,contains:el => el === f.body};
  f.document.querySelectorAll = selector => selector.includes('__body') ? [f.body] : [f.root,other];
  assert.match((await f.command({type:'start',auto:true,runId:2})).error,/Multiple conversation lists/);
});
test('automatic collection moves immediately without waiting for its timer',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});
  assert.equal(f.root.scrollTop,420);
});
test('reversed conversations move toward older messages using negative scroll positions',async () => {
  const f = fixture();let position = 0;
  Object.defineProperty(f.root,'scrollTop',{get:() => position,set:value => {position = Math.max(-900,Math.min(0,value));}});
  f.context.getComputedStyle = () => ({overflowY:'auto',visibility:'visible',display:'flex',flexDirection:'column-reverse'});
  await f.command({type:'start',auto:true,runId:1});
  assert.equal(position,-80);await f.tick();assert.equal(position,-160);
});
test('programmatically scrollable hidden-overflow containers are supported',async () => {
  const f = fixture();f.context.getComputedStyle = () => ({overflowY:'hidden',visibility:'visible',display:'block'});
  await f.command({type:'start',auto:true,runId:1});
  assert.equal(f.root.scrollTop,420);
});
test('a nonmoving inner scroll candidate falls back to its conversation ancestor',async () => {
  const f = fixture();
  Object.defineProperty(f.root,'scrollTop',{get:() => 500,set:() => {}});
  const parent = {...f.root,scrollTop:500,parentElement:null};f.root.parentElement = parent;
  await f.command({type:'start',auto:true,runId:1});
  assert.equal(parent.scrollTop,420);
});
test('blocked scrolling reports failure instead of pretending to load messages',async () => {
  const f = fixture();Object.defineProperty(f.root,'scrollTop',{get:() => 500,set:() => {}});
  const response = await f.command({type:'start',auto:true,runId:1});
  assert.match(response.error,/did not move/);assert.equal(f.timer,null);
});
test('scroll diagnostics contain layout fields but never private message text',async () => {
  const f = fixture();f.body.innerText = 'PRIVATE MESSAGE';
  await f.command({type:'start',auto:false,runId:1});
  const response = await f.command({type:'diagnostics'});
  assert.equal(response.diagnostics.mode,'manual');
  assert.equal(response.diagnostics.scrollContainers[0].scrollTop,500);
  assert.ok(!JSON.stringify(response).includes('PRIVATE MESSAGE'));
});
test('automatic scrolling defaults to a faster 750 ms cadence',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});
  assert.equal(f.interval,750);
});
test('gentle speed remains selectable',async () => {
  const f = fixture();await f.command({type:'start',auto:true,intervalMs:2000,runId:1});
  assert.equal(f.interval,2000);
});
test('fast cadence still waits thirty seconds for slow history loading',async () => {
  const f = fixture();await f.command({type:'start',auto:true,intervalMs:750,runId:1});
  f.root.scrollTop = 0;
  for (let i = 0; i < 39; i++) await f.tick();
  assert.ok(f.timer);
  for (let i = 0; i < 3; i++) await f.tick();
  assert.equal(f.timer,null);
});
test('live progress tracks elapsed time, real scrolls, and acknowledged saved links',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});
  await f.tick();
  const stats = f.messages.at(-1).progress;
  assert.equal(stats.phase,'scrolling');assert.equal(stats.elapsedMs,750);assert.equal(stats.scrollSteps,2);
  assert.equal(f.widgetUpdates.at(-1).totalLinks,1);
});
test('waiting is visible without claiming that new history is loading',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});f.root.scrollTop = 0;await f.tick();
  assert.equal(f.widgetUpdates.at(-1).phase,'waiting');
});
test('in-page Stop flushes the last links and freezes the elapsed timer',async () => {
  const f = fixture();await f.command({type:'start',auto:true,runId:1});await f.tick();
  f.body.querySelectorAll = () => [{href:'https://example.com/second',textContent:'Second'}];
  await f.widgetStop();
  const stopped = f.widgetUpdates.at(-1);
  assert.equal(stopped.running,false);assert.equal(stopped.phase,'stopped');assert.equal(stopped.totalLinks,2);
  await f.tick();
  const diagnostics = await f.command({type:'diagnostics'});
  assert.equal(diagnostics.diagnostics.progress.elapsedMs,stopped.elapsedMs);
});
test('failed saving marks the visible indicator as interrupted',async () => {
  const f = fixture();f.context.chrome.runtime.sendMessage = async () => ({error:'Storage full'});
  await f.command({type:'start',auto:true,runId:1});
  assert.equal(f.widgetUpdates.at(-1).phase,'error');assert.equal(f.widgetUpdates.at(-1).running,false);
});
