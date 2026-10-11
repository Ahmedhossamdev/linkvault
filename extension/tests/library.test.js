import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, restoreLibrary, ensureChat, ingest, entries, setState, deleteEntry, undoDelete, category, mergeLibrary, replaceURL } from '../library.js';

test('legacy links migrate without losing edits, selections, or context',() => {
  const library = restoreLibrary({version:1,name:'Friends',links:[{url:'https://example.com/linux',title:'My title',topic:'os-linux',selected:false,sources:[{text:'Context'}]}]});
  assert.equal(library.version,2);assert.equal(library.chats[0].name,'Friends');
  assert.equal(library.items[0].title,'My title');assert.equal(library.items[0].selected,false);assert.equal(library.items[0].state,'unread');
  assert.equal(library.items[0].sources[0].text,'Context');
});
test('a general reading list deduplicates links across chats and retains both sources',() => {
  const library = emptyLibrary();const a = ensureChat(library,'thread-a','Alice');const b = ensureChat(library,'thread-b','Bob');
  ingest(library,a.id,[{url:'https://example.com/linux?utm_source=chat',sources:[{text:'A'}]}]);
  setState(library,library.items[0].url,'reading');
  ingest(library,b.id,[{url:'https://example.com/linux',sources:[{text:'B'}]}]);
  assert.equal(library.items.length,1);assert.equal(library.items[0].chatIds.length,2);assert.equal(library.items[0].state,'reading');
  assert.equal(library.items[0].sources.length,2);
  assert.equal(entries(library,{chatId:a.id})[0],entries(library,{chatId:b.id})[0]);
});
test('chat, state, category and search filters intersect',() => {
  const library = emptyLibrary();const chat = ensureChat(library,'chat','Friends');
  ingest(library,chat.id,[{url:'https://example.com/linux',title:'Linux kernel'},{url:'https://youtube.com/watch?v=1',title:'DNS video'}]);
  setState(library,library.items[0].url,'read');
  assert.equal(entries(library,{state:'read',category:'os',search:'kernel'}).length,1);
  assert.equal(entries(library,{chatId:chat.id,state:'reading'}).length,0);
  assert.equal(category('https://github.com/user/network','network'),'github');
  assert.equal(category('https://youtu.be/xyz','network'),'youtube');
});
test('deletion affects every chat, prevents recapture, and can be undone',() => {
  const library = emptyLibrary();const chat = ensureChat(library,'chat','Friends');
  ingest(library,chat.id,[{url:'https://example.com'}]);const item = library.items[0];
  deleteEntry(library,item.url);ingest(library,chat.id,[{url:item.url}]);assert.equal(library.items.length,0);
  undoDelete(library,item);assert.equal(library.items.length,1);assert.equal(library.deleted.length,0);
});
test('backup round trip retains chat membership, reading state and deletion exclusions',() => {
  const library = emptyLibrary();const chat = ensureChat(library,'chat','Friends');
  ingest(library,chat.id,[{url:'https://example.com/one'},{url:'https://example.com/two'}]);
  setState(library,library.items[0].url,'archived');deleteEntry(library,library.items[1].url);
  const restored = restoreLibrary(JSON.parse(JSON.stringify(library)));
  assert.equal(restored.items[0].state,'archived');assert.equal(restored.deleted.length,1);assert.equal(restored.chats[0].id,chat.id);
});
test('merging a backup preserves current reading progress and adds new chats',() => {
  const library = emptyLibrary();const chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://example.com'}]);setState(library,library.items[0].url,'read');
  const other = emptyLibrary();const b = ensureChat(other,'b','Bob');ingest(other,b.id,[{url:'https://example.com'}]);
  mergeLibrary(library,other);assert.equal(library.items[0].state,'read');assert.equal(library.items[0].chatIds.length,2);
});
test('invalid states and dangling chat memberships are rejected',() => {
  const library = emptyLibrary();assert.throws(() => restoreLibrary({...library,items:[{url:'https://example.com',chatIds:['missing']}]}));
  const chat = ensureChat(library,'chat','Friends');ingest(library,chat.id,[{url:'https://example.com'}]);
  assert.throws(() => setState(library,library.items[0].url,'invented'));
});
test('active reading list excludes archived items, everything retains them',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');
  ingest(library,chat.id,[{url:'https://example.com/one'},{url:'https://example.com/two'}]);
  setState(library,library.items[0].url,'archived');
  assert.equal(entries(library,{state:'active'}).length,1);assert.equal(entries(library).length,2);
});
test('resolved duplicates merge chat membership without resetting existing reading state',() => {
  const library = emptyLibrary(), a = ensureChat(library,'a','Alice'), b = ensureChat(library,'b','Bob');
  ingest(library,a.id,[{url:'https://example.com/article',sources:[{text:'A'}]}]);
  ingest(library,b.id,[{url:'https://lnkd.in/short',sources:[{text:'B'}]}]);
  setState(library,library.items[0].url,'read');
  replaceURL(library,'https://lnkd.in/short',{url:'https://example.com/article',title:'Fetched title'});
  assert.equal(library.items.length,1);assert.equal(library.items[0].state,'read');assert.equal(library.items[0].chatIds.length,2);assert.equal(library.items[0].sources.length,2);
});
test('every reading state survives recapture and portable backup',() => {
  for (const state of ['unread','reading','read','archived']) {
    const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://example.com'}]);
    setState(library,library.items[0].url,state);ingest(library,chat.id,[{url:'https://example.com'}]);
    assert.equal(restoreLibrary(JSON.parse(JSON.stringify(library))).items[0].state,state);
  }
});
test('identical message context in different chats retains both origins in a backup',() => {
  const library = emptyLibrary(), a = ensureChat(library,'a','Alice'), b = ensureChat(library,'b','Bob');
  const incoming = [{url:'https://example.com',sources:[{text:'Read this',sender:'Me',date:'2026-10-11'}]}];
  ingest(library,a.id,incoming);ingest(library,b.id,incoming);
  const restored = restoreLibrary(JSON.parse(JSON.stringify(library)));
  assert.equal(restored.items[0].sources.length,2);
  assert.deepEqual(restored.items[0].sources.map(source => source.chatId),[a.id,b.id]);
});
test('resolution never resurrects a deleted destination',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');
  ingest(library,chat.id,[{url:'https://example.com/article'},{url:'https://lnkd.in/short'}]);
  deleteEntry(library,'https://example.com/article');replaceURL(library,'https://lnkd.in/short',{url:'https://example.com/article'});
  assert.equal(library.items.length,0);assert.equal(restoreLibrary(library).items.length,0);
});
test('resolved aliases keep shared state on recapture and survive backup, delete, and undo',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');
  ingest(library,chat.id,[{url:'https://lnkd.in/short'}]);replaceURL(library,'https://lnkd.in/short',{url:'https://example.com/article'});
  setState(library,'https://example.com/article','read');
  const restored = restoreLibrary(JSON.parse(JSON.stringify(library)));ingest(restored,chat.id,[{url:'https://lnkd.in/short'}]);
  assert.equal(restored.items.length,1);assert.equal(restored.items[0].state,'read');
  const item = deleteEntry(restored,'https://example.com/article');ingest(restored,chat.id,[{url:'https://lnkd.in/short'}]);assert.equal(restored.items.length,0);
  undoDelete(restored,item);ingest(restored,chat.id,[{url:'https://lnkd.in/short'}]);assert.equal(restored.items.length,1);assert.equal(restored.deleted.length,0);
});
test('independently migrated collections keep distinct chats when combined',() => {
  const a = restoreLibrary({version:1,name:'Alice',links:[{url:'https://example.com/a'}]});
  const b = restoreLibrary({version:1,name:'Bob',links:[{url:'https://example.com/b'}]});
  mergeLibrary(a,b);assert.equal(a.chats.length,2);assert.deepEqual(a.chats.map(chat => chat.name),['Alice','Bob']);
});
test('imported deleted alias cannot remove a surviving local article on reload',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://example.com/article'},{url:'https://lnkd.in/short'}]);deleteEntry(library,'https://lnkd.in/short');
  const other = emptyLibrary(), b = ensureChat(other,'b','Bob');ingest(other,b.id,[{url:'https://lnkd.in/short'}]);replaceURL(other,'https://lnkd.in/short',{url:'https://example.com/article'});
  mergeLibrary(library,other);assert.equal(restoreLibrary(library).items.length,1);assert.equal(library.items[0].url,'https://example.com/article');
});
test('backup aliases consolidate all matching local entries immediately',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://example.com/article'},{url:'https://lnkd.in/short'}]);setState(library,library.items[0].url,'read');
  const other = emptyLibrary(), b = ensureChat(other,'b','Bob');ingest(other,b.id,[{url:'https://lnkd.in/short',sources:[{text:'B'}]}]);replaceURL(other,'https://lnkd.in/short',{url:'https://example.com/article'});
  mergeLibrary(library,other);assert.equal(library.items.length,1);assert.equal(library.items[0].state,'read');assert.equal(library.items[0].chatIds.length,2);assert.equal(library.items[0].sources[0].text,'B');
});
test('topic and site filters remain independent for a science video',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://youtube.com/watch?v=1',topic:'science'},{url:'https://example.com/science',topic:'science'}]);
  assert.equal(entries(library,{topic:'science'}).length,2);assert.equal(entries(library,{topic:'science',site:'youtube'}).length,1);assert.equal(entries(library,{topic:'books'}).length,0);
});
test('an edited custom topic remains pinned after backup restore and recapture',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://example.com'}]);library.items[0].topic = 'My research';library.items[0].topicEdited = true;
  const restored = restoreLibrary(library);ingest(restored,chat.id,[{url:'https://example.com',topic:'science'}]);assert.equal(restored.items[0].topic,'My research');assert.equal(restored.items[0].topicEdited,true);
});
test('alias import preserves existing destination progress and custom edits even if short URL came first',() => {
  const library = emptyLibrary(), chat = ensureChat(library,'a','Alice');ingest(library,chat.id,[{url:'https://lnkd.in/short'},{url:'https://example.com/article',title:'My title',topic:'My research'}]);
  setState(library,'https://example.com/article','read');library.items[1].topicEdited = true;
  const other = emptyLibrary(), b = ensureChat(other,'b','Bob');ingest(other,b.id,[{url:'https://lnkd.in/short'}]);replaceURL(other,'https://lnkd.in/short',{url:'https://example.com/article'});
  mergeLibrary(library,other);assert.equal(library.items.length,1);assert.equal(library.items[0].state,'read');assert.equal(library.items[0].title,'My title');assert.equal(library.items[0].topic,'My research');assert.equal(library.items[0].topicEdited,true);
});
