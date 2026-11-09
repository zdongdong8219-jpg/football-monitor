import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {routeResearch, planReview} from './validate-delivery-workflow.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [mode, date, deadline] = process.argv.slice(2);
if (!['research','review'].includes(mode) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw Error('Usage: workflow-next-action.mjs research|review YYYY-MM-DD [deadline]');
const read = p => fs.existsSync(path.join(root,p)) ? JSON.parse(fs.readFileSync(path.join(root,p),'utf8')) : null;
let action;
if (mode === 'research') action = routeResearch(read(`data/research/${date}/status.json`)?.researchWorkflow, root, Date.now(), deadline);
else {
  const report = read(`data/reports/${date}.json`);
  action = report ? planReview(report, read(`data/reviews/${date}.json`), read(`data/research/${date}/review-status.json`), read(`data/research/${date}/review-result-audit.json`)?.fixtures?.map(f => ({...f,verified:f.secondaryVerified === true}))) : {action:'recover_report',reason:'missing original report; locate original before settlement'};
}
console.log(JSON.stringify(action,null,2));
