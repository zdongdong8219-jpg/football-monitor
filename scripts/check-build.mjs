import fs from 'node:fs';
for(const file of ['data/state.json','data/latest.json']) JSON.parse(fs.readFileSync(file,'utf8'));
const html=fs.readFileSync('public/index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!script)throw Error('Page script missing');
new Function(script);
if(!html.includes("fetch('data/state.json")||!html.includes("fetch('data/latest.json"))throw Error('Data integration missing');
console.log('Football mobile build verified');
