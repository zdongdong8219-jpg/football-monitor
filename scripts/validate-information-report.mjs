import {validateSpeculativeNarrowing, normalizeDirection} from './validate-speculative-narrowing.mjs';
import fs from 'node:fs';
export function validateInformationReport(report) {
  validateSpeculativeNarrowing(report);
  if (report.infoOnly !== true) throw Error('Information report marker missing');
  const rows=report.scanTable||[],scenarios=report.recommendations||[];
  if (!rows.length||new Set(rows.map(r=>r.number)).size!==rows.length) throw Error('Missing or duplicate analysis rows');
  const forbidden=new Set(['stake','cost','totalCost','exampleStake','betCount','subTickets','passSizes','returned','net','breakEven']);
  function check(value){if(!value||typeof value!=='object')return;for(const [key,v] of Object.entries(value)){if(forbidden.has(key))throw Error('Information scenario contains financial configuration: '+key);check(v);}}
  check(scenarios);
  let frozenRows=null;
  if(report.revision?.id==='2026-11-04-bo-r1'){
    const original=JSON.parse(fs.readFileSync(new URL('../data/reports/versions/2026-11-04-final-verified.json',import.meta.url),'utf8'));
    if(JSON.stringify(scenarios)!==JSON.stringify(original.recommendations))throw Error('Original revision combinations changed');
    frozenRows=original.scanTable;
  }

  for(const row of rows){
    if(!row.analysis||!row.risk||!row.sources?.length||!row.probabilityMethod||!row.outcomeRanking?.length)throw Error('Missing evidence/risk/probability provenance: '+row.number);
    if(Date.parse(row.analysisAt)>=Date.parse(row.kickoff))throw Error('Analysis must use saved prematch evidence: '+row.number);
    const p=row.marketImpliedProbability;if(!p||Math.abs(p.h+p.d+p.a-100)>.2)throw Error('Invalid implied probabilities');
    const choices=normalizeDirection(row.primaryPick);
    if(choices.length>1&&choices.every(x=>['胜','平','负'].includes(x))&&row.outcomeRanking.indexOf(choices[0])>row.outcomeRanking.indexOf(choices[1]))throw Error('Direction order mismatch');
  }
  if(report.deliveryStage!=='early'){
    for(const [category,count] of [['core20',2],['core30',2],['dream6',6],['goals4',4]]){let s=scenarios.find(x=>x.category===category);if(!s){const withheld=report.ticketClassStatus?.find(x=>x.category===category);if(withheld?.status==='withheld'&&withheld.reason?.length>=20&&report.coreComparison?.[category]?.selected===null&&report.coreComparison?.[category]?.compared?.length>=2&&['core20','core30'].includes(category))continue;throw Error('Scenario missing without documented rejection '+category);}if(s.legs?.length!==count)throw Error('Scenario size mismatch '+category);for(const leg of s.legs){let row=rows.find(r=>r.number===leg.number);if(!row)throw Error('Unknown scenario match');if(category==='goals4'&&leg.selection!==row.goals)throw Error('Goals scenario order mismatch');if(['core20','core30'].includes(category)&&leg.selection!==row.primaryPick)throw Error('Main scenario differs from analysis');if(category==='dream6'&&leg.selection!==(frozenRows?.find(r=>r.number===leg.number)||row).speculative)throw Error('High variance scenario differs from analysis');}}
  }
  return true;
}
