# Plots part of a pdf-lines.py file with a metre grid, to read positions off it.
#   python3 plot-pdf.py out.json x0 x1 y0 y1 picture.png [grid step, default 5] [t = also print the text]
import sys, json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt, numpy as np
from matplotlib.collections import LineCollection
d = json.load(open(sys.argv[1])); x0, x1, y0, y1 = map(float, sys.argv[2:6]); out = sys.argv[6]
step = float(sys.argv[7]) if len(sys.argv) > 7 else 5; showtext = len(sys.argv) > 8
fig = plt.figure(figsize=(20, 20 * (y1 - y0) / (x1 - x0)), dpi=100); ax = fig.add_axes([0.03, 0.03, 0.96, 0.96])
segs = [list(zip(l[0::2], l[1::2])) for l in d['lines'] if any(x0 <= l[i] <= x1 and y0 <= l[i + 1] <= y1 for i in range(0, len(l), 2))]
ax.add_collection(LineCollection(segs, colors='#444', linewidths=0.5))
if showtext:
    for t in d['texts']:
        if x0 <= t['x'] <= x1 and y0 <= t['y'] <= y1: ax.text(t['x'], t['y'], t['text'][:30], fontsize=6, color='red', ha='center', va='center')
ax.set_xlim(x0, x1); ax.set_ylim(y0, y1); ax.set_aspect('equal')
ax.set_xticks(np.arange(x0, x1 + .01, step)); ax.set_yticks(np.arange(y0, y1 + .01, step)); ax.grid(True, lw=0.3, color='#88f'); ax.tick_params(labelsize=7)
fig.savefig(out)
