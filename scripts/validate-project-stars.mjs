import fs from 'node:fs';
import path from 'node:path';

export function validateProjectStars(root) {
  const report = JSON.parse(fs.readFileSync(path.join(root, 'data/latest.json'), 'utf8'));
  if (report.date < '2026-10-27') return;
  const fields = ['direction', 'speculative', 'goals', 'halfFull', 'score'];
  for (const row of report.scanTable ?? []) {
    for (const field of fields) {
      const rating = row.projectStars?.[field];
      if (!Number.isInteger(rating) || rating < 0 || rating > 3)
        throw Error(`${row.number} ${field}: 必须独立填写0至3星`);
      if (rating ? !['red', 'white'].includes(row.projectStarColors?.[field]) : row.projectStarColors?.[field] !== 'none')
        throw Error(`${row.number} ${field}: 有星必须注明红色或白色，无星使用none`);
      if (typeof row.projectStarAudit?.[field] !== 'string' || !row.projectStarAudit[field].trim())
        throw Error(`${row.number} ${field}: 缺少独立评星或不加星理由`);
    }
  }
  const renderer = fs.readFileSync(path.join(root, 'public/muse-cards.js'), 'utf8');
  for (const label of ['★★★ 给我干他', '★★ 超级看好', '★ 一般看好'])
    if (!renderer.includes(label)) throw Error(`星级档位文案不可变更：${label}`);
}
