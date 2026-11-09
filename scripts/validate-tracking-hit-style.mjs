import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
export function validateTrackingHitStyle(root,rendererFile='public/muse-cards.js'){
 const read=p=>fs.readFileSync(path.join(root,p));
 const lock=JSON.parse(read('data/tracking-hit-style-lock.json'));
 if(lock.version!=='2026-11-09-mamlai-v2'||lock.label!=='妈来'||lock.missLabel!=='惜败'||!lock.swordDecoration||!lock.userApproved)throw Error('Tracking hit style lock missing');
 if(hash(read(lock.asset))!==lock.assetSha256||hash(read(lock.inherits))!==lock.baseTemplateSha256)throw Error('Tracking asset/base template changed');
 const renderer=read(rendererFile).toString().replace(/\r\n/g,'\n');
 const from=renderer.indexOf('  function trackingResult(r){'),to=renderer.indexOf('    function values(r,i)');
 if(from<0||to<from||hash(renderer.slice(from,to))!==lock.statusFunctionSha256)throw Error('Tracking result decisions changed');
 for(const marker of ["trackingHitAsset.src='assets/tracking-mamlai.png'","await Promise.all([assetReady,trackingHitReady])","if(isResult&&s==='命中'){drawTrackingHit(ctx,x,y,widths[j])}","else if(isResult&&s==='未中'){ctx.save();ctx.fillStyle='#59677f';","centeredCell(ctx,'惜败',x,widths[j],y+48,18,'#fff',true)","ctx.rect(x+2,y+34,width-4,52)","ctx.drawImage(trackingHitAsset,x+4,y+37,width-8,46)"])if(!renderer.includes(marker))throw Error('Approved tracking hit renderer missing: '+marker);
 if(renderer.includes("s==='命中'?'#c94338'"))throw Error('Old red tracking hit style forbidden');
 return true;
}
