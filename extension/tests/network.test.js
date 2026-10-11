import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchText } from '../network.js';

test('network reads are bounded and omit cookies', async () => {
  const original = globalThis.fetch;
  let options;
  globalThis.fetch = async (url, opts) => { options = opts; return new Response('abcdefghij',{headers:{'Content-Type':'text/plain'}}); };
  try {
    const result = await fetchText('https://example.com',{},4);
    assert.equal(result.text,'abcd');
    assert.equal(options.credentials,'omit');
    assert.equal(options.referrerPolicy,'no-referrer');
  } finally { globalThis.fetch = original; }
});
