import json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
D=Path('data/research/2026-11-03'); R=json.loads(Path('data/reviews/2026-11-03.json').read_text(encoding='utf8')); lock=json.loads(Path('data/review-template-lock.json').read_text(encoding='utf8'))
font=lambda n,b=False:ImageFont.truetype('C:/Windows/Fonts/msyhbd.ttc' if b else 'C:/Windows/Fonts/msyh.ttc',n)
base=Image.open(R['originalImages'][0]).convert('RGBA'); im=base.copy(); masks=[]; markers=[];results=[]
def rect(draw,box,fill):draw.rectangle((box[0],box[1],box[0]+box[2]-1,box[1]+box[3]-1),fill=fill)
def text(draw,xy,s,size,color,b=True,center=False):draw.text(xy,s,font=font(size,b),fill=color,anchor='mt' if center else 'lt')
geo=json.loads(Path(R['geometryFile']).read_text()); assert geo['width']==base.width and geo['height']==base.height and all(h==72 for h in geo['rowHeights']); first=geo['tableTop']+geo['headerHeight']
for i,r in enumerate(R['rows']):
 y=first+72*i
 for col,v in r['hits'].items():
  if not v:continue
  c=lock['scan']['columns'][col];x=c['x']+3; yy=y+3;w=c['width']-6;h=66
  layer=Image.new('RGBA',im.size);g=ImageDraw.Draw(layer);g.rectangle((x,yy,x+w-1,yy+h-1),fill=(220,200,100,round(.24*255)));im=Image.alpha_composite(im,layer);g=ImageDraw.Draw(im);g.rectangle((x,yy,x+w-1,yy+h-1),outline='#ffda3d',width=2)
  masks.append((x,yy,w,h));markers.append(dict(number=r['number'],column=col,x=x,y=yy,width=w,height=h,cellX=c['x'],cellY=y,cellWidth=c['width'],cellHeight=72,shape='rectangle',scope='full-cell',inset=3,strokeWidth=2,fillAlpha=.24))
 g=ImageDraw.Draw(im);box=(1115,y+5,84,62);rect(g,box,'#122c4d');text(g,(1121,y+10),r['actualScore'],20,'#ffe28a');text(g,(1121,y+36),'半 '+r['halfScore'],15,'#c4d7ee',False);masks.append(box);results.append(dict(number=r['number'],x=1112,y=y,height=72,score=r['actualScore'],half=r['halfScore']))
g=ImageDraw.Draw(im);stamps=[]
for ty,t in zip([260,412,620,812],R['scenarioReview']):
 sx=246 if t["id"]=="2026-11-03-core30-r1" else 286;sy=ty+48;hit=t['hitCount']==t['totalLegs'];g.rectangle((sx,sy,sx+71,sy+45),fill='#bd3c38' if hit else '#59677f',outline='white',width=2);text(g,(sx+36,sy+7),'中' if hit else '错',29,'white',center=True)
 g.rectangle((sx-10,sy+49,sx+83,sy+78),fill='#f5bd24',outline='#ffdc70',width=2);text(g,(sx+37,sy+53),t['status'],19,'#17365a',center=True);masks.extend([(sx,sy,72,46),(sx-10,sy+49,94,30)])
 stamps.append(dict(category=t['category'],seal='中' if hit else '错',count=t['status']))
# Retain original ticket title and footer; add only permitted settlement overlays.
trackingBase=Image.open(R['originalImages'][1]).convert('RGBA');tr=trackingBase.copy();g=ImageDraw.Draw(tr);tm=[];widths=[90,230,75,110,120,230,75,110,120];lastY=979+9*135
for i,t in enumerate(R['scenarioReview'][:2]):
 col=6 if i else 2;x=42+sum(widths[:col]);w=widths[col];box=(x+2,lastY+8,w-4,115);rect(g,box,'#173260');tm.append(box)
 g.rectangle((x+6,lastY+31,x+w-6,lastY+75),fill='#bd3c38' if t['hit'] else '#59677f',outline='white',width=2)
 text(g,(x+w/2,lastY+36),'中' if t['hit'] else '错',25,'white',center=True)
 g.rectangle((x+2,lastY+80,x+w-3,lastY+108),fill='#f5bd24')
 text(g,(x+w/2,lastY+84),t['status'],17,'#17365a',center=True)

def compare(a,b,allowed):
 aa=np.array(a);bb=np.array(b);diff=np.any(aa!=bb,axis=2);mask=np.zeros(diff.shape,bool)
 for x,y,w,h in allowed:mask[y:y+h,x:x+w]=True
 return dict(width=a.width,height=a.height,changedPixels=int(diff.sum()),outsideAllowedPixels=int((diff&~mask).sum()),allowed=[dict(x=x,y=y,w=w,h=h) for x,y,w,h in allowed])
audit=dict(date=R['date'],templateLockVersion=lock['version'],markers=markers,results=results,ticketStamps=stamps,templateComparison=dict(scan=compare(base,im,masks),tracking=compare(trackingBase,tr,tm)),manualInspection=dict(passed=False),publicationAllowed=False)
for kind,img in [('scan',im),('tracking',tr)]:
 img.save(D/f'draft-review-{kind}.png');p=img.convert('RGB');p.thumbnail((720,10000));p.save(D/f'draft-review-{kind}-preview.jpg',quality=88)
 for i in range(5):
  y0=img.height*i//5;y1=img.height*(i+1)//5;img.crop((0,y0,img.width,y1)).save(D/f'native-{kind}-{i+1}.png')
(D/'review-visual-v6-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({k:{kk:vv for kk,vv in v.items() if kk!='allowed'} for k,v in audit['templateComparison'].items()}));print('markers',len(markers),'first row',first)





