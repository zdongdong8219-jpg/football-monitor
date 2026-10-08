import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildResearchSnapshot, collect } from './monitor-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'data/state.json');
const previous=JSON.parse(fs.readFileSync(file,'utf8'));
const state=await collect(previous);
fs.writeFileSync(file,JSON.stringify(state,null,2)+'\n');
const research=buildResearchSnapshot(state);
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
}).formatToParts(new Date(state.checkedAt)).map(part=>[part.type,part.value]));
const researchDir=path.join(root,'data/research',`${parts.year}-${parts.month}-${parts.day}`);
fs.mkdirSync(researchDir,{recursive:true});
fs.writeFileSync(path.join(researchDir,`${parts.hour}${parts.minute}.json`),JSON.stringify(research,null,2)+'\n');
console.log(JSON.stringify({checkedAt:state.checkedAt,date:state.currentDate,matches:state.days[state.currentDate]?.latest?.matches?.length||0}));
