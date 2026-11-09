import fs from 'node:fs';
import path from 'node:path';

const sign = (home, away) => home > away ? '胜' : home < away ? '负' : '平';
const options = value => String(value ?? '').split('/').map(item => item.trim()).filter(Boolean);

export function validateReviewConsistency(projectRoot) {
  const review = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data/review-latest.json'), 'utf8'));
  if (!review?.date || !Array.isArray(review.rows)) throw Error('Review rows missing');
  const original = JSON.parse(fs.readFileSync(path.join(projectRoot, `data/reports/${review.date}.json`), 'utf8'));
  const scans = new Map((original.scanTable || []).map(row => [row.number, row]));
  const excludesUnissued = review.evaluationPolicy === 'exclude-unissued-v1';
  const pickFields = {result: 'buy', goals: 'goals', score: 'score', halfFull: 'halfFull'};
  const unissued = (row, key) => {
    const scan = scans.get(row.number);
    return excludesUnissued && scan && (scan.lateAnalysis === true || /^(无|资料不足|未交付|)$/.test(String(scan[pickFields[key]] ?? '').trim()));
  };

  for (const row of review.rows) {
    if (!/^\d+\s*:\s*\d+$/.test(String(row.actualScore))) continue;
    const scan = scans.get(row.number);
    if (!scan) throw Error(`Review ${row.number}: immutable scan row missing`);
    const [home, away] = row.actualScore.split(':').map(Number);
    const ordinary = sign(home, away);
    const rawHandicap = scan.officialHandicap ?? scan.handicap ?? 0;
    const handicapNumber = Number(String(rawHandicap).match(/\d+/)?.[0] || 0);
    const adjustedHome = typeof rawHandicap === 'number' ? home + rawHandicap : home + (/受让/.test(rawHandicap) ? handicapNumber : -handicapNumber);
    const handicap = '让' + sign(adjustedHome, away);
    const expected = {
      result: options(scan.buy).includes(String(scan.buy).startsWith('让') ? handicap : ordinary),
      goals: (String(scan.goals).match(/\d+/g) || []).map(Number).includes(home + away),
      score: options(scan.score).map(value => value.replace(/\s/g, '')).includes(`${home}:${away}`),
      halfFull: null
    };
    if (/^\d+\s*:\s*\d+$/.test(String(row.halfScore))) {
      const [halfHome, halfAway] = row.halfScore.split(':').map(Number);
      expected.halfFull = options(scan.halfFull).includes(sign(halfHome, halfAway) + ordinary);
    }
    for (const key of ['result', 'goals', 'score', 'halfFull']) {
      if (unissued(row, key)) {
        if (row.hits?.[key] !== null) throw Error(`Review ${row.number}: unissued ${key} must not be scored`);
        continue;
      }
      if (expected[key] !== null && row.hits?.[key] !== expected[key]) {
        throw Error(`Review ${row.number}: ${key}=${row.hits?.[key]} but immutable pick and score require ${expected[key]}`);
      }
    }
  }

  for (const key of ['result', 'goals', 'halfFull', 'score']) {
    const expected = {
      hit: review.rows.filter(row => row.hits?.[key] === true).length,
      total: review.rows.filter(row => row.hits?.[key] != null).length,
      pending: review.rows.filter(row => row.hits?.[key] == null && !unissued(row, key)).length
    };
    for (const field of ['hit', 'total', 'pending']) {
      if (review.statistics?.[key]?.[field] !== expected[field]) {
        throw Error(`Review statistics ${key}.${field}=${review.statistics?.[key]?.[field]} but rows require ${expected[field]}`);
      }
    }
    if (excludesUnissued && review.statistics?.[key]?.notIssued !== review.rows.filter(row => unissued(row, key)).length) {
      throw Error(`Review statistics ${key}.notIssued does not match immutable issuance records`);
    }
  }
  return {date: review.date, rows: review.rows.length, statistics: review.statistics};
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) {
  const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
  console.log(JSON.stringify(validateReviewConsistency(projectRoot)));
}
