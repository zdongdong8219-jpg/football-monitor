/* Shared phone preview and clipboard renderer. Reference template: supplied MUSE cards. */
(() => {
  const TITLE='FT足球竞彩模型';
  const FONT='"Microsoft YaHei",system-ui,sans-serif';
  const asset=new Image();asset.src='assets/muse-hero.jpg';
  const assetReady=asset.decode().catch(()=>{});
  const money=n=>n==null?'—':(Number(n)>0?'+':'')+Number(Number(n).toFixed(2));
  const plain=v=>String(v??'').replace(/<[^>]*>/g,'');
  const reviewPick=r=>plain(r.primaryPick||r.buy||r.resultPick||'待分析').split(/[|｜]\s*博\s*[:：]/)[0].replace(/^\s*买\s*[:：]\s*/,'').trim();
  function ticketSeal(ctx,r,x,y){const s=plain(r.status||r.result||'');let label='待定',color='#56718d';if(r.invalid||/不合规|无效/.test(s)){label='无效';color='#687380'}else if(/待定|待核|未完|未结/.test(s)){}else if(/未中|没中|错/.test(s)){label='错';color='#707986'}else if(r.hit===true||/全中|串子命中|^中$/.test(s)){label='中';color='#ce4038'}ctx.save();ctx.translate(x,y);ctx.rotate(-.12);ctx.fillStyle=color;ctx.strokeStyle='#e0e7ef';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-36,-25,72,50,5);ctx.fill();ctx.stroke();ctx.textAlign='center';text(ctx,label,0,-16,68,label.length>1?24:32,'#fff',true);ctx.restore();ctx.textAlign='left'}
  function wrap(ctx,text,max){let line='',out=[];for(const c of plain(text)){if(c==='\n'||(ctx.measureText(line+c).width>max&&line)){out.push(line);line='';if(c==='\n')continue}line+=c}if(line)out.push(line);return out.length?out:['—']}
  function text(ctx,value,x,y,max,size=24,color='#fff',bold=false){ctx.font=`${bold?'700 ':''}${size}px ${FONT}`;ctx.fillStyle=color;const lines=wrap(ctx,value,max);lines.forEach((s,i)=>ctx.fillText(s,x,y+i*(size+10)));return lines.length*(size+10)}
  function setup(height,width=1376){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#0d2148';ctx.fillRect(0,0,width,height);ctx.textBaseline='top';return {canvas,ctx}}
  function drawCover(ctx,image,x,y,width,height,focusX=.5,focusY=.5){if(!image.naturalWidth||!image.naturalHeight)return;const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight),sw=width/scale,sh=height/scale,sx=Math.max(0,Math.min(image.naturalWidth-sw,(image.naturalWidth-sw)*focusX)),sy=Math.max(0,Math.min(image.naturalHeight-sh,(image.naturalHeight-sh)*focusY));ctx.drawImage(image,sx,sy,sw,sh,x,y,width,height)}
  function edge(ctx,h){const w=ctx.canvas.width;ctx.strokeStyle='#f0c96c';ctx.lineWidth=9;ctx.strokeRect(7,7,w-14,h-14);ctx.strokeStyle='#90b6e8';ctx.lineWidth=2;ctx.strokeRect(20,20,w-40,h-40)}
  function band(ctx,y,w=1290,h=68){ctx.fillStyle='#183d79';ctx.fillRect(43,y,w,h)}
  function centered(ctx,s,y,size=40,color='#fff'){ctx.textAlign='center';text(ctx,s,ctx.canvas.width/2,y,ctx.canvas.width-96,size,color,true);ctx.textAlign='left'}
  function chip(ctx,s,x,y,color='#218fbe',w=190){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,40,20);ctx.fill();ctx.textAlign='center';text(ctx,s,x+w/2,y+7,w-10,23,'#fff',true);ctx.textAlign='left'}
  function star(r){const n=Number(r.stars??r.confidenceStars);if(n>=3)return ['★★★ 给我干他','#ff604c'];if(n===2||r.stronglyRecommended)return ['★★ 超级看好','#ff951e'];if(n===1)return ['★ 一般看好','#c1c9d8'];return ['未评星','#a8bed8']}
  function slot(r){const s=[r.category,r.name,r.type,r.passType].filter(Boolean).join(' ');if(/dream|梦想/.test(s))return 5;if(/half_full|半全场/.test(s))return 4;if(/three|3串1/.test(s))return 3;if(/双选|重叠/.test(s))return 1;if(/3[.]0|约3倍/.test(s))return 2;if(/single|单关/.test(s))return 6;return 0}
  function mainTier(r){const i=slot(r);return i===0||i===1||i===2}
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
    const ticketBlocks=tickets.map(({r,label,i})=>{const title=r?selections(r)||r.name||label:'今晚不出 · 暂无合格方案';const detail=!r?'不凑单，等待有依据的候选':reviewMode?(r.detail||r.status||r.result||'待定'):[r.oddsText||r.totalOdds||'赔率待核',r.totalCost!=null?`总投入${r.totalCost}元`:'',(r.legs||[]).map(l=>l.selectionReason||'').filter(Boolean).join('；')].filter(Boolean).join(' · ');probe.font=`700 27px ${FONT}`;const a=wrap(probe,title,680);probe.font=`22px ${FONT}`;const b=wrap(probe,detail,680);return {r,label,i,a,b,tier:r&&mainTier(r)?'main':'bet',h:Math.max(118,a.length*36+b.length*30+56)}});
    const widths=[95,105,80,210,220,90,110,160,90],heads=['编号','时间','赛事','主队 : 客队','胜平负/让球','总进球','半全场','比分（3个）','赛果'];
    const tableWidth=widths.reduce((a,b)=>a+b,0),posterWidth=1244;
    const threeScores=v=>{const scores=plain(Array.isArray(v)?v.join('；'):v).match(/\d+\s*[:：-]\s*\d+/g);return scores?.length?scores.slice(0,3).map(s=>s.replace(/\s/g,'').replace(/[：-]/,':')).join('；'):plain(v)||'—'};
    const league=r=>String(r.league||'—').replace('欧洲协会联赛','欧协联').replace('解放者杯','解放杯');
    const getCells=r=>{const pick=reviewMode?reviewPick(r):(r.primaryPick||r.buy||r.selection||'待分析');const rating=Number(r.stars??r.confidenceStars)||0;const marked=!reviewMode&&rating>0?`${pick} ${'★'.repeat(Math.min(3,rating))}`:pick;return reviewMode?[r.number,r.time,league(r),r.teams,marked,r.goalsPick,r.halfFullPick,threeScores(r.scorePick),r.actualScore||'待定']:[r.number,(r.kickoff||'').replace('T',' ').slice(5,16),league(r),r.teams||[r.home,r.away].join(' : '),marked,r.goals||r.goalRange||'—',r.halfFull||r.halfTimePrediction||'—',threeScores(r.score||r.predictedScore),'待定']};
    probe.font=`18px ${FONT}`;const cells=rows.map(getCells),rowHeights=cells.map(a=>Math.max(66,...a.map((s,i)=>wrap(probe,s,widths[i]-14).length*27+18)));
    const groupGap=56,recommendEnd=260+ticketBlocks.reduce((a,b)=>a+b.h,0)+groupGap,scanTop=recommendEnd+145,tableTop=scanTop+165,height=tableTop+68+rowHeights.reduce((a,b)=>a+b,0)+170;
    const {canvas,ctx}=setup(height,posterWidth);
    const artTop=260+ticketBlocks.slice(0,2).reduce((sum,b)=>sum+b.h,0);
    if(asset.naturalWidth){ctx.save();ctx.globalAlpha=.44;const sourceX=600,sourceY=0,sourceWidth=asset.naturalWidth-sourceX,sourceHeight=Math.min(560,asset.naturalHeight),artWidth=posterWidth*1.7,artHeight=artWidth*sourceHeight/sourceWidth;ctx.translate(posterWidth,0);ctx.scale(-1,1);ctx.drawImage(asset,sourceX,sourceY,sourceWidth,sourceHeight,(posterWidth-artWidth)/2,artTop-18,artWidth,artHeight);ctx.restore()}
    centered(ctx,TITLE,48,29,'#a8ccff');centered(ctx,reviewMode?'✨ 推荐复盘 ✨':'✨ 今日推荐 ✨',103,64);centered(ctx,`${report.date||'日期待核'} · ${rows.length}场`,183,28,'#bfd2ed');
    let y=260,currentTier='';const groupStarts={};ticketBlocks.forEach((b,n)=>{if(b.tier!==currentTier){if(currentTier)y+=groupGap;currentTier=b.tier;groupStarts[currentTier]={top:y,bottom:y}}ctx.fillStyle=n===0?'#f9bd23':'#9db0ce';ctx.beginPath();ctx.arc(70,y+25,28,0,Math.PI*2);ctx.fill();ctx.textAlign='center';text(ctx,n+1,70,y+10,56,28,'#fff',true);ctx.textAlign='left';chip(ctx,b.label,112,y+5,colors[b.i],b.label.length>10?245:180);let yy=y+41;const x=370;const st=b.r?star(b.r):['','#aaa'];const status=reviewMode?(b.r.status||b.r.result||'待定'):st[0];text(ctx,status,x,y+5,680,22,reviewMode?'#f7d675':st[1],true);text(ctx,b.a.join('\n'),x,yy,680,27,'#fff',true);yy+=b.a.length*36;text(ctx,b.b.join('\n'),x,yy,680,22,'#ffdb72',false);if(reviewMode&&b.r)ticketSeal(ctx,b.r,posterWidth-112,y+90);y+=b.h;groupStarts[currentTier].bottom=y});
    Object.entries(groupStarts).forEach(([tier,g])=>{ctx.strokeStyle=tier==='main'?'#f1c35b':'#79b8e8';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(34,g.top-18,posterWidth-68,g.bottom-g.top+28,28);ctx.stroke();const stamp=tier==='main'?'主推':'博单';const sx=posterWidth-112,sy=g.top+26;ctx.save();ctx.translate(sx,sy);ctx.rotate(-.1);ctx.fillStyle=tier==='main'?'#d84435':'#287bb5';ctx.beginPath();ctx.roundRect(-50,-28,100,56,8);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();ctx.textAlign='center';text(ctx,stamp,0,-17,92,30,'#fff',true);ctx.restore();ctx.textAlign='left'});
    centered(ctx,'★★★ 给我干他   ★★ 超级看好   ★ 一般看好',recommendEnd+20,24,'#ff9a35');centered(ctx,'⚽ 仅供参考 · 理性购彩 ⚽',recommendEnd+65,24,'#bfcee4');ctx.strokeStyle='#87a2ce';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(45,scanTop-10);ctx.lineTo(1330,scanTop-10);ctx.stroke();centered(ctx,'⚽ '+TITLE+' · 赛前预测',scanTop+22,27,'#a4ceff');centered(ctx,reviewMode?'✨ 竞彩扫盘 · 复盘 ✨':'✨ 竞彩扫盘 ✨',scanTop+69,48);centered(ctx,report.date||'',scanTop+130,24,'#bfd2ed');
    ctx.fillStyle='#0d2148';ctx.fillRect(42,tableTop,tableWidth,68);let x=42;heads.forEach((s,i)=>{text(ctx,s,x+7,tableTop+23,widths[i]-8,19,'#fff',true);x+=widths[i]});y=tableTop+68;
    rows.forEach((r,j)=>{ctx.fillStyle=j%2?'rgba(11,28,52,.92)':'rgba(17,39,69,.92)';ctx.fillRect(42,y,tableWidth,rowHeights[j]);x=42;cells[j].forEach((s,i)=>{const color=i===4&&!reviewMode?'#ff9a35':i===8?'#b4c4d9':'#fff';text(ctx,s,x+7,y+13,widths[i]-14,18,color,i===3||i===4);if(reviewMode&&[4,5,6,7].includes(i)){const key={4:'result',5:'goals',6:'halfFull',7:'score'}[i];if(r.hits?.[key]===true){ctx.strokeStyle='#62b46d';ctx.lineWidth=3;ctx.strokeRect(x+3,y+7,widths[i]-7,rowHeights[j]-14)}}x+=widths[i]});y+=rowHeights[j]});
    centered(ctx,reviewMode?'命中仅按原票与核验赛果标记 · 待定不计战绩':'当日方向与推荐同步 · 未发布场次如实标待分析',height-118,23,'#a9c0de');centered(ctx,'⚽ 仅供参考 · 理性购彩 ⚽',height-74,25,'#b8c9e1');edge(ctx,height);return png(canvas);
  }
  async function tracking(reviewMode){
    await assetReady;const report=reviewMode?currentReview:liveReport();if(!report)throw Error('没有可用复盘');
    const raw=reviewMode?(report.ticketReview?.length?report.ticketReview:report.combinations||[]):report.recommendations||[];
    const tier=r=>{const s=[r.name,r.type,r.passType,r.trackingTier].filter(Boolean).join(' ');if(/half_full|半全场|dream|梦想|three|3串1|single|单关/.test([r.category,s].join(' ')))return null;const m=s.match(/(?:^|[^\d.])([23])[.]0(?:版|档|\s|[｜|·：:]|$)/);return m?Number(m[1]):null};
    const session=r=>[r.sessionLabel,r.batchLabel,r.session,r.batch?.label,r.batch?.name,r.name].filter(v=>typeof v==='string').join(' ').match(/早场|中场|晚场/)?.[0]||'';
    const order=rs=>rs.map((r,i)=>({r,i})).sort((a,b)=>{const rank=r=>({'早场':0,'中场':1,'晚场':2}[session(r)]??3);return rank(a.r)-rank(b.r)||a.i-b.i}).map(x=>x.r);
    const left=order(raw.filter(r=>tier(r)===2)),right=order(raw.filter(r=>tier(r)===3));const count=Math.max(left.length,right.length,1),heroH=800,tableY=912,height=tableY+80+count*135+160;
    const cardWidth=1244,tableWidth=1160,tableX=42;const {canvas,ctx}=setup(height,cardWidth);ctx.fillStyle='#0d2148';ctx.fillRect(0,0,cardWidth,height);
    // Keep the whole reference artwork inside the border, including its left speech bubble.
    if(asset.naturalWidth){const artX=32,artY=32,artW=cardWidth-64,artH=artW*asset.naturalHeight/asset.naturalWidth;ctx.drawImage(asset,artX,artY,artW,artH);ctx.fillStyle='rgba(7,16,32,.24)';ctx.fillRect(artX,artY,artW,artH)}
    ctx.fillStyle='rgba(14,41,77,.86)';ctx.fillRect(36,heroH-77,cardWidth-72,77);centered(ctx,TITLE+' · '+(reviewMode?'复盘跟踪卡':'今日跟踪卡'),heroH-59,39,'#f5d485');
    ctx.fillStyle='#0d2148';ctx.fillRect(tableX,heroH+10,tableWidth,88);text(ctx,'2.0 求稳',65,heroH+35,240,30,'#9cc8ff',true);centered(ctx,'每日最稳2串1',heroH+32,34);text(ctx,'3.0 求赚',990,heroH+35,210,30,'#ffa14a',true);
    const widths=[115,255,65,90,100,255,65,90,125],heads=['日期','二串一','结果','当日盈亏','累计盈亏','二串一','结果','当日盈亏','累计盈亏'];ctx.fillStyle='#0d2148';ctx.fillRect(tableX,tableY,tableWidth,80);let x=tableX;heads.forEach((s,i)=>{text(ctx,s,x+5,tableY+25,widths[i]-8,21,'#fff',true);x+=widths[i]});
    function values(r){if(!r)return ['—','—','—','—'];const cost=Number(r.cost??r.exampleStake),net=r.net??r.exampleNet;const amount=reviewMode&&Number.isFinite(cost)&&cost>0&&net!=null?Number(net)/cost*1000:null;return [[session(r),selections(r)||r.name].filter(Boolean).join(' · '),reviewMode?(r.status||r.result||'待定'):'待定',money(amount),r.cumulativeNet==null?'—':money(r.cumulativeNet)]}
    for(let i=0;i<count;i++){const y=tableY+80+i*135;ctx.fillStyle=i%2?'#173260':'#203f73';ctx.fillRect(tableX,y,tableWidth,135);const data=[(report.date||'').slice(5).replace('-','.'),...values(left[i]),...values(right[i])];x=tableX;data.forEach((s,j)=>{const c=[3,4,7,8].includes(j)?(String(s).startsWith('+')?'#fa806b':String(s).startsWith('-')?'#76ce8b':'#9aafcc'):'#fff';text(ctx,s,x+7,y+22,widths[j]-14,j===1||j===5?23:20,c,j===1||j===5);x+=widths[j]});ctx.strokeStyle='#58729c';ctx.beginPath();ctx.moveTo(tableX,y+134);ctx.lineTo(tableX+tableWidth,y+134);ctx.stroke()}
    centered(ctx,'仅跟踪2.0/3.0版2串1 · 含早场、中场、晚场 · 每组模拟投入1000元',height-125,23,'#b5c6de');centered(ctx,'累计需已核验历史序列；缺少记录显示 —，不虚构历史盈亏',height-87,22,'#9bb3d2');centered(ctx,TITLE+' · 仅供参考 · 理性购彩',height-50,22,'#b5c6de');edge(ctx,height);return png(canvas);
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
  for(const name of ['renderReport','renderScanTable','renderReview']){const previous=window[name];window[name]=function(...args){if(name==='renderReview'&&args[0]?.rows)args[0]={...args[0],rows:args[0].rows.map(r=>({...r,resultPick:reviewPick(r)}))};const result=previous.apply(this,args);schedule();return result}}
  [['quickPoster','copyPoster'],['quickTracking','copyTracking'],['quickReview','copyReview'],['quickReviewTracking','copyReviewTracking']].forEach(([quick,id])=>{$(quick).onclick=()=>$(id).click()});
  if(currentReview?.rows?.length)renderReview(currentReview);
  schedule();
})();
