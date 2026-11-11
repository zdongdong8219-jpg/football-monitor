import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import {spawn} from 'node:child_process';
const dir='work/reissue-1111/',report=JSON.parse(fs.readFileSync('data/latest.json'));
const html=()=>{let s=fs.readFileSync(dir+'main-muse.js','utf8');s=s.slice(0,s.indexOf('  const publishedReview='))+'window.testApi={poster,tracking};})();';return '<meta charset="utf-8"><script>var currentReview='+JSON.stringify(report)+';var posterReport=currentReview,currentScanDate=currentReview.date,currentScanRows=currentReview.scanTable;'+s+'</script>';};
const server=http.createServer((req,res)=>{try{const u=req.url.split('?')[0];if(u==='/before'||u==='/after'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html(u.slice(1)));}else if(u==='/before.png')res.end(fs.readFileSync(dir+'renderer-before.png'));else if(u.startsWith('/assets/'))res.end(fs.readFileSync('public/assets/'+path.basename(u)));else res.writeHead(404).end();}catch{res.writeHead(404).end();}}).listen(9456,'127.0.0.1');
const proc=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--remote-debugging-port=9457','--user-data-dir='+path.resolve(fs.mkdtempSync('work/mamlai-edge-')),'about:blank'],{windowsHide:true,stdio:'ignore'});let ws;
try{let tabs;for(let i=0;i<40;i++){try{tabs=await fetch('http://127.0.0.1:9457/json').then(r=>r.json());break;}catch{await new Promise(r=>setTimeout(r,200));}}
ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map();ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(pending.has(d.id)){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result);}});const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});const run=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
for(const kind of ['scan','tracking']){
 await call('Page.navigate',{url:'http://127.0.0.1:9456/after'});
 for(let i=0;i<40;i++){if(await run('Boolean(window.testApi)'))break;await new Promise(r=>setTimeout(r,100));}
 const data=await run(`(async()=>{const blob=await testApi.${kind==='scan'?'poster':'tracking'}(false);return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})})()`);
 const file='public/cards/2026-11-11-reissue-r2-'+kind;
 fs.writeFileSync(file+'.png',Buffer.from(data.split(',')[1],'base64'));
 const jpg=await run(`(async()=>{const i=new Image();i.src=${JSON.stringify(data)};await i.decode();const c=document.createElement('canvas');c.width=720;c.height=Math.round(i.height*720/i.width);c.getContext('2d').drawImage(i,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.88)})()`);
 fs.writeFileSync(file+'-preview.jpg',Buffer.from(jpg.split(',')[1],'base64'));
 console.log(file);
}
}finally{ws?.close();proc.kill();server.close();}
