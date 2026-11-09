import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateDreamThree,dreamThreeBranches,validateDreamThreeHandoff} from './validate-dream-three.mjs';
// In-memory test inputs only; no fixture file or report is created.
function dreamThreeFixture(count=1){
 const rawArtifact='scripts/test-dream-three.mjs',sha256=crypto.createHash('sha256').update(fs.readFileSync(new URL('./test-dream-three.mjs',import.meta.url))).digest('hex');
 const report={date:'2026-11-09',publishedAt:'2026-11-09T11:00:00+08:00',infoOnly:true,finalLocked:true,dream3Assessment:{selectedCount:count,reason:'合成结构测试，不是真实比赛推荐。'},scanTable:[],recommendations:[],trackingHistory:{two:[],three:[]},ticketClassStatus:[]};
 for(let i=0;i<count;i++){
  const t={id:'synthetic-dream3-'+i,name:'本地结构样例·非推荐',category:'dream3',trackingEligible:false,autoBet:false,assessedAt:'2026-11-09T10:00:00+08:00',qualityReason:'结构测试：三场独立，不表示真实比赛观点。',strongestCounterevidence:'仅测试结构，未作实战研究。',legs:[]};
  for(let j=0;j<3;j++){
   const id=i*3+j+1,number='样例'+String(id).padStart(3,'0'),kickoff='2026-11-09T20:00:00+08:00';
   const l={number,officialMatchId:id,kickoff,handicap:-1,primaryJudgment:'样例主队净胜一球方向。',strongestCounterevidence:'样例反证：进攻效率不足可能战平。',sources:[{url:'https://example.test/prematch',collectedAt:'2026-11-09T09:00:00+08:00',evidence:'合成测试资料，不是真实赛况。'}],options:[]};
   const defs=j===0?[['hhad','d','让平',3.2],['had','d','平',3.1]]:[['had',j===1?'h':'a',j===1?'胜':'负',1.8]];
   for(const [market,key,selection,odds] of defs)l.options.push({market,key,selection,odds,qualification:{status:'Selling',allUp:1,passSizes:[3],mixedAllUp:true,market,officialMatchId:id,checkedAt:'2026-11-09T09:00:00+08:00',saleCloseAt:'2026-11-09T19:45:00+08:00',source:{url:'https://example.test/official-snapshot',rawArtifact,sha256}}});
   l.primaryOption=l.options[0].market+':'+l.options[0].key;
   if(j===1)l.primaryJudgment='样例主队方向，胜幅不升级。';
   if(j===2)l.primaryJudgment='样例客队方向，胜幅不升级。';
   if(j===0){l.coverageReason='一球胜与战平是互斥的两个边界。';l.drawCounterevidence='前场机会转化不足可能无法打破平衡。';l.netGoalBoundary={mainMargins:[1],coverMargins:[0],reason:'主队让1球：让平=净胜1球，普通平=净胜0球。'};}
   t.legs.push(l);report.scanTable.push({number,officialMatchId:id,kickoff,handicap:-1,teams:'测试主队 : 测试客队',league:'测试',buy:'观望',primaryPick:'观望',speculative:'无',goals:'—',halfFull:'—',score:'—'});
  }
  t.branches=dreamThreeBranches(t.legs);t.combinationCount=t.branches.length;report.recommendations.push(t);
 }
 if(!count)report.ticketClassStatus.push({category:'dream3',status:'withheld',reason:'本地空集合测试：无合格组合，不凑数。'});
 return report;
}


const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const bad=(name,mutate,pattern)=>test(name,()=>{const r=dreamThreeFixture();mutate(r,r.recommendations[0],r.recommendations[0].legs[0]);assert.throws(()=>validateDreamThree(r,root),pattern);});
for(const n of [1,5])test(n+' final combinations valid',()=>validateDreamThree(dreamThreeFixture(n),root));
test('zero final combinations rejected',()=>assert.throws(()=>validateDreamThree(dreamThreeFixture(0),root),/1-5/));
test('infoOnly cannot bypass mandatory final combination',()=>{const r=dreamThreeFixture(0);r.infoOnly=true;assert.throws(()=>validateDreamThree(r,root),/1-5/);});
test('unlocked research draft may still have zero',()=>{const r=dreamThreeFixture(0);r.finalLocked=false;validateDreamThree(r,root);});
test('six rejected',()=>assert.throws(()=>validateDreamThree(dreamThreeFixture(6),root),/1-5/));
bad('two fixtures rejected',(r,t)=>t.legs.pop(),/three independent/);
bad('repeated fixture identity rejected',(r,t)=>t.legs[1].officialMatchId=t.legs[0].officialMatchId,/three independent/);
bad('unknown match rejected',(r,t,l)=>l.number='unknown',/identity/);
bad('closed market rejected',(r,t,l)=>l.options[0].qualification.status='Closed',/on sale/);
bad('pass not eligible rejected',(r,t,l)=>l.options[0].qualification.passSizes=[2],/on sale/);
bad('mixed pass not eligible rejected',(r,t,l)=>l.options[0].qualification.mixedAllUp=false,/on sale/);
bad('invalid odds rejected',(r,t,l)=>l.options[0].odds=0,/odds/);
bad('missing coverage rejected',(r,t,l)=>delete l.coverageReason,/coverage/);
bad('missing draw counterevidence rejected',(r,t,l)=>delete l.drawCounterevidence,/coverage/);
bad('incorrect margin boundary rejected',(r,t,l)=>l.netGoalBoundary.coverMargins=[1],/boundary/);
bad('missing primary judgment rejected',(r,t,l)=>delete l.primaryJudgment,/evidence/);
bad('missing strongest counterevidence rejected',(r,t,l)=>delete l.strongestCounterevidence,/evidence/);
bad('qualification hash rejected',(r,t,l)=>l.options[0].qualification.source.sha256='a'.repeat(64),/hash/);
bad('late publication rejected',r=>r.publishedAt='2026-11-09T20:01:00+08:00',/after close/);
bad('missing option market rejected',(r,t,l)=>delete l.options[0].market);
bad('branch odds rejected',(r,t)=>t.branches[0].odds+=1,/branch odds/);
bad('branch count rejected',(r,t)=>t.combinationCount=8,/expansion/);
bad('dream tracking rejected',(r,t)=>r.trackingHistory.two.push(t),/tracking/);
bad('dream cumulative rejected',r=>r.trackingCumulative=[{category:'dream3',net:1}],/tracking/);
bad('dream autobet rejected',(r,t)=>t.autoBet=true,/autobet/);
bad('missing final quality decision rejected',r=>delete r.dream3Assessment,/quality decision/);
test('handoff rejects unassessed optional class',()=>assert.throws(()=>validateDreamThreeHandoff({date:'2026-11-09',researchWorkflow:{phase:'handoff_ready'}}),/handoff/));
test('handoff explicit no candidates is valid',()=>validateDreamThreeHandoff({date:'2026-11-09',researchWorkflow:{phase:'handoff_ready',dream3Research:{candidateNumbers:[],qualificationArtifacts:[],coverageGaps:['no eligible fixtures'],reason:'没有在售候选，不凑组合。'}}}));
test('shared legs require concentration disclosure',()=>{const r=dreamThreeFixture(2),t=r.recommendations[1];t.legs[0]=structuredClone(r.recommendations[0].legs[0]);t.branches=dreamThreeBranches(t.legs);assert.throws(()=>validateDreamThree(r,root),/concentration/);for(const x of r.recommendations){x.sharedMatchIds=[1];x.concentrationRisk='样例001被两票共用，失误将同时影响两组。';}validateDreamThree(r,root);});
test('ordinary win/draw defensive alternative valid',()=>{const r=dreamThreeFixture(),t=r.recommendations[0],l=t.legs[0];Object.assign(l.options[0],{market:'had',key:'h',selection:'胜'});l.options[0].qualification.market='had';l.primaryOption='had:h';l.netGoalBoundary.mainMargins=[1,2];t.branches=dreamThreeBranches(t.legs);validateDreamThree(r,root);});
test('ordinary lose/draw defensive alternative valid',()=>{const r=dreamThreeFixture(),t=r.recommendations[0],l=t.legs[0];Object.assign(l.options[0],{market:'had',key:'a',selection:'负'});l.options[0].qualification.market='had';l.primaryOption='had:a';l.netGoalBoundary.mainMargins=[-1,-2];t.branches=dreamThreeBranches(t.legs);validateDreamThree(r,root);});
test('three dual selections expand to eight branches',()=>{const r=dreamThreeFixture(),t=r.recommendations[0];for(let i=1;i<3;i++){const l=structuredClone(t.legs[0]),prior=t.legs[i];Object.assign(l,{number:prior.number,officialMatchId:prior.officialMatchId});l.options.forEach(o=>o.qualification.officialMatchId=prior.officialMatchId);t.legs[i]=l;}t.branches=dreamThreeBranches(t.legs);t.combinationCount=t.branches.length;assert.equal(t.combinationCount,8);validateDreamThree(r,root);});
test('nested win/handicap draw is not defensive alternative',()=>{const r=dreamThreeFixture(),t=r.recommendations[0],l=t.legs[0];Object.assign(l.options[1],{market:'had',key:'h',selection:'胜'});l.netGoalBoundary.coverMargins=[2];t.branches=dreamThreeBranches(t.legs);assert.throws(()=>validateDreamThree(r,root),/overlapping/);});
test('historical final report is not backfilled',()=>validateDreamThree({date:'2026-11-08',finalLocked:true,recommendations:[]},root));
console.log(count+' dream3 tests passed');
