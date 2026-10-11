import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyLibrary, ensureChat, ingest, setState, deleteEntry } from '../library.js';
import { readingReport } from '../reports.js';

test('reports count unique links across chats and separate all reading states',() => {
  const library = emptyLibrary(), a = ensureChat(library,'a','Alice'), b = ensureChat(library,'b','Bob');
  ingest(library,a.id,[{url:'https://example.com/science',topic:'science'},{url:'https://example.com/books',topic:'books'},{url:'https://example.com/music',topic:'music'}]);
  ingest(library,b.id,[{url:'https://example.com/science',topic:'science'},{url:'https://example.com/travel',topic:'travel'}]);
  setState(library,'https://example.com/science','read');setState(library,'https://example.com/books','reading');setState(library,'https://example.com/music','archived');
  const report = readingReport(library);
  assert.equal(report.total,4);assert.deepEqual(report.counts,{unread:1,reading:1,read:1,archived:1});assert.equal(report.readPercent,25);
  assert.equal(report.byChat.find(row => row.id === a.id).total,3);assert.equal(report.byChat.find(row => row.id === b.id).counts.read,1);
  assert.equal(report.byTopic.find(row => row.topic === 'science').counts.read,1);
  deleteEntry(library,'https://example.com/science');assert.equal(readingReport(library).counts.read,0);
});
test('empty reports have zero totals without NaN or invented reading dates',() => {
  const report = readingReport(emptyLibrary());assert.equal(report.total,0);assert.equal(report.readPercent,0);assert.deepEqual(report.byChat,[]);assert.deepEqual(report.byTopic,[]);
});
