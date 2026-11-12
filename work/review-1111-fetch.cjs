const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const D='data/research/2026-11-11/',dir=D+'review-results/';fs.mkdirSync(dir,{recursive:true});
const report=JSON.parse(fs.readFileSync('data/reports/2026-11-11.json'));
const ids=[6538690,6538689,6538688,6538691,6014408,6015570];
const names=[['Yokohama','Kashima'],['Vissel','Machida'],['Kawasaki','Kashiwa'],['Urawa','Cerezo'],['Sheffield Wednesday','Accrington'],['Barnsley','Oldham']];
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
(async()=>{const fixtures=[];for(let i=0;i<ids.length;i++){
 const sourceUrl='https://www.fotmob.com/api/data/matchDetails?matchId='+ids[i],rawFile=dir+'fotmob-'+ids[i]+'.json';
 const res=await fetch(sourceUrl,{signal:AbortSignal.timeout(30000)});assert(res.ok);const raw=await res.text();fs.writeFileSync(rawFile,raw);const j=JSON.parse(raw),s=report.scanTable[i],teams=j.header.teams,ht=j.content.matchFacts.events.events.find(e=>e.type==='Half'&&e.halfStrShort==='HT');
 assert(j.header.status.finished&&!j.header.status.cancelled);assert.equal(Date.parse(j.general.matchTimeUTCDate),Date.parse(s.kickoff));teams.forEach((t,k)=>assert(t.name.includes(names[i][k])));assert(ht);
 fixtures.push({number:s.number,officialMatchId:s.officialMatchId,scheduledKickoff:s.kickoff,sourceKickoff:j.general.matchTimeUTCDate,sourceTeams:teams.map(t=>t.name),sourceLeague:j.general.leagueName,identityVerified:true,finished:true,fullTime:teams.map(t=>t.score).join(':'),halfTime:[ht.homeScore,ht.awayScore].join(':'),sourceUrl,rawFile,sha256:crypto.createHash('sha256').update(raw).digest('hex'),checkedAt:new Date().toISOString()});
 }write(D+'review-result-audit.json',{date:report.date,checkedAt:new Date().toISOString(),fixtures});console.log(JSON.stringify(fixtures));
 const u='https://webapi.sporttery.cn/gateway/uniform/football/getMatchResultV1.qry?matchPage=1&matchBeginDate=2026-11-11&matchEndDate=2026-11-11&pageSize=100&isFix=0&pcOrWap=1';try{const r=await fetch(u,{signal:AbortSignal.timeout(30000)}),s=await r.text();fs.writeFileSync(dir+'official.txt',s);write(dir+'official-fetch.json',{url:u,status:r.status,checkedAt:new Date().toISOString(),sha256:crypto.createHash('sha256').update(s).digest('hex')});console.log('official',s.slice(0,2500));}catch(e){write(dir+'official-fetch.json',{url:u,error:String(e),checkedAt:new Date().toISOString()});}
})().catch(e=>{console.error(e);process.exitCode=1});
