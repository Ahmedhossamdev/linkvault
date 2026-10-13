import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// A minimal DOM exercises production dashboard handlers, not browser layout.
class Element {
  constructor(tag = 'div') {this.tagName = tag;this.children = [];this.value = '';this.files = [];this.attributes = {};this.classList = {toggle(){}};}
  append(...nodes) {this.children.push(...nodes);}
  replaceChildren(...nodes) {this.children = nodes;}
  setAttribute(key,value) {this.attributes[key] = value;}
  getAttribute(key) {return this.attributes[key];}
  toggleAttribute(key,force) {if (force) this.attributes[key] = '';else delete this.attributes[key];}
  showModal() {this.open = true;}
  close() {this.open = false;this.onclose?.();}
  click() {return this.onclick?.();}
  focus() {globalThis.document.activeElement = this;}
  scrollIntoView() {this.scrolledIntoView = true;}
  select() {}
}
function descendants(element) {return element.children.flatMap(child => [child,...descendants(child)]);}
const html = await readFile(new URL('../app.html',import.meta.url),'utf8');
async function dashboard(seed = {},{failWrites = false,ownerAvailable = true,sourceAvailable = true,beforeWrite = async () => {}} = {}) {
  const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => {const element = new Element();element.id = match[1];return [match[1],element];}));
  ids.mode.value = 'manual';ids.speed.value = '750';ids.risk.checked = true;
  const saved = structuredClone(seed), calls = [], listeners = [], scrolls = [];
  const previous = new Map(['document','location','chrome','window','navigator','LinkVaultProgress'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const lifecycle = {};Object.defineProperty(globalThis,'navigator',{value:{locks:{async request(name,options,callback){return callback(ownerAvailable ? {name} : null);}}},configurable:true});
  globalThis.document = {documentElement:new Element('html'),getElementById:id => {assert.ok(ids[id],`Missing HTML element: ${id}`);return ids[id];},createElement:tag => new Element(tag),querySelectorAll:() => Object.values(ids).flatMap(element => [element,...descendants(element)])};
  globalThis.location = {href:'https://extension.test/app.html?tab=7'};
  globalThis.window = {addEventListener(name,callback){lifecycle[name] = callback;},scrollTo(options){scrolls.push(options);}};
  globalThis.LinkVaultProgress = {phases:{},summary:() => 'Progress'};
  globalThis.chrome = {
    storage:{local:{async get(){return saved;},async set(data){await beforeWrite(data);if (failWrites) throw new Error('Storage quota exceeded');Object.assign(saved,structuredClone(data));}}},
    runtime:{onMessage:{addListener(fn){listeners.push(fn);}}},
    tabs:{async get(){if (!sourceAvailable) throw new Error('No tab with id: 7.');return {id:7,url:'https://www.linkedin.com/messaging/thread/test/'};},async update(id){if (!sourceAvailable) throw new Error('No tab with id: 7.');calls.push(`focus:${id}`);},async sendMessage(id,message){calls.push(message.type);return {ok:true};},onRemoved:{addListener(){}},onUpdated:{addListener(){}}},
    scripting:{async executeScript(){calls.push('inject');}},permissions:{async request(){return true;}},
  };
  await import(`../app.js?fixture=${crypto.randomUUID()}`);
  return {ids,saved,calls,listeners,scrolls,restore(){lifecycle.pagehide?.();for (const [key,descriptor] of previous) {if (descriptor) Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}
test('dashboard migrates, shares reading progress across chats, filters, deletes, and backs up all data',async () => {
  const legacy = {version:1,name:'Old friends',links:[{url:'https://example.com/linux',title:'Linux notes',selected:true,topic:'os-linux',sources:[]}]};
  const app = await dashboard({collection:legacy});
  const {ids,saved} = app;
  const rows = () => ids.links.children.filter(node => node.className === 'link-row');
  const find = (element,cls) => descendants(element).find(node => node.className === cls);
  const filter = (id,label) => ids[id].children.find(node => node.textContent.startsWith(label));
  try {
    assert.deepEqual(saved.collection,legacy);assert.equal(saved.library.version,2);assert.equal(ids.name.value,'All chats');assert.equal(rows()[0].children[0].checked,false);
    ids['chat-name'].value = 'New friends';ids.file.files = [{name:'friends.txt',size:30,async text(){return 'https://example.com/linux https://github.com/user/project';}}];
    await ids.file.onchange();assert.equal(rows().length,2);assert.equal(saved.library.items[0].chatIds.length,2);
    let reading = find(rows()[0],'reading-state');reading.value = 'read';reading.onchange();
    await new Promise(resolve => setImmediate(resolve));assert.equal(saved.library.items[0].state,'read');
    assert.equal(rows()[0].children[0].checked,true);
    filter('chats','New friends').click();assert.equal(rows().length,2);assert.equal(find(rows()[0],'reading-state').value,'read');
    filter('states','Read (').click();assert.equal(rows().length,1);
    reading = find(rows()[0],'reading-state');reading.value = 'archived';reading.onchange();assert.equal(rows().length,0);
    ids.reset.click();assert.equal(rows().length,1);
    filter('states','Archived (').click();assert.equal(rows().length,1);
    find(rows()[0],'secondary delete-link').click();assert.equal(rows().length,0);
    await ids.undo.click();assert.equal(rows().length,1);assert.equal(find(rows()[0],'reading-state').value,'archived');
    const create = URL.createObjectURL, revoke = URL.revokeObjectURL, timeout = globalThis.setTimeout;let blob;
    try {
      URL.createObjectURL = value => {blob = value;return 'blob:fixture';};URL.revokeObjectURL = () => {};globalThis.setTimeout = () => 1;
      ids.json.click();const backup = JSON.parse(await blob.text());assert.equal(backup.items.length,2);assert.equal(backup.chats.length,2);assert.equal(backup.items.find(item => item.url.includes('/linux')).state,'archived');
      ids.file.files = [{name:'backup.json',size:100,async text(){return JSON.stringify(backup);}}];await ids.file.onchange();assert.equal(saved.library.items.length,2);
      filter('states','Archived (').click();ids.context.checked = true;ids.markdown.click();assert.match(await blob.text(),/Archived/);
    } finally {URL.createObjectURL = create;URL.revokeObjectURL = revoke;globalThis.setTimeout = timeout;}
    await ids.start.click();assert.deepEqual(app.calls,['inject','start','focus:7']);
    const acknowledged = await new Promise(resolve => app.listeners[0]({type:'capture',thread:'https://www.linkedin.com/messaging/thread/test/',runId:1,running:true,status:'Watching',links:[{url:'https://example.com/linux',sources:[{text:'Live context'}]}],progress:{phase:'manual'}},{tab:{id:7}},resolve));
    assert.equal(acknowledged.ok,true);assert.equal(acknowledged.totalLinks,2);
    assert.equal(saved.library.items.find(item => item.url.includes('/linux')).chatIds.length,3);
    await ids.stop.click();
  } finally {app.restore();}
});
test('invalid saved library is not overwritten and mutation actions remain disabled',async () => {
  const app = await dashboard({library:{version:99}});
  try {assert.match(app.ids.status.textContent,/not been overwritten/);assert.equal(app.ids.start.disabled,true);assert.equal(app.ids.file.disabled,true);assert.deepEqual(app.saved.library,{version:99});}
  finally {app.restore();}
});
test('compact rows retain full long titles in the link tooltip, editor, and saved library',async () => {
  const fullTitle = 'One customer backfills 500K events into your Kafka topic. '.repeat(8);
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Friends',links:[{url:'https://example.com/kafka',title:fullTitle,sources:[]}]}});
  try {
    const row = app.ids.links.children.find(node => node.className === 'link-row');
    const anchor = descendants(row).find(node => node.className === 'article-title');
    const editor = descendants(row).find(node => node.tagName === 'input' && node.id?.startsWith('title-'));
    assert.equal(anchor.textContent,fullTitle);assert.equal(anchor.title,fullTitle);assert.equal(editor.value,fullTitle);
    assert.equal(app.saved.library.items[0].title,fullTitle);
    editor.value = 'A shorter Kafka title';editor.onchange();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(anchor.title,'A shorter Kafka title');assert.equal(app.saved.library.items[0].title,'A shorter Kafka title');
    assert.equal(row.children[0].checked,false);
  } finally {app.restore();}
});
test('pagination bounds rendered rows, keeps reading state, resets filters, and exports every filtered page',async () => {
  const links = Array.from({length:61},(_,index) => ({url:`https://example.com/item-${index}`,title:`Article ${index}`,selected:true,sources:[]}));
  const app = await dashboard({collection:{version:1,name:'Many links',links}});
  const rows = () => app.ids.links.children.filter(node => node.className === 'link-row');
  const page = number => app.ids.pagination.children.find(node => node.textContent === String(number));
  try {
    app.ids['page-size'].value = '25';app.ids['page-size'].onchange();
    assert.equal(rows().length,25);assert.match(app.ids['page-status'].textContent,/1.*25.*61/);
    page(3).click();assert.equal(rows().length,11);assert.match(app.ids['page-status'].textContent,/51.*61/);
    const reading = descendants(rows()[0]).find(node => node.className === 'reading-state');reading.value = 'reading';reading.onchange();
    page(1).click();page(3).click();assert.equal(descendants(rows()[0]).find(node => node.className === 'reading-state').value,'reading');
    app.ids['page-size'].value = '50';app.ids['page-size'].onchange();assert.equal(rows().length,50);
    app.ids.search.value = 'Article 60';app.ids.search.oninput();assert.equal(rows().length,1);assert.equal(app.ids.pagination.hidden,true);
    app.ids.reset.click();assert.equal(rows().length,50);
    const create = URL.createObjectURL, timeout = globalThis.setTimeout;let blob;
    try {URL.createObjectURL = value => {blob = value;return 'blob:fixture';};globalThis.setTimeout = () => 1;app.ids.markdown.click();assert.match(await blob.text(),/61 unique links/);}
    finally {URL.createObjectURL = create;globalThis.setTimeout = timeout;}
  } finally {app.restore();}
});
test('migration save failure leaves the previous collection intact and permits a recovery backup',async () => {
  const legacy = {version:1,name:'Friends',links:[{url:'https://example.com',sources:[]}]};
  const app = await dashboard({collection:legacy},{failWrites:true});
  try {assert.deepEqual(app.saved.collection,legacy);assert.equal(app.saved.library,undefined);assert.equal(app.ids.json.disabled,false);assert.match(app.ids.status.textContent,/backup/i);}
  finally {app.restore();}
});
test('export tab keeps the reading filters and exports all their pages',async () => {
  const links = Array.from({length:31},(_,index) => ({url:`https://example.com/topic-${index}`,title:`Science ${index}`,sources:[]}));
  links.push({url:'https://example.com/other',title:'Travel',sources:[]});
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Test chat',links}});
  const create = URL.createObjectURL, timeout = globalThis.setTimeout;let blob;
  try {
    assert.ok(app.ids['tab-export'],'Export must be a separate navigable tab');
    app.ids.search.value = 'Science';app.ids.search.oninput();
    app.ids['tab-export'].click();assert.equal(app.ids['panel-export'].hidden,false);assert.equal(app.ids['panel-library'].hidden,true);
    assert.match(app.ids['export-summary'].textContent,/31/);
    URL.createObjectURL = value => {blob = value;return 'blob:fixture';};globalThis.setTimeout = () => 1;
    app.ids.markdown.click();assert.match(await blob.text(),/31 unique links/);assert.doesNotMatch(await blob.text(),/https:\/\/example.com\/other/);
    app.ids.json.click();assert.equal(JSON.parse(await blob.text()).items.length,32);
    app.ids['tab-export'].onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(app.ids['panel-reports'].hidden,false);
    app.ids['tab-library'].click();assert.equal(app.ids.search.value,'Science');
  } finally {URL.createObjectURL = create;globalThis.setTimeout = timeout;app.restore();}
});
test('upper and lower pagination share page size, page selection, and filter reset',async () => {
  const links = Array.from({length:61},(_,index) => ({url:`https://example.com/link-${index}`,title:`Link ${index}`,sources:[]}));
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Test chat',links}});
  const rows = () => app.ids.links.children.filter(node => node.className === 'link-row');
  const button = (id,label) => app.ids[id].children.find(node => node.textContent === label);
  try {
    assert.ok(app.ids['pagination-top'],'Navigation must be available before the links');
    app.ids['page-size-top'].value = '25';app.ids['page-size-top'].onchange();
    assert.equal(app.ids['page-status-top'].textContent,app.ids['page-status'].textContent);
    button('pagination-top','3').click();assert.equal(rows().length,11);assert.equal(button('pagination','3').getAttribute('aria-current'),'page');
    button('pagination','1').click();assert.equal(button('pagination-top','1').getAttribute('aria-current'),'page');
    app.ids['page-size-top'].value = '50';app.ids['page-size-top'].onchange();assert.equal(rows().length,50);assert.equal(app.ids['page-size'].value,'50');
    app.ids['page-size'].value = '100';app.ids['page-size'].onchange();assert.equal(app.ids['page-size-top'].value,'100');assert.equal(rows().length,61);
    assert.equal(app.ids['pagination-top'].hidden,true);assert.equal(app.ids.pagination.hidden,true);
    app.ids.search.value = 'Link 60';app.ids.search.oninput();assert.equal(rows().length,1);assert.match(app.ids['page-status-top'].textContent,/1 to 1 of 1/);
  } finally {app.restore();}
});
test('title edits immediately refresh search matches, export counts, and availability',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Demo',links:[{url:'https://example.com/one',title:'Needle article',sources:[]}]}});
  try {
    app.ids.search.value = 'Needle';app.ids.search.oninput();
    const row = app.ids.links.children.find(node => node.className === 'link-row');
    const editor = descendants(row).find(node => node.tagName === 'input' && node.id?.startsWith('title-'));
    editor.value = 'Updated article';editor.onchange();
    await new Promise(resolve => setImmediate(resolve));
    app.ids['tab-export'].click();
    assert.match(app.ids['export-summary'].textContent,/Markdown: 0 links/);assert.equal(app.ids.markdown.disabled,true);
    assert.equal(app.ids.json.disabled,false);assert.equal(app.saved.library.items[0].title,'Updated article');
    assert.equal(app.ids.links.children.filter(node => node.className === 'link-row').length,0);
    app.ids['tab-library'].click();app.ids.reset.click();assert.equal(app.ids.markdown.disabled,false);
  } finally {app.restore();}
});
test('reading list defaults to ten rows with synchronized sizes and safe fallback',async () => {
  const links = Array.from({length:61},(_,index) => ({url:`https://example.com/compact-${index}`,title:`Compact article ${index}`,sources:[]}));
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Compact chat',links}});
  const rows = () => app.ids.links.children.filter(node => node.className === 'link-row');
  try {
    assert.equal(rows().length,10);assert.equal(app.ids['page-size'].value,'10');assert.equal(app.ids['page-size-top'].value,'10');
    assert.match(app.ids['page-status-top'].textContent,/1 to 10 of 61/);
    app.ids['pagination-top'].children.find(node => node.textContent === '7').click();assert.equal(rows().length,1);
    assert.equal(app.ids['pagination-toolbar'].scrolledIntoView,true);
    app.ids['page-size-top'].value = 'invalid';app.ids['page-size-top'].onchange();assert.equal(rows().length,10);assert.equal(app.ids['page-size'].value,'10');
  } finally {app.restore();}
});
test('collection tab reveals live modes without scrolling below the library',async () => {
  const app = await dashboard({theme:'dark',onboardingVersion:1});
  try {
    assert.equal(document.documentElement.getAttribute('data-theme'),'dark');
    assert.equal(app.ids['panel-collect'].hidden,true);app.ids['open-collect'].click();assert.equal(app.ids['panel-collect'].hidden,false);assert.equal(app.ids['panel-library'].hidden,true);assert.equal(document.activeElement,app.ids.mode);
    await app.ids.theme.click();assert.equal(document.documentElement.getAttribute('data-theme'),'light');assert.equal(app.saved.theme,'light');assert.equal(app.ids.theme.getAttribute('aria-label'),'Switch to dark theme');
    await app.ids.theme.click();assert.equal(document.documentElement.getAttribute('data-theme'),'dark');assert.equal(app.saved.theme,'dark');assert.equal(app.ids.theme.getAttribute('aria-label'),'Switch to light theme');
  } finally {app.restore();}
});
test('backup restore imports Markdown as unread and merges JSON without losing progress',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Existing',links:[{url:'https://example.com/science',title:'My science',topic:'science',sources:[]}]}});
  try {
    assert.ok(app.ids['restore-file'],'Restore must be discoverable with backups');
    const state = descendants(app.ids.links).find(node => node.className === 'reading-state');state.value = 'read';state.onchange();
    await new Promise(resolve => setImmediate(resolve));
    const backup = structuredClone(app.saved.library);
    app.ids['tab-export'].click();app.ids['restore-file'].files = [{name:'reading.md',size:80,async text(){return '# My reading\n\n## Books\n- [A novel (Read)](https://example.com/books)';}}];
    await app.ids['restore-file'].onchange();
    assert.equal(app.saved.library.items.length,2);assert.equal(app.saved.library.items.find(item=>item.url.endsWith('/books')).state,'unread');
    assert.equal(app.saved.library.items.find(item=>item.url.endsWith('/books')).title,'A novel');
    assert.equal(app.saved.library.items.find(item=>item.url.endsWith('/science')).state,'read');
    app.ids['restore-file'].files = [{name:'library.json',size:100,async text(){return JSON.stringify(backup);}}];await app.ids['restore-file'].onchange();
    assert.equal(app.saved.library.items.length,2);assert.equal(app.saved.library.items.find(item=>item.url.endsWith('/science')).state,'read');
    assert.equal(app.ids['panel-library'].hidden,false);
  } finally {app.restore();}
});
test('invalid restore file does not overwrite the library or create empty chats',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Existing',links:[{url:'https://example.com',sources:[]}]}});
  try {
    assert.ok(app.ids['restore-file']);const before = structuredClone(app.saved.library);
    for (const [name,text] of [['bad.json','{"version":2,"items":[{}]}'],['empty.md','# Nothing here']]) {
      app.ids['restore-file'].files = [{name,size:50,async text(){return text;}}];await app.ids['restore-file'].onchange();assert.deepEqual(app.saved.library,before);
    }
  } finally {app.restore();}
});
test('delete all links requires explicit confirmation and permits restoring a full backup',async () => {
  const legacy = {version:1,name:'Old',links:[{url:'https://example.com/one',sources:[{text:'Private context'}]},{url:'https://example.com/two',sources:[]}]};
  const app = await dashboard({theme:'dark',onboardingVersion:1,collection:legacy});
  try {
    assert.ok(app.ids['clear-all']);const before = structuredClone(app.saved.library);
    app.ids.search.value = 'one';app.ids.search.oninput();
    app.ids['clear-all'].click();assert.equal(app.ids['clear-dialog'].open,true);assert.match(app.ids['clear-count'].textContent,/2/);
    await app.ids['confirm-clear'].click();assert.deepEqual(app.saved.library,before);
    app.ids['cancel-clear'].click();assert.equal(app.ids['clear-dialog'].open,false);assert.deepEqual(app.saved.library,before);
    app.ids['clear-all'].click();app.ids['clear-confirm'].value = 'DELETE';await app.ids['confirm-clear'].click();
    assert.equal(app.saved.library.items.length,0);assert.equal(app.saved.library.deleted.length,0);assert.equal(app.saved.collection,null);
    assert.equal(app.saved.theme,'dark');assert.equal(app.saved.onboardingVersion,1);assert.equal(app.saved.library.chats.length,1);
    assert.equal(app.ids['clear-dialog'].open,false);assert.equal(app.ids.search.value,'');assert.equal(app.ids.undo.disabled,true);
    app.ids['restore-file'].files = [{name:'backup.json',size:100,async text(){return JSON.stringify(before);}}];await app.ids['restore-file'].onchange();
    assert.equal(app.saved.library.items.length,2);assert.equal(app.saved.library.items[0].sources[0].text,'Private context');
  } finally {app.restore();}
});
test('failed delete-all storage write leaves the existing library and legacy recovery data intact',async () => {
  const library = {version:2,chats:[{id:'a',source:'demo',name:'A'}],items:[{url:'https://example.com',title:'Article',topic:'books',chatIds:['a'],state:'read',sources:[]}],deleted:[]};
  const collection = {version:1,links:[{url:'https://example.com'}]};
  const app = await dashboard({library,collection,onboardingVersion:1},{failWrites:true});
  try {
    assert.ok(app.ids['clear-all']);app.ids['clear-all'].click();app.ids['clear-confirm'].value = 'DELETE';await app.ids['confirm-clear'].click();
    assert.deepEqual(app.saved.library,library);assert.deepEqual(app.saved.collection,collection);assert.equal(app.ids['clear-dialog'].open,true);
    assert.match(app.ids['clear-error'].textContent,/Storage quota/);
  } finally {app.restore();}
});
test('reading filters have removable chips and chat rename appears only in a selected chat',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Friends',links:[{url:'https://example.com/science',title:'Astronomy',topic:'science',sources:[]}]}});
  try {
    assert.ok(app.ids['chat-settings']);assert.ok(app.ids['selected-chat-actions']);assert.equal(app.ids['chat-settings'].hidden,true);assert.equal(app.ids['selected-chat-actions'].hidden,true);assert.equal(app.ids['active-filters'].hidden,true);
    app.ids.chats.children.find(node=>node.textContent.startsWith('Friends')).click();assert.equal(app.ids['chat-settings'].hidden,false);assert.equal(app.ids['selected-chat-actions'].hidden,false);assert.match(app.ids['selected-chat-name'].textContent,/Friends/);
    app.ids.search.value = 'Astronomy';app.ids.search.oninput();assert.equal(app.ids['active-filters'].children.length,2);
    app.ids['active-filters'].children.find(node=>node.textContent.startsWith('Search')).click();assert.equal(app.ids.search.value,'');
    app.ids.reset.click();assert.equal(app.ids['chat-settings'].hidden,true);assert.equal(app.ids['selected-chat-actions'].hidden,true);assert.equal(app.ids['active-filters'].hidden,true);
    app.ids['tab-guide'].click();assert.equal(app.ids['panel-guide'].hidden,false);assert.equal(app.ids['tab-guide'].getAttribute('aria-expanded'),'true');
  } finally {app.restore();}
});
test('chat and topic management keeps shared links, assigns custom topics, and moves deleted topics to Unsorted',async () => {
  const library = {version:2,chats:[{id:'chat:a',source:'a',name:'Alice'},{id:'chat:b',source:'b',name:'Bob'}],topics:['Distributed systems'],items:[
    {url:'https://example.com/shared',title:'Shared',topic:'books',chatIds:['chat:a','chat:b'],state:'unread',sources:[{chatId:'chat:a'},{chatId:'chat:b'}]},
    {url:'https://example.com/alice',title:'Alice only',topic:'books',chatIds:['chat:a'],state:'unread',sources:[{chatId:'chat:a'}]},
  ],deleted:[]};
  const app = await dashboard({library,onboardingVersion:1});
  try {
    assert.ok(app.ids['delete-chat'],'Selected chats need a deletion control');
    assert.ok(app.ids['add-topic'],'Topics need an add control');
    app.ids['new-topic'].value = 'Systems thinking';
    await app.ids['add-topic-form'].onsubmit({preventDefault(){}});
    assert.ok(app.saved.library.topics.includes('Systems thinking'));
    app.ids.chats.children.find(node => node.textContent.startsWith('Alice')).click();
    app.ids['delete-chat'].click();assert.equal(app.ids['delete-chat-dialog'].open,true);
    await app.ids['confirm-delete-chat'].click();
    assert.deepEqual(app.saved.library.chats.map(chat => chat.name),['Bob']);
    assert.deepEqual(app.saved.library.items.map(item => item.url),['https://example.com/shared']);
    const row = app.ids.links.children.find(node => node.className === 'link-row');
    const topic = descendants(row).find(node => node.className === 'topic');
    topic.value = 'Distributed systems';topic.onchange();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.saved.library.items[0].topic,'Distributed systems');
    const deleteTopic = descendants(app.ids.topics).find(node => node.className === 'delete-topic');
    deleteTopic.click();assert.equal(app.ids['delete-topic-dialog'].open,true);
    await app.ids['confirm-delete-topic'].click();
    assert.equal(app.saved.library.items[0].topic,'misc-useful');
    assert.deepEqual(app.saved.library.topics,['Systems thinking']);
  } finally {app.restore();}
});
test('reading cards expose local site badges and current reading state without remote images',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Friends',links:[{url:'https://github.com/example/demo',title:'A project',sources:[]}]}});
  try {
    const row = () => app.ids.links.children.find(node=>node.className==='link-row');
    assert.equal(row().getAttribute('data-state'),'unread');
    assert.equal(descendants(row()).find(node=>node.className==='site-badge').textContent,'github.com');
    assert.equal(descendants(row()).find(node=>node.className==='site-mark').textContent,'GH');
    assert.equal(descendants(row()).find(node=>node.className==='reading-badge').textContent,'To read');
    const reading = descendants(row()).find(node=>node.className==='reading-state');reading.value='reading';reading.onchange();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(row().getAttribute('data-state'),'reading');assert.equal(descendants(row()).find(node=>node.className==='reading-badge').textContent,'Reading');
    assert.equal(descendants(row()).filter(node=>node.tagName==='img').length,0);
  } finally {app.restore();}
});
test('closed source tabs give reconnection instructions without touching saved data',async () => {
  const app = await dashboard({onboardingVersion:1},{sourceAvailable:false});
  try {
    await app.ids.start.click();assert.match(app.ids.status.textContent,/conversation.*icon|icon.*conversation/i);assert.doesNotMatch(app.ids.status.textContent,/No tab with id/);
    await app.ids.source.click();assert.match(app.ids.status.textContent,/conversation.*icon|icon.*conversation/i);assert.equal(app.saved.library,undefined);assert.deepEqual(app.calls,[]);
  } finally {app.restore();}
});
test('switching sections starts at the top rather than retaining a long reading-list scroll position',async () => {
  const app = await dashboard({onboardingVersion:1});
  try {
    app.ids['tab-export'].click();assert.deepEqual(app.scrolls.at(-1),{top:0,behavior:'auto'});
    const previous = app.scrolls.length;app.ids['tab-guide'].click();assert.equal(app.scrolls.length,previous+1);
  } finally {app.restore();}
});
test('delete-all invalidates finished capture sessions so delayed packets cannot resurrect links',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Existing',links:[{url:'https://example.com/saved',sources:[]}]}});
  try {
    await app.ids.start.click();await app.ids.stop.click();
    app.ids['clear-all'].click();app.ids['clear-confirm'].value = 'DELETE';await app.ids['confirm-clear'].click();
    let response;
    const pending = app.listeners[0]({type:'capture',thread:'https://www.linkedin.com/messaging/thread/test/',runId:1,running:false,status:'Late packet',links:[{url:'https://example.com/late'}],progress:{phase:'saving'}},{tab:{id:7}},value=>{response=value;});
    await new Promise(resolve=>setImmediate(resolve));assert.equal(pending,undefined);assert.equal(response,undefined);assert.equal(app.saved.library.items.length,0);
  } finally {app.restore();}
});
test('deleting a finished captured chat invalidates late packets for that chat',async () => {
  const app = await dashboard({onboardingVersion:1});
  try {
    await app.ids.start.click();await app.ids.stop.click();
    app.ids.chats.children.find(node => node.textContent.startsWith('LinkedIn chat')).click();
    app.ids['delete-chat'].click();await app.ids['confirm-delete-chat'].click();
    let response;
    const accepted = app.listeners[0]({type:'capture',thread:'https://www.linkedin.com/messaging/thread/test/',runId:1,running:false,status:'Late packet',links:[{url:'https://example.com/late'}],progress:{phase:'saving'}},{tab:{id:7}},value=>{response=value;});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(accepted,undefined);assert.equal(response,undefined);assert.equal(app.saved.library.items.length,0);
  } finally {app.restore();}
});
test('restore retires finished collectors before writing so late packets cannot overwrite imported links',async () => {
  let entered, release;
  const started = new Promise(resolve=>{entered=resolve;}), held = new Promise(resolve=>{release=resolve;});
  const app = await dashboard({onboardingVersion:1},{beforeWrite:async data=>{if(data.library?.items.some(item=>item.url==='https://example.com/restored')){entered();await held;}}});
  try {
    await app.ids.start.click();await app.ids.stop.click();
    app.ids['restore-file'].files = [{name:'restore.md',size:70,async text(){return '- [Restored article](https://example.com/restored)';}}];
    const importing = app.ids['restore-file'].onchange();await started;
    const accepted = app.listeners[0]({type:'capture',thread:'https://www.linkedin.com/messaging/thread/test/',runId:1,running:true,status:'Late packet',links:[{url:'https://example.com/late'}],progress:{phase:'manual'}},{tab:{id:7}},()=>{});
    release();await importing;await new Promise(resolve=>setImmediate(resolve));
    assert.equal(accepted,undefined);assert.deepEqual(app.saved.library.items.map(item=>item.url),['https://example.com/restored']);assert.equal(app.ids.stop.disabled,true);
  } finally {release();app.restore();}
});
test('first-open walkthrough can be completed, skipped, and replayed without modifying the library',async () => {
  const app = await dashboard();
  try {
    assert.equal(app.ids['panel-guide'].hidden,false);assert.equal(app.ids.walkthrough.hidden,false);assert.equal(app.ids['walkthrough-back'].disabled,true);
    for (let step = 0;step < 4;step++) await app.ids['walkthrough-next'].click();
    assert.equal(app.saved.onboardingVersion,1);assert.equal(app.ids.walkthrough.hidden,true);assert.equal(app.ids['panel-library'].hidden,false);assert.equal(app.saved.library,undefined);
    app.ids['tab-guide'].click();app.ids['guide-restart'].click();assert.equal(app.ids.walkthrough.hidden,false);await app.ids['walkthrough-skip'].click();assert.equal(app.ids.walkthrough.hidden,true);
  } finally {app.restore();}
  const returning = await dashboard({onboardingVersion:1});
  try {assert.equal(returning.ids['panel-library'].hidden,false);assert.equal(returning.ids.walkthrough.hidden,true);} finally {returning.restore();}
});
test('Reports reflects reading edits while topic filters work independently of sites',async () => {
  const app = await dashboard({onboardingVersion:1,collection:{version:1,name:'Friends',links:[{url:'https://youtube.com/watch?v=1',title:'Astronomy',topic:'science'},{url:'https://example.com/book',title:'Novel',topic:'books'}]}});
  try {
    const science = app.ids.topics.children.find(node => node.textContent.startsWith('Science'));science.click();assert.equal(app.ids.links.children.filter(node => node.className === 'link-row').length,1);
    const check = app.ids.links.children[0].children[0];check.checked = true;check.onchange();await new Promise(resolve => setImmediate(resolve));
    app.ids['tab-reports'].click();assert.equal(app.ids['panel-reports'].hidden,false);assert.equal(app.ids['report-read'].textContent,'1');assert.equal(app.ids['report-total'].textContent,'2');assert.match(app.ids['report-progress'].textContent,/50%/);
    assert.equal(app.ids['report-topics'].children.length,2);
  } finally {app.restore();}
});
test('filters and reading controls preserve keyboard focus when the list rerenders',async () => {
  const app = await dashboard({collection:{version:1,name:'Friends',links:[{url:'https://example.com'}]}});
  try {
    const filter = app.ids.states.children.find(node => node.textContent.startsWith('Everything'));filter.focus();filter.click();assert.match(document.activeElement.textContent,/Everything/);assert.notEqual(document.activeElement,filter);
    const reading = descendants(app.ids.links).find(node => node.className === 'reading-state');reading.focus();reading.value = 'read';reading.onchange();assert.equal(document.activeElement.className,'reading-state');assert.notEqual(document.activeElement,reading);
    const checkbox = app.ids.links.children[0].children[0];checkbox.focus();checkbox.checked = false;checkbox.onchange();assert.equal(app.ids.links.children[0].children[0].checked,false);assert.equal(document.activeElement,app.ids.links.children[0].children[0]);
    await new Promise(resolve => setImmediate(resolve));
  } finally {app.restore();}
});
test('a duplicated dashboard cannot overwrite the owning dashboard library',async () => {
  const seed = {version:1,name:'Friends',links:[{url:'https://example.com'}]};const app = await dashboard({collection:seed,onboardingVersion:1},{ownerAvailable:false});
  try {assert.equal(app.ids.start.disabled,true);assert.equal(app.ids.file.disabled,true);assert.match(app.ids.status.textContent,/another.*dashboard/i);assert.equal(app.saved.library,undefined);} finally {app.restore();}
});
test('same-name chats restore focus by identity and topic edits keep their editor open',async () => {
  const app = await dashboard({onboardingVersion:1});
  try {
    for (const name of ['one','two']) {app.ids['chat-name'].value = 'Friends';app.ids.file.files = [{name:`${name}.txt`,size:20,async text(){return `https://example.com/${name}`;}}];await app.ids.file.onchange();}
    const second = app.ids.chats.children[2];second.focus();second.click();assert.equal(document.activeElement,app.ids.chats.children[2]);
    let details = descendants(app.ids.links).find(node => node.tagName === 'details');details.open = true;const topic = descendants(details).find(node => node.className === 'topic');topic.focus();topic.value = 'My research';topic.onchange();
    details = descendants(app.ids.links).find(node => node.tagName === 'details');assert.equal(details.open,true);assert.equal(document.activeElement.className,'topic');await new Promise(resolve => setImmediate(resolve));
  } finally {app.restore();}
});
