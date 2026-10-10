import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('public/index.html','utf8');
const source=html.slice(html.indexOf('    function dreamCost('),html.indexOf('    function renderDreamCost('));
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
assert.equal(ctx.dreamCost(5,0,[3],1).cost,20);
assert.equal(ctx.dreamCost(6,0,[3,4,5],1).cost,82);
assert.equal(ctx.dreamCost(5,2,[5],1).cost,8);
// Three doubled tickets and four single tickets in a three-leg subset of four matches.
assert.equal(ctx.dreamCost(4,1,[3],1).count,7);
assert.equal(ctx.dreamCost(5,2,[5,5],1).count,4);
assert.throws(()=>ctx.dreamCost(4,5,[4],1));
assert.throws(()=>ctx.dreamCost(4,0,[5],1));
assert.throws(()=>ctx.dreamCost(4,0,[3],0));
console.log('Dream cost checks passed');
