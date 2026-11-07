import { validateTicketMath } from './validate-ticket-math.mjs';
import { validateCoreAdmission } from './validate-core-admission.mjs';
import fs from 'node:fs';
import { validateProjectStars } from './validate-project-stars.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateReviewConsistency } from './validate-review-consistency.mjs';
import { validateFormalReport } from './validate-formal-report.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
validateProjectStars(projectRoot);
const readProjectFile = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

for (const file of ['data/state.json', 'data/latest.json', 'data/review-latest.json']) {
  JSON.parse(readProjectFile(file));
}

const latestReport = JSON.parse(readProjectFile('data/latest.json'));
validateCoreAdmission(latestReport, projectRoot);
const latestReview = JSON.parse(readProjectFile('data/review-latest.json'));
if (latestReport.finalLocked === true && latestReport.infoOnly !== true) {
  const starProjects = ['direction', 'speculative', 'goals', 'halfFull', 'score'];
  for (const project of starProjects) {
    if (!(latestReport.scanTable || []).some(row => Number(row.projectStars?.[project]) > 0)) {
      throw Error(`Final scan has no starred ${project} selection`);
    }
  }
}
if (latestReview.completed === true && latestReview.date < latestReport.date) {
  const reviewTracking = Array.isArray(latestReview.tracking)
    ? latestReview.tracking.filter(ticket => ['core20', 'core30'].includes(ticket.category))
    : [];
  const publishedTracking = [
    ...(latestReport.trackingHistory?.two || []),
    ...(latestReport.trackingHistory?.three || []),
  ];
  for (const ticket of reviewTracking) {
    if (!publishedTracking.some(item => item.id === ticket.id)) {
      throw Error(`Tracking history missing settled review ticket: ${ticket.id}`);
    }
  }
}
validateReviewConsistency(projectRoot);
validateFormalReport(projectRoot);
validateTicketMath(projectRoot);

const html = readProjectFile('public/index.html');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!script) throw Error('Page script missing');
new Function(script);

const requiredMarkers = [
  ['raw.githubusercontent.com/zdongdong8219-jpg/football-monitor/main/data/', 'Data integration missing'],
  ['function recommendationGroup(r)', 'Recommendation grouping missing'],
  ['stronglyRecommended', 'Independent recommendation badge data missing'],
  ['strong-badge', 'Independent recommendation badge styling missing'],
  ['betSingleRecommended', 'Bet-single recommendation marker missing'],
  ['bet-single-badge', 'Bet-single recommendation badge styling missing'],
  ['.recommendation-groups{display:grid;grid-template-columns:minmax(0,1fr)', 'Single-column recommendation layout missing'],
  ['predictedScore', 'Score prediction rendering missing'],
  ['combinationCount', 'Combination structure rendering missing'],
  ['halfTimePrediction', 'Half-full-time prediction rendering missing'],
  ['upgradeFrom', 'Half-full-time upgrade data missing'],
  ['selectionReason', 'Selection rationale rendering missing'],
  ['renderScanTable', 'Scan summary table missing'],
  ['confidenceStars', 'Scan confidence rendering missing'],
  ['copyScanTable', 'Mobile scan image copy control missing'],
  ['function scanImageBlob(){return tableImageBlob(false);}', 'Copy entry must use full recommendation-and-scan image'],
  ['id="copyPoster"', 'Top image copy control missing'],
  ['lines:completeTicketLines(r)', 'Full original ticket details missing from image'],
  ['ClipboardItem', 'Clipboard API integration missing'],
  ['image/png', 'PNG clipboard output missing'],
  ['renderReview', 'Post-match review rendering missing'],
  ['review-latest.json', 'Post-match review data integration missing'],
  ['markedPick', 'Review pick marker missing'],
  ['hit-mark', 'Review hit marker missing'],
  ['recommendationDetails', 'Recommendation detail rendering missing'],
  ['coverageText', 'Coverage and risk rendering missing'],
];

for (const [marker, message] of requiredMarkers) {
  if (!html.includes(marker)) throw Error(message);
}

const groupStart = html.indexOf('const sections=[');
const categoryOrder = ["'two'", "'half_full'", "'three'", "'dream'"]
  .map(marker => html.indexOf(marker, groupStart));
if (categoryOrder.some((position, index) =>
  position < 0 || (index > 0 && position <= categoryOrder[index - 1])
)) throw Error('Recommendation priority order incorrect');

console.log('Football mobile build verified');


