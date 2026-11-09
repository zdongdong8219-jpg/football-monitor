import fs from 'node:fs';
import crypto from 'node:crypto';
import {dreamThreeBranches} from './validate-dream-three.mjs';
// Synthetic structural fixtures only. Never publish as football analysis.
export function dreamThreeFixture(count=1){
 const rawArtifact='scripts/dream-three-fixture.mjs',sha256=crypto.createHash('sha256').update(fs.readFileSync(new URL('./dream-three-fixture.mjs',import.meta.url))).digest('hex');
 const report={testOnly:true,date:'2026-11-09',publishedAt:'2026-11-09T11:00:00+08:00',infoOnly:true,finalLocked:true,dream3Assessment:{selectedCount:count,reason:'合成结构测试，不是真实比赛推荐。'},scanTable:[],recommendations:[],trackingHistory:{two:[],three:[]},ticketClassStatus:[]};
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
