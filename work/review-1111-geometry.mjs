import fs from 'node:fs';
let source=fs.readFileSync('work/reissue-1111/render.mjs','utf8');
source=source.replace("const dir='work/reissue-1111/',report=JSON.parse(fs.readFileSync('data/latest.json'));","const dir='work/reissue-1111/',report=JSON.parse(fs.readFileSync('data/reports/2026-11-11.json'));");
source=source.replace("s=s.slice(0,s.indexOf('  const publishedReview='))", "s=s.replace('numbers:rows.map(r=>r.number)', 'numbers:rows.map(r=>r.number),ticketBlocks:ticketBlocks.map(b=>({id:b.r?.id,h:b.h,tier:b.tier})),scanTop,recommendEnd');s=s.slice(0,s.indexOf('  const publishedReview='))");
source=source.replace("for(const kind of ['scan','tracking'])", "for(const kind of ['scan'])");
source=source.replace("const file='public/cards/'+report.imageFiles[kind].replace('.png','');", "fs.writeFileSync('work/review-1111/geometry.json',JSON.stringify(await run('window.__scanGeometry')));const file='work/review-1111/geometry-reference';");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
