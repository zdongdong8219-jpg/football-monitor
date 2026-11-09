import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {validateDreamThree} from './validate-dream-three.mjs';

const fail = message => { throw Error(`Delivery workflow: ${message}`); };
const text = x => typeof x === 'string' && x.trim().length > 0;
const time = x => typeof x === 'string' ? Date.parse(x) : NaN;
export const activationDate = '2026-11-09';

export function validateSchedule(report) {
  const s = report.reviewSchedule;
  if (!s || !['lastScheduledKickoff', 'estimatedEnd', 'reviewAt'].every(k => Number.isFinite(time(s[k]))) || !Number.isFinite(s.bufferMinutes) || s.bufferMinutes < 0) fail('missing/invalid reviewSchedule');
  const kickoffs = (report.scanTable || []).map(r => time(r.kickoff));
  if (!kickoffs.length || kickoffs.some(t => !Number.isFinite(t)) || Math.max(...kickoffs) !== time(s.lastScheduledKickoff)) fail('reviewSchedule does not match last fixture');
  if (time(s.estimatedEnd) <= time(s.lastScheduledKickoff) || time(s.reviewAt) !== time(s.estimatedEnd) + s.bufferMinutes * 60000) fail('reviewSchedule arithmetic');
}

// Historical tracking has compact issued records without stake/publishedAt.
// Only their exact committed fingerprints may use the old settlement stake.
export function validateTracking(document, legacy = {}) {
  const groups = [];
  function walk(value, location = '') {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'excludedTrackingArchive' || key === 'priorDayHistory' || key === 'immutableHashes') continue;
      if (key === 'trackingCumulative') {
        if (!Array.isArray(child) || child.some(x => !['core20','core30'].includes(x.category))) fail('nonordinary cumulative');
      } else if (/^tracking(?:History|Tickets|Records)?$/.test(key) || (/^tracking/i.test(key) && Array.isArray(child))) {
        const tickets = [];
        const collect = v => { if (Array.isArray(v)) tickets.push(...v); else if (v && typeof v === 'object') Object.values(v).forEach(collect); };
        collect(child); groups.push({location: location + '.' + key, tickets});
      } else walk(child, location + '.' + key);
    }
  }
  walk(document);
  for (const group of groups) {
    const ids = new Set();
    for (const t of group.tickets) {
      if (!text(t.id) || ids.has(t.id)) fail('duplicate/missing tracking id');
      ids.add(t.id);
      if (!['core20','core30'].includes(t.category) || /dream|梦想|六串一|6串1|highMultiple/i.test([t.id,t.name,t.type].join(' '))) fail('dream/nonordinary tracking ' + t.id);
      if (t.cancelled || t.revoked || t.final === false || t.issued === false || /cancel|draft|withdraw|撤销|草稿|复核/i.test(t.status || '')) fail('unissued tracking ' + t.id);
      const old = (legacy[t.id] || []).includes(crypto.createHash('sha256').update(JSON.stringify(t)).digest('hex'));
      if (!(Number(t.stake ?? (old ? (t.trackingSettlement?.stake ?? t.totalCost ?? t.cost) : undefined)) > 0)) fail('nonpositive/missing stake ' + t.id);
      if (!old && (!Number.isFinite(time(t.publishedAt)) || (t.date >= activationDate && (t.final !== true || t.issued !== true)))) fail('missing final issuance ' + t.id);
    }
  }
  if (document.trackingCumulative && document.trackingHistory) {
    const all = Object.values(document.trackingHistory).flat().filter(x => x && typeof x === 'object');
    for (const c of document.trackingCumulative) {
      const tickets = all.filter(t => t.category === c.category);
      const normalized = t => Number.isFinite(t.trackingSettlement?.net) ? t.trackingSettlement.net : t.stake === 1000 && Number.isFinite(t.net) ? t.net : (t.totalCost ?? t.cost) > 0 && Number.isFinite(t.returned) ? t.returned/(t.totalCost ?? t.cost)*1000-1000 : 0;
      const net = Math.round(tickets.reduce((sum,t) => sum + normalized(t), 0)*100)/100;
      if (c.tickets !== tickets.length || Math.abs(c.net-net) > 0.011) fail('cumulative mismatch ' + c.category);
    }
  }
}

export function validateAnalysis(report, now = Date.now()) {
  if (report.date < activationDate) return; // Never backfill historical prematch analysis.
  const rows = report.scanTable || [];
  if (!rows.length) fail('empty full analysis');
  for (const row of rows) {
    const a = row.analysisAudit;
    if (!a || !Array.isArray(a.availableEvidence) || !a.availableEvidence.length || !Array.isArray(a.gaps) || !text(a.counterevidence) || !['admit','reject'].includes(a.decision) || !text(a.reason)) fail('incomplete analysis ' + row.number);
    for (const e of a.availableEvidence) if (!text(e.source) || !Number.isFinite(time(e.collectedAt)) || !text(e.evidence)) fail('unattributed evidence ' + row.number);
  }
  const early = rows.filter(r => {
    const local = new Date(time(r.kickoff)+8*3600000).toISOString();
    return local.slice(0,10) === report.date && Number(local.slice(11,13)) < 18;
  });
  if (early.length) {
    const deadline = Math.min(time(report.date+'T16:00:00+08:00'), ...early.map(r => Math.min(time(r.kickoff)-3600000, Number.isFinite(time(r.saleCloseAt)) ? time(r.saleCloseAt) : Infinity)));
    // Full delivery or a verified early batch must actually precede the deadline.
    const delivered = [report, ...(report.batches || [])].some(b => b.mobileVerified === true && time(b.onlineVerifiedAt) <= deadline && (b === report || early.every(r => (b.numbers || []).includes(r.number))));
    if (now > deadline && !delivered) {
      if (report.earlyDeliveryMissed !== true || !text(report.failureReason)) fail('late early delivery lacks failure record');
      if (report.earlyDelivered === true || report.deliveryStage === 'early' || report.earlyCompleted === true) fail('late sweep claimed as early delivery');
    }
  }
}

export function routeResearch(workflow, root, now = Date.now(), deadline) {
  const w = workflow || {}, reasons = [];
  const artifacts = Array.isArray(w.requiredArtifacts) ? w.requiredArtifacts : [];
  if (!w.packet?.path || !w.packet?.sha256) reasons.push('missing_packet');
  if (!artifacts.length) reasons.push('missing_requiredArtifacts');
  for (const entry of [...artifacts, ...(w.packet?.path ? [w.packet] : [])]) {
    const name = typeof entry === 'string' ? entry : entry?.path;
    const expected = typeof entry === 'string' ? w.artifactHashes?.[entry] : entry?.sha256;
    const resolved = typeof name === 'string' && path.resolve(root, name);
    try {
      if (!resolved || !resolved.startsWith(path.resolve(root)+path.sep) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) reasons.push('missing_artifact:'+name);
      else if (!expected || crypto.createHash('sha256').update(fs.readFileSync(resolved)).digest('hex') !== expected) reasons.push('hash_error:'+name);
    } catch { reasons.push('unreadable_artifact:'+name); }
  }
  if (/failed|interrupted|backup_required/.test(w.phase || '')) reasons.push('failed_state');
  const stale = !Number.isFinite(time(w.lastRealProgressAt)) || now-time(w.lastRealProgressAt) >= 15*60000;
  // A complete valid handoff is not stale merely because the owner stopped fetching.
  if (w.phase !== 'handoff_ready' && stale) reasons.push('no_real_progress_15m');
  if (reasons.length && Number.isFinite(time(deadline)) && time(deadline)-now <= 45*60000) reasons.push('delivery_window_45m');
  const takeover = reasons.length > 0;
  return {owner: takeover ? 'task6' : 'main', action: takeover ? 'minimal_gap_collection' : 'read_only_analysis', allowTask6Fetch: takeover, reasons, reuseArtifacts: artifacts, forbidFullRefetch: true};
}

export function validateResearchExecution(execution, route) {
  if (!execution || execution.owner !== 'task6') fail('missing task6 research execution');
  if (!Array.isArray(execution.fetches)) fail('missing fetch audit');
  if (!route.allowTask6Fetch && execution.fetches.length) fail('valid packet forbids redundant fetch');
  if (route.allowTask6Fetch) {
    if (execution.mode !== 'minimal_gap_collection' || !text(execution.failureReason) || !execution.fetches.length) fail('takeover not performed');
    for (const f of execution.fetches) if (!text(f.source) || !Number.isFinite(time(f.collectedAt)) || !text(f.gap) || !text(f.outcome) || !Array.isArray(f.evidenceUsed) || (f.outcome === 'failed' && !text(f.failureReason))) fail('incomplete takeover source audit');
  }
}

export function planReview(report, review, status, fixtures, now = Date.now()) {
  if (review?.completed && review?.mobileVerified && status?.completed) return {action:'done'};
  let due = time(report.reviewSchedule?.reviewAt);
  if (!Number.isFinite(due)) {
    const starts = (report.scanTable || []).map(r => time(r.kickoff));
    if (!starts.length || starts.some(t => !Number.isFinite(t))) return {action:'recover_schedule', reason:'missing verified schedule'};
    due = Math.max(...starts)+145*60000;
  }
  if (now < due) return {action:'wait', nextCheckAt:new Date(due).toISOString()};
  if (!fixtures?.length || fixtures.length !== report.scanTable.length || fixtures.some(f => !f.verified)) return {action:'verify_results', reason:'overdue missing verified result/status'};
  if (fixtures.some(f => !f.finished)) return {action:'incremental_followup', nextCheckAt:new Date(now+15*60000).toISOString()};
  return {action:'recover_review', reason:'overdue incomplete review or phone verification'};
}

export function validateDeliveryWorkflow(root) {
  const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const report = read('data/latest.json'), review = read('data/review-latest.json');
  validateDreamThree(report,root);
  const legacy = read('data/workflow-legacy-tracking.json');
  validateTracking(report, legacy); validateTracking(review, legacy);
  if (report.finalLocked) {
    validateSchedule(report); validateAnalysis(report);
    if (report.date >= activationDate) {
      if (!Number.isFinite(time(report.analysisAsOf)) || !Number.isFinite(time(report.deliveryDeadline))) fail('missing analysisAsOf/deliveryDeadline');
      const status = read(`data/research/${report.date}/status.json`);
      const route = routeResearch(status.researchWorkflow, root, time(report.analysisAsOf), report.deliveryDeadline);
      validateResearchExecution(report.researchExecution, route);
    }
  }
}
