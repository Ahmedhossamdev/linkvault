import test from 'node:test';
import assert from 'node:assert/strict';
import { importJSON, importText } from '../import.js';

test('JSON backups round trip selections and message context', () => {
  const result = importJSON(JSON.stringify({version:1,name:'Friends',links:[{url:'https://example.com/article',title:'Article',topic:'reading',selected:false,sources:[{sender:'Friend',date:'2026-01-01',text:'Read this'}]}]}));
  assert.equal(result.name,'Friends');
  assert.equal(result.links[0].selected,false);
  assert.equal(result.links[0].sources[0].text,'Read this');
});
test('invalid imported data is rejected before collection mutation', () => {
  assert.throws(() => importJSON('{"version":2,"links":[]}'));
  assert.throws(() => importJSON('{"version":1,"links":[{"url":42}]}'));
  assert.equal(importJSON('{"version":1,"links":[{"url":"javascript:alert(1)"}]}').links.length,0);
});
test('text imports deduplicate without restricting domain suffixes', () => {
  const links = importText('https://example.xyz/path\nhttps://example.xyz/path\nhttps://example.com/other.');
  assert.equal(links.length,2);
  assert.equal(links[1].url,'https://example.com/other');
});
