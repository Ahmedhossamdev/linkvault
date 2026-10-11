// Dependency-free CDP fixture checks. No LinkedIn account or requests are used.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../',import.meta.url));
const executable = process.env.LINKVAULT_BROWSER || 'chromium';
const origin = pathToFileURL(root).href.replace(/\/$/,'');
let browser;
const shim = `
  globalThis.messages = []; globalThis.listeners = []; globalThis.saved = {};
  globalThis.chrome = {
    runtime:{onMessage:{addListener(fn){listeners.push(fn)}},async sendMessage(msg){messages.push(msg);return {ok:true}}},
    storage:{local:{async get(){return saved},async set(data){Object.assign(saved,data)}}},
    permissions:{async request(){return true}},
    tabs:{onRemoved:{addListener(){}},onUpdated:{addListener(){}},async get(){return {url:'https://www.linkedin.com/messaging/thread/test/'}},async sendMessage(){return {ok:true}},async update(){}},
    scripting:{async executeScript(){}},
  };
  globalThis.confirm = () => true;
  URL.createObjectURL = blob => {globalThis.downloadBlob = blob;return 'blob:fixture'};
  HTMLAnchorElement.prototype.click = function(){globalThis.downloadName = this.download};
`;
try {
  browser = spawn(executable,['--no-sandbox','--headless','--disable-gpu','--allow-file-access-from-files','--remote-debugging-pipe','about:blank'],{stdio:['ignore','ignore','pipe','pipe','pipe']});
  let id = 0; const pending = new Map();
  let buffer = '', stderr = '';
  browser.stderr.on('data',data => {stderr += data;});
  const fail = error => {for (const task of pending.values()) {clearTimeout(task.timeout);task.reject(error);} pending.clear();};
  browser.on('error',fail);
  browser.stdio[3].on('error',error => fail(new Error(`${error.message}: ${stderr.slice(-1500)}`)));
  browser.on('exit',code => fail(new Error(`Browser exited (${code}): ${stderr.slice(-1500)}`)));
  function receive(raw) {
    const message = JSON.parse(raw);
    if (!message.id) return;
    const task = pending.get(message.id); if (!task) return;
    pending.delete(message.id);clearTimeout(task.timeout);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  }
  browser.stdio[4].on('data',data => {
    buffer += data.toString();
    let boundary;
    while ((boundary = buffer.indexOf('\0')) >= 0) {const raw = buffer.slice(0,boundary);buffer = buffer.slice(boundary + 1);if (raw) receive(raw);}
  });
  const send = (method,params = {},sessionId) => new Promise((resolve,reject) => {
    const taskId = ++id;
    const timeout = setTimeout(() => {pending.delete(taskId);reject(new Error(`CDP timeout: ${method}`));},10000);
    pending.set(taskId,{resolve,reject,timeout});
    browser.stdio[3].write(JSON.stringify({id:taskId,method,params,...(sessionId ? {sessionId} : {})}) + '\0');
  });
  const {targetId} = await send('Target.createTarget',{url:'about:blank'});
  const {sessionId} = await send('Target.attachToTarget',{targetId,flatten:true});
  const cdp = (method,params) => send(method,params,sessionId);
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:shim});
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate',{expression:expression.replace("import('/import.js')",`import(${JSON.stringify(origin + '/import.js')})`),awaitPromise:true,returnByValue:true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await cdp('Page.navigate',{url:origin + '/app.html?tab=1'});
  for (let i = 0; i < 50; i++) {
    if (await evaluate('!!document.getElementById("file")?.onchange')) break;
    await new Promise(resolve => setTimeout(resolve,100));
  }
  const importResult = await evaluate(`(async () => {
    await document.getElementById('walkthrough-skip').onclick();
    document.getElementById('tab-collect').click();
    const html = '<div class="msg-s-message-list__event"><div class="msg-s-event-listitem__body"><a href="https://example.com/postgres">Postgres [notes]</a><script>globalThis.pwned=true</script></div></div><a href="https://unrelated.example">Outside</a>';
    const dt = new DataTransfer();dt.items.add(new File([html],'chat.html',{type:'text/html'}));
    document.getElementById('file').files=dt.files; document.getElementById('file').dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r,100));
    return {count:document.querySelectorAll('.link-row').length,pwned:!!globalThis.pwned,status:document.getElementById('status').textContent,saved:saved.library.items.length};
  })()`);
  assert.equal(importResult.count,1);assert.equal(importResult.saved,1);assert.equal(importResult.pwned,false);
  assert.match(importResult.status,/Imported 1/);
  await evaluate(`document.getElementById('tab-library').click()`);
  const compact = await evaluate(`(() => {
    const anchor = document.querySelector('.article-title');
    anchor.textContent = 'One customer backfills 500K events into your Kafka topic. '.repeat(8);
    const style = getComputedStyle(anchor);
    return {height:anchor.getBoundingClientRect().height,lineHeight:parseFloat(style.lineHeight),fontSize:parseFloat(style.fontSize),clamp:style.webkitLineClamp,url:document.querySelector('.article-url').textContent};
  })()`);
  assert.equal(compact.clamp,'2');assert.ok(compact.height <= compact.lineHeight * 2 + 1);assert.ok(compact.fontSize <= 18);assert.equal(compact.url,'https://example.com/postgres');
  await evaluate(`document.querySelector('.article-title').textContent='Postgres [notes]'`);
  await evaluate(`document.querySelector('.topic').value='my-topic';document.querySelector('.topic').dispatchEvent(new Event('change'));document.getElementById('tab-export').click();document.getElementById('markdown').click()`);
  assert.equal(await evaluate('document.getElementById("panel-export").hidden'),false);
  assert.equal(await evaluate('document.getElementById("panel-library").hidden'),true);
  const download = await evaluate('(async () => ({name:downloadName,text:await downloadBlob.text()}))()');
  assert.match(download.name,/\.md$/);assert.match(download.text,/## my-topic/);assert.match(download.text,/Postgres \\\[notes\\\]/);
  await evaluate(`document.getElementById('json').click()`);
  assert.equal(JSON.parse(await evaluate('downloadBlob.text()')).items[0].topic,'my-topic');
  await evaluate(`document.getElementById('tab-library').click();document.querySelector('.link-row input[type=checkbox]').click()`);
  assert.equal(await evaluate('document.querySelector(".reading-state").value'),'read');
  assert.equal(await evaluate('document.getElementById("markdown").disabled'),false);
  const paginationChecks = await evaluate(`(async () => {
    document.getElementById('tab-collect').click();
    const dt = new DataTransfer();dt.items.add(new File([Array.from({length:61},(_,i)=>'https://example.com/page-'+i).join(String.fromCharCode(10))],'many-links.txt',{type:'text/plain'}));
    document.getElementById('file').files=dt.files;document.getElementById('file').dispatchEvent(new Event('change'));
    await new Promise(r=>setTimeout(r,100));document.getElementById('tab-library').click();
    const before=document.getElementById('pagination-top').getBoundingClientRect().bottom <= document.getElementById('links').getBoundingClientRect().top;
    [...document.getElementById('pagination-top').children].find(x=>x.textContent==='3').click();
    return {before,top:document.getElementById('page-status-top').textContent,bottom:document.getElementById('page-status').textContent,current:document.querySelector('#pagination [aria-current]').textContent};
  })()`);
  assert.equal(paginationChecks.before,true);assert.equal(paginationChecks.top,paginationChecks.bottom);assert.equal(paginationChecks.current,'3');
  const htmlChecks = await evaluate(`(async () => {
    const {importHTML}=await import('/import.js');
    const result=importHTML('<a href="javascript:alert(1)">Bad</a><a href="https://example.xyz/x">Good</a><script>https://noise.example</script>');
    return {fallback:result.fallback,urls:result.links.map(x=>x.url)};
  })()`);
  assert.deepEqual(htmlChecks,{fallback:true,urls:['https://example.xyz/x']});
  console.log('PASS: HTML import, isolation, compact rows, export tab, pagination, reading states, Markdown and JSON downloads.');

  // A fresh fixture page uses controlled timers to exercise the collector.
  await cdp('Page.navigate',{url:'about:blank'});
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:shim});
  await evaluate(shim);
  await evaluate(`document.body.innerHTML='<a href="https://outside.example">Outside</a><div class="msg-s-message-list" style="height:100px;overflow-y:scroll"><div style="height:700px"><div class="msg-s-message-list__event" data-event-urn="one"><div class="msg-s-event-listitem__body"><a href="https://example.com/first">First</a></div></div></div></div>';globalThis.tick=null;globalThis.fixtureNow=0;Date.now=()=>fixtureNow;globalThis.setInterval=(fn,delay)=>(globalThis.tick=()=>{fixtureNow+=delay;fn()},1);globalThis.clearInterval=()=>{globalThis.tick=null};`);
  await evaluate(await readFile(root + 'progress.js','utf8'));
  await evaluate(await readFile(root + 'capture.js','utf8'));
  const command = value => evaluate(`(async () => {let result;listeners[0](${JSON.stringify(value)},{},r=>result=r);await new Promise(r=>setTimeout(r,20));return result})()`);
  assert.equal((await command({type:'start',auto:false,runId:1})).ok,true);
  const manual = await evaluate(`(async()=>{const box=document.querySelector('.msg-s-message-list');box.scrollTop=500;tick();await new Promise(r=>setTimeout(r,20));return {scroll:box.scrollTop,urls:messages.flatMap(m=>m.links.map(x=>x.url))}})()`);
  assert.equal(manual.scroll,500);assert.ok(!manual.urls.includes('https://outside.example/'));
  await evaluate(`document.querySelector('[data-event-urn]').remove();document.querySelector('.msg-s-message-list>div').innerHTML='<div class="msg-s-message-list__event" data-event-urn="two"><div class="msg-s-event-listitem__body"><a href="https://example.com/second">Second</a></div></div>';`);
  await command({type:'stop'});
  const urls = await evaluate('messages.flatMap(m=>m.links.map(x=>x.url))');
  assert.ok(urls.includes('https://example.com/first'));assert.ok(urls.includes('https://example.com/second'));
  assert.equal(await evaluate('messages.at(-1).running'),false);
  assert.equal((await command({type:'start',auto:true,runId:2})).ok,true);
  const automatic = await evaluate(`(async()=>{const box=document.querySelector('.msg-s-message-list');box.scrollTop=500;tick();await new Promise(r=>setTimeout(r,20));return box.scrollTop})()`);
  assert.equal(automatic,420);
  await evaluate(`(async()=>{const box=document.querySelector('.msg-s-message-list');box.scrollTop=0;for(let i=0;i<45 && tick;i++)tick();await new Promise(r=>setTimeout(r,20));})()`);
  assert.equal(await evaluate('messages.at(-1).running'),false);
  assert.match(await evaluate('messages.at(-1).status'),/does not guarantee/);
  await evaluate(`document.body.append(document.querySelector('.msg-s-message-list').cloneNode(true))`);
  assert.match((await command({type:'start',auto:true,runId:3})).error,/Multiple conversation lists/);
  console.log('PASS: manual mode, automatic scrolling, virtualized history retention, Stop, idle pause, ambiguous chat rejection.');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await cdp('Page.navigate',{url:origin + '/app.html?tab=1'});
  await new Promise(resolve => setTimeout(resolve,300));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  console.log('PASS: narrow dashboard layout without horizontal overflow.');
} finally {
  browser?.kill();
}
