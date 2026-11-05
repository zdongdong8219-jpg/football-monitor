// Compare outcome sets on integer home-minus-away margins, not predicted scores.
const aliases = new Map([
  ['胜', '胜'], ['主胜', '胜'], ['主队胜', '胜'], ['普通胜', '胜'], ['普通主胜', '胜'],
  ['负', '负'], ['客胜', '负'], ['客队胜', '负'], ['主负', '负'], ['普通负', '负'], ['普通客胜', '负'],
  ['平', '平'], ['平局', '平'], ['普通平', '平'],
  ['让胜', '让胜'], ['让球胜', '让胜'], ['让球主胜', '让胜'],
  ['让平', '让平'], ['让球平', '让平'], ['让球平局', '让平'],
  ['让负', '让负'], ['让球负', '让负'], ['让球客胜', '让负'],
]);

export function normalizeDirection(value) {
  const text = String(value ?? '').normalize('NFKC').replace(/\s+/g, '').replace(/^(推荐|博)[:：]/, '').replace(/[★☆]+$/, '');
  const expanded = ({双平: '平/让平', 主队不败: '胜/平', 主不败: '胜/平', 客队不败: '负/平', 客不败: '负/平', 胜平: '胜/平', 平胜: '平/胜', 负平: '负/平', 平负: '平/负'})[text] || text;
  return [...new Set(expanded.split(/[\/、,，或|｜]/).map(token => {
    const canonical = aliases.get(token);
    if (!canonical) throw Error('Unrecognized actual market direction: ' + token);
    return canonical;
  }))];
}

export function inspectSpeculativeNarrowing(row) {
  const primary = normalizeDirection(row.primaryPick ?? row.buy ?? row.selection);
  const speculative = normalizeDirection(row.speculative);
  const handicap = row.handicap;
  if (typeof handicap !== 'number' || !Number.isSafeInteger(handicap) || Math.abs(handicap) > Number.MAX_SAFE_INTEGER - 2) {
    throw Error('Official integer home handicap required');
  }
  // The predicates change only at 0 and -handicap. Their neighbors represent
  // every nonempty integer interval, including both unbounded tails exactly.
  const margins = [...new Set([0, -handicap].flatMap(n => [n - 1, n, n + 1]))].sort((a, b) => a - b);
  const matches = (choices, margin) => choices.some(choice => {
    const adjusted = margin + (choice.startsWith('让') ? handicap : 0);
    return choice.replace('让', '') === (adjusted > 0 ? '胜' : adjusted < 0 ? '负' : '平');
  });
  const main = margins.filter(n => matches(primary, n));
  const narrow = margins.filter(n => matches(speculative, n));
  const outside = narrow.filter(n => !main.includes(n));
  const omitted = main.filter(n => !narrow.includes(n));
  const code = outside.length ? 'incompatible' : !omitted.length ? 'duplicate' : 'strict_subset';
  return {number: row.number, handicap, primary, speculative, code, passed: code === 'strict_subset', witnesses: {outside, omitted}, basis: 'exact integer goal-margin market sets; no predicted score inference'};
}

export function validateSpeculativeNarrowing(report) {
  if (!Array.isArray(report.scanTable) || !report.scanTable.length) throw Error('Missing scan rows for narrowing gate');
  const rows = report.scanTable.map(row => {
    try { return inspectSpeculativeNarrowing(row); }
    catch (e) { return {number: row.number, passed: false, code: 'unverifiable', error: e.message}; }
  });
  const failed = rows.filter(row => !row.passed);
  if (failed.length) {
    const error = Error('Speculative narrowing gate failed: ' + failed.map(row => `${row.number}: ${row.code}${row.error ? ' (' + row.error + ')' : ''}`).join('; '));
    error.audit = {passed: false, rows};
    throw error;
  }
  return {passed: true, rows};
}
