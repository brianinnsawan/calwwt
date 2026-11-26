# Makes <code>/plan-lines.json (the plan drawn on the ground in the 3D model) from a pickle made by dxf-flatten.py.
#   python3 dxf-plan-lines.py flat.pkl out.json ox oy x0 y0 x1 y1 "note"
# Leaves out hatch fills, dimension strings and lines under 5 cm; the sanitary / drainage layers go in "drainage".
import sys, json, pickle, math
segs, texts, inserts, circles = pickle.load(open(sys.argv[1], 'rb'))
ox, oy = float(sys.argv[3]), float(sys.argv[4]); x0, y0, x1, y1 = map(float, sys.argv[5:9])
SKIP = {'DIM', 'Landscape', 'Hatch', 'Defpoints', '1TEXT-3', 'Text', 'SPEC', 'A-WALL-MSRY-PATT', 'BD B_Floor plan$0$A-WALL-MSRY-PATT', 'A-WALL-PATT'}
DRAIN = {'SAN', 'SANI', 'Drainage', 'PIPE', 'Manhole', 'Tank', 'FIBERGLASS TANK', 'Sling'}
out = {'note': sys.argv[9], 'origin': [ox, oy], 'general': [], 'drainage': []}
seen = set()
for lay, path, kind, pts in segs:
    if kind.startswith('HATCH') or lay in SKIP: continue
    keep = [(x, y) for x, y in pts if x0 <= x <= x1 and y0 <= y <= y1]
    if len(keep) < 2 or len(keep) != len(pts): continue
    if sum(math.dist(keep[i], keep[i + 1]) for i in range(len(keep) - 1)) < 0.05: continue
    flat = []
    for x, y in keep:
        p = [round((x - ox) * 100), round((y - oy) * 100)]
        if flat[-2:] != p: flat += p
    if len(flat) < 4: continue
    k = tuple(flat)
    if k in seen: continue   # blocks drawn twice (the drawing carries a copy of some blocks)
    seen.add(k)
    out['drainage' if lay in DRAIN else 'general'].append(flat)
json.dump(out, open(sys.argv[2], 'w'), separators=(',', ':'))
print(len(out['general']), 'general,', len(out['drainage']), 'drainage')
