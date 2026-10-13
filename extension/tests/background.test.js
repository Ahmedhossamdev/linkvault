import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const dashboard = 'chrome-extension://linkvault/app.html';
async function fixture(pages) {
  const calls = [];
  let click;
  const chrome = {
    action:{onClicked:{addListener(listener){click = listener;}}},
    runtime:{getURL:path => `chrome-extension://linkvault/${path}`},
    tabs:{
      query:async () => pages,
      update:async (id,options) => calls.push(['focus',id,options]),
      remove:async id => calls.push(['remove',id]),
      create:async options => calls.push(['create',options]),
    },
  };
  vm.runInNewContext(await readFile(new URL('../background.js',import.meta.url),'utf8'),{chrome});
  return {calls,click};
}

for (const url of [dashboard,`${dashboard}?tab=7`]) {
  test(`toolbar on ${url} retains the dashboard and its source connection`,async () => {
    const f = await fixture([{id:9,url},{id:10,url:`${dashboard}?tab=8`}]);
    await f.click({id:9,url});
    assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[['focus',9,{active:true}]]);
  });
}

test('LinkedIn toolbar closes dashboards and connects the original source',async () => {
  const f = await fixture([{id:9,url:`${dashboard}?tab=8`},{id:10,url:dashboard}]);
  await f.click({id:7,url:'https://www.linkedin.com/messaging/thread/source/'});
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[
    ['remove',9],['remove',10],['create',{url:`${dashboard}?tab=7`}],
  ]);
});

test('lookalike dashboard prefixes neither retain themselves nor get removed as dashboards',async () => {
  const url = `${dashboard}-unrelated`;
  const f = await fixture([{id:9,url:dashboard},{id:7,url}]);
  await f.click({id:7,url});
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[
    ['remove',9],['create',{url:`${dashboard}?tab=7`}],
  ]);
});
