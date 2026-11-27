# -*- coding: utf-8 -*-
"""Vẽ sprite sheet hiệu ứng đòn đánh (PNG RGBA trong suốt) cho nhân vật Kiếm.

Đòn bay từ PHẢI sang TRÁI (nhân vật đứng phải, quái đứng trái).
Mọi chi tiết là hàm của thời gian t (0..1) nên có thể xuất bao nhiêu khung cũng được:
  python tools/fx/gen_kiem.py        -> fx/kiem.webp + kiem.png (N khung, lưới COLS cột; game dùng .webp)
  python tools/fx/gen_kiem.py 6      -> fx/kiem-6.png  (6 ô ngang, đúng bố cục của prompt)
Chỉ cần numpy + Pillow.
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw

CW, CH = 600, 250          # kích thước 1 ô xuất ra (2.4:1 như sân đấu)
# toạ độ vẽ theo hệ 720x300; vẽ siêu mẫu x2 so với ô xuất rồi thu nhỏ để mịn
SS = 2 * CW / 720
W, H = int(720 * SS), int(300 * SS)
N, COLS = 24, 6            # 24 khung, lưới 6 cột x 4 hàng
FX_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'fx')

# màu phát sáng (tuyến tính, sẽ được nén bằng 1-exp)
WHITE = np.array([1.0, 1.0, 1.0])
ICE = np.array([0.55, 0.85, 1.0])
BLUE = np.array([0.18, 0.48, 1.0])
DEEP = np.array([0.10, 0.22, 0.95])

ORIGIN = (565, 150)        # tâm trận kiếm bên phải
IMPACT = (140, 150)        # điểm nổ bên trái


# ---------------- tiện ích ----------------
def box_blur(a, r):
    if r < 1:
        return a
    r = int(r)
    k = 2 * r + 1
    p = np.pad(a, ((r + 1, r), (0, 0)), mode='constant')
    c = np.cumsum(p, axis=0)
    a = (c[k:] - c[:-k]) / k
    p = np.pad(a, ((0, 0), (r + 1, r)), mode='constant')
    c = np.cumsum(p, axis=1)
    return (c[:, k:] - c[:, :-k]) / k


def blur(a, sigma):
    """xấp xỉ gauss bằng 3 lần box blur"""
    if sigma <= 0:
        return a
    r = max(1, int(round(sigma * 0.85)))
    for _ in range(3):
        a = box_blur(a, r)
    return a


class Layer:
    """mặt nạ cường độ (float) vẽ bằng PIL ở chế độ 'F' — vẽ đè, nên vẽ thứ mờ trước"""
    def __init__(self):
        self.im = Image.new('F', (W, H), 0.0)
        self.d = ImageDraw.Draw(self.im)

    def arr(self):
        return np.asarray(self.im, dtype=np.float32)


def P(x, y):
    return (x * SS, y * SS)


def sword_poly(cx, cy, L, ang, w):
    """thanh kiếm: mũi nhọn theo hướng ang (pi = chĩa sang trái). (cx,cy) = tâm thanh kiếm."""
    ux, uy = math.cos(ang), math.sin(ang)      # hướng mũi
    vx, vy = -uy, ux                            # pháp tuyến
    def pt(a, b):  # a dọc thân (từ tâm, + về mũi), b ngang
        return P(cx + ux * a + vx * b, cy + uy * a + vy * b)
    h = L / 2
    blade = [pt(h, 0), pt(h - L * .16, w), pt(-h + L * .26, w * .9), pt(-h + L * .26, -w * .9), pt(h - L * .16, -w)]
    guard = [pt(-h + L * .26, w * 2.6), pt(-h + L * .21, w * 2.6), pt(-h + L * .21, -w * 2.6), pt(-h + L * .26, -w * 2.6)]
    hilt = [pt(-h + L * .21, w * .45), pt(-h + L * .04, w * .45), pt(-h + L * .04, -w * .45), pt(-h + L * .21, -w * .45)]
    pommel = pt(-h + L * .02, 0)
    spine = [pt(h - L * .05, 0), pt(-h + L * .28, 0)]
    return blade, guard, hilt, pommel, spine


def draw_sword(core, body, cx, cy, L, ang, w, k=1.0):
    blade, guard, hilt, pommel, spine = sword_poly(cx, cy, L, ang, w)
    body.d.polygon(blade, fill=k)
    body.d.polygon(guard, fill=k * .9)
    body.d.polygon(hilt, fill=k * .7)
    r = w * .9 * SS
    body.d.ellipse([pommel[0] - r, pommel[1] - r, pommel[0] + r, pommel[1] + r], fill=k * .8)
    core.d.line(spine, fill=k, width=max(1, int(w * .8 * SS)))


def streak(lay, x0, y0, x1, y1, w0, w1, k0, k1, seg=10):
    """vệt sáng thuôn từ (x0,y0) [đầu, sáng] tới (x1,y1) [đuôi, mờ]; vẽ đuôi trước"""
    dx, dy = x1 - x0, y1 - y0
    n = math.hypot(dx, dy) or 1
    vx, vy = -dy / n, dx / n
    for i in reversed(range(seg)):
        t0, t1 = i / seg, (i + 1) / seg
        wa, wb = w0 + (w1 - w0) * t0, w0 + (w1 - w0) * t1
        ka = k0 + (k1 - k0) * (t0 + t1) / 2
        ax, ay = x0 + dx * t0, y0 + dy * t0
        bx, by = x0 + dx * t1, y0 + dy * t1
        lay.d.polygon([P(ax + vx * wa, ay + vy * wa), P(bx + vx * wb, by + vy * wb),
                       P(bx - vx * wb, by - vy * wb), P(ax - vx * wa, ay - vy * wa)], fill=ka)


def dot(lay, x, y, r, k):
    lay.d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], fill=k)


def diamond(lay, x, y, r, k, ang=0.0, stretch=2.2):
    ux, uy = math.cos(ang), math.sin(ang)
    vx, vy = -uy, ux
    pts = [P(x + ux * r * stretch, y + uy * r * stretch), P(x + vx * r, y + vy * r),
           P(x - ux * r * stretch, y - uy * r * stretch), P(x - vx * r, y - vy * r)]
    lay.d.polygon(pts, fill=k)


def ring(lay, cx, cy, rx, ry, width, k, a0=0, a1=360):
    lay.d.arc([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], a0, a1, fill=k, width=max(1, int(width * SS)))


def rune_ring(lay, cx, cy, r, k, rot, n=24):
    ring(lay, cx, cy, r, r, 1.6, k)
    ring(lay, cx, cy, r * .86, r * .86, 1.0, k * .7)
    for i in range(n):
        a = rot + i * 2 * math.pi / n
        x0, y0 = cx + math.cos(a) * r * .88, cy + math.sin(a) * r * .88
        x1, y1 = cx + math.cos(a) * r * .98, cy + math.sin(a) * r * .98
        lay.d.line([P(x0, y0), P(x1, y1)], fill=k * (1 if i % 3 == 0 else .6), width=int(2 * SS) if i % 3 == 0 else max(1, int(SS)))


def compose(core, body, soft):
    c, b, s = core.arr(), body.arr(), soft.arr()
    E = (np.clip(c, 0, 1.5)[..., None] * WHITE * 1.6
         + blur(b, 1.2 * SS)[..., None] * ICE * 1.25
         + blur(b, 5 * SS)[..., None] * BLUE * 0.9
         + blur(b + c, 16 * SS)[..., None] * DEEP * 0.75
         + blur(s, 2 * SS)[..., None] * ICE * 0.9
         + blur(s, 10 * SS)[..., None] * BLUE * 0.8)
    # mép kiếm sắc nét: viền xanh đậm quanh thân
    edge = np.clip(blur(b, .7 * SS) - b * .92, 0, 1)
    E += edge[..., None] * np.array([0.25, 0.55, 1.0]) * 1.4
    E = 1 - np.exp(-E * 1.15)
    a = np.clip(E.max(axis=2), 0, 1)
    a = np.where(a < 0.012, 0, a)
    rgb = np.where(a[..., None] > 0, E / np.maximum(a[..., None], 1e-4), 0)
    out = np.dstack([np.clip(rgb, 0, 1), a]) * 255
    im = Image.fromarray(out.astype(np.uint8), 'RGBA')
    return im.resize((CW, CH), Image.LANCZOS)



# ---------------- hoạt ảnh liên tục theo t ----------------
def sm(a, b, t):
    """smoothstep 0->1 khi t đi từ a tới b"""
    if b == a:
        return 1.0 if t >= b else 0.0
    x = min(1.0, max(0.0, (t - a) / (b - a)))
    return x * x * (3 - 2 * x)


def env(t, a, b, c, d):
    """lên từ a->b, giữ, xuống c->d"""
    return sm(a, b, t) * (1 - sm(c, d, t))


def lerp(a, b, x):
    return a + (b - a) * x


class Seeds:
    """thuộc tính ngẫu nhiên cố định cho mọi khung -> chuyển động liền mạch"""
    def __init__(self, rnd):
        r = rnd.random
        self.spiral = [(r() * 2 * math.pi, 40 + r() * 110, .35 + r() * .4, .9 + r() * 1.2, r() * .25) for _ in range(150)]
        self.flyers = [((r() - .5) * 210, .36 + r() * .2, 18 + r() * 16, 1.2 + r() * .6, .6 + r() * .4, 900 + r() * 500) for _ in range(70)]
        self.escort = [((r() - .5) * 230, r(), 14 + r() * 18, 1 + r() * .6, .5 + r() * .5, (r() - .5) * .08) for _ in range(80)]
        self.sparks = [(r() * 2 * math.pi, r(), .7 + r(), r()) for _ in range(90)]
        self.rays = [(i * 2 * math.pi / 44 + r() * .1, 65 + r() * 60) for i in range(44)]
        self.bigrays = [(r() * 2 * math.pi, 100 + r() * 25) for _ in range(14)]
        self.frags = [(r() * 2 * math.pi, .35 + r() * .65, 1.6 + r() * 1.6, r()) for _ in range(46)]
        self.dust = [(r() * 2 * math.pi, .2 + r() * .8, .25 + r() * .45, r() < .3, r()) for _ in range(100)]
        self.jit = [r() for _ in range(200)]


def formation(core, body, soft, S, rot, tight, k, trail_arc=0.0, point_left=0.0, appear=1.0):
    """trận kiếm 3 vòng. point_left 0..1 xoay mũi từ tiếp tuyến sang chĩa trái; appear 0..1 số kiếm đã hiện"""
    cx, cy = ORIGIN
    rings = [(104 * tight, 22, 40, 4.2), (72 * tight, 16, 32, 3.6), (42 * tight, 10, 24, 3.0)]
    j = 0
    for ri, (R, n, L, w) in enumerate(rings):
        sp = 1 if ri % 2 == 0 else -1
        for i in range(n):
            j += 1
            vis = sm(S.jit[j] * .7, S.jit[j] * .7 + .3, appear)
            if vis <= 0.01:
                continue
            a = rot * sp + i * 2 * math.pi / n
            x, y = cx + math.cos(a) * R, cy + math.sin(a) * R * .92
            tang = a + sp * math.pi / 2
            d = (math.pi - tang + math.pi) % (2 * math.pi) - math.pi
            ang = tang + d * point_left
            kk = k * vis * (0.75 + 0.25 * S.jit[j + 60])
            if trail_arc > 0:
                steps = 6
                for s in range(steps):
                    a2 = a - sp * trail_arc * (s + 1) / steps
                    dot(soft, cx + math.cos(a2) * R, cy + math.sin(a2) * R * .92, w * (1 - s / steps) * 1.1, kk * .5 * (1 - s / steps))
            draw_sword(core, body, x, y, L * (.6 + .4 * vis), ang, w * .55, kk)


def render(t, S):
    core, body, soft = Layer(), Layer(), Layer()
    cx, cy = ORIGIN
    ix, iy = IMPACT

    # 1) tụ khí: hạt xoáy vào tâm
    g = env(t, 0, .04, .2, .34)
    if g > 0:
        for (a0, r0, tail, rr, dl) in S.spiral:
            p = sm(dl, dl + .3, t)                 # tiến trình hút vào của hạt này
            if p >= 1:
                continue
            a = a0 + p * 2.2
            r = r0 * (1 - p * .85)
            x, y = cx + math.cos(a) * r, cy + math.sin(a) * r * .9
            a2, r2 = a - tail, r * 1.18
            kk = g * (1 - p) ** .5
            streak(soft, x, y, cx + math.cos(a2) * r2, cy + math.sin(a2) * r2 * .9, 1.4, .2, .9 * kk, 0, seg=5)
            dot(core, x, y, rr, .7 * kk)

    # lõi sáng ở tâm trận
    c = env(t, 0, .2, .4, .55)
    if c > 0:
        pulse = 1 + .12 * math.sin(t * 60)
        dot(soft, cx, cy, (14 + 16 * c) * pulse, .85 * c)
        dot(body, cx, cy, (6 + 7 * c) * pulse, c)
        dot(core, cx, cy, (3 + 5 * c) * pulse, 1.25 * c)

    # 2) trận kiếm xoay
    f = env(t, .06, .22, .5, .62)
    if f > 0:
        rot = t * 9.0
        rune_ring(body, cx, cy, 128, .5 * f, rot * .3, 36)
        rune_ring(soft, cx, cy, 88, .4 * f, -rot * .45, 24)
        pl = sm(.33, .45, t)
        formation(core, body, soft, S, rot, lerp(.8, 1.0, sm(.06, .25, t)) - .05 * pl, f, trail_arc=.5 * (1 - pl) + .1,
                  point_left=pl, appear=sm(.04, .26, t))
        for (a, rr, sz, ph) in S.sparks[:60]:
            r = rr * 125
            dot(core, cx + math.cos(a + t * 4) * r, cy + math.sin(a + t * 4) * r * .9, sz, .55 * f * (0.5 + .5 * math.sin(ph * 6 + t * 30)))

    # 3) kiếm bay vụt sang trái
    for (dy, t0, L, w, k, v) in S.flyers:
        if t < t0:
            continue
        dt = t - t0
        x = cx - 60 - dt * v
        if x < -40:
            continue
        kk = k * (1 - sm(.6, .75, t))
        if kk <= 0:
            continue
        tl = min(40 + dt * v * .45, 200)
        streak(soft, x + L / 2, cy + dy, x + L / 2 + tl, cy + dy, 1.6, .2, .9 * kk, 0, seg=6)
        draw_sword(core, body, x, cy + dy, L, math.pi, w, kk)

    # 4) kiếm khí khổng lồ: thành hình ở trận, lao sang trái, cắm vào quái
    gs = env(t, .36, .48, .72, .84)
    if gs > 0:
        L = lerp(200, 400, sm(.36, .55, t))
        tipx = lerp(cx - L * .55, ix + 10, sm(.46, .7, t) ** 1.6)
        gx = tipx + L / 2
        streak(soft, gx + L / 2 - 30, cy, min(712, gx + L / 2 + 260), cy, 16, 3, .75 * gs, 0, seg=14)
        for dyy in (-34, 34):
            streak(body, gx, cy + dyy * .5, min(712, gx + L / 2 + 240), cy + dyy, 2.2, .3, .65 * gs, 0, seg=10)
        mv = sm(.46, .52, t) * (1 - sm(.68, .74, t))
        if mv > 0:
            for jx, ox in enumerate((60, 120, 190)):
                ring(body, tipx + ox, cy, 16 + jx * 9, 46 + jx * 22, 2.2 - jx * .5, (.8 - jx * .2) * mv * gs, 100, 260)
        draw_sword(core, body, gx, cy, L, math.pi, lerp(9, 17, sm(.36, .55, t)), gs * lerp(.55, 1, sm(.36, .5, t)))
    # bầy kiếm hộ tống
    e = env(t, .46, .52, .7, .78)
    if e > 0:
        for (dy, ph, L, w, k, da) in S.escort:
            x = 700 - ((ph * 520 + (t - .46) * 1900) % 560)
            streak(soft, x + L / 2, cy + dy, x + L / 2 + 70, cy + dy, 1.4, .2, k * e, 0, seg=5)
            draw_sword(core, body, x, cy + dy, L, math.pi + da, w, k * e)

    # 5) nổ ở quái
    x5 = env(t, .68, .71, .76, .9)
    if x5 > 0:
        gr = sm(.68, .8, t)                          # nổ lan ra
        for (a, r1) in S.rays:
            r = r1 * (.5 + .7 * gr)
            streak(soft, ix + math.cos(a) * 18, iy + math.sin(a) * 18, ix + math.cos(a) * r, iy + math.sin(a) * r * .9, 5, .4, x5, 0, seg=6)
        for (a, r1) in S.bigrays:
            r = r1 * (.5 + .7 * gr)
            streak(body, ix, iy, ix + math.cos(a) * r, iy + math.sin(a) * r * .9, 3, .2, x5, 0, seg=8)
        dot(soft, ix, iy, 40 + 40 * x5, x5)
        dot(body, ix, iy, 24 + 22 * x5, x5)
        dot(core, ix, iy, 16 + 18 * x5, 1.4 * x5)
    sw = env(t, .69, .72, .82, 1.0)
    if sw > 0:
        rr = sm(.69, 1.0, t)
        ring(body, ix, iy, 60 + 90 * rr, 54 + 80 * rr, 3 * (1 - rr) + .8, .9 * sw)
        ring(soft, ix, iy, 40 + 70 * rr, 36 + 62 * rr, 6 * (1 - rr) + 1, .7 * sw)
        ring(body, ix, iy, 30 + 30 * rr, 80 + 60 * rr, 2, .55 * sw * (1 - rr), 60, 300)
    # mảnh lưỡi kiếm văng ra rồi rơi
    fr = env(t, .69, .73, .85, 1.0)
    if fr > 0:
        pf = sm(.69, 1.0, t)
        for (a, sp, sz, ph) in S.frags:
            r = 30 + sp * 150 * pf ** .6
            x, y = ix + math.cos(a) * r, iy + math.sin(a) * r * .88 + 30 * pf * pf
            diamond(body, x, y, sz, .9 * fr, a + ph * pf * 3, 3.2)
            streak(soft, x, y, x - math.cos(a) * 22 * (1 - pf), y - math.sin(a) * 20 * (1 - pf), 1.2, .1, .7 * fr, 0, seg=4)
    # 6) bụi sáng tan dần, trôi lên
    d6 = env(t, .74, .84, .9, 1.0)
    if d6 > 0:
        pd = sm(.74, 1.0, t)
        for (a, rr, k, isd, ph) in S.dust:
            r = 20 + rr * 140 * (.4 + .6 * pd)
            x, y = ix + math.cos(a) * r, iy + math.sin(a) * r * .85 - 28 * pd * ph
            tw = .6 + .4 * math.sin(ph * 9 + t * 40)
            if isd:
                diamond(body, x, y, 1.2 + ph, k * d6 * tw, a, 3)
            else:
                dot(core, x, y, .6 + ph * 1.1, k * d6 * tw)
    return compose(core, body, soft)


def build(n, cols, out):
    rnd = random.Random(7)
    S = Seeds(rnd)
    rows = (n + cols - 1) // cols
    sheet = Image.new('RGBA', (CW * cols, CH * rows), (0, 0, 0, 0))
    for i in range(n):
        t = .02 + .96 * i / (n - 1) if n > 1 else 0
        if n == 6:   # 6 ô: lấy đúng 6 thời điểm tiêu biểu của prompt
            t = [.14, .3, .44, .58, .72, .9][i]
        sheet.paste(render(t, S), ((i % cols) * CW, (i // cols) * CH))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if out.endswith('.webp'):
        sheet.save(out, quality=86, method=6)   # bản dùng trong game (nhẹ hơn PNG ~3 lần, vẫn có alpha)
        sheet.save(out[:-5] + '.png', optimize=True)
    else:
        sheet.save(out, optimize=True)
    print('saved', os.path.abspath(out), sheet.size, n, 'frames')


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        n = int(sys.argv[1])
        build(n, n if n <= 8 else COLS, os.path.join(FX_DIR, 'kiem-%d.png' % n))
    else:
        build(N, COLS, os.path.join(FX_DIR, 'kiem.webp'))
