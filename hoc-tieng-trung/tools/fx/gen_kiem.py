# -*- coding: utf-8 -*-
"""Vẽ sprite sheet hiệu ứng đòn đánh 6 khung (PNG RGBA trong suốt) cho nhân vật Kiếm.

Đòn bay từ PHẢI sang TRÁI (nhân vật đứng phải, quái đứng trái).
Chạy:  python tools/fx/gen_kiem.py   ->  fx/kiem.png (6 ô ngang, mỗi ô CW x CH)
Chỉ cần numpy + Pillow.
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw

CW, CH = 720, 300          # kích thước 1 ô (2.4:1 như sân đấu)
SS = 2                     # vẽ siêu mẫu x2 rồi thu nhỏ để mịn
W, H = CW * SS, CH * SS
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'fx', 'kiem.png')

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
        lay.d.line([P(x0, y0), P(x1, y1)], fill=k * (1 if i % 3 == 0 else .6), width=2 * SS if i % 3 == 0 else SS)


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


# ---------------- 6 khung ----------------
def formation(core, body, soft, rnd, rot, tight, k, trail_arc=0.0, point_left=0.0):
    """trận kiếm xoay tròn: 3 vòng kiếm. point_left 0..1 = xoay mũi kiếm từ tiếp tuyến sang chĩa trái"""
    cx, cy = ORIGIN
    rings = [(104 * tight, 22, 40, 4.2), (72 * tight, 16, 32, 3.6), (42 * tight, 10, 24, 3.0)]
    for ri, (R, n, L, w) in enumerate(rings):
        sp = (1 if ri % 2 == 0 else -1)
        for i in range(n):
            a = rot * sp + i * 2 * math.pi / n
            x, y = cx + math.cos(a) * R, cy + math.sin(a) * R * .92
            tang = a + sp * math.pi / 2
            # nội suy góc ngắn nhất từ tiếp tuyến -> pi
            d = (math.pi - tang + math.pi) % (2 * math.pi) - math.pi
            ang = tang + d * point_left
            if trail_arc > 0:  # vệt cung phía sau mỗi kiếm thể hiện chuyển động xoay
                steps = 6
                for s in range(steps):
                    a2 = a - sp * trail_arc * (s + 1) / steps
                    x2, y2 = cx + math.cos(a2) * R, cy + math.sin(a2) * R * .92
                    dot(soft, x2, y2, w * (1 - s / steps) * 1.1, k * .55 * (1 - s / steps))
            draw_sword(core, body, x, y, L, ang, w * .55, k * (0.75 + 0.25 * rnd.random()))


def frame1(rnd):  # tụ khí bên phải
    core, body, soft = Layer(), Layer(), Layer()
    cx, cy = ORIGIN
    # hạt sáng xoáy vào tâm
    for i in range(170):
        a = rnd.random() * 2 * math.pi
        r = 34 + rnd.random() * 105
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r * .9
        tail = 0.35 + rnd.random() * .4
        a2 = a - tail
        r2 = r * 1.18
        streak(soft, x, y, cx + math.cos(a2) * r2, cy + math.sin(a2) * r2 * .9, 1.4, 0.2, .9, 0, seg=5)
        dot(core, x, y, 0.9 + rnd.random() * 1.2, .7)
    rune_ring(body, cx, cy, 70, .35, 0.2, 18)
    dot(soft, cx, cy, 26, .9)
    dot(body, cx, cy, 11, 1)
    dot(core, cx, cy, 6, 1.2)
    # vài thanh kiếm mờ bắt đầu hiện ra
    for i in range(10):
        a = i * 2 * math.pi / 10 + .3
        draw_sword(core, body, cx + math.cos(a) * 92, cy + math.sin(a) * 84, 34, a + math.pi / 2, 2.2, .45)
    return compose(core, body, soft)


def frame2(rnd):  # trận kiếm hình thành, xoay tròn
    core, body, soft = Layer(), Layer(), Layer()
    cx, cy = ORIGIN
    rune_ring(body, cx, cy, 128, .5, .6, 36)
    rune_ring(soft, cx, cy, 88, .4, -.4, 24)
    formation(core, body, soft, rnd, .5, 1.0, 1.0, trail_arc=.55)
    dot(soft, cx, cy, 26, .8)
    dot(body, cx, cy, 12, 1)
    dot(core, cx, cy, 8, 1.3)
    for i in range(80):
        a = rnd.random() * 2 * math.pi; r = rnd.random() * 125
        dot(core, cx + math.cos(a) * r, cy + math.sin(a) * r * .9, .8 + rnd.random(), .6)
    return compose(core, body, soft)


def frame3(rnd):  # kiếm phóng ra sang trái
    core, body, soft = Layer(), Layer(), Layer()
    cx, cy = ORIGIN
    rune_ring(soft, cx, cy, 128, .3, 1.0, 36)
    formation(core, body, soft, rnd, .9, .95, .85, trail_arc=.25, point_left=.85)
    # thanh kiếm khổng lồ bắt đầu thành hình
    streak(soft, cx + 50, cy, cx + 140, cy, 12, 2, .6, 0, seg=10)
    draw_sword(core, body, cx - 30, cy, 210, math.pi, 9, .55)
    # kiếm bay vụt trước
    for i in range(46):
        y = cy + (rnd.random() - .5) * 200
        x = cx - 140 - rnd.random() * 260
        L = 18 + rnd.random() * 16
        streak(soft, x + L / 2, y, x + L / 2 + 60 + rnd.random() * 140, y, 1.6, .2, .9, 0, seg=6)
        draw_sword(core, body, x, y, L, math.pi, 1.2 + rnd.random() * .6, .9)
    return compose(core, body, soft)


def frame4(rnd):  # kiếm khí khổng lồ lao sang trái
    core, body, soft = Layer(), Layer(), Layer()
    tipx, cy = 150, 150
    L = 400
    gx = tipx + L / 2
    # vệt kiếm khí phía sau
    streak(soft, gx + L / 2 - 30, cy, 712, cy, 16, 3, .75, 0, seg=16)
    streak(soft, tipx + 40, cy, gx + L / 2, cy, 30, 22, .35, .3, seg=4)
    for dy in (-34, 34):
        streak(body, gx, cy + dy * .5, 700, cy + dy, 2.2, .3, .7, 0, seg=12)
    # vòng sóng xung kích quanh mũi kiếm
    for j, ox in enumerate((60, 120, 190)):
        ring(body, tipx + ox, cy, 16 + j * 9, 46 + j * 22, 2.2 - j * .5, .8 - j * .2, 100, 260)
    draw_sword(core, body, gx, cy, L, math.pi, 17, 1.0)
    # bầy kiếm nhỏ bay kèm
    for i in range(90):
        y = cy + (rnd.random() - .5) * 230
        x = 170 + rnd.random() * 470
        Ls = 14 + rnd.random() * 18
        k = .5 + rnd.random() * .5
        streak(soft, x + Ls / 2, y, x + Ls / 2 + 40 + rnd.random() * 120, y, 1.4, .2, k, 0, seg=5)
        draw_sword(core, body, x, y, Ls, math.pi + (rnd.random() - .5) * .08, 1 + rnd.random() * .6, k)
    # tàn dư trận kiếm bên phải
    rune_ring(soft, ORIGIN[0] + 30, ORIGIN[1], 110, .22, 1.4, 30)
    for i in range(60):
        dot(core, tipx + rnd.random() * 520, cy + (rnd.random() - .5) * 240, .7 + rnd.random(), .6)
    return compose(core, body, soft)


def frame5(rnd):  # nổ tung bên trái
    core, body, soft = Layer(), Layer(), Layer()
    cx, cy = IMPACT
    # tia nổ toả tròn
    for i in range(44):
        a = i * 2 * math.pi / 44 + rnd.random() * .1
        r1 = 65 + rnd.random() * 60
        streak(soft, cx + math.cos(a) * 18, cy + math.sin(a) * 18, cx + math.cos(a) * r1, cy + math.sin(a) * r1 * .9, 5, .4, 1, 0, seg=6)
    for i in range(14):
        a = rnd.random() * 2 * math.pi
        r1 = 100 + rnd.random() * 25
        streak(body, cx, cy, cx + math.cos(a) * r1, cy + math.sin(a) * r1 * .9, 3, .2, 1, 0, seg=8)
    ring(body, cx, cy, 120, 108, 3, .9)
    ring(soft, cx, cy, 96, 84, 6, .7)
    ring(body, cx, cy, 52, 128, 2, .6, 60, 300)   # vành sóng dọc
    dot(soft, cx, cy, 70, 1.0)
    dot(body, cx, cy, 42, 1.0)
    dot(core, cx, cy, 30, 1.4)
    # mảnh lưỡi kiếm văng
    for i in range(40):
        a = rnd.random() * 2 * math.pi
        r = 40 + rnd.random() * 100
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r * .88
        diamond(body, x, y, 1.6 + rnd.random() * 1.6, .9, a, 3.2)
        streak(soft, x, y, x - math.cos(a) * 22, y - math.sin(a) * 20, 1.2, .1, .7, 0, seg=4)
    # đuôi kiếm khí còn lại phía sau
    streak(soft, cx + 40, cy, 470, cy, 14, 1, .6, 0, seg=12)
    draw_sword(core, body, cx + 120, cy, 240, math.pi, 12, .55)
    return compose(core, body, soft)


def frame6(rnd):  # hạt sáng tan dần
    core, body, soft = Layer(), Layer(), Layer()
    cx, cy = IMPACT
    ring(soft, cx, cy, 132, 122, 2.5, .3)
    ring(body, cx, cy, 140, 130, 1, .2)
    for i in range(110):
        a = rnd.random() * 2 * math.pi
        r = 20 + rnd.random() * 130
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r * .85 - rnd.random() * 18
        k = .25 + rnd.random() * .45
        if rnd.random() < .3:
            diamond(body, x, y, 1.2 + rnd.random(), k, a, 3)
        else:
            dot(core, x, y, .6 + rnd.random() * 1.1, k)
            streak(soft, x, y, x, y + 6 + rnd.random() * 10, 1, .1, k * .6, 0, seg=3)
    # vài kiếm nhỏ mờ rơi lại
    for i in range(6):
        x = cx + 30 + rnd.random() * 200; y = cy + (rnd.random() - .5) * 150
        draw_sword(core, body, x, y, 18, math.pi + (rnd.random() - .5) * .6, 1.1, .3)
    return compose(core, body, soft)


def main():
    rnd = random.Random(7)
    frames = [f(rnd) for f in (frame1, frame2, frame3, frame4, frame5, frame6)]
    sheet = Image.new('RGBA', (CW * 6, CH), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, (i * CW, 0))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    sheet.save(OUT, optimize=True)
    print('saved', os.path.abspath(OUT), sheet.size)


if __name__ == '__main__':
    main()
