# -*- coding: utf-8 -*-
"""Thư viện vẽ hiệu ứng đòn đánh dùng chung (theo bảng màu từng nhân vật).

Dựa trên gen_kiem.py: 3 lớp phát sáng (core / body / soft) + 1 lớp tối (dark: khói, mực, đá)
nén thành PNG RGBA trong suốt. Toạ độ vẽ theo hệ 720x300, đòn đi từ PHẢI sang TRÁI.
Mốc thời gian chung (t = 0..1, 3 giây):
  0–.34 tụ khí · .06–.6 thế trận bên phải · .4–.7 đòn bay sang trái · .69 nổ ở quái · .74–1 tàn dư
"""
import math
import numpy as np
from PIL import Image
from gen_kiem import (CW, CH, SS, W, H, ORIGIN, IMPACT, Layer, P, blur, streak, dot, diamond, ring,
                      rune_ring, draw_sword, sm, env, lerp)

OX, OY = ORIGIN
IX, IY = IMPACT
HIT_T = .69


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


class Pal:
    def __init__(self, core, mid, glow, deep, dark='#1a1020', edge=None):
        self.core, self.mid, self.glow, self.deep, self.dark = rgb(core), rgb(mid), rgb(glow), rgb(deep), rgb(dark)
        self.edge = rgb(edge) if edge else self.glow


class L4:
    def __init__(self):
        self.core, self.body, self.soft, self.dark = Layer(), Layer(), Layer(), Layer()


def compose(L, pal):
    c, b, s, d = L.core.arr(), L.body.arr(), L.soft.arr(), L.dark.arr()
    E = (np.clip(c, 0, 1.5)[..., None] * pal.core * 1.6
         + blur(b, 1.2 * SS)[..., None] * pal.mid * 1.25
         + blur(b, 5 * SS)[..., None] * pal.glow * 0.9
         + blur(b + c, 16 * SS)[..., None] * pal.deep * 0.75
         + blur(s, 2 * SS)[..., None] * pal.mid * 0.9
         + blur(s, 10 * SS)[..., None] * pal.glow * 0.8)
    edge = np.clip(blur(b, .7 * SS) - b * .92, 0, 1)
    E += edge[..., None] * pal.edge * 1.4
    E = 1 - np.exp(-E * 1.15)
    aE = np.clip(E.max(axis=2), 0, 1)
    rgbE = E / np.maximum(aE[..., None], 1e-4)
    if d.any():
        aD = np.clip(blur(d, 1.6 * SS) * .95, 0, .9)
        a = aE + aD * (1 - aE)
        col = (rgbE * aE[..., None] + pal.dark * (aD * (1 - aE))[..., None]) / np.maximum(a[..., None], 1e-4)
    else:
        a, col = aE, rgbE
    a = np.where(a < 0.012, 0, a)
    out = np.dstack([np.clip(col, 0, 1), a]) * 255
    return Image.fromarray(out.astype(np.uint8), 'RGBA').resize((CW, CH), Image.LANCZOS)


# ---------------- hình cơ bản ----------------
def poly(lay, pts, k):
    lay.d.polygon([P(x, y) for x, y in pts], fill=k)


def line(lay, pts, w, k):
    lay.d.line([P(x, y) for x, y in pts], fill=k, width=max(1, int(w * SS)), joint='curve')


def ell(lay, cx, cy, rx, ry, k):
    lay.d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=k)


def rot_pts(pts, cx, cy, a, s=1.0):
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (x * ca - y * sa) * s, cy + (x * sa + y * ca) * s) for x, y in pts]


def ngon(cx, cy, r, n, a0=0.0, ry=None):
    ry = r if ry is None else ry
    return [(cx + math.cos(a0 + i * 2 * math.pi / n) * r, cy + math.sin(a0 + i * 2 * math.pi / n) * ry) for i in range(n)]


def bolt(x0, y0, x1, y1, rs, jag=14, seg=10):
    """đường sét gấp khúc (rs: mảng số ngẫu nhiên 0..1)"""
    pts = [(x0, y0)]
    dx, dy = x1 - x0, y1 - y0
    n = math.hypot(dx, dy) or 1
    vx, vy = -dy / n, dx / n
    for i in range(1, seg):
        f = i / seg
        o = (rs[i % len(rs)] - .5) * 2 * jag
        pts.append((x0 + dx * f + vx * o, y0 + dy * f + vy * o))
    pts.append((x1, y1))
    return pts


def leaf(lay, x, y, s, a, k):
    pts = [(s * 1.4, 0), (s * .5, s * .45), (-s * .6, s * .35), (-s * 1.1, 0), (-s * .6, -s * .35), (s * .5, -s * .45)]
    poly(lay, rot_pts(pts, x, y, a), k)


def crescent(lay, cx, cy, r, th, k, a0=110, a1=250, steps=14):
    """lưỡi trăng lưỡi liềm hướng sang trái (dày ở giữa, nhọn hai đầu)"""
    outer, inner = [], []
    for i in range(steps + 1):
        f = i / steps
        a = math.radians(a0 + (a1 - a0) * f)
        w = th * math.sin(math.pi * f)
        outer.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
        inner.append((cx + math.cos(a) * (r - w), cy + math.sin(a) * (r - w)))
    poly(lay, outer + inner[::-1], k)


def note(lay, x, y, s, k):
    ell(lay, x, y, s * 1.1, s * .8, k)
    line(lay, [(x + s, y), (x + s, y - s * 3.6)], max(.8, s * .35), k)
    line(lay, [(x + s, y - s * 3.6), (x + s * 2.4, y - s * 2.6)], max(.8, s * .35), k)


def butterfly(lay, x, y, s, flap, k, a=0.0):
    f = .35 + .65 * abs(flap)
    pts1 = [(0, 0), (-s * 1.2 * f, -s * 1.3), (-s * 1.9 * f, -s * .4), (-s * .4 * f, s * .1)]
    pts2 = [(0, 0), (-s * 1.1 * f, s * .9), (-s * .5 * f, s * 1.3)]
    for sg in (1, -1):
        poly(lay, rot_pts([(px * sg, py) for px, py in pts1], x, y, a), k)
        poly(lay, rot_pts([(px * sg, py) for px, py in pts2], x, y, a), k * .8)
    line(lay, rot_pts([(0, -s * .5), (0, s * .8)], x, y, a), max(.8, s * .2), k)


def palm(lay, x, y, s, k):
    """bàn tay lớn, lòng bàn tay hướng sang trái (ngón tay chĩa lên)"""
    poly(lay, [(x - s * .5, y - s * .55), (x + s * .45, y - s * .55), (x + s * .55, y + s * .6), (x - s * .45, y + s * .75)], k)
    for i, (fx, fl) in enumerate([(-.42, 1.0), (-.14, 1.15), (.14, 1.08), (.4, .85)]):
        cx = x + fx * s
        poly(lay, [(cx - s * .12, y - s * .5), (cx + s * .12, y - s * .5), (cx + s * .1, y - s * (.5 + fl * .75)), (cx - s * .1, y - s * (.5 + fl * .75))], k)
        ell(lay, cx, y - s * (.5 + fl * .75), s * .1, s * .1, k)
    poly(lay, [(x + s * .5, y - s * .1), (x + s * .95, y - s * .55), (x + s * 1.05, y - s * .4), (x + s * .55, y + s * .25)], k)


# ---------------- khối thời gian dùng chung ----------------
class Seeds:
    def __init__(self, seed):
        self.r = np.random.RandomState(seed).rand(600, 8)

    def __getitem__(self, i):
        return self.r[i % 600]


def travel(t, t0=.46, t1=HIT_T, x0=None, x1=None, ease=1.6):
    """vị trí x của đòn bay: từ trận bên phải tới quái"""
    x0 = OX - 40 if x0 is None else x0
    x1 = IX + 10 if x1 is None else x1
    p = sm(t0, t1, t) ** ease
    return lerp(x0, x1, p), p


def spiral_in(L, t, S, k=1.0, base=0, n=120, rmax=110, slow=1.0):
    g = env(t, 0, .04, .2, .34)
    if g <= 0:
        return
    for i in range(n):
        a0, r0, tail, rr, dl = S[base + i][:5]
        a0 *= 2 * math.pi
        r0 = 40 + r0 * rmax
        tail = .35 + tail * .4
        dl *= .25
        p = sm(dl, dl + .3, t)
        if p >= 1:
            continue
        a = a0 + p * 2.2 * slow
        r = r0 * (1 - p * .85)
        x, y = OX + math.cos(a) * r, OY + math.sin(a) * r * .9
        a2, r2 = a - tail, r * 1.18
        kk = g * (1 - p) ** .5 * k
        streak(L.soft, x, y, OX + math.cos(a2) * r2, OY + math.sin(a2) * r2 * .9, 1.4, .2, .9 * kk, 0, seg=5)
        dot(L.core, x, y, .9 + rr * 1.2, .7 * kk)


def charge(L, t, k=1.0, size=1.0, x=OX, y=OY):
    c = env(t, 0, .2, .4, .55)
    if c <= 0:
        return
    pulse = 1 + .12 * math.sin(t * 140)
    dot(L.soft, x, y, (14 + 16 * c) * pulse * size, .85 * c * k)
    dot(L.body, x, y, (6 + 7 * c) * pulse * size, c * k)
    dot(L.core, x, y, (3 + 5 * c) * pulse * size, 1.25 * c * k)


def burst(L, t, S, base=300, rays=44, k=1.0, ring_k=1.0, frag=None, nfrag=40, x=IX, y=IY, size=1.0):
    """vụ nổ chung ở quái: tia, lõi sáng, sóng xung kích, mảnh văng (frag(lay,x,y,s,k,a))"""
    x5 = env(t, .68, .7, .73, .84)
    if x5 > 0:
        gr = sm(.68, .8, t)
        for i in range(rays):
            a = i * 2 * math.pi / rays + S[base + i][0] * .1
            r1 = (65 + S[base + i][1] * 60) * size * (.5 + .7 * gr)
            streak(L.soft, x + math.cos(a) * 18, y + math.sin(a) * 18, x + math.cos(a) * r1, y + math.sin(a) * r1 * .9, 5, .4, x5 * k, 0, seg=6)
        dot(L.soft, x, y, (26 + 26 * x5) * size, x5 * k)
        dot(L.body, x, y, (14 + 14 * x5) * size, x5 * k)
        dot(L.core, x, y, (8 + 10 * x5) * size, 1.3 * x5 * k)
    sw = env(t, .69, .72, .82, 1.0)
    if sw > 0 and ring_k > 0:
        rr = sm(.69, 1.0, t)
        ring(L.body, x, y, (60 + 90 * rr) * size, (54 + 80 * rr) * size, 3 * (1 - rr) + .8, .9 * sw * ring_k)
        ring(L.soft, x, y, (40 + 70 * rr) * size, (36 + 62 * rr) * size, 6 * (1 - rr) + 1, .7 * sw * ring_k)
    fr = env(t, .69, .73, .85, 1.0)
    if fr > 0 and frag:
        pf = sm(.69, 1.0, t)
        for i in range(nfrag):
            a, sp, sz, ph = S[base + 100 + i][:4]
            a *= 2 * math.pi
            r = 30 + sp * 150 * pf ** .6 * size
            fx, fy = x + math.cos(a) * r, y + math.sin(a) * r * .88 + 30 * pf * pf
            frag(L, fx, fy, 1.6 + sz * 1.6, .9 * fr, a + ph * pf * 3)


def residue(L, t, S, base=450, n=90, fn=None, x=IX, y=IY, rise=28):
    d6 = env(t, .74, .84, .9, 1.0)
    if d6 <= 0:
        return
    pd = sm(.74, 1.0, t)
    for i in range(n):
        a, rr, k, kind, ph = S[base + i][:5]
        a *= 2 * math.pi
        k = .25 + k * .45
        r = 20 + rr * 140 * (.4 + .6 * pd)
        px, py = x + math.cos(a) * r, y + math.sin(a) * r * .85 - rise * pd * ph
        tw = (.6 + .4 * math.sin(ph * 9 + t * 100)) * k * d6
        if fn and kind < .35:
            fn(L, px, py, 1.2 + ph, tw, a)
        else:
            dot(L.core, px, py, .6 + ph * 1.1, tw)
