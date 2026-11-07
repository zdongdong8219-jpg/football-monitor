import fs from 'node:fs';
import path from 'node:path';
export const requiredEvidence = ['lineupAndReplacements','tacticalMatchup','chanceQuality','scheduleFitness','marketMovement','support','counterEvidence'];
export function validateCoreAdmission(report, root) {
  if (report.date < '2026-11-07') return true;
  for (const ticket of report.recommendations || []) {
    if (!['core20','core30'].includes(ticket.category)) continue;
    if (ticket.id === '2026-11-07-early-core20-s1') {
      const original = JSON.parse(fs.readFileSync(path.join(root,'data/reports/versions/2026-11-07-early-core20-s1-verified.json'),'utf8'));
      const prior = original.recommendations.find(t => t.id === ticket.id);
      if (JSON.stringify(ticket) !== JSON.stringify(prior) || report.admissionIncident?.id !== '2026-11-07-early-admission-failure' || report.admissionIncident?.status !== 'failed' || report.admissionIncident?.label !== '分析证据未达到核心准入，紧急发布流程违规') throw Error('Incident ticket must remain unchanged and explicitly marked failed');
      continue;
    }
    if (ticket.legs?.length !== 2) throw Error('Core ticket requires two audited legs');
    for (const leg of ticket.legs) {
      const audit = leg.coreAdmission;
      const assessed = Date.parse(audit?.assessedAt), admitted = Date.parse(audit?.admittedAt), kickoff = Date.parse(leg.kickoff);
      if (!audit?.approved || !Number.isFinite(assessed) || !Number.isFinite(admitted) || !Number.isFinite(kickoff) || assessed > admitted || admitted >= kickoff) throw Error('Core admission missing or not prematch: '+leg.number);
      for (const key of requiredEvidence) {
        const e = audit.evidence?.[key];
        if (e?.complete !== true || typeof e.assessment !== 'string' || e.assessment.trim().length < 20 || !Array.isArray(e.sources) || !e.sources.length) throw Error('Core evidence incomplete: '+leg.number+'/'+key);
        for (const source of e.sources) {
          const at = Date.parse(source.checkedAt);
          if (!/^https?:\/\//.test(source.url || '') || !Number.isFinite(at) || at > assessed || at >= kickoff) throw Error('Core source missing or not prematch: '+leg.number+'/'+key);
        }
      }
    }
  }
  return true;
}
