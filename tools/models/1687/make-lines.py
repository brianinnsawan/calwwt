# Makes the linework for the 1687 Phetchaburi model from Brian's 2025 Robinson DWGs (26 Nov 2026).
#   python3 make-lines.py b_laou4.pkl c_asbuilt.pkl      (the .pkl files come from ../dwg/flatten.py)
# Sources (Brian's folder 24 25 Grease and Septic repair\เพชรบุรี Phetchaburi Robinson):
#   b = "01 Robinson Petchburi_Laou4.dwg": the Robinson Phetchaburi site plan (1:1000 sheet "ผังบริเวณโครงการรวม") with the
#       Caltex station drawn in it. Metres. Its top-left copy is used.
#   c = "Layout As Built งานถังบำบัด 3,000 ลิตร (โรบินสันเพชรบุรี).dwg": the same site plan plus the station's own drainage plan
#       (block San-001) and fuel layout. Metres.
# Both are placed on the model's coordinates (the SN-01 sheet, see site.mjs) by a plain shift, no turn and no scale:
#   model = c - (204.75, 327.51)   from the three old round tanks, which are in both (checked on MH-1, MH-2, MH-5 to MH-10: within 0.2 m)
#   c     = b - (4428.93, 2648.12) from the survey marks 0408, 6269, 9104, 9209, 3080, 2560 and 3939, which are in both
# Writes:
#   plan-lines.json   the SN-01 linework already there is kept; the rest of the station is added (outside the SN-01 sheet)
#   surroundings.json the Robinson site and Phetkasem Road outside the station, for the "Surroundings" layer
import json, math, pickle, sys, os
here = os.path.dirname(os.path.abspath(__file__))
B = (4428.93 + 204.75, 2648.12 + 327.51)
C = (204.75, 327.51)
BOUNDARY = [(-17.66, 12.58), (12.26, 12.39), (25.82, 12.56), (25.83, 13.37), (25.90, 14.18), (26.02, 14.99), (26.18, 15.78), (26.40, 16.57),
            (26.66, 17.34), (26.97, 18.09), (27.33, 18.82), (27.91, 19.92), (27.91, 54.13), (-17.66, 68.47)]
SN01 = (3.6, 8.0, 31.6, 30.3)          # what the SN-01 sheet already draws (its linework stays as it is)
AREA = (-370, -45, 170, 330)            # the Robinson site plan (top-left copy) and the road in front
def inside(poly, x, y):
    c = False
    for i in range(len(poly)):
        (xi, yi), (xj, yj) = poly[i], poly[i - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
    return c
in_sn01 = lambda x, y: SN01[0] <= x <= SN01[2] and SN01[1] <= y <= SN01[3]

b = pickle.load(open(sys.argv[1], 'rb'))[0]
c = pickle.load(open(sys.argv[2], 'rb'))[0]
SKIP_B = ('DIM', 'TITLE', 'FRAME', 'Defpoints', 'hid', 'Hatch', 'A-Hatch', 'BP', '1TEXT', 'Text', 'Head', 'Symbol', 'A-TEXT', 'Arrow')
# outside the station only the site layout itself: kerbs, parking, roads, building outlines (no cars, furniture or services)
AROUND = ('00 Robinson', 'PARK', 'SYM-PARK', 'Pavement', 'T-PRE', 'FT', 'RAMP', 'Line_2y')

def rdp(pts, tol):
    if len(pts) < 3: return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]; L = math.hypot(bx - ax, by - ay) or 1e-9
    d = [abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / L for x, y in pts[1:-1]]
    i = max(range(len(d)), key=d.__getitem__)
    if d[i] <= tol: return [pts[0], pts[-1]]
    return rdp(pts[:i + 2], tol)[:-1] + rdp(pts[i + 1:], tol)
def segs(pl, shift, tol=0):
    pts = [(x - shift[0], y - shift[1]) for x, y in pl]
    if tol: pts = rdp(pts, tol)
    return [(pts[i], pts[i + 1]) for i in range(len(pts) - 1) if math.dist(pts[i], pts[i + 1]) > 0.02]

station_general, station_drain, around = [], [], []
for lay, path, pl, *_ in b:
    if any(lay.startswith(s) for s in SKIP_B): continue
    xs = [p[0] - B[0] for p in pl]; ys = [p[1] - B[1] for p in pl]
    if not (AREA[0] <= min(xs) and max(xs) <= AREA[2] and AREA[1] <= min(ys) and max(ys) <= AREA[3]): continue
    for s in segs(pl, B, 0.05):
        mx, my = (s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2
        if inside(BOUNDARY, mx, my):
            if not in_sn01(mx, my): station_general.append(s)
        elif lay in AROUND and math.dist(*s) > 0.15: around.append(s)
for lay, path, pl, *_ in c:
    if not path.startswith('/San-001'): continue        # the station's own drainage plan
    for s in segs(pl, C):
        mx, my = (s[0][0] + s[1][0]) / 2, (s[0][1] + s[1][1]) / 2
        if not in_sn01(mx, my): station_drain.append(s)

def pack(sl, origin):
    # join touching segments into polylines, whole centimetres from origin
    out = []
    for (a, b2) in sl:
        p = [round((a[0] - origin[0]) * 100), round((a[1] - origin[1]) * 100), round((b2[0] - origin[0]) * 100), round((b2[1] - origin[1]) * 100)]
        if p[0:2] == p[2:4]: continue
        if out and out[-1][-2:] == p[0:2]: out[-1].extend(p[2:])
        else: out.append(p)
    return out

pl_path = os.path.join(here, 'plan-lines.json')
plan = json.load(open(pl_path))
o = plan['origin']
added = {'general': pack(station_general, o), 'drainage': pack(station_drain, o)}
plan.setdefault('sn01', {'general': len(plan['general']), 'drainage': len(plan['drainage'])})
plan['general'] = plan['general'][:plan['sn01']['general']] + added['general']
plan['drainage'] = plan['drainage'][:plan['sn01']['drainage']] + added['drainage']
plan['note2'] = ('Added 26 Nov 2026 (tools/models/1687/make-lines.py): the rest of the station outside the SN-01 sheet, from the Robinson site plan '
                 'in "01 Robinson Petchburi_Laou4.dwg" (general) and the station drainage plan, block San-001, in "Layout As Built งานถังบำบัด 3,000 ลิตร '
                 '(โรบินสันเพชรบุรี).dwg" (drainage). The first sn01.general / sn01.drainage lines are the SN-01 sheet.')
json.dump(plan, open(pl_path, 'w'), separators=(',', ':'))

sur = {'note': 'Robinson Phetchaburi site plan and Phetkasem Road outside the Caltex station, from "01 Robinson Petchburi_Laou4.dwg" (top-left copy of '
               'the 1:1000 site plan), shifted onto the model (see make-lines.py). Whole centimetres from origin, x and y as in the model. For context only.',
       'origin': [0, 0], 'lines': pack(around, (0, 0))}
json.dump(sur, open(os.path.join(here, 'surroundings.json'), 'w'), separators=(',', ':'))
print('station general', len(station_general), 'drainage', len(station_drain), 'around', len(around))
