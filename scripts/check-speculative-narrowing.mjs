import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateSpeculativeNarrowing} from './validate-speculative-narrowing.mjs';
const source = process.argv.find(x => x.startsWith('--report='))?.slice(9) || 'data/latest.json';
const auditPath = process.argv.find(x => x.startsWith('--audit='))?.slice(8) || 'work/speculative-narrowing-audit.json';
let audit;
try {
  const bytes = fs.readFileSync(source);
  const report = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
  const identity = {checkedAt: new Date().toISOString(), inputSha256: crypto.createHash('sha256').update(bytes).digest('hex'), report: source};
  try { audit = {...identity, ...validateSpeculativeNarrowing(report)}; }
  catch (e) { audit = {...identity, ...e.audit, passed: false, error: e.message}; throw e; }
  console.log('Speculative narrowing gate passed: ' + audit.rows.length + ' rows');
} catch (e) {
  audit ||= {passed: false, checkedAt: new Date().toISOString(), error: e.message};
  console.error(e.message); process.exitCode = 1;
} finally {
  fs.mkdirSync(path.dirname(auditPath), {recursive: true});
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));
}
