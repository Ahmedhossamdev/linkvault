import test from 'node:test';
import assert from 'node:assert/strict';
import * as importer from '../import.js';
import { markdown } from '../core.js';
import { emptyLibrary, ensureChat, ingest } from '../library.js';

// Keep missing feature failures as assertions so every case can run before implementation.
function importMarkdown(text) {
  assert.equal(typeof importer.importMarkdown, 'function', 'Markdown importer must be exported');
  return importer.importMarkdown(text);
}

test('Markdown headings supply collection name and per-link topics', () => {
  const result = importMarkdown('# My collection\n\n## Research\n- [Paper](https://example.com/Paper)\n## Books\n[Novel](https://example.com/Novel)');
  assert.equal(result.name, 'My collection');
  assert.deepEqual(result.links.map(({title,topic}) => ({title,topic})), [
    {title:'Paper',topic:'Research'}, {title:'Novel',topic:'Books'},
  ]);
});

test('Markdown destinations preserve balanced parentheses, query punctuation and path case', () => {
  const result = importMarkdown('[Nested](https://example.com/Case_(one_(two))?Q=(A)&Keep=Yes) [Escaped](https://example.com/a\\(b\\)) [Angle](<https://example.com/Other_(X)?q=One&v=Two> "tooltip")');
  assert.deepEqual(result.links.map(item => item.url), [
    'https://example.com/Case_(one_(two))?Q=(A)&Keep=Yes',
    'https://example.com/a(b)',
    'https://example.com/Other_(X)?q=One&v=Two',
  ]);
});

test('Markdown labels unescape punctuation and allow nested brackets', () => {
  const result = importMarkdown(String.raw`[A \[label\] and \\ path](https://example.com/one) [A [nested] label](https://example.com/two)`);
  assert.deepEqual(result.links.map(item => item.title), ['A [label] and \\ path','A [nested] label']);
});

test('Markdown autolinks deduplicate through URL normalization', () => {
  const result = importMarkdown('[First](https://EXAMPLE.com/Article?utm_source=chat&Q=Yes) <https://example.com/Article?Q=Yes> <http://example.org/Case>');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/Article?Q=Yes','http://example.org/Case']);
  assert.equal(result.links[0].title, 'First');
});

test('Markdown resolves full, collapsed and shortcut references without importing unused definitions', () => {
  const result = importMarkdown('[Full][ A   REF ] [Collapsed][] [Shortcut]\n\n[a ref]: https://example.com/Full_(X) "tooltip"\n[collapsed]: <https://example.com/Collapsed>\n[shortcut]: https://example.com/Shortcut\n[unused]: https://example.com/Unused\n[a ref]: https://example.com/Wrong');
  assert.deepEqual(result.links.map(({title,url}) => ({title,url})), [
    {title:'Full',url:'https://example.com/Full_(X)'},
    {title:'Collapsed',url:'https://example.com/Collapsed'},
    {title:'Shortcut',url:'https://example.com/Shortcut'},
  ]);
});

test('Markdown accepts only valid HTTP and HTTPS links under existing merge rules', () => {
  const result = importMarkdown('[JS](javascript:alert(1)) [File](file:///tmp/data) [Mail](mailto:a@example.com) [Relative](/local) [Credentials](https://user:pass@example.com/) [Bad](https://) [Valid](https://example.com/valid)');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/valid']);
});

test('Markdown ignores images including reference images and links in image descriptions', () => {
  const result = importMarkdown('![Image](https://example.com/image) ![Reference][img] ![Shortcut] ![Nested [link](https://example.com/nested)](https://example.com/outer)\n[img]: https://example.com/reference\n[shortcut]: https://example.com/shortcut\n[Real](https://example.com/real)');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/real']);
});

test('Markdown ignores backtick and tilde fences, indented code and inline code', () => {
  const result = importMarkdown('# Collection\n```md\n# Wrong\n[Code](https://example.com/fenced)\n````\n~~~\n<https://example.com/tilde>\n~~~\n    [Indented](https://example.com/indented)\n`[Inline](https://example.com/inline)` ``[Other](https://example.com/other) ` text``\n[Real](https://example.com/real)');
  assert.equal(result.name, 'Collection');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/real']);
});

test('Markdown ignores exported nested context links and context continuation lines', () => {
  const result = importMarkdown('- [Saved](https://example.com/saved)\n  - Friend | [Unrelated](https://example.com/context) <https://example.com/autocontext>\n    [Continuation](https://example.com/continuation)\n- [Next](https://example.com/next)');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/saved','https://example.com/next']);
  assert.deepEqual(result.links.map(item => item.sources), [[],[]]);
});

test('LinkVault Markdown export round trips escaped headings and original URL identity', () => {
  const text = markdown([{title:'A [paper] \\ notes',url:'https://example.com/Case_(X)?Q=Yes',topic:'Research_[one]',sources:[{text:'See [other](https://example.com/context)'}]}], 'Friends [2026]', true);
  const result = importMarkdown(text);
  assert.equal(result.name, 'Friends [2026]');
  assert.deepEqual(result.links.map(({title,url,topic,sources}) => ({title,url,topic,sources})), [{
    title:'A [paper] \\ notes',url:'https://example.com/Case_(X)?Q=Yes',topic:'Research_[one]',sources:[],
  }]);
});

test('all exported reading suffixes are removed and ingested links remain unread', () => {
  const result = importMarkdown('# Export\n## Science\n- [First (To read)](https://example.com/one)\n- [Second (Reading)](https://example.com/two)\n- [Third (Read)](https://example.com/three)\n- [Fourth (Archived)](https://example.com/four)\n- [Keep (Research)](https://example.com/five)');
  assert.deepEqual(result.links.map(item => item.title), ['First','Second','Third','Fourth','Keep (Research)']);
  const library = emptyLibrary();
  const chat = ensureChat(library, 'import', result.name);
  ingest(library, chat.id, result.links);
  assert.deepEqual(library.items.map(item => item.state), ['unread','unread','unread','unread','unread']);
});

test('Markdown HTML is inert and HTML anchors and bare context URLs are not imported', () => {
  const result = importMarkdown('<a href="https://example.com/html">HTML</a>\n<script>alert("never run")</script>\nhttps://example.com/plain\n[<img onerror="alert(1)">](https://example.com/real)');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/real']);
  assert.equal(result.links[0].title, '<img onerror="alert(1)">');
});

test('Markdown empty and malformed input yields no accidental URLs', () => {
  assert.deepEqual(importMarkdown(''), {name:'',links:[]});
  assert.deepEqual(importMarkdown('[broken](https://example.com/unclosed\n[unknown][missing]\n\\[escaped](https://example.com/escaped)'), {name:'',links:[]});
});

test('Markdown handles long unmatched delimiter runs without recursion or false imports', () => {
  const result = importMarkdown('['.repeat(20000) + '\nunmatched ' + '`'.repeat(20000) + '\n[Real](https://example.com/real)');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/real']);
});

test('Markdown code spans treat backslashes as literal before closing backticks', () => {
  const result = importMarkdown('`[Code](https://example.com/code) \\` [Real](https://example.com/real)');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/real']);
});

test('Markdown code spans can cross lines without importing references or headings inside', () => {
  const result = importMarkdown('Start `\n# Hidden\n[bad]: https://example.com/bad\n<https://example.com/code>\n`\n[bad]\n[Real](https://example.com/real)');
  assert.equal(result.name, '');
  assert.deepEqual(result.links.map(item => item.url), ['https://example.com/real']);
});

test('Markdown destinations decode common named character references once', () => {
  const result = importMarkdown('[Search](https://example.com/?a=1&amp;b=2&amp;literal=&amp;amp;) [Named](<https://example.com/?q=&quot;A&quot;&amp;tag=&lt;B&gt;&amp;apostrophe=&apos;&amp;space=&nbsp;>)');
  assert.deepEqual(result.links.map(item => item.url), [
    'https://example.com/?a=1&b=2&literal=&amp;',
    'https://example.com/?q=%22A%22&tag=%3CB%3E&apostrophe=%27&space=%C2%A0',
  ]);
});

test('Markdown references decode decimal and hexadecimal Unicode character references', () => {
  const result = importMarkdown('[Reference][ref]\n[ref]: <https://example.com/Case_&#40;X&#x29;?a=1&#38;b=2&#x26;unicode=&#x1F600;>');
  assert.equal(result.links[0].url, 'https://example.com/Case_(X)?a=1&b=2&unicode=%F0%9F%98%80');
});

test('Markdown destination decoding preserves percent escapes, escaped ampersands and unknown references', () => {
  const result = importMarkdown('[Escaped](https://example.com/Case_%28X%29?x=\\&amp;&unknown;) [Raw](https://example.com/Case_(X)?x=&amp;)');
  assert.deepEqual(result.links.map(item => item.url), [
    'https://example.com/Case_%28X%29?x=&amp;&unknown;',
    'https://example.com/Case_(X)?x=&',
  ]);
});

test('Markdown numeric references replace invalid Unicode values without throwing', () => {
  const result = importMarkdown('[Invalid](https://example.com/?a=&#0;&amp;b=&#xD800;&amp;c=&#x110000;)');
  assert.equal(result.links[0].url, 'https://example.com/?a=%EF%BF%BD&b=%EF%BF%BD&c=%EF%BF%BD');
});

test('Markdown decoded destinations still obey URL safety rules and keep headings and titles inert', () => {
  const result = importMarkdown('# &lt;Collection&gt;\n## &lt;Topic&gt;\n[Unsafe](javascript&#58;alert(1)) [Credentials](https://user&#58;pass@example.com/) [<img onerror="alert(1)">](https://example.com/?q=&lt;script&gt;)');
  assert.equal(result.name, '&lt;Collection&gt;');
  assert.equal(result.links.length, 1);
  assert.equal(result.links[0].topic, '&lt;Topic&gt;');
  assert.equal(result.links[0].title, '<img onerror="alert(1)">');
  assert.equal(result.links[0].url, 'https://example.com/?q=%3Cscript%3E');
});
