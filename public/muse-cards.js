/* Shared phone preview and clipboard renderer. Reference template: supplied MUSE cards. */
(() => {
  const TITLE='FT足球竞彩模型';
  const FONT='"Microsoft YaHei",system-ui,sans-serif';
  const asset=new Image();asset.src='assets/muse-hero.jpg';
  const assetReady=asset.decode().catch(()=>{});
  const money=n=>n==null?'—':(Number(n)>0?'+':'')+Number(Number(n).toFixed(2));
  const plain=v=>String(v??'').replace(/<[^>]*>/g,'');
  function wrap(ctx,text,max){let line='',out=[];for(const c of plain(text)){if(c==='\n'||(ctx.measureText(line+c).width>max&&line)){out.push(line);line='';if(c==='\n')continue}line+=c}if(line)out.push(line);return out.length?out:['—']}
  function text(ctx,value,x,y,max,size=24,color='#fff',bold=false){ctx.font=`${bold?'700 ':''}${size}px ${FONT}`;ctx.fillStyle=color;const lines=wrap(ctx,value,max);lines.forEach((s,i)=>ctx.fillText(s,x,y+i*(size+10)));return lines.length*(size+10)}
  function setup(height){const canvas=document.createElement('canvas');canvas.width=1376;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#2e528a';ctx.fillRect(0,0,1376,height);ctx.textBaseline='top';return {canvas,ctx}}
  function edge(ctx,h){ctx.strokeStyle='#f0c96c';ctx.lineWidth=9;ctx.strokeRect(7,7,1362,h-14);ctx.strokeStyle='#90b6e8';ctx.lineWidth=2;ctx.strokeRect(20,20,1336,h-40)}
  function band(ctx,y,w=1290,h=68){ctx.fillStyle='#183d79';ctx.fillRect(43,y,w,h)}
  function centered(ctx,s,y,size=40,color='#fff'){ctx.textAlign='center';text(ctx,s,688,y,1280,size,color,true);ctx.textAlign='left'}
  function chip(ctx,s,x,y,color='#218fbe',w=190){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,40,20);ctx.fill();ctx.textAlign='center';text(ctx,s,x+w/2,y+7,w-10,23,'#fff',true);ctx.textAlign='left'}
  function star(r){const n=Number(r.stars??r.confidenceStars);if(n>=3)return ['★★★ 给我干他','#ff604c'];if(n===2||r.stronglyRecommended)return ['★★ 超级看好','#ff951e'];if(n===1)return ['★ 一般看好','#c1c9d8'];return ['未评星','#a8bed8']}
  function slot(r){const s=[r.category,r.name,r.type,r.passType].filter(Boolean).join(' ');if(/dream|梦想/.test(s))return 5;if(/half_full|半全场/.test(s))return 4;if(/three|3串1/.test(s))return 3;if(/双选|重叠/.test(s))return 1;if(/3[.]0|约3倍/.test(s))return 2;if(/single|单关/.test(s))return 6;return 0}
  const labels=['最稳2串1 · 2.0版','双选2串1','最稳2串1 · 3.0版','最稳3串1','半全场2串1','梦想单','单关'];
  const colors=['#f08219','#12b7a0','#ed741b','#2993c2','#a15ac1','#ee5147','#21825a'];
  function liveReport(){return posterReport?.date===currentScanDate?posterReport:{date:currentScanDate,recommendations:[],pending:true}}
  function orderedTickets(rs){const out=[];labels.forEach((label,i)=>{const group=rs.filter(r=>slot(r)===i);if(group.length)group.forEach(r=>out.push({r,label,i}));else out.push({r:null,label,i})});return out}
  function selections(r){return r.selectionText||(r.legs||[]).map(l=>`${l.number||''}[${l.selection||'—'}]`).join(' × ')}
  const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败')),'image/png'));
  async function poster(reviewMode){
    await assetReady;
    const report=reviewMode?currentReview:liveReport();if(!report)throw Error('没有可用复盘');
    const raw=reviewMode?(report.ticketReview?.length?report.ticketReview:report.combinations||[]):report.recommendations||[];
    const tickets=reviewMode?raw.map((r,i)=>({r,label:r.name||labels[slot(r)],i:slot(r)})):orderedTickets(raw);
    const rows=reviewMode?(report.rows||[]):currentScanRows;
    const probe=document.createElement('canvas').getContext('2d');
    const ticketBlocks=tickets.map(({r,label,i})=>{const title=r?selections(r)||r.name||label:'今晚不出 · 暂无合格方案';const detail=!r?'不凑单，等待有依据的候选':reviewMode?(r.detail||r.status||r.result||'待定'):[r.oddsText||r.totalOdds||'赔率待核',r.totalCost!=null?`总投入${r.totalCost}元`:'',(r.legs||[]).map(l=>l.selectionReason||'').filter(Boolean).join('；')].filter(Boolean).join(' · ');probe.font=`700 29px ${FONT}`;const a=wrap(probe,title,920);probe.font=`23px ${FONT}`;const b=wrap(probe,detail,920);return {r,label,i,a,b,h:Math.max(140,a.length*39+b.length*33+72)}});
    const widths=[120,155,100,280,170,100,125,140,100],heads=['编号','时间','赛事','主队 : 客队','胜平负/让球','总进球','半全场','比分','赛果'];
    const league=r=>String(r.league||'—').replace('欧洲协会联赛','欧协联').replace('解放者杯','解放杯');
    const getCells=r=>reviewMode?[r.number,r.time,league(r),r.teams,r.resultPick,r.goalsPick,r.halfFullPick,r.scorePick,r.actualScore||'待定']:[r.number,(r.kickoff||'').replace('T',' ').slice(5,16),league(r),r.teams||[r.home,r.away].join(' : '),r.primaryPick||r.buy||r.selection||'待分析',r.goals||r.goalRange||'—',r.halfFull||r.halfTimePrediction||'—',r.score||r.predictedScore||'—','待定'];
    probe.font=`23px ${FONT}`;const cells=rows.map(getCells),rowHeights=cells.map(a=>Math.max(83,...a.map((s,i)=>wrap(probe,s,widths[i]-18).length*33+25)));
    const recommendEnd=260+ticketBlocks.reduce((a,b)=>a+b.h,0),scanTop=recommendEnd+145,tableTop=scanTop+165,height=tableTop+68+rowHeights.reduce((a,b)=>a+b,0)+170;
    const {canvas,ctx}=setup(height);
    if(asset.naturalWidth){ctx.save();ctx.globalAlpha=.46;ctx.drawImage(asset,0,300,1376,920);ctx.restore()}
    centered(ctx,TITLE,48,29,'#a8ccff');centered(ctx,reviewMode?'✨ 推荐复盘 ✨':'✨ 今日推荐 ✨',103,64);centered(ctx,`${report.date||'日期待核'} · ${rows.length}场`,183,28,'#bfd2ed');
    let y=260;ticketBlocks.forEach((b,n)=>{ctx.fillStyle=n===0?'#f9bd23':'#9db0ce';ctx.beginPath();ctx.arc(77,y+29,31,0,Math.PI*2);ctx.fill();ctx.textAlign='center';text(ctx,n+1,77,y+12,60,31,'#fff',true);ctx.textAlign='left';chip(ctx,b.label,125,y+9,colors[b.i],b.label.length>10?265:195);let yy=y+46;const x=410;const st=b.r?star(b.r):['','#aaa'];const status=reviewMode?(b.r.status||b.r.result||'待定'):st[0];text(ctx,status,x,y+8,920,23,reviewMode?'#f7d675':st[1],true);text(ctx,b.a.join('\n'),x,yy,920,29,'#fff',true);yy+=b.a.length*39;text(ctx,b.b.join('\n'),x,yy,920,23,'#ffdb72',false);y+=b.h});
    centered(ctx,'★★★ 给我干他   ★★ 超级看好   ★ 一般看好',recommendEnd+20,24,'#ff9a35');centered(ctx,'⚽ 仅供参考 · 理性购彩 ⚽',recommendEnd+65,24,'#bfcee4');ctx.strokeStyle='#87a2ce';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(45,scanTop-10);ctx.lineTo(1330,scanTop-10);ctx.stroke();centered(ctx,'⚽ '+TITLE+' · 赛前预测',scanTop+22,27,'#a4ceff');centered(ctx,reviewMode?'✨ 竞彩扫盘 · 复盘 ✨':'✨ 竞彩扫盘 ✨',scanTop+69,48);centered(ctx,report.date||'',scanTop+130,24,'#bfd2ed');
    band(ctx,tableTop,1290,68);let x=43;heads.forEach((s,i)=>{text(ctx,s,x+9,tableTop+22,widths[i]-10,24,'#fff',true);x+=widths[i]});y=tableTop+68;
    rows.forEach((r,j)=>{ctx.fillStyle=j%2?'#173970':'#23477d';ctx.fillRect(43,y,1290,rowHeights[j]);x=43;cells[j].forEach((s,i)=>{const color=i===8?'#b4c4d9':'#fff';text(ctx,s,x+9,y+16,widths[i]-18,23,color,i===3);if(reviewMode&&[4,5,6,7].includes(i)){const key={4:'result',5:'goals',6:'halfFull',7:'score'}[i];if(r.hits?.[key]===true){ctx.strokeStyle='#62b46d';ctx.lineWidth=3;ctx.strokeRect(x+3,y+7,widths[i]-7,rowHeights[j]-14)}}x+=widths[i]});y+=rowHeights[j]});
    centered(ctx,reviewMode?'命中仅按原票与核验赛果标记 · 待定不计战绩':'当日方向与推荐同步 · 未发布场次如实标待分析',height-118,23,'#a9c0de');centered(ctx,'⚽ 仅供参考 · 理性购彩 ⚽',height-74,25,'#b8c9e1');edge(ctx,height);return png(canvas);
  }
  async function tracking(reviewMode){
    await assetReady;const report=reviewMode?currentReview:liveReport();if(!report)throw Error('没有可用复盘');
    const raw=reviewMode?(report.ticketReview?.length?report.ticketReview:report.combinations||[]):report.recommendations||[];
    const two=raw.filter(r=>/two|2串1|2.0|3.0/.test([r.category,r.name].join(' '))&&!/half_full|半全场/.test([r.category,r.name].join(' ')));
    const left=two.filter(r=>slot(r)!==2),right=two.filter(r=>slot(r)===2);const count=Math.max(left.length,right.length,1),heroH=918,tableY=1030,height=tableY+80+count*135+160;
    const {canvas,ctx}=setup(height);ctx.fillStyle='#102650';ctx.fillRect(0,0,1376,height);if(asset.naturalWidth)ctx.drawImage(asset,0,0,1376,heroH);
    ctx.fillStyle='rgba(14,41,77,.86)';ctx.fillRect(36,heroH-77,1304,77);centered(ctx,TITLE+' · '+(reviewMode?'复盘跟踪卡':'今日跟踪卡'),heroH-59,39,'#f5d485');
    band(ctx,heroH+10,1290,88);text(ctx,'2.0 求稳',70,heroH+35,260,30,'#9cc8ff',true);centered(ctx,'每日最稳2串1',heroH+32,34);text(ctx,'3.0 求赚',1100,heroH+35,240,30,'#ffa14a',true);
    const widths=[130,285,75,100,115,285,75,100,125],heads=['日期','二串一','结果','当日盈亏','累计盈亏','二串一','结果','当日盈亏','累计盈亏'];band(ctx,tableY,1290,80);let x=43;heads.forEach((s,i)=>{text(ctx,s,x+5,tableY+25,widths[i]-8,23,'#fff',true);x+=widths[i]});
    function values(r){if(!r)return ['—','—','—','—'];const cost=Number(r.cost??r.exampleStake),net=r.net??r.exampleNet;const amount=reviewMode&&Number.isFinite(cost)&&cost>0&&net!=null?Number(net)/cost*1000:null;return [selections(r)||r.name,reviewMode?(r.status||r.result||'待定'):'待定',money(amount),r.cumulativeNet==null?'—':money(r.cumulativeNet)]}
    for(let i=0;i<count;i++){const y=tableY+80+i*135;ctx.fillStyle=i%2?'#173260':'#203f73';ctx.fillRect(43,y,1290,135);const data=[(report.date||'').slice(5).replace('-','.'),...values(left[i]),...values(right[i])];x=43;data.forEach((s,j)=>{const c=[3,4,7,8].includes(j)?(String(s).startsWith('+')?'#fa806b':String(s).startsWith('-')?'#76ce8b':'#9aafcc'):'#fff';text(ctx,s,x+7,y+22,widths[j]-14,j===1||j===5?25:21,c,j===1||j===5);x+=widths[j]});ctx.strokeStyle='#58729c';ctx.beginPath();ctx.moveTo(43,y+134);ctx.lineTo(1333,y+134);ctx.stroke()}
    centered(ctx,'跟踪口径：每组总投入1000元，双选分摊；仅为统一模拟记账',height-125,23,'#b5c6de');centered(ctx,'累计需已核验历史序列；缺少记录显示 —，不虚构历史盈亏',height-87,22,'#9bb3d2');centered(ctx,TITLE+' · 仅供参考 · 理性购彩',height-50,22,'#b5c6de');edge(ctx,height);return png(canvas);
  }
  scanImageBlob=()=>poster(false);reviewImageBlob=()=>poster(true);trackingImageBlob=tracking;
  let timer;const cache=new Map();
  function schedule(){clearTimeout(timer);timer=setTimeout(refreshPreviews,500)}
  async function refreshPreviews(){
    let area=document.getElementById('phoneImageCards');if(!area){area=document.createElement('section');area.id='phoneImageCards';area.innerHTML='<h2>模型图片 · 可直接复制</h2><p>点图可放大，长按可保存。推荐与跟踪卡各一张，复盘各一张。</p><div class="phone-image-grid"></div>';$('summary').before(area)}
    const grid=area.querySelector('.phone-image-grid');grid.innerHTML='';
    const specs=[['今日推荐＋扫盘',false,false,'copyPoster','quickPoster'],['今日跟踪卡',false,true,'copyTracking','quickTracking'],['复盘推荐＋扫盘',true,false,'copyReview','quickReview'],['复盘跟踪卡',true,true,'copyReviewTracking','quickReviewTracking']];
    for(const [title,isReview,isTracking,id,quick] of specs){const ready=isReview?Boolean(currentReview?.rows?.length):Boolean(currentScanRows.length);$(id).disabled=!ready;$(quick).disabled=!ready;if(!ready)continue;const box=document.createElement('article');box.innerHTML='<h3></h3><p></p><button type="button">⧉ 复制图片</button><a target="_blank" rel="noopener"><img loading="lazy"></a>';box.querySelector('h3').textContent=title;box.querySelector('p').textContent=(isReview?currentReview?.date:currentScanDate)+(isReview?' · 历史原票复盘':liveReport().pending?' · 今日方案待发布':' · 当日原票');box.querySelector('button').onclick=()=>$(id).click();grid.append(box);try{const blob=await(isTracking?tracking(isReview):poster(isReview));const url=URL.createObjectURL(blob);const previous=cache.get(id);if(previous)URL.revokeObjectURL(previous);cache.set(id,url);const img=box.querySelector('img');img.src=url;img.alt=title;box.querySelector('a').href=url}catch(e){box.querySelector('p').textContent='图片暂未生成：'+e.message}}
  }
  for(const name of ['renderReport','renderScanTable','renderReview']){const previous=window[name];window[name]=function(...args){const result=previous.apply(this,args);schedule();return result}}
  [['quickPoster','copyPoster'],['quickTracking','copyTracking'],['quickReview','copyReview'],['quickReviewTracking','copyReviewTracking']].forEach(([quick,id])=>{$(quick).onclick=()=>$(id).click()});
  schedule();
})();
