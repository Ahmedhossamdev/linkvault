import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, deleteChat, addTopic, deleteTopic, setTopic, restoreLibrary, mergeLibrary } from '../library.js';

function libraryWithSharedLink() {
  return {
    version:2,
    chats:[{id:'chat:a',source:'a',name:'Alice'},{id:'chat:b',source:'b',name:'Bob'}],
    topics:[],
    items:[
      {url:'https://example.com/shared',title:'Shared',topic:'books',chatIds:['chat:a','chat:b'],state:'unread',sources:[{chatId:'chat:a',text:'A'},{chatId:'chat:b',text:'B'}]},
      {url:'https://example.com/alice',title:'Only Alice',topic:'books',chatIds:['chat:a'],state:'read',sources:[{chatId:'chat:a',text:'A only'}]},
    ],
    deleted:[],
  };
}

test('deleting a chat preserves shared links and removes only its private links and context',() => {
  const library = libraryWithSharedLink();

  const result = deleteChat(library,'chat:a');

  assert.deepEqual(result,{name:'Alice',removedLinks:1,keptLinks:1});
  assert.deepEqual(library.chats.map(chat => chat.id),['chat:b']);
  assert.deepEqual(library.items.map(item => item.url),['https://example.com/shared']);
  assert.deepEqual(library.items[0].chatIds,['chat:b']);
  assert.deepEqual(library.items[0].sources,[{chatId:'chat:b',text:'B'}]);
  assert.deepEqual(library.deleted,[]);
});

test('custom topics can be added, assigned, and deleted without deleting their links',() => {
  const library = emptyLibrary();
  library.items = [{url:'https://example.com/one',title:'One',topic:'misc-useful',chatIds:[],state:'unread',sources:[]}];

  assert.equal(addTopic(library,'  Distributed systems  '),'Distributed systems');
  assert.equal(addTopic(library,'distributed SYSTEMS'),'Distributed systems');
  setTopic(library,'https://example.com/one','Distributed systems');
  assert.equal(library.items[0].topic,'Distributed systems');

  const result = deleteTopic(library,'Distributed systems');
  assert.deepEqual(result,{name:'Distributed systems',movedLinks:1});
  assert.deepEqual(library.topics,[]);
  assert.equal(library.items[0].topic,'misc-useful');
  assert.equal(library.items.length,1);
});

test('empty custom topics survive backup restoration and library merging',() => {
  const source = emptyLibrary();
  addTopic(source,'Long-form essays');

  const restored = restoreLibrary(JSON.parse(JSON.stringify(source)));
  const destination = emptyLibrary();
  mergeLibrary(destination,restored);

  assert.deepEqual(restored.topics,['Long-form essays']);
  assert.deepEqual(destination.topics,['Long-form essays']);
});
