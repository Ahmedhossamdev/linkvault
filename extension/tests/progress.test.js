import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync(new URL('../progress.js',import.meta.url),'utf8'),context);
const ui = context.LinkVaultProgress;
function element(tag) {
  return {tag,style:{},children:[],textContent:'',attributes:{},append(...items){this.children.push(...items);},setAttribute(key,value){this.attributes[key] = value;},attachShadow(){this.shadow = element('shadow');return this.shadow;},remove(){this.removed = true;}};
}
test('elapsed clock handles zero, minutes, and long sessions',() => {
  assert.equal(ui.clock(0),'00:00');assert.equal(ui.clock(61750),'01:01');assert.equal(ui.clock(-100),'00:00');assert.equal(ui.clock(600000),'10:00');
});
test('widget reflects activity and Stop invokes the collector callback',() => {
  const document = {createElement:element,documentElement:element('html')};let stops = 0;
  const widget = ui.createWidget(document,() => {stops++;});
  const host = document.documentElement.children[0];const section = host.shadow.children[1];
  widget.update({running:true,phase:'scrolling',elapsedMs:1500,totalLinks:8,scrollSteps:2});
  assert.equal(section.children[1].textContent,'Scrolling');assert.match(section.children[2].textContent,/00:01 elapsed · 8 links saved · 2 scrolls/);
  const [stop,dismiss] = section.children[4].children;assert.equal(dismiss.disabled,true);stop.onclick();assert.equal(stops,1);
  widget.update({running:false,phase:'stopped',elapsedMs:1500,totalLinks:8,scrollSteps:2});
  assert.equal(stop.disabled,true);assert.equal(dismiss.disabled,false);dismiss.onclick();assert.equal(host.removed,true);
});
