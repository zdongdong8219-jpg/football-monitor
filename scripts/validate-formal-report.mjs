import fs from 'node:fs';
import path from 'node:path';
export function validateFormalReport(root){
  const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const report=read('data/latest.json');
  const keys=['direction','speculative','goals','halfFull','score'];
  const validateRow=(r)=>{for(const key of keys){const n=r.projectStars?.[key],color=r.projectStarColors?.[key];if(!Number.isInteger(n)||n<0||n>3||color===undefined||(n>0&&color!=='red')||(n===0&&color==='red'))throw Error(`${r.number}: invalid ${key} stars`);if(n>0&&!r.projectStarAudit?.[key])throw Error(`${r.number}: missing ${key} evidence`);}};
  if(report.date>='2026-10-26'){
    for(const row of report.scanTable||[])validateRow(row);
    for(const ticket of report.recommendations||[]){const s=[ticket.category,ticket.name,ticket.type,ticket.passType].join(' '),legs=ticket.legs||[];const dream=/全进球数|进球数梦想|goals[34]/.test(s);if(dream){if(![3,4].includes(legs.length)||legs.some(l=>!['goals','ttg','TTG'].includes(l.market)))throw Error('Dream ticket must use 3 or 4 total-goals legs');}else if(!/[23][.]0/.test(s)||legs.length!==2)throw Error('Only four formal ticket types are allowed');}
    const rows=new Map((report.scanTable||[]).map(r=>[r.number,r]));
    for(const ticket of report.recommendations||[]){if(!['core20','core30'].includes(ticket.category))continue;for(const leg of ticket.legs||[]){const row=rows.get(leg.number),first=String(row?.primaryPick||row?.buy||'').split('/')[0];if(first&&leg.selection!==first)throw Error(`${ticket.category}: ${leg.number} uses ${leg.selection} instead of primary ${first}`);}}
    for(const row of report.scanTable||[]){const first=String(row.primaryPick||row.buy||'').split('/')[0];if(first==='胜'&&row.handicap===-1&&row.speculative==='让负')throw Error(`${row.number}: speculative pick directly opposes primary win`);if(first==='负'&&row.handicap===1&&row.speculative==='让胜')throw Error(`${row.number}: speculative pick directly opposes primary lose`);}
  }
  const review=read('data/review-latest.json');
  if(review.date>='2026-10-26'){
    const original=read(`data/reports/${review.date}.json`),byNumber=new Map(original.scanTable.map(r=>[r.number,r]));
    for(const row of review.rows||[]){const before=byNumber.get(row.number);if(!before)throw Error('Missing original scan '+row.number);validateRow(row);for(const key of keys){if(row.projectStars[key]!==before.projectStars[key]||row.projectStarColors[key]!==before.projectStarColors[key])throw Error('Changed pre-match star '+row.number+' '+key);}for(const [reviewKey,originalKey] of [['recommendedPick','primaryPick'],['speculativePick','speculative'],['goalsPick','goals'],['halfFullPick','halfFull'],['scorePick','score']]){if(row[reviewKey]!==before[originalKey])throw Error('Changed pre-match pick or order '+row.number+' '+reviewKey);}}
  }
  return true;
}
