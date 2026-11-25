# Reads a vector PDF drawing (one page) and writes its linework and text in METRES, for sites where only PDFs are on file.
#   python3 pdf-lines.py drawing.pdf 250 out.json [page]        (250 = the drawing scale 1:250)
# x runs right along the sheet, y runs UP the sheet (so the plan is the right way up), origin = bottom-left of the page.
# out.json: {"scale", "page":[w,h], "lines":[[x0,y0,x1,y1,...],...], "texts":[{"x","y","text","size"}]}
# Then plot regions with a grid (plot-pdf.py) to read positions, and pick out level labels from "texts".
import sys, json, pdfplumber
src, scale, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
pg = int(sys.argv[4]) - 1 if len(sys.argv) > 4 else 0
k = scale * 0.0254 / 72
with pdfplumber.open(src) as pdf:
    p = pdf.pages[pg]; H = float(p.height)
    X = lambda v: round(float(v) * k, 3); Y = lambda v: round((H - float(v)) * k, 3)
    lines = []
    for l in p.lines: lines.append([X(l['x0']), Y(l['top']), X(l['x1']), Y(l['bottom'])] if 'pts' not in l else [c for (x, y) in l['pts'] for c in (X(x), Y(y))])
    for c in p.curves:
        pts = c.get('pts') or []
        if len(pts) >= 2: lines.append([v for (x, y) in pts for v in (X(x), Y(y))])
    for r in p.rects:
        x0, x1, t, b = X(r['x0']), X(r['x1']), Y(r['top']), Y(r['bottom'])
        lines.append([x0, t, x1, t, x1, b, x0, b, x0, t])
    texts = [{'x': X((w['x0'] + w['x1']) / 2), 'y': Y((w['top'] + w['bottom']) / 2), 'text': w['text'], 'size': round((w['bottom'] - w['top']) * k, 3)} for w in p.extract_words(keep_blank_chars=False, use_text_flow=False)]
    json.dump({'scale': scale, 'page': [X(p.width), round(H * k, 3)], 'lines': lines, 'texts': texts}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(lines)} lines, {len(texts)} words, sheet {X(p.width)} x {round(H * k, 1)} m at 1:{scale:g}')
