import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './monitor-core.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'data/state.json');
const previous=JSON.parse(fs.readFileSync(file,'utf8'));
const state=await collect(previous);
fs.writeFileSync(file,JSON.stringify(state,null,2)+'\n');
console.log(JSON.stringify({checkedAt:state.checkedAt,date:state.currentDate,matches:state.days[state.currentDate]?.latest?.matches?.length||0}));
