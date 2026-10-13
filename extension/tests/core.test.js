import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeURL, mergeLinks, markdown, classify } from '../core.js';

test('URLs retain case-sensitive paths and meaningful queries', () => {
  assert.equal(normalizeURL('https://example.com/ABC?utm_source=chat&id=2#section'), 'https://example.com/ABC?id=2#section');
  assert.equal(normalizeURL('javascript:alert(1)'), null);
  assert.equal(normalizeURL('https://www.linkedin.com/in/person'), null);
  assert.equal(normalizeURL('https://www.linkedin.com/posts/hello'), 'https://www.linkedin.com/posts/hello');
  assert.equal(normalizeURL('https://example.org/resource'), 'https://example.org/resource');
});
test('merge preserves edits and repeated-message provenance', () => {
  const a = {url:'https://example.com/', title:'Edited', topic:'personal', sources:[{text:'first'}], selected:false};
  const links = mergeLinks([a], [{url:a.url,title:'New',sources:[{text:'second'}]}]);
  assert.equal(links.length, 1);
  assert.equal(links[0].title, 'Edited');
  assert.equal(links[0].selected, false);
  assert.equal(links[0].sources.length, 2);
});
test('export escapes Markdown syntax and excludes deselected items', () => {
  const output = markdown([{url:'https://example.com/a(b)',title:'[title]\nnext',topic:'db',selected:true,sources:[]},{url:'https://hidden.com',selected:false}], 'Friends');
  assert.ok(output.includes('\\[title\\] next'));
  assert.ok(output.includes('](<https://example.com/a(b)>)'));
  assert.ok(!output.includes('hidden.com'));
});
test('local keyword topics remain available without an AI integration', () => {
  assert.equal(classify('Postgres tutorial','https://example.com'), 'db');
});
test('local suggestions cover subjects beyond programming, including video subjects',() => {
  for (const [title,expected] of [['Astronomy and space exploration','science'],['A history of ancient Rome','history'],['Books and literature','books'],['Personal finance and investing','finance'],['Travel in Japan','travel'],['Nutrition and wellbeing','health'],['Photography composition','photography'],['Philosophy of ethics','philosophy'],['Music theory','music'],['Climate and sustainability','environment'],['UX and typography','design']]) assert.equal(classify(title,'https://example.com'),expected);
  assert.equal(classify('Astronomy explained','https://youtube.com/watch?v=1'),'science');
});
