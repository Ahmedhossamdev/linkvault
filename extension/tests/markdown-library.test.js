import test from 'node:test';
import assert from 'node:assert/strict';
import { markdown } from '../core.js';
import { importMarkdown } from '../import.js';
import { emptyLibrary, ensureChat, ingest, setState, deleteEntry } from '../library.js';

test('Markdown reimport preserves Read progress for a URL containing parentheses', () => {
  const library = emptyLibrary();
  const original = ensureChat(library, 'original', 'Original');
  const url = 'https://example.com/Case_(X)?Q=(A)';
  ingest(library, original.id, [{url,title:'Article'}]);
  setState(library, url, 'read');
  const exported = markdown(library.items.map(item => ({...item,title:`${item.title} (Read)`})));
  const imported = ensureChat(library, 'import', 'Imported');
  ingest(library, imported.id, importMarkdown(exported).links);
  assert.equal(library.items.length, 1);
  assert.equal(library.items[0].url, url);
  assert.equal(library.items[0].state, 'read');
  assert.deepEqual(library.items[0].chatIds, [original.id,imported.id]);
});

test('Markdown reimport cannot bypass deletion exclusions for URLs containing parentheses', () => {
  const library = emptyLibrary();
  const chat = ensureChat(library, 'original', 'Original');
  const url = 'https://example.com/Case_(X)?Q=(A)';
  ingest(library, chat.id, [{url,title:'Article'}]);
  const exported = markdown(library.items);
  deleteEntry(library, url);
  ingest(library, chat.id, importMarkdown(exported).links);
  assert.deepEqual(library.items, []);
  assert.deepEqual(library.deleted, [url]);
});

test('Markdown round trips keep originally percent-encoded URLs distinct and stable', () => {
  const library = emptyLibrary();
  const chat = ensureChat(library, 'original', 'Original');
  const literal = 'https://example.com/Case_(X)?Q=(A)';
  const encoded = 'https://example.com/Case_%28X%29?Q=%28A%29';
  ingest(library, chat.id, [{url:literal,title:'Literal'},{url:encoded,title:'Encoded'}]);
  setState(library, encoded, 'read');
  const exported = markdown(library.items);
  const imported = importMarkdown(exported);
  assert.deepEqual(imported.links.map(item => item.url), [literal,encoded]);
  ingest(library, chat.id, imported.links);
  assert.deepEqual(library.items.map(({url,state}) => ({url,state})), [
    {url:literal,state:'unread'}, {url:encoded,state:'read'},
  ]);
  const fresh = emptyLibrary();
  const restoredChat = ensureChat(fresh, 'restored', 'Restored');
  ingest(fresh, restoredChat.id, imported.links);
  assert.deepEqual(fresh.items.map(({url,state}) => ({url,state})), [
    {url:literal,state:'unread'}, {url:encoded,state:'unread'},
  ]);
});

test('Markdown export and reimport preserve literal entity-like query keys and values', () => {
  const library = emptyLibrary();
  const chat = ensureChat(library, 'original', 'Original');
  const url = 'https://example.com/Case_(X)?a=1&amp;b=2&literal=&copy;&unknown;';
  ingest(library, chat.id, [{url,title:'Query'}]);
  setState(library, url, 'read');
  const imported = importMarkdown(markdown(library.items));
  assert.equal(imported.links[0].url, url);
  ingest(library, chat.id, imported.links);
  assert.equal(library.items.length, 1);
  assert.equal(library.items[0].state, 'read');
});
