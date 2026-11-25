# Flattens a DWG that tools/models/dwg/dwg-to-json.mjs turned into JSON: every line, polyline, circle and arc of model
# space (blocks opened up, in their real positions) with its layer, plus texts and block positions.
#   python3 flatten.py drawing.json out.pkl
# Used once for 0589 Kathu to read positions off the as-built drawing and to make tools/models/0589/plan-lines.json.
import json, sys, math, collections, pickle
db=json.load(open(sys.argv[1]))
blocks={b['name']:b for b in db['tables']['BLOCK_RECORD']['entries']}
def M(ins):
    p=ins.get('insertionPoint',{'x':0,'y':0}); sx=ins.get('xScale',1) or 1; sy=ins.get('yScale',1) or 1; r=ins.get('rotation',0) or 0
    c,s=math.cos(r),math.sin(r)
    return (c*sx,-s*sy,s*sx,c*sy,p['x'],p['y'])
def mul(A,B):
    a,b,c,d,e,f=A; a2,b2,c2,d2,e2,f2=B
    return (a*a2+b*c2, a*b2+b*d2, c*a2+d*c2, c*b2+d*d2, a*e2+b*f2+e, c*e2+d*f2+f)
def ap(A,x,y): a,b,c,d,e,f=A; return (a*x+b*y+e, c*x+d*y+f)
segs=[]; texts=[]; inserts=[]; circles=[]
def arcpts(cx,cy,r,a0,a1,n=16):
    if a1<a0: a1+=2*math.pi
    return [(cx+r*math.cos(a0+(a1-a0)*i/n), cy+r*math.sin(a0+(a1-a0)*i/n)) for i in range(n+1)]
def walk(ents,A,path,layer0,depth=0):
    for e in ents:
        t=e['type']; lay=e.get('layer'); 
        if lay=='0' and layer0: lay=layer0
        if t=='LINE':
            a=e['startPoint'];b=e['endPoint']; segs.append((lay,path,[ap(A,a['x'],a['y']),ap(A,b['x'],b['y'])]))
        elif t=='LWPOLYLINE':
            vs=e['vertices']; pts=[]
            n=len(vs); closed=bool(e.get('flag',0)&1)
            for i,v in enumerate(vs):
                pts.append((v['x'],v['y']))
                bul=v.get('bulge',0) or 0
                if bul and (i<n-1 or closed):
                    w=vs[(i+1)%n]; x1,y1,x2,y2=v['x'],v['y'],w['x'],w['y']
                    d=math.hypot(x2-x1,y2-y1)
                    if d>1e-9:
                        th=4*math.atan(bul); r=d/2/math.sin(th/2); 
                        mx,my=(x1+x2)/2,(y1+y2)/2; h=r*math.cos(th/2)
                        cx=mx-(y2-y1)/d*h; cy=my+(x2-x1)/d*h
                        a0=math.atan2(y1-cy,x1-cx)
                        for k in range(1,8): pts.append((cx+abs(r)*math.cos(a0+th*k/8), cy+abs(r)*math.sin(a0+th*k/8)))
            if closed and pts: pts.append(pts[0])
            segs.append((lay,path,[ap(A,x,y) for x,y in pts], e.get('constantWidth',0)))
        elif t in('POLYLINE2D','POLYLINE','POLYLINE3D'):
            vs=e.get('vertices',[]); pts=[(v['x'],v['y']) for v in vs if 'x' in v]
            if e.get('flag',0)&1 and pts: pts.append(pts[0])
            if pts: segs.append((lay,path,[ap(A,x,y) for x,y in pts]))
        elif t=='CIRCLE':
            c=e['center']; r=e['radius']; segs.append((lay,path,[ap(A,x,y) for x,y in arcpts(c['x'],c['y'],r,0,2*math.pi,24)]))
            circles.append((lay,path,ap(A,c['x'],c['y']),r*math.hypot(A[0],A[2])))
        elif t=='ARC':
            c=e['center']; r=e['radius']; segs.append((lay,path,[ap(A,x,y) for x,y in arcpts(c['x'],c['y'],r,e['startAngle'],e['endAngle'])]))
        elif t in('TEXT','MTEXT','ATTRIB','ATTDEF'):
            p=e.get('startPoint') or e.get('insertionPoint') or {'x':0,'y':0}
            texts.append((lay,path,ap(A,p['x'],p['y']),e.get('text','')))
        elif t=='INSERT':
            b=blocks.get(e['name'])
            A2=mul(A,M(e)); inserts.append((lay,path,e['name'],ap(A,e['insertionPoint']['x'],e['insertionPoint']['y']),e.get('xScale'),e.get('rotation'),len(b['entities']) if b else -1))
            if b and depth<8: walk(b['entities'],A2,path+'/'+e['name'],lay,depth+1)
        elif t=='MULTILEADER':
            # a leader with its own text (levels are often written this way): position = the arrow tip
            try: v=e['leaderSections'][0]['leaderLines'][0]['vertices'][0]; pos=ap(A,v['x'],v['y'])
            except Exception: pos=None
            ta=e.get('textAnchor') or e.get('contentBasePosition'); tpos=ap(A,ta['x'],ta['y']) if ta else None
            texts.append((lay,path,pos,'ML '+str(e.get('textContent','')),tpos))
I=(1,0,0,1,0,0)
walk(db['entities'],I,'',None)
pickle.dump((segs,texts,inserts,circles),open(sys.argv[2],'wb'))
print(len(segs),len(texts),len(inserts))
c=collections.Counter(s[0] for s in segs)
print(c.most_common(70))
