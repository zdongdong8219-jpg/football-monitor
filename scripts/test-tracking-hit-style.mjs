import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {validateTrackingHitStyle} from './validate-tracking-hit-style.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');validateTrackingHitStyle(root);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tracking-style-test-'));
try{
 for(const p of ['data/tracking-hit-style-lock.json','data/review-template-lock.json','public/assets/tracking-haomi.png','public/muse-cards.js']){const to=path.join(temp,p);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,p),to);}
 const file=path.join(temp,'public/muse-cards.js'),source=fs.readFileSync(file,'utf8');
 fs.writeFileSync(file,source.replace("if(isResult&&s==='命中'){drawTrackingHit(ctx,x,y,widths[j])}","if(isResult&&s==='命中'){ctx.fillStyle='#c94338'}"));assert.throws(()=>validateTrackingHitStyle(temp),/renderer missing/);
 fs.writeFileSync(file,source.replace("if(r?.hit===true)return '命中';","if(r?.hit===true)return '未中';"));assert.throws(()=>validateTrackingHitStyle(temp),/decisions changed/);
 fs.writeFileSync(file,source);fs.appendFileSync(path.join(temp,'public/assets/tracking-haomi.png'),'tamper');assert.throws(()=>validateTrackingHitStyle(temp),/asset\/base/);
 console.log('4 tracking style checks passed: valid, old red rejected, decisions protected, asset protected');
}finally{if(path.dirname(temp)!==os.tmpdir()||!path.basename(temp).startsWith('tracking-style-test-'))throw Error('Unexpected cleanup path');fs.rmSync(temp,{recursive:true,force:true});}
