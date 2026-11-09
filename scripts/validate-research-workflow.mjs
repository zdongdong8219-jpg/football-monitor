import fs from 'node:fs';
import {validateDreamThreeHandoff} from './validate-dream-three.mjs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) throw new Error('Usage: node scripts/validate-research-workflow.mjs <status.json>');
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
const workflow = state.researchWorkflow;
validateDreamThreeHandoff(state);
if (!workflow) throw new Error('Missing researchWorkflow state');
for (const key of ['phase', 'owner', 'nextAction', 'lastVerifiedAt']) {
  if (typeof workflow[key] !== 'string' || !workflow[key].trim()) throw new Error(`Missing researchWorkflow.${key}`);
}
if (!Array.isArray(workflow.requiredArtifacts) || !workflow.requiredArtifacts.length) throw new Error('Missing requiredArtifacts');
if (!Array.isArray(workflow.attemptedSources)) throw new Error('Missing attemptedSources');
if (workflow.phase === 'handoff_ready' && workflow.requiredArtifacts.some(entry => !fs.existsSync(typeof entry==='string'?entry:entry.path))) {
  throw new Error('Handoff marked ready without required artifacts');
}
console.log(JSON.stringify({ valid: true, phase: workflow.phase, owner: workflow.owner, nextAction: workflow.nextAction }));
