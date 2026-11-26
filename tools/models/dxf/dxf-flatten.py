# Flattens a DXF (saved from the DWG in AutoCAD / Civil 3D: Save As -> AutoCAD 2018 DXF) for reading positions:
# every line, polyline, circle and arc of model space with blocks opened up in their real positions, plus texts and
# block positions. Used for 1642 Phun Phon (A-104 / A-103).
#   python3 dxf-flatten.py drawing.dxf out.pkl x0 y0 x1 y1      (only keeps what lies inside the window, in drawing units)
import sys, pickle, collections, ezdxf
from ezdxf import path as P
src, out = sys.argv[1], sys.argv[2]; x0, y0, x1, y1 = map(float, sys.argv[3:7])
doc = ezdxf.readfile(src)
segs, texts, inserts, circles = [], [], [], []
def inside(x, y): return x0 <= x <= x1 and y0 <= y <= y1
def walk(ents, chain, depth=0):
    for e in ents:
        t = e.dxftype(); lay = e.dxf.get('layer', '0')
        if lay == '0' and chain: lay = chain[-1][1]
        try:
            if t == 'INSERT':
                ip = e.dxf.insert; inserts.append((lay, '/'.join(c[0] for c in chain), e.dxf.name, (ip.x, ip.y), e.dxf.xscale, e.dxf.rotation))
                for a in e.attribs: texts.append((lay, e.dxf.name, (a.dxf.insert.x, a.dxf.insert.y), a.dxf.text))
                if depth < 8: walk(list(e.virtual_entities()), chain + [(e.dxf.name, lay)], depth + 1)
            elif t in ('TEXT', 'MTEXT'):
                p = e.dxf.insert; texts.append((lay, '/'.join(c[0] for c in chain), (p.x, p.y), e.dxf.text if t == 'TEXT' else e.plain_text()))
            elif t == 'CIRCLE':
                c = e.dxf.center; circles.append((lay, '/'.join(c2[0] for c2 in chain), (c.x, c.y), e.dxf.radius))
                pts = [(v.x, v.y) for v in P.make_path(e).flattening(0.01)]; segs.append((lay, '/'.join(c2[0] for c2 in chain), t, pts))
            elif t in ('LINE', 'LWPOLYLINE', 'POLYLINE', 'ARC', 'ELLIPSE', 'SPLINE'):
                pts = [(v.x, v.y) for v in P.make_path(e).flattening(0.01)]
                if pts: segs.append((lay, '/'.join(c[0] for c in chain), t, pts))
            elif t == 'HATCH':
                for p in P.from_hatch(e):
                    pts = [(v.x, v.y) for v in p.flattening(0.01)]
                    if pts: segs.append((lay, '/'.join(c[0] for c in chain), 'HATCH:' + (e.dxf.pattern_name or ''), pts))
        except Exception as ex:
            pass
walk(list(doc.modelspace()), [])
segs = [s for s in segs if any(inside(x, y) for x, y in s[3])]
pickle.dump((segs, texts, inserts, circles), open(out, 'wb'))
print(len(segs), 'segments,', len(texts), 'texts,', len(inserts), 'blocks,', len(circles), 'circles')
print(collections.Counter(s[0] for s in segs).most_common(40))
