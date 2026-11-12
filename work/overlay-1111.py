import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
D=Path('data/research/2026-11-11'); W=Path('work/review-1111'); R=json.loads(Path('data/reviews/2026-11-11.json').read_text(encoding='utf8')); geo=json.loads((W/'geometry.json').read_text()); lock=json.loads(Path('data/review-template-lock.json').read_text())
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc',n)
base=Image.open(R['originalImages'][0]).convert('RGBA'); im=base.copy(); allowed=[]; markers=[]
assert im.size==(geo['width'],geo['height'])
def box(img,b,color,mask):
 ImageDraw.Draw(img).rectangle((b[0],b[1],b[0]+b[2]-1,b[1]+b[3]-1),fill=color);mask.append(b)
def text(img,x,y,s,size,color='white'):ImageDraw.Draw(img).text((x,y),s,font=font(size),fill=color,anchor='mt')
xs=[geo['tableX']+sum(geo['widths'][:i]) for i in range(len(geo['widths']))]
for i,r in enumerate(R['rows']):
 y=geo['tableTop']+geo['headerHeight']+sum(geo['rowHeights'][:i]);height=geo['rowHeights'][i]
 for k,c in {'result':4,'handicap':5,'speculative':6,'goals':7,'halfFull':8,'score':9}.items():
  if not r['hits'][k]:continue
  b=(xs[c]+3,y+3,geo['widths'][c]-6,height-6);layer=Image.new('RGBA',im.size);g=ImageDraw.Draw(layer);g.rectangle((b[0],b[1],b[0]+b[2]-1,b[1]+b[3]-1),fill=(220,200,100,61),outline='#ffda3d',width=2);im=Image.alpha_composite(im,layer);allowed.append(b);markers.append(dict(number=r['number'],column=k,shape='rectangle',scope='full-cell',x=b[0],y=b[1],width=b[2],height=b[3]))
 b=(xs[10]+3,y+3,geo['widths'][10]-6,height-6);box(im,b,base.getpixel((xs[10]+2,y+2)),allowed);text(im,b[0]+b[2]/2,y+8,r['actualScore'],20,'#ffe28a');text(im,b[0]+b[2]/2,y+36,'半'+r['halfScore'],14,'#c4d7ee')
for b,s,size in [((210,94,825,76),'赛后复盘 · 原判断保留',48),((170,geo['scanTop']+15,900,46),'赛后复盘 · 原票原星',27),((340,geo['scanTop']+65,570,60),'竞彩扫盘 · 复盘',40)]:box(im,b,'#102249',allowed);text(im,b[0]+b[2]/2,b[1]+4,s,size)
y=260;tier='';tickets={t['id']:t for t in R['ticketReview']}
for block in geo['ticketBlocks']:
 if tier and block['tier']!=tier:y+=56
 tier=block['tier'];t=tickets.get(block.get('id'))
 if t:
  b=(284,y+62,64,48);box(im,b,'#59677f',allowed);text(im,316,y+65,'错',30)
  b=(273,y+114,86,28);box(im,b,'#f5bd24',allowed);text(im,316,y+115,t['hitText'],18,'#17365a')
 y+=block['h']
tb=Image.open(R['originalImages'][1]).convert('RGBA');tr=tb.copy();tm=[];widths=[90,230,75,110,120,230,75,110,120];tx=[42+sum(widths[:i]) for i in range(9)];row=18;ty=979+row*135
assert R['trackingDisplayPairs'][row]==[t['id'] for t in R['tracking']]
for idx,col in enumerate([2,6]):
 for c in [col,col+1,col+2]:box(tr,(tx[c]+2,ty+2,widths[c]-4,131),tb.getpixel((44,ty+10)),tm)
 ImageDraw.Draw(tr).rounded_rectangle((tx[col]+8,ty+38,tx[col]+widths[col]-8,ty+84),radius=8,fill='#59677f');text(tr,tx[col]+widths[col]/2,ty+48,'惜败',18)
 text(tr,tx[col+1]+widths[col+1]/2,ty+48,'-1000.00',18,'#7ee0a5')
 n=R['trackingCumulative'][idx]['net'];text(tr,tx[col+2]+widths[col+2]/2,ty+48,f'{n:+.2f}',18,'#ff8a74' if n>=0 else '#7ee0a5')
def compare(a,b,rects):
 diff=np.any(np.array(a)!=np.array(b),axis=2);mask=np.zeros(diff.shape,bool)
 for x,y,w,h in rects:mask[y:y+h,x:x+w]=True
 outside=int((diff&~mask).sum());assert outside==0
 return dict(outsideAllowedPixels=outside,changedPixels=int(diff.sum()),allowed=rects)
audit=dict(date=R['date'],templateLockVersion=lock['version'],templateComparison={'scan':compare(base,im,allowed),'tracking':compare(tb,tr,tm)},markers=markers,geometry=geo,manualInspection={'passed':False},geometryBasis='Original published six-market columns; full-cell inset3 height66 stroke2; original MUSE images retained')
for kind,img in [('scan',im),('tracking',tr),('tracking-display-settled',tr)]:
 p=Path('public/cards')/('2026-11-11-review-'+kind+'.png');img.save(p);preview=img.convert('RGB');preview.thumbnail((720,10000));preview.save(str(p).replace('.png','-preview.jpg'),quality=88)
 for i in range(3):img.crop((0,img.height*i//3,img.width,img.height*(i+1)//3)).save(W/(kind+'-detail-'+str(i)+'.png'))
tr.crop((0,ty-15,tr.width,ty+150)).save(W/'tracking-last-row.png')
(D/'review-visual-v6-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8');print('Full-cell markers',len(markers),'outside allowed pixels 0; prior tracking rows unchanged')
