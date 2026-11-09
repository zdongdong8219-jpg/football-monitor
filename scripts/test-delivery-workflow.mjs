import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {validateSchedule,validateTracking,validateAnalysis,routeResearch,validateResearchExecution,planReview,validateDeliveryWorkflow} from './validate-delivery-workflow.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const clone=structuredClone;
let count=0;
const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const report={date:'2026-11-09',scanTable:[{number:'001',kickoff:'2026-11-09T15:00:00+08:00',analysisAudit:{availableEvidence:[{source:'official saved fixture',collectedAt:'2026-11-09T08:00:00+08:00',evidence:'verified kickoff and market'}],gaps:['lineup'],counterevidence:'insufficient lineup confirmation',decision:'reject',reason:'withhold admission pending lineup'}}],reviewSchedule:{lastScheduledKickoff:'2026-11-09T15:00:00+08:00',estimatedEnd:'2026-11-09T17:00:00+08:00',reviewAt:'2026-11-09T17:25:00+08:00',bufferMinutes:25},earlyDeliveryMissed:true,failureReason:'missed verified publication deadline'};
const late=Date.parse('2026-11-09T16:00:00+08:00');
test('schedule valid',()=>validateSchedule(report));
test('missing schedule blocks',()=>assert.throws(()=>validateSchedule({...report,reviewSchedule:null}),/reviewSchedule/));
test('bad schedule arithmetic blocks',()=>assert.throws(()=>validateSchedule({...report,reviewSchedule:{...report.reviewSchedule,bufferMinutes:5}}),/arithmetic/));
const t={id:'2026-11-09-core20-1',date:'2026-11-09',name:'2.0',category:'core20',stake:1000,issued:true,final:true,publishedAt:'2026-11-09T10:00:00+08:00'};
test('ordinary issued tracking valid',()=>validateTracking({trackingHistory:{two:[t]}}));
for(const [name,change] of [['dream',{category:'dream6'}],['disguised dream',{id:'old-dream6'}],['zero stake',{stake:0}],['cancelled',{cancelled:true}],['draft',{final:false}],['unissued',{issued:false}]])test(name+' rejected',()=>assert.throws(()=>validateTracking({trackingHistory:{two:[{...t,...change}]}})));
test('duplicate across groups rejected',()=>assert.throws(()=>validateTracking({trackingHistory:{two:[t],three:[t]}}),/duplicate/));
test('dream cumulative rejected',()=>assert.throws(()=>validateTracking({trackingCumulative:[{category:'dream6'}]}),/cumulative/));
test('per-row evidence plus gaps is valid',()=>validateAnalysis(report,late));
test('missing counterevidence rejected',()=>{const r=clone(report);delete r.scanTable[0].analysisAudit.counterevidence;assert.throws(()=>validateAnalysis(r,late));});
test('missing early failure rejected',()=>assert.throws(()=>validateAnalysis({...report,earlyDeliveryMissed:false},late),/failure/));
test('late sweep cannot be early success',()=>assert.throws(()=>validateAnalysis({...report,earlyCompleted:true},late),/claimed/));
test('18:00 is not early',()=>{const r=clone(report);r.scanTable[0].kickoff='2026-11-09T18:00:00+08:00';delete r.earlyDeliveryMissed;validateAnalysis(r,late);});
const file='scripts/test-delivery-workflow.mjs',hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const w={phase:'handoff_ready',packet:{path:file,sha256:hash},requiredArtifacts:[{path:file,sha256:hash}],lastRealProgressAt:'2026-11-09T08:00:00+08:00'};
const good=routeResearch(w,root,late);
test('valid complete packet is read only even after owner stops',()=>assert.equal(good.allowTask6Fetch,false));
test('valid packet forbids redundant fetch',()=>assert.throws(()=>validateResearchExecution({owner:'task6',fetches:[{}]},good),/redundant/));
test('artifacts alone do not replace missing packet',()=>assert.equal(routeResearch({...w,packet:null},root,late).owner,'task6'));
for(const [name,bad] of [['missing packet',null],['missing required artifact',{...w,requiredArtifacts:[{path:'does-not-exist',sha256:hash}]}],['hash error',{...w,requiredArtifacts:[{path:file,sha256:'bad'}]}],['interrupted',{...w,phase:'interrupted'}],['stale unfinished packet',{...w,phase:'collecting'}]])test(name+' routes to task6',()=>assert.equal(routeResearch(bad,root,late).owner,'task6'));
test('near deadline missing packet routes to task6',()=>assert(routeResearch(null,root,late,'2026-11-09T16:30:00+08:00').reasons.includes('delivery_window_45m')));
test('takeover requires collection audit',()=>assert.throws(()=>validateResearchExecution({owner:'task6',mode:'minimal_gap_collection',failureReason:'missing packet',fetches:[]},routeResearch(null,root,late))));
test('takeover with source evidence accepted',()=>validateResearchExecution({owner:'task6',mode:'minimal_gap_collection',failureReason:'missing packet',fetches:[{source:'official',collectedAt:'2026-11-09T15:55:00+08:00',gap:'lineup',outcome:'saved',evidenceUsed:['confirmed absence']}]},routeResearch(null,root,late)));
const due=Date.parse('2026-11-09T18:00:00+08:00');
test('missing review triggers result verification',()=>assert.equal(planReview(report,null,null,null,due).action,'verify_results'));
test('finished fixtures recover missing review',()=>assert.equal(planReview(report,null,null,[{verified:true,finished:true}],due).action,'recover_review'));
test('unfinished fixtures follow up',()=>assert.equal(planReview(report,null,null,[{verified:true,finished:false}],due).action,'incremental_followup'));
test('before schedule waits',()=>assert.equal(planReview(report,null,null,null,late).action,'wait'));
test('real current build preserves legacy',()=>validateDeliveryWorkflow(root));
// Exercise the actual check-build entry point in an isolated fixture directory.
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'football-workflow-test-'));
try {
  fs.mkdirSync(path.join(stage,'scripts'));fs.mkdirSync(path.join(stage,'data'));
  for(const name of fs.readdirSync(path.join(root,'scripts')).filter(n=>n.endsWith('.mjs')))fs.copyFileSync(path.join(root,'scripts',name),path.join(stage,'scripts',name));
  for(const name of ['review-latest.json','workflow-legacy-tracking.json'])fs.copyFileSync(path.join(root,'data',name),path.join(stage,'data',name));
  const original=JSON.parse(fs.readFileSync(path.join(root,'data/latest.json'),'utf8'));
  const cases=[['missing schedule',r=>{r.reviewSchedule=null;},'reviewSchedule'],['dream',r=>{r.trackingHistory.dream.push({...t,id:'injected-dream6',category:'dream6'});},'dream/nonordinary'],['stake0',r=>{r.trackingHistory.two.push({...t,stake:0});},'nonpositive'],['duplicate',r=>{r.trackingHistory.two.push(clone(r.trackingHistory.two[0]));},'duplicate']];
  for(const [name,mutate,expected] of cases)test('check-build rejects '+name,()=>{
    const r=clone(original);mutate(r);fs.writeFileSync(path.join(stage,'data/latest.json'),JSON.stringify(r));
    const result=spawnSync(process.execPath,['scripts/check-build.mjs'],{cwd:stage,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,new RegExp('Delivery workflow:.*'+expected));
  });
  test('check-build rejects zero dream3 in a new final report',()=>{
    const r=clone(original);r.date='2026-11-09';r.finalLocked=true;r.infoOnly=true;r.recommendations=r.recommendations.filter(t=>t.category!=='dream3');r.dream3Assessment={selectedCount:0,reason:'negative test, never a recommendation'};
    fs.writeFileSync(path.join(stage,'data/latest.json'),JSON.stringify(r));
    const result=spawnSync(process.execPath,['scripts/check-build.mjs'],{cwd:stage,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/Dream3: final reports require 1-5/);
  });
  test('check-build rejects synthetic fixture publication',()=>{
    const r=clone(original);r.testOnly=true;
    fs.writeFileSync(path.join(stage,'data/latest.json'),JSON.stringify(r));
    const result=spawnSync(process.execPath,['scripts/check-build.mjs'],{cwd:stage,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/synthetic test fixtures cannot be published/);
  });
} finally {
  if(path.dirname(stage)!==os.tmpdir() || !path.basename(stage).startsWith('football-workflow-test-'))throw Error('Unexpected test cleanup path');
  fs.rmSync(stage,{recursive:true,force:true});
}
console.log(`${count} workflow tests passed`);
