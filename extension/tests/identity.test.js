import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));

test('browser and toolbar icons are packaged at each declared pixel size',async () => {
  assert.ok(manifest.icons,'The extension must have its own icon set');
  assert.deepEqual(Object.keys(manifest.icons),['16','32','48','128']);
  assert.deepEqual(manifest.action.default_icon,manifest.icons);
  for (const [size,path] of Object.entries(manifest.icons)) {
    assert.ok(path.startsWith('icons/'));
    const bytes = await readFile(new URL(`../${path}`,import.meta.url));
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16),Number(size));
    assert.equal(bytes.readUInt32BE(20),Number(size));
  }
});

test('dashboard brand images and favicon resolve to packaged local assets',async () => {
  const html = await readFile(new URL('../app.html',import.meta.url),'utf8');
  const marks = [...html.matchAll(/<img[^>]+class="brand-mark[^\"]*"[^>]+src="([^\"]+)"/g)];
  assert.equal(marks.length,2,'Light and dark marks must both be packaged');
  for (const match of marks) {
    const svg = await readFile(new URL(`../${match[1]}`,import.meta.url),'utf8');
    assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<script|<image|(?:href|src)="https?:\/\//);
  }
  assert.match(html,/<link rel="icon"[^>]+href="icons\/icon-32.png"/);
});
