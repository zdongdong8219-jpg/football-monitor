import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const fail=m=>{throw Error('Dream3: '+m);};
const present=x=>typeof x==='string'&&x.trim().length>0;
const ms=x=>typeof x==='string'?Date.parse(x):NaN;
const choices={had:{h:'胜',d:'平',a:'负'},hhad:{h:'让胜',d:'让平',a:'让负'}};
const optionId=o=>o.market+':'+o.key;
const wins=(o,margin,handicap)=>{const d=margin+(o.market==='hhad'?handicap:0);return o.key==='h'?d>0:o.key==='a'?d<0:d===0;};

export function dreamThreeBranches(legs) {
  return legs.reduce((rows,l)=>rows.flatMap(r=>l.options.map(o=>({selections:[...r.selections,{number:l.number,market:o.market,key:o.key}],odds:r.odds*o.odds}))),[{selections:[],odds:1}]);
}

export function validateDreamThreeHandoff(state) {
  if(state.date<'2026-11-09'||state.researchWorkflow?.phase!=='handoff_ready')return true;
  const a=state.researchWorkflow.dream3Research;
  if(!a||!Array.isArray(a.candidateNumbers)||new Set(a.candidateNumbers).size!==a.candidateNumbers.length||!Array.isArray(a.qualificationArtifacts)||!Array.isArray(a.coverageGaps)||!present(a.reason))fail('handoff lacks dream3 candidate/qualification/gap assessment');
  if(a.candidateNumbers.length&&!a.qualificationArtifacts.length)fail('handoff candidates lack market qualification sources');
  return true;
}

export function validateDreamThree(report, root) {
  if(report.date<'2026-11-09')return true;
  const tickets=(report.recommendations||[]).filter(t=>t.category==='dream3');
  const skipped=report.finalLocked===true&&tickets.length===0;
  if(tickets.length>5)fail('final reports require 1-5 dream3 combinations; drafts allow up to 5');
  if(skipped)validateDreamThreeSkip(report,root);
  if(report.finalLocked&&(!report.dream3Assessment||report.dream3Assessment.selectedCount!==tickets.length||!present(report.dream3Assessment.reason)))fail('final analysis lacks dream3 quality decision');
  const ids=new Set(),signatures=new Set(),counts=new Map();
  for(const t of tickets)for(const l of t.legs||[])counts.set(String(l.officialMatchId),(counts.get(String(l.officialMatchId))||0)+1);
  for(const t of tickets){
    if(!present(t.id)||ids.has(t.id))fail('duplicate/missing ticket id');ids.add(t.id);
    if(t.trackingEligible!==false||t.autoBet!==false)fail('dream tracking/autobet must be disabled');
    if(!Array.isArray(t.legs)||t.legs.length!==3||new Set(t.legs.map(l=>String(l.officialMatchId))).size!==3||new Set(t.legs.map(l=>l.number)).size!==3)fail('exactly three independent fixtures required');
    if(!present(t.qualityReason)||!present(t.strongestCounterevidence))fail('missing combination quality/counterevidence');
    const assessed=ms(t.assessedAt);
    if(!Number.isFinite(assessed))fail('missing assessment time');
    for(const l of t.legs){
      const row=(report.scanTable||[]).find(r=>r.number===l.number);
      if(!row||!l.officialMatchId||String(row.officialMatchId)!==String(l.officialMatchId)||ms(row.kickoff)!==ms(l.kickoff)||!Number.isFinite(ms(l.kickoff))||assessed>=ms(l.kickoff))fail('fixture identity or prematch mismatch');
      if(!present(l.primaryJudgment)||!present(l.strongestCounterevidence)||!Array.isArray(l.sources)||!l.sources.length)fail('missing independent leg evidence');
      for(const s of l.sources){
        if(!/^https?:\/\//.test(s.url||'')||!Number.isFinite(ms(s.collectedAt))||ms(s.collectedAt)>assessed||!present(s.evidence))fail('invalid evidence source/time');
      }
      if(!Array.isArray(l.options)||l.options.length<1||l.options.length>2||new Set(l.options.map(optionId)).size!==l.options.length)fail('one or two distinct options required');
      if(l.primaryOption!==optionId(l.options[0]))fail('primary option must be first');
      const mixed=new Set(l.options.map(o=>o.market)).size>1;
      if(l.options.some(o=>o.market==='hhad')&&(!Number.isInteger(l.handicap)||l.handicap!==row.handicap))fail('official handicap missing/mismatch');
      for(const o of l.options){
        if(!choices[o.market]||!(o.key in choices[o.market])||choices[o.market][o.key]!==o.selection||!(Number.isFinite(o.odds)&&o.odds>1))fail('invalid market/selection/odds');
        const q=o.qualification;
        if(!q||q.status!=='Selling'||q.allUp!==1||!q.passSizes?.includes(3)||mixed&&q.mixedAllUp!==true||q.market!==o.market||String(q.officialMatchId)!==String(l.officialMatchId)||!Number.isFinite(ms(q.checkedAt))||ms(q.checkedAt)>assessed||!Number.isFinite(ms(q.saleCloseAt))||assessed>=ms(q.saleCloseAt))fail('market not verified on sale for this pass');
        if(!/^https?:\/\//.test(q.source?.url||'')||!present(q.source?.rawArtifact)||! /^[a-f0-9]{64}$/.test(q.source?.sha256||''))fail('missing qualification snapshot');
        if(root){const file=path.resolve(root,q.source.rawArtifact);if(!file.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(file)||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==q.source.sha256)fail('qualification snapshot hash mismatch');}
        if(report.publishedAt&&(ms(report.publishedAt)>=ms(q.saleCloseAt)||ms(report.publishedAt)>=ms(l.kickoff)||ms(report.publishedAt)<assessed))fail('published after close/kickoff or before analysis');
      }
      if(l.options.length===2){
        const b=l.netGoalBoundary;
        if(!present(l.coverageReason)||!present(l.drawCounterevidence)||!b||!present(b.reason)||!Array.isArray(b.mainMargins)||!b.mainMargins.length||!Array.isArray(b.coverMargins)||!b.coverMargins.length)fail('dual selection lacks coverage/boundary/draw counterevidence');
        const [main,cover]=l.options, handicap=l.handicap||0;
        if(b.mainMargins.some(d=>!Number.isInteger(d)||!wins(main,d,handicap))||b.coverMargins.some(d=>!Number.isInteger(d)||!wins(cover,d,handicap)||wins(main,d,handicap)))fail('declared net-goal boundary does not support coverage');
        const bound=Math.abs(handicap)+3, margins=Array.from({length:bound*2+1},(_,i)=>i-bound);
        if(margins.some(d=>wins(main,d,handicap)&&wins(cover,d,handicap)))fail('overlapping selections are not defensive alternatives');
      }
    }
    const shared=t.legs.filter(l=>counts.get(String(l.officialMatchId))>1).map(l=>String(l.officialMatchId)).sort();
    if(shared.length&&(!present(t.concentrationRisk)||JSON.stringify([...(t.sharedMatchIds||[])].map(String).sort())!==JSON.stringify(shared)))fail('shared legs require explicit concentration risk');
    const signature=t.legs.map(l=>l.officialMatchId+'='+l.options.map(optionId).sort().join('/')).sort().join('|');
    if(signatures.has(signature))fail('duplicate combination');signatures.add(signature);
    const branches=dreamThreeBranches(t.legs);
    if(t.combinationCount!==branches.length||!Array.isArray(t.branches)||t.branches.length!==branches.length)fail('combination expansion mismatch');
    const key=b=>b.selections.map(s=>s.number+':'+s.market+':'+s.key).join('|');
    const expected=new Map(branches.map(b=>[key(b),b.odds])),seen=new Set();
    for(const b of t.branches){const k=key(b);if(seen.has(k)||!expected.has(k)||!Number.isFinite(b.odds)||Math.abs(b.odds-expected.get(k))>1e-8)fail('incorrect branch odds');seen.add(k);}
  }
  // Every active tracking structure is checked, including aliases outside trackingHistory.
  function trackingCheck(value,active=false){if(!value||typeof value!=='object')return;for(const[k,v]of Object.entries(value)){if(k==='excludedTrackingArchive'||k==='priorDayHistory')continue;const tracked=active||/^tracking/i.test(k);if(tracked&&v&&typeof v==='object'&&/dream|梦想|六串一|highMultiple/i.test([v.category,v.id,v.name].join(' ')))fail('dream in tracking/cumulative');trackingCheck(v,tracked);}}
  trackingCheck(report);
  return true;
}

// The exception is established by the complete official sale-day snapshot, not a candidate shortlist.
export function validateDreamThreeSkip(report, root) {
  const a=report.dream3Assessment,e=a?.officialFixtureEvidence;
  if(a?.skipReason!=='eligible distinct fixtures < 3'||!e)fail('final reports require 1-5 dream3 combinations unless official evidence proves fewer than 3');
  if(e.saleDate!==report.date||e.completeSaleDay!==true||!Array.isArray(e.fixtures)||!Number.isFinite(ms(e.collectedAt))||ms(e.collectedAt)>ms(report.analysisAsOf||report.publishedAt))fail('invalid official fixture evidence date/completeness');
  let url;try{url=new URL(e.url);}catch{fail('missing official fixture source');}
  if(url.protocol!=='https:'||url.hostname!=='webapi.sporttery.cn'||!present(e.rawArtifact)||!/^[a-f0-9]{64}$/.test(e.sha256||''))fail('invalid official fixture source/hash');
  const ids=e.fixtures.map(f=>String(f.officialMatchId));
  if(e.fixtures.some(f=>!f.officialMatchId||f.saleDate!==report.date||f.status!=='Selling')||new Set(ids).size!==ids.length||ids.length>=3||a.eligibleDistinctFixtureCount!==ids.length)fail('official eligible distinct fixtures must be < 3');
  if((report.scanTable||[]).some(r=>!ids.includes(String(r.officialMatchId)))||new Set((report.scanTable||[]).map(r=>String(r.officialMatchId))).size!==ids.length)fail('skip evidence does not cover full scan');
  if(root){
    const file=path.resolve(root,e.rawArtifact);
    if(!file.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(file)||crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==e.sha256)fail('official snapshot hash mismatch');
    const raw=JSON.parse(fs.readFileSync(file,'utf8'));
    const batches=raw.value?.matchInfoList?.filter(b=>b.businessDate===report.date);
    if(raw.success!==true||!batches?.length||batches.some(b=>!Array.isArray(b.subMatchList)))fail('official snapshot lacks complete sale day');
    const actual=[...new Set(batches.flatMap(b=>b.subMatchList).filter(m=>m.businessDate===report.date&&m.matchStatus==='Selling').map(m=>String(m.matchId)))].sort();
    if(JSON.stringify(actual)!==JSON.stringify([...ids].sort()))fail('official snapshot fixture set mismatch');
  }
  return true;
}
