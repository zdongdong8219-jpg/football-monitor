import {validateDreamThree} from './validate-dream-three.mjs';
import {validateSpeculativeNarrowing, normalizeDirection, inspectSpeculativeNarrowing} from './validate-speculative-narrowing.mjs';
import fs from 'node:fs';
export function validateInformationReport(report) {
  validateDreamThree(report);
  validateSpeculativeNarrowing(report);
  if (report.infoOnly !== true) throw Error('Information report marker missing');
  const rows=report.scanTable||[],scenarios=report.recommendations||[];
  const marketSet=(selection,handicap)=>Array.from({length:41},(_,i)=>i-20).filter(n=>String(selection).split('/').some(p=>p.startsWith('让')?p==='让'+(n+handicap>0?'胜':n+handicap<0?'负':'平'):p===(n>0?'胜':n<0?'负':'平'))).join(',');
  const equivalentCore=(leg,row)=>{
    const market=String(leg.market).toLowerCase(),field={ttg:'goals',hafu:'halfFull',crs:'score'}[market];
    if(field)return String(leg.selection).replace(/[；;]/g,'/')===String(row[field]).replace(/[；;]/g,'/');
    return market==='hhad'&&marketSet(leg.selection,row.handicap)===marketSet(row.primaryPick,row.handicap);
  };
  if(report.date>='2026-11-11')for(const t of scenarios.filter(t=>['dream3','dream6'].includes(t.category)))for(const l of t.legs||[])if(!['had','hhad'].includes(String(l.market).toLowerCase())||(l.options||[]).some(o=>o.market&&!['had','hhad'].includes(String(o.market).toLowerCase())))throw Error('Dream3/6 allow outcome markets only');
  for(const ticket of scenarios.filter(t=>t.category==='dream6'&&t.construction==='mixed-outcome-sixfold')){
    if(ticket.legs?.length!==6||new Set(ticket.legs.map(l=>l.number)).size!==6||ticket.trackingEligible!==false)throw Error('Dream6 distinct fixture/tracking gate');
    let products=[1];
    for(const leg of ticket.legs){const row=rows.find(r=>r.number===leg.number);if(!row||!['had','hhad'].includes(leg.market)||!leg.options?.length||!leg.primaryJudgment||!leg.strongestCounterevidence||!leg.sources?.length)throw Error('Dream6 outcome evidence missing');if(![row.primaryPick,row.handicapPick,row.speculative].includes(leg.selection))throw Error('Dream6 not an analyzed direction');for(const o of leg.options)if(!['h','d','a'].includes(o.key)||o.odds<=1||o.qualification?.status!=='Selling'||o.qualification.allUp!==1||!o.qualification.passSizes?.includes(6)||Date.parse(ticket.assessedAt)>=Date.parse(leg.kickoff))throw Error('Dream6 qualification');products=products.flatMap(p=>leg.options.map(o=>p*o.odds));}
    if(ticket.branches?.length!==products.length||products.some((p,i)=>Math.abs(p-ticket.branches[i].odds)>1e-7))throw Error('Dream6 branch arithmetic');
  }
  if (!rows.length||new Set(rows.map(r=>r.number)).size!==rows.length) throw Error('Missing or duplicate analysis rows');
  const forbidden=new Set(['stake','cost','totalCost','exampleStake','betCount','subTickets','passSizes','returned','net','breakEven']);
  function check(value, parentKey=''){if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){const eligibilityPassSizes=key==='passSizes'&&parentKey==='qualification'&&value.status==='Selling'&&value.allUp===1;if(forbidden.has(key)&&!eligibilityPassSizes)throw Error('Information scenario contains financial configuration: '+key);check(v,key);}}
  check(scenarios);
  let frozenRows=null;
  let authorizedCoreNarrowing=false;
  let november6Narrowing=false;
  if(['2026-11-06-core30-r1','2026-11-06-core30-r2'].includes(report.revision?.id)){
    const prior=JSON.parse(fs.readFileSync(new URL('../data/reports/versions/2026-11-06-final-verified.json',import.meta.url),'utf8'));
    const audit=JSON.parse(fs.readFileSync(new URL('../data/research/2026-11-06/'+(report.revision.id.endsWith('r2')?'core30-r2':'core30-r1')+'/expanded-market-audit.json',import.meta.url),'utf8'));
    const t=scenarios.find(x=>x.category==='core30');
    if(JSON.stringify(rows)!==JSON.stringify(prior.scanTable)||JSON.stringify(scenarios.filter(x=>x.category!=='core30'))!==JSON.stringify(prior.recommendations))throw Error('November6 frozen scope changed');
    if(JSON.stringify(report.trackingHistory.two)!==JSON.stringify(prior.trackingHistory.two)||JSON.stringify(report.trackingHistory.three.slice(0,-1))!==JSON.stringify(prior.trackingHistory.three))throw Error('November6 historical tracking changed');
    if(t?.legs.length!==2||t.legs[0].number!=='周五003'||t.legs[0].selection!=='让胜'||t.legs[1].number!==(report.revision.id.endsWith('r2')?'周五011':'周五004')||t.legs[1].selection!==(report.revision.id.endsWith('r2')?'让负':'胜')||!t.legs[0].independentAdmission?.approved||audit.math.branchCount!==1)throw Error('November6 exact admission mismatch');
    if(!inspectSpeculativeNarrowing({...rows.find(x=>x.number==='周五003'),speculative:t.legs[0].selection}).passed)throw Error('November6 boundary mismatch');
    const product=t.legs.reduce((n,l)=>n*l.odds,1);if(Math.abs(product-t.wholeSetMath.min)>1e-8||Math.abs(product-t.wholeSetMath.max)>1e-8||Math.abs(product-audit.math.allocation[0].wholeSetMultiple)>1e-8||t.wholeSetMath.branchCount!==1)throw Error('November6 actual whole-set math mismatch');
    if(report.revision.id.endsWith('r2')){const id=n=>rows.find(x=>x.number===n).officialMatchId;const base=scenarios.find(x=>x.category==='core20').legs.map(x=>id(x.number));if(t.legs.filter(x=>base.includes(id(x.number))).length>1)throw Error('Maximum one shared fixture violated');}
    november6Narrowing=true;
  }
  if(report.revision?.id==='2026-11-05-core30-r2'){
    const prior=JSON.parse(fs.readFileSync(new URL('../data/reports/versions/2026-11-05-core-r1-verified.json',import.meta.url),'utf8'));
    const audit=JSON.parse(fs.readFileSync(new URL('../data/research/2026-11-05/core30-r2/expanded-market-audit.json',import.meta.url),'utf8'));
    if(JSON.stringify(rows)!==JSON.stringify(prior.scanTable)||JSON.stringify(scenarios.filter(x=>x.category!=='core30'))!==JSON.stringify(prior.recommendations.filter(x=>x.category!=='core30')))throw Error('R2 changed frozen scope');
    const t=scenarios.find(x=>x.category==='core30');
    if(t?.legs.length!==2||t.legs[0].number!=='周四001'||t.legs[0].selection!=='胜'||t.legs[1].number!=='周四005'||t.legs[1].selection!=='让胜'||audit.math.branchCount!==1||!t.legs[1].independentAdmission?.approved)throw Error('R2 admission audit mismatch');
    if(!inspectSpeculativeNarrowing({...rows.find(x=>x.number==='周四005'),speculative:t.legs[1].selection}).passed)throw Error('R2 core not strict subset');
    const product=t.legs.reduce((n,l)=>n*l.odds,1);if(Math.abs(product-t.wholeSetMath.min)>1e-8||Math.abs(product-audit.math.allocation[0].wholeSetMultiple)>1e-8)throw Error('R2 branch arithmetic');
    authorizedCoreNarrowing=true;
  }
  if(report.revision?.id==='2026-11-04-bo-r1'){
    const original=JSON.parse(fs.readFileSync(new URL('../data/reports/versions/2026-11-04-final-verified.json',import.meta.url),'utf8'));
    if(JSON.stringify(scenarios)!==JSON.stringify(original.recommendations))throw Error('Original revision combinations changed');
    frozenRows=original.scanTable;
  }

  for(const row of rows){
    if(!row.analysis||!row.risk||!row.sources?.length||!row.probabilityMethod||!row.outcomeRanking?.length)throw Error('Missing evidence/risk/probability provenance: '+row.number);
    const analyzedAt=Date.parse(row.analysisAt), kickoffAt=Date.parse(row.kickoff);
    if(!Number.isFinite(analyzedAt)||!Number.isFinite(kickoffAt))throw Error('Invalid analysis or kickoff time: '+row.number);
    if(analyzedAt>=kickoffAt){
      const usedInTicket=scenarios.some(ticket=>(ticket.legs||[]).some(leg=>leg.number===row.number||leg.officialMatchId===row.officialMatchId));
      const prematchOnly=row.sources.every(source=>Number.isFinite(Date.parse(source.checkedAt))&&Date.parse(source.checkedAt)<kickoffAt);
      if(row.lateAnalysis!==true||!row.lateLabel?.includes('迟到补扫')||usedInTicket||!prematchOnly)throw Error('Late analysis requires explicit label, prematch sources and no new ticket: '+row.number);
    }
    const p=row.marketImpliedProbability;if(!p||Math.abs(p.h+p.d+p.a-100)>.2)throw Error('Invalid implied probabilities');
    const choices=normalizeDirection(row.primaryPick);
    if(choices.length>1&&choices.every(x=>['胜','平','负'].includes(x))&&row.outcomeRanking.indexOf(choices[0])>row.outcomeRanking.indexOf(choices[1]))throw Error('Direction order mismatch');
  }
  if(report.deliveryStage!=='early'){
    // A high multiple can come from six ordinary outcomes; it need not force six handicap selections.
    const ordinaryDreams=scenarios.filter(s=>s.category==='dream6'&&s.construction==='ordinary-sixfold');
    for(const s of ordinaryDreams){
      if(s.legs?.length!==6||new Set(s.legs.map(l=>l.number)).size!==6)throw Error('Ordinary dream requires six distinct fixtures');
      for(const l of s.legs){const row=rows.find(r=>r.number===l.number);if(l.market!=='had'||!['胜','平','负'].includes(l.selection)||l.selection!==row?.primaryPick||!(l.odds>1)||l.selectionReason?.length<20||l.risk?.length<20||l.comparison?.length<20||Date.parse(s.oddsAsOf)>=Date.parse(l.kickoff))throw Error('Ordinary dream evidence or prematch gate failed');}
      const product=s.legs.reduce((n,l)=>n*l.odds,1);if(Math.abs(product-s.totalOdds)>1e-8||Math.abs(product-s.wholeSetMath?.min)>1e-8||Math.abs(product-s.wholeSetMath?.max)>1e-8)throw Error('Ordinary dream odds arithmetic mismatch');
    }
    // A documented optional-class rejection is valid; core classes retain their own admission gate.
    for (const category of ['dream6','goals4']) {
      if (scenarios.some(s=>s.category===category)) continue;
      const status=report.ticketClassStatus?.find(s=>s.category===category), comparison=report.coreComparison?.[category];
      if (status?.status==='withheld' && status.reason?.length>=20 && comparison?.selected===null && comparison.compared?.length>=2) {
        // The legacy size loop below evaluates only issued optional classes.
        continue;
      }
      throw Error('Optional scenario missing without documented comparison '+category);
    }
    for(const [category,count] of [['core20',2],['core30',2],['dream6',6],['goals4',4]]){let s=scenarios.find(x=>x.category===category);if(!s){const withheld=report.ticketClassStatus?.find(x=>x.category===category);if(withheld?.status==='withheld'&&withheld.reason?.length>=20&&report.coreComparison?.[category]?.selected===null&&report.coreComparison?.[category]?.compared?.length>=2)continue;throw Error('Scenario missing without documented rejection '+category);}if(s.legs?.length!==count)throw Error('Scenario size mismatch '+category);for(const leg of s.legs){let row=rows.find(r=>r.number===leg.number);if(!row)throw Error('Unknown scenario match');if(category==='goals4'&&leg.selection!==row.goals)throw Error('Goals scenario order mismatch');if(['core20','core30'].includes(category)&&leg.selection!==row.primaryPick&&!equivalentCore(leg,row)&&!(authorizedCoreNarrowing&&category==='core30'&&leg.number==='周四005')&&!(november6Narrowing&&category==='core30'&&leg.number==='周五003'))throw Error('Main scenario differs from analysis');if(category==='dream6'&&!['ordinary-sixfold','mixed-outcome-sixfold'].includes(s.construction)&&leg.selection!==(frozenRows?.find(r=>r.number===leg.number)||row).speculative)throw Error('High variance scenario differs from analysis');}}
  }
  return true;
}
