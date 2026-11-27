# -*- coding: utf-8 -*-
"""Sprite sheet đòn đánh 3 giây (72 khung, 24 khung/giây) cho 21 nhân vật (Kiếm: gen_kiem.py).

  python tools/fx/gen_fx.py                 -> fx/<id>.webp cho tất cả
  python tools/fx/gen_fx.py hoa thuy        -> chỉ vài nhân vật
  python tools/fx/gen_fx.py --n 6 hoa       -> fx/hoa-6.png (6 ô ngang, bố cục prompt)
Mỗi nhân vật: bảng màu PAL[id] + hàm fx_<id>(L, t, S) vẽ một khung tại thời điểm t.
"""
import math, os, sys
from multiprocessing import Pool
from PIL import Image
from fxlib import *  # noqa
from gen_kiem import FX_DIR, N, COLS

TAU = 2 * math.pi
PAL = {
    'hoa': Pal('#fff4d6', '#ffb03a', '#ff5a10', '#c01800', dark='#2a0a04'),
    'thuy': Pal('#effcff', '#6fe0ff', '#1a9cf0', '#0a40c0'),
    'moc': Pal('#f4ffe0', '#9cf06a', '#38c040', '#0a7a2a', dark='#0f2a10'),
    'dia': Pal('#fff2cc', '#ffc55a', '#d98a20', '#8a4a10', dark='#3a2a1c'),
    'loi': Pal('#fbf4ff', '#c8a0ff', '#8a50ff', '#4a10d0'),
    'bang': Pal('#ffffff', '#c8f4ff', '#7ad0ff', '#3a80e0', edge='#e0faff'),
    'phong': Pal('#f6fff9', '#b8ffe0', '#5ae0b0', '#109a80'),
    'hon': Pal('#f6e6ff', '#d080ff', '#9a30e0', '#5a0aa0', dark='#140820'),
    'quang': Pal('#fffbe8', '#ffe68a', '#ffc030', '#e08a00'),
    'doc': Pal('#f4ffd8', '#b6f040', '#6ad020', '#3a8a10', dark='#1c2a08'),
    'khong': Pal('#f0eaff', '#a8a0ff', '#6a50ff', '#3010b0', dark='#0a0618'),
    'thoi': Pal('#fff8ec', '#e8c8ff', '#b08cff', '#7a50d0'),
    'kimcuong': Pal('#fffbe6', '#ffd760', '#ffa818', '#c86a00'),
    'dan': Pal('#efffff', '#80ffd8', '#20d0a0', '#0a8a70'),
    'khi': Pal('#fff6e0', '#ffcf80', '#e89040', '#a85010', dark='#2a1a10'),
    'tran': Pal('#effaff', '#90e0ff', '#40a8ff', '#1050d0'),
    'thu': Pal('#fff6e0', '#ffc870', '#ff9020', '#c05000', dark='#2a1606'),
    'am': Pal('#fff0fb', '#ffa0e0', '#f050b8', '#a01080'),
    'co': Pal('#f4ffe8', '#c0ff70', '#80c030', '#5a2a90', dark='#160a20'),
    'nho': Pal('#fffaea', '#ffe0a0', '#f0b040', '#b07010', dark='#0c0a10'),
    'hoa2': Pal('#fff2fa', '#ffb0e0', '#ff60c0', '#c02090'),
}


def proj_tail(L, x, y, length, w, k, lay='soft'):
    streak(getattr(L, lay), x, y, min(712, x + length), y, w, w * .1, k, 0, seg=12)


# ===================== HỎA: Viêm Dương — cầu lửa phượng diệm =====================
def flame(L, x, y, s, k, a=math.pi):
    """lưỡi lửa: giọt nhọn hướng ngược chiều bay"""
    pts = [(s * 2.6, 0), (s * .3, s * .9), (-s * .9, s * .55), (-s * 1.1, 0), (-s * .9, -s * .55), (s * .3, -s * .9)]
    poly(L.body, rot_pts(pts, x, y, a + math.pi), k)


def fx_hoa(L, t, S):
    spiral_in(L, t, S, n=100)
    f = env(t, .06, .22, .5, .62)
    if f > 0:
        for i in range(28):  # vòng lửa xoay
            a = t * 10 + i * TAU / 28
            r = 85 + 10 * math.sin(i * 3 + t * 40)
            x, y = OX + math.cos(a) * r, OY + math.sin(a) * r * .9
            flame(L, x, y, 5 + 3 * S[i][0], f * (.6 + .4 * S[i][1]), a + math.pi / 2)
        ring(L.soft, OX, OY, 100, 90, 3, .5 * f)
        for i in range(40):  # tàn lửa bay lên
            ph = (S[i + 30][0] + t * 3) % 1
            dot(L.core, OX + (S[i + 30][1] - .5) * 200, OY + 80 - ph * 170, 1 + S[i][2], .7 * f * (1 - ph))
    charge(L, t, size=1.4)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        x, p = travel(t)
        r = lerp(14, 34, sm(.38, .55, t))
        for i in range(26):  # lưỡi lửa kéo đuôi
            ln = 60 + S[i + 80][0] * 160
            dy = (S[i + 80][1] - .5) * r * 1.6
            wob = math.sin(t * 90 + i) * 6
            streak(L.body, x + r * .4, OY + dy * .7 + wob * .3, x + ln, OY + dy + wob, r * .35 * (1 - abs(dy) / (r * 1.2)), .5, v * .8, 0, seg=8)
        proj_tail(L, x, OY, 260, r * .9, .9 * v)
        dot(L.soft, x, OY, r * 1.5, v)
        dot(L.body, x, OY, r, v)
        dot(L.core, x, OY, r * .6, 1.3 * v)
        for i in range(30):  # tàn lửa văng
            dx = S[i + 120][0] * 260
            dot(L.core, x + dx, OY + (S[i + 120][1] - .5) * 90 * (dx / 260 + .3), 1 + S[i + 120][2], v * (1 - dx / 300))
    burst(L, t, S, size=1.15, frag=lambda L, x, y, s, k, a: flame(L, x, y, s * 1.3, k, a))
    x5 = env(t, .69, .74, .8, .95)
    if x5 > 0:  # khói cháy
        g = sm(.69, 1, t)
        for i in range(10):
            a = S[i + 200][0] * TAU
            ell(L.dark, IX + math.cos(a) * 60 * g, IY + math.sin(a) * 50 * g - 30 * g, 22 + 18 * g, 18 + 14 * g, .45 * x5)
    residue(L, t, S, fn=lambda L, x, y, s, k, a: flame(L, x, y, s, k, -math.pi / 2), rise=60)


# ===================== THỦY: Huyền Thủy — thủy long cuộn sóng =====================
def drop(L, x, y, s, k, a=0):
    pts = [(s * 2.2, 0), (s * .2, s), (-s, s * .6), (-s * 1.1, 0), (-s, -s * .6), (s * .2, -s)]
    poly(L.body, rot_pts(pts, x, y, a), k)


def fx_thuy(L, t, S):
    spiral_in(L, t, S, n=90)
    f = env(t, .06, .22, .5, .62)
    if f > 0:
        for j in range(4):  # xoáy nước elip
            rx = 40 + j * 22
            a0 = (t * 900 * (1 if j % 2 else -1) + j * 60) % 360
            ring(L.body, OX, OY, rx, rx * .55, 3 - j * .4, .8 * f, a0, a0 + 230)
            ring(L.soft, OX, OY, rx, rx * .55, 5, .4 * f, a0 + 240, a0 + 330)
        for i in range(30):
            a = t * 12 + i * TAU / 30
            r = 70 + S[i][0] * 50
            drop(L, OX + math.cos(a) * r, OY + math.sin(a) * r * .6, 1.6 + S[i][1] * 1.5, .8 * f, a + math.pi / 2)
    charge(L, t)
    v = env(t, .38, .48, .69, .72)
    if v > 0:  # thủy long: dải sóng hình sin, đầu to
        hx, p = travel(t)
        pts = []
        n = 40
        for i in range(n):
            f2 = i / (n - 1)
            x = hx + f2 * 380
            y = OY + math.sin(f2 * 9 - t * 60) * 26 * (f2 ** .6)
            pts.append((x, y))
        for i in range(n - 1):
            w = lerp(22, 2, i / (n - 1))
            streak(L.body, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w * .6, w * .58, .85 * v, .8 * v, seg=1)
            streak(L.soft, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w * 1.1, w, .6 * v, .5 * v, seg=1)
        line(L.core, pts[:20], 2.4, .9 * v)
        dot(L.soft, hx, OY, 30, v)
        dot(L.body, hx, OY, 16, v)
        dot(L.core, hx - 4, OY - 5, 3, v)
        dot(L.core, hx - 4, OY + 5, 3, v)
        for i in range(40):  # bọt nước
            d = S[i + 80][0] * 300
            drop(L, hx + d, OY + (S[i + 80][1] - .5) * 80, 1 + S[i + 80][2] * 1.6, v * (1 - d / 330), math.pi)
    xs = env(t, .69, .72, .8, .98)
    if xs > 0:  # nước bắn tung toé theo parabol
        g = sm(.69, 1, t)
        for i in range(60):
            a = -math.pi * (.1 + .8 * S[i + 200][0])
            sp = 60 + S[i + 200][1] * 120
            x = IX + math.cos(a) * sp * g
            y = IY + math.sin(a) * sp * g + 140 * g * g
            drop(L, x, y, 1.4 + S[i + 200][2] * 2, xs, math.atan2(math.sin(a) * sp + 280 * g, math.cos(a) * sp))
    burst(L, t, S, rays=30, size=1.0)
    residue(L, t, S, fn=lambda L, x, y, s, k, a: drop(L, x, y, s, k, math.pi / 2), rise=-20)


# ===================== MỘC: Thanh Mộc — bão lá, dây leo gai =====================
def fx_moc(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .5, .62)
    if f > 0:
        for i in range(36):
            a = t * 9 + i * TAU / 36
            r = 50 + S[i][0] * 70
            leaf(L.body, OX + math.cos(a) * r, OY + math.sin(a) * r * .85, 3 + S[i][1] * 3, a + math.pi / 2 + math.sin(t * 50 + i), f * (.7 + .3 * S[i][2]))
        for j in range(3):  # dây leo xoắn
            pts = [(OX + math.cos(t * 8 + j * 2.1 + u * 5) * (20 + u * 90), OY + math.sin(t * 8 + j * 2.1 + u * 5) * (18 + u * 80)) for u in [i / 20 for i in range(21)]]
            line(L.body, pts, 2.2, .7 * f)
    charge(L, t)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        pts = [(hx + u * 400, OY + math.sin(u * 14 - t * 40) * 10 * u) for u in [i / 40 for i in range(41)]]
        line(L.body, pts, 6, v)
        line(L.core, pts[:25], 2, v)
        for i in range(0, 40, 3):  # gai
            x, y = pts[i]
            poly(L.body, [(x, y - 3), (x - 10, y - 12 if i % 2 else y + 12), (x + 3, y)], v)
        poly(L.body, [(hx - 22, OY), (hx + 4, OY - 8), (hx + 4, OY + 8)], v)
        for i in range(70):  # bão lá
            ph = (S[i + 80][0] + t * 2.5) % 1
            x = hx + 20 + (1 - ph) * 380
            y = OY + (S[i + 80][1] - .5) * 160 + math.sin(t * 30 + i) * 10
            leaf(L.body, x, y, 2.5 + S[i + 80][2] * 2.5, math.pi + math.sin(t * 40 + i) * .8, v * .9)
    xs = env(t, .69, .72, .82, 1.0)
    if xs > 0:  # dây leo bung ra
        g = sm(.69, .85, t)
        for j in range(9):
            a = j * TAU / 9 + S[j + 250][0]
            pts = []
            for i in range(16):
                u = i / 15 * g
                r = u * 120
                pts.append((IX + math.cos(a + math.sin(u * 6) * .5) * r, IY + math.sin(a + math.sin(u * 6) * .5) * r * .85))
            line(L.body, pts, 3.5, xs)
            leaf(L.body, pts[-1][0], pts[-1][1], 5, a, xs)
    burst(L, t, S, rays=24, size=.9, frag=lambda L, x, y, s, k, a: leaf(L.body, x, y, s * 1.6, a, k))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: leaf(L.body, x, y, s * 1.8, a + t * 20, k), rise=-30)


# ===================== ĐỊA: Đại Địa — đá tảng, địa chấn =====================
def rock(L, x, y, s, k, a=0, rs=None):
    rs = rs if rs is not None else [.5] * 7
    pts = [(math.cos(a + i * TAU / 7) * s * (.7 + .5 * rs[i]), math.sin(a + i * TAU / 7) * s * (.7 + .5 * rs[i])) for i in range(7)]
    pts = [(x + px, y + py) for px, py in pts]
    poly(L.dark, pts, k)
    line(L.body, pts + [pts[0]], max(1, s * .12), k * .8)


def fx_dia(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .5, .62)
    if f > 0:
        rune_ring(L.body, OX, OY + 50, 110, .5 * f, t * 3, 16)
        for i in range(16):  # đá lơ lửng xoay
            a = t * 6 + i * TAU / 16
            r = 70 + S[i][0] * 40
            rock(L, OX + math.cos(a) * r, OY + math.sin(a) * r * .5 - 10 * f, 5 + S[i][1] * 6, f, t * 10 + i, S[i + 1][:7])
    charge(L, t, size=1.2)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        y = OY + 10
        ell(L.soft, hx + 60, y + 40, 120, 10, .6 * v)  # vệt bụi mặt đất
        for i in range(30):
            d = S[i + 80][0] * 260
            rock(L, hx + 40 + d, y + 30 - S[i + 80][1] * 40 * (1 - d / 260), 2 + S[i + 80][2] * 4, v * (1 - d / 280), t * 20 + i, S[i + 81][:7])
        rock(L, hx + 10, y, 34, v, -t * 30, S[90][:7])  # tảng đá lớn lăn
        ring(L.body, hx + 10, y, 30, 30, 2, .9 * v)
        for i in range(5):
            a = S[i + 95][0] * TAU
            line(L.core, [(hx + 10, y), (hx + 10 + math.cos(a) * 26, y + math.sin(a) * 26)], 1.6, .8 * v)
    xs = env(t, .69, .72, .82, 1.0)
    if xs > 0:  # sóng địa chấn + gai đá trồi lên
        g = sm(.69, .8, t)
        ring(L.body, IX, IY + 40, 40 + 120 * g, 12 + 20 * g, 3, xs)
        ring(L.soft, IX, IY + 40, 30 + 100 * g, 10 + 16 * g, 6, .7 * xs)
        for i in range(9):
            sx = IX + (i - 4) * 22
            hgt = (40 + S[i + 220][0] * 50) * sm(.69 + i * .003, .76, t) * (1 - sm(.88, 1, t))
            poly(L.dark, [(sx - 9, IY + 46), (sx + 2, IY + 46 - hgt), (sx + 9, IY + 46)], xs)
            line(L.body, [(sx - 9, IY + 46), (sx + 2, IY + 46 - hgt), (sx + 9, IY + 46)], 1.5, xs * .9)
    burst(L, t, S, rays=26, size=.9, frag=lambda L, x, y, s, k, a: rock(L, x, y, s * 1.5, k, a))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: rock(L, x, y, s * 1.3, k * 1.4, a), rise=-15)


# ===================== LÔI: Tử Tiêu — lôi long, sét tím =====================
def fx_loi(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .55, .64)
    fr = int(t * 72)
    if f > 0:
        for i in range(7):  # cung sét quanh quả cầu
            a0 = S[fr * 7 + i][0] * TAU
            r = 40 + S[fr * 7 + i][1] * 60
            line(L.body, bolt(OX, OY, OX + math.cos(a0) * r, OY + math.sin(a0) * r, S[fr * 7 + i + 1], jag=8, seg=6), 1.8, f)
        ring(L.soft, OX, OY, 70, 66, 3, .5 * f)
        rune_ring(L.body, OX, OY, 95, .35 * f, t * 6, 20)
    charge(L, t, size=1.3)
    v = env(t, .44, .47, .69, .72)
    if v > 0:
        hx, p = travel(t, t0=.46, ease=1.2)
        for k2, (w, jag) in enumerate([(5, 18), (2.2, 22), (1.2, 26)]):
            pts = bolt(OX - 10, OY, hx, OY, S[fr * 3 + k2 + 100], jag=jag, seg=14)
            line(L.body, pts, w, v)
        line(L.core, bolt(OX - 10, OY, hx, OY, S[fr * 3 + 100], jag=18, seg=14), 2, v)
        for i in range(6):  # nhánh sét
            u = S[fr + i + 150][0]
            bx = lerp(hx, OX, u)
            line(L.body, bolt(bx, OY, bx + 20 + S[fr + i][1] * 40, OY + (S[fr + i][2] - .5) * 120, S[fr + i + 160], jag=8, seg=5), 1.2, .8 * v)
        dot(L.soft, hx, OY, 26, v)
        dot(L.core, hx, OY, 8, v)
    x5 = env(t, .69, .7, .78, .86)
    if x5 > 0:  # sét giáng từ trên xuống quái
        for k2 in range(3):
            line(L.body, bolt(IX + (k2 - 1) * 20, -10, IX, IY, S[fr * 2 + k2 + 220], jag=16, seg=10), 3 - k2 * .7, x5)
    burst(L, t, S, rays=36, size=1.0, frag=lambda L, x, y, s, k, a: line(L.core, bolt(x, y, x + math.cos(a) * s * 6, y + math.sin(a) * s * 6, S[int(a * 50)], jag=3, seg=3), 1, k))
    residue(L, t, S, rise=10)


# ===================== BĂNG: Thiên Sơn — thương băng, tinh thể =====================
def flake(lay, x, y, r, k, a=0):
    for i in range(6):
        b = a + i * TAU / 6
        ex, ey = x + math.cos(b) * r, y + math.sin(b) * r
        line(lay, [(x, y), (ex, ey)], max(.8, r * .08), k)
        for u in (.45, .7):
            mx, my = x + math.cos(b) * r * u, y + math.sin(b) * r * u
            for s in (1, -1):
                line(lay, [(mx, my), (mx + math.cos(b + s * .9) * r * .25, my + math.sin(b + s * .9) * r * .25)], max(.8, r * .06), k)


def shard(L, x, y, s, k, a=0):
    poly(L.body, rot_pts([(s * 3, 0), (0, s * .8), (-s * 1.2, 0), (0, -s * .8)], x, y, a), k)


def fx_bang(L, t, S):
    spiral_in(L, t, S, n=80)
    f = env(t, .06, .22, .5, .62)
    if f > 0:
        flake(L.body, OX, OY, 90 * sm(.06, .25, t), f, t * 3)
        flake(L.soft, OX, OY, 60, .6 * f, -t * 4 + .5)
        ring(L.body, OX, OY, 100, 100, 1.5, .5 * f)
        for i in range(18):
            a = -t * 6 + i * TAU / 18
            shard(L, OX + math.cos(a) * 112, OY + math.sin(a) * 104, 3, .8 * f, a)
    charge(L, t)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        Ls = lerp(150, 300, sm(.38, .55, t))
        proj_tail(L, hx + Ls * .6, OY, 240, 18, .6 * v)
        poly(L.body, [(hx, OY), (hx + Ls * .25, OY - 14), (hx + Ls, OY - 6), (hx + Ls, OY + 6), (hx + Ls * .25, OY + 14)], v)
        line(L.core, [(hx + 4, OY), (hx + Ls * .9, OY)], 2.2, v)
        line(L.core, [(hx + Ls * .25, OY - 13), (hx + Ls * .6, OY - 8)], 1, .7 * v)
        for i in range(50):  # tuyết bay theo
            d = S[i + 80][0] * 360
            dot(L.core, hx + Ls * .3 + d, OY + (S[i + 80][1] - .5) * 90 * (.3 + d / 360), .8 + S[i + 80][2], v * (1 - d / 400))
        for i in range(8):
            d = S[i + 140][0] * 200
            flake(L.body, hx + 60 + d, OY + (S[i + 140][1] - .5) * 70, 5, .7 * v, t * 20)
    xs = env(t, .69, .72, .84, 1.0)
    if xs > 0:  # gai băng toả tròn
        g = sm(.69, .76, t)
        for i in range(14):
            a = i * TAU / 14 + S[i + 230][0] * .2
            ln = (40 + S[i + 230][1] * 60) * g
            poly(L.body, [(IX + math.cos(a + .12) * 10, IY + math.sin(a + .12) * 10), (IX + math.cos(a) * ln, IY + math.sin(a) * ln * .9), (IX + math.cos(a - .12) * 10, IY + math.sin(a - .12) * 10)], xs)
        flake(L.soft, IX, IY, 120 * sm(.69, 1, t), .7 * xs, .3)
    burst(L, t, S, rays=28, size=.9, frag=lambda L, x, y, s, k, a: shard(L, x, y, s, k, a))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: flake(L.body, x, y, s * 2.2, k, a), rise=-25)


# ===================== PHONG: Phiêu Miểu — phong nhận lưỡi liềm =====================
def fx_phong(L, t, S):
    spiral_in(L, t, S, n=90, slow=1.6)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for j in range(7):  # cung gió xoáy
            r = 30 + j * 14
            a0 = (t * 1400 + j * 51) % 360
            ring(L.body, OX, OY, r, r * .8, 2.4 - j * .2, .8 * f, a0, a0 + 120)
            ring(L.soft, OX, OY, r, r * .8, 4, .45 * f, a0 + 180, a0 + 260)
    charge(L, t, k=.8)
    for b in range(5):  # 5 lưỡi gió bay nối nhau
        t0 = .44 + b * .035
        v = env(t, t0, t0 + .04, HIT_T - .02 + b * .006, HIT_T + .03 + b * .006)
        if v > 0:
            x, p = travel(t, t0=t0, t1=HIT_T + b * .006, ease=1.3)
            dy = (b - 2) * 18
            s = 1 - abs(b - 2) * .12
            crescent(L.body, x + 50 * s, OY + dy, 55 * s, 14 * s, v)
            crescent(L.soft, x + 58 * s, OY + dy, 62 * s, 22 * s, .6 * v)
            crescent(L.core, x + 48 * s, OY + dy, 53 * s, 4 * s, v)
            for i in range(4):
                streak(L.soft, x + 30, OY + dy + (i - 1.5) * 16 * s, x + 200, OY + dy + (i - 1.5) * 20 * s, 1.3, .2, .6 * v, 0, seg=5)
    xs = env(t, .69, .72, .86, 1.0)
    if xs > 0:  # lốc xoáy ở quái
        for j in range(8):
            yy = IY + 50 - j * 14
            r = 20 + j * 7
            a0 = (t * 2000 + j * 40) % 360
            ring(L.body, IX, yy, r, r * .3, 2.2, xs, a0, a0 + 200)
    burst(L, t, S, rays=20, size=.8, ring_k=.6, frag=lambda L, x, y, s, k, a: leaf(L.body, x, y, s * 1.4, a, k))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: crescent(L.body, x, y, s * 3, s * .8, k, 120 + a * 30, 240 + a * 30, 6), rise=40)


# ===================== HỒN: U Minh — hồn hoả, quỷ trảo =====================
def wisp(L, x, y, s, k, a=math.pi, tail=4):
    dot(L.body, x, y, s, k)
    dot(L.core, x, y, s * .4, k)
    streak(L.soft, x, y, x - math.cos(a) * s * tail * 3, y - math.sin(a) * s * tail * 3 + s * 2, s * .9, .1, k, 0, seg=5)


def fx_hon(L, t, S):
    f = env(t, 0, .15, .5, .62)
    if f > 0:
        for i in range(10):  # khói u minh
            a = t * 3 + i * TAU / 10
            ell(L.dark, OX + math.cos(a) * 50, OY + math.sin(a) * 40, 34, 26, .35 * f)
        for i in range(14):  # hồn hoả xoay
            a = t * 9 + i * TAU / 14
            r = 70 + 14 * math.sin(t * 30 + i)
            wisp(L, OX + math.cos(a) * r, OY + math.sin(a) * r * .8, 3.5, f, a + math.pi / 2)
        rune_ring(L.body, OX, OY, 110, .35 * f, -t * 4, 13)
    spiral_in(L, t, S, n=70)
    charge(L, t, size=1.2)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        for i in range(8):
            ell(L.dark, hx + 30 + i * 26, OY + math.sin(i + t * 40) * 6, 30 - i * 2.5, 24 - i * 2, .5 * v)
        # đầu quỷ: khối hồn lớn với hai mắt
        dot(L.soft, hx, OY, 34, v)
        dot(L.body, hx, OY, 20, v)
        ell(L.dark, hx, OY, 14, 15, .6 * v)
        dot(L.core, hx - 6, OY - 5, 3, v)
        dot(L.core, hx - 6, OY + 5, 3, v)
        for i in range(3):  # móng vuốt
            yy = OY + (i - 1) * 16
            crescent(L.body, hx - 6, yy, 22, 5, v, 140, 220, 8)
        for i in range(20):
            ph = (S[i + 80][0] + t * 2) % 1
            wisp(L, hx + ph * 340, OY + (S[i + 80][1] - .5) * 130 + math.sin(t * 40 + i) * 10, 2.2 + S[i][2] * 1.5, v * (1 - ph), math.pi, 3)
    xi = env(t, .66, .69, .71, .74)
    if xi > 0:  # co rút vào trước khi nổ
        g = sm(.66, .72, t)
        ring(L.body, IX, IY, 110 * (1 - g) + 10, 100 * (1 - g) + 10, 3, xi)
    burst(L, t, S, rays=30, size=1.0, frag=lambda L, x, y, s, k, a: wisp(L, x, y, s * 1.1, k, a, 2))
    xs = env(t, .7, .76, .86, 1.0)
    if xs > 0:
        g = sm(.7, 1, t)
        for i in range(8):
            a = S[i + 260][0] * TAU
            ell(L.dark, IX + math.cos(a) * 55 * g, IY + math.sin(a) * 45 * g - 20 * g, 26, 20, .4 * xs)
    residue(L, t, S, fn=lambda L, x, y, s, k, a: wisp(L, x, y, s * 1.2, k, -math.pi / 2, 3), rise=70)


# ===================== QUANG: Thánh Quang — thánh quang trụ =====================
def fx_quang(L, t, S):
    spiral_in(L, t, S, n=80)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for i in range(16):  # tia hào quang xoay
            a = t * 3 + i * TAU / 16
            r1 = 40 + (25 if i % 2 else 55) * f
            streak(L.soft, OX + math.cos(a) * 20, OY + math.sin(a) * 20, OX + math.cos(a) * (r1 + 40), OY + math.sin(a) * (r1 + 40), 4, .3, .8 * f, 0, seg=5)
        ring(L.body, OX, OY - 70, 40, 9, 2.5, .8 * f)  # vầng hào quang
        rune_ring(L.body, OX, OY, 100, .45 * f, t * 2, 24)
        rune_ring(L.soft, OX, OY, 75, .4 * f, -t * 3, 12)
    charge(L, t, size=1.5)
    v = env(t, .44, .5, .69, .74)
    if v > 0:  # chùm sáng thẳng, đầu sáng lao tới
        hx, p = travel(t, ease=1.2)
        streak(L.soft, hx, OY, OX - 10, OY, 18, 26, .8 * v, .9 * v, seg=6)
        streak(L.body, hx, OY, OX - 10, OY, 7, 10, v, v, seg=4)
        line(L.core, [(hx, OY), (OX - 10, OY)], 3, v)
        for i in range(12):  # vòng xoắn quanh tia
            u = (i / 12 + t * 4) % 1
            x = lerp(hx, OX, u)
            ring(L.body, x, OY, 4, 16, 1.4, .7 * v, 0, 360)
        dot(L.soft, hx, OY, 30, v)
        dot(L.core, hx, OY, 10, v)
    xp = env(t, .69, .71, .86, 1.0)
    if xp > 0:  # cột sáng giáng xuống quái
        streak(L.soft, IX, IY + 60, IX, -10, 40, 30, xp, .6 * xp, seg=6)
        streak(L.body, IX, IY + 60, IX, -10, 14, 10, xp, .8 * xp, seg=6)
        line(L.core, [(IX, IY + 60), (IX, -10)], 4, xp)
        ring(L.body, IX, IY + 60, 60 * sm(.69, .9, t) + 20, 10, 2, xp)
    burst(L, t, S, rays=40, size=1.0, frag=lambda L, x, y, s, k, a: diamond(L.core, x, y, s * .8, k, 0, 3))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: diamond(L.body, x, y, s, k, 0, 3), rise=60)


# ===================== ĐỘC: Vạn Độc — độc cầu, sương độc =====================
def bubble(L, x, y, r, k):
    ring(L.body, x, y, r, r, max(.8, r * .18), k)
    dot(L.core, x - r * .35, y - r * .35, r * .22, k)


def fx_doc(L, t, S):
    f = env(t, 0, .15, .5, .62)
    if f > 0:
        for i in range(9):
            a = t * 2 + i * TAU / 9
            ell(L.dark, OX + math.cos(a) * 55, OY + math.sin(a) * 40, 30, 22, .3 * f)
        for i in range(40):  # bọt độc nổi lên
            ph = (S[i][0] + t * 2) % 1
            bubble(L, OX + (S[i][1] - .5) * 160, OY + 70 - ph * 150, 2 + S[i][2] * 5, f * (1 - ph) * .9)
        rune_ring(L.body, OX, OY, 95, .35 * f, t * 4, 16)
    spiral_in(L, t, S, n=60)
    charge(L, t, size=1.2)
    for b in range(3):  # 3 độc cầu bay theo đường cong
        t0 = .44 + b * .03
        v = env(t, t0, t0 + .04, HIT_T + .01, HIT_T + .04)
        if v > 0:
            x, p = travel(t, t0=t0, t1=HIT_T + .01, ease=1.2)
            y = OY + (b - 1) * 30 * (1 - p) - math.sin(p * math.pi) * (40 + b * 20)
            dot(L.soft, x, y, 20, v)
            dot(L.body, x, y, 11, v)
            dot(L.core, x, y, 5, v)
            for i in range(10):
                u = i / 10
                px = x + u * 120
                pp = max(0, p - u * .25)
                py = OY + (b - 1) * 30 * (1 - pp) - math.sin(pp * math.pi) * (40 + b * 20)
                dot(L.body, px, py + i * 1.5, 6 * (1 - u), v * (1 - u))
                if i % 3 == 0:
                    dot(L.body, px, py + 8 + (t * 400 + i * 7) % 30, 1.6, v * (1 - u))
    xs = env(t, .69, .74, .86, 1.0)
    if xs > 0:  # đám mây độc
        g = sm(.69, 1, t)
        for i in range(12):
            a = S[i + 210][0] * TAU
            r = 50 * g + 10
            ell(L.dark, IX + math.cos(a) * r, IY + math.sin(a) * r * .7, 28 + 14 * g, 22 + 10 * g, .45 * xs)
            ell(L.soft, IX + math.cos(a) * r, IY + math.sin(a) * r * .7, 20 + 10 * g, 15 + 8 * g, .35 * xs)
        for i in range(30):
            ph = (S[i + 240][0] + t * 3) % 1
            bubble(L, IX + (S[i + 240][1] - .5) * 160, IY + 40 - ph * 100, 2 + S[i + 240][2] * 4, xs * (1 - ph))
    burst(L, t, S, rays=24, size=.9, frag=lambda L, x, y, s, k, a: dot(L.body, x, y, s * 1.3, k))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: bubble(L, x, y, s * 1.6, k), rise=60)


# ===================== KHÔNG: Hư Không — cổng không gian, vỡ hư không =====================
def portal(L, x, y, r, k, t, ry=None):
    ry = ry or r * 1.3
    ell(L.dark, x, y, r * .85, ry * .85, .9 * k)
    ring(L.body, x, y, r, ry, 3, k)
    ring(L.soft, x, y, r * 1.15, ry * 1.12, 6, .6 * k)
    for i in range(4):
        a0 = (t * 1500 + i * 90) % 360
        ring(L.body, x, y, r * .6, ry * .6, 1.6, .7 * k, a0, a0 + 60)


def fx_khong(L, t, S):
    spiral_in(L, t, S, n=90)
    f = env(t, .06, .2, .55, .64)
    if f > 0:
        portal(L, OX - 30, OY, 46 * sm(.06, .22, t), f, t)
        for i in range(30):  # sao trong hư không bị hút vào
            ph = (S[i][0] + t * 2) % 1
            a = S[i][1] * TAU
            r = (1 - ph) * 110 + 20
            dot(L.core, OX - 30 + math.cos(a) * r, OY + math.sin(a) * r, 1 + S[i][2], f * ph)
    v = env(t, .44, .5, .69, .73)
    if v > 0:
        portal(L, IX + 70, IY, 40, v, t)  # cổng thứ hai mở ở quái
        hx, p = travel(t, t0=.48, t1=HIT_T, ease=1.0)
        fr = int(t * 72)
        line(L.body, bolt(OX - 30, OY, hx, OY, S[fr + 40], jag=10, seg=16), 2.6, v)  # vết nứt không gian
        line(L.core, bolt(OX - 30, OY, hx, OY, S[fr + 40], jag=10, seg=16), 1, v)
        for i in range(5):
            u = S[i + 60][0]
            bx = lerp(hx, OX - 30, u)
            line(L.body, bolt(bx, OY, bx + (S[i + 60][1] - .5) * 60, OY + (S[i + 60][2] - .5) * 120, S[fr + i + 70], jag=6, seg=4), 1.2, .8 * v)
        for i in range(24):  # sao rơi qua khe nứt
            u = (S[i + 100][0] + t * 3) % 1
            x = lerp(OX - 30, IX + 70, u)
            dot(L.core, x, OY + (S[i + 100][1] - .5) * 30, 1.2, v)
    xs = env(t, .69, .71, .84, 1.0)
    if xs > 0:  # không gian vỡ thành mảnh
        g = sm(.69, 1, t)
        for i in range(14):
            a = S[i + 200][0] * TAU
            r = 20 + g * (60 + S[i + 200][1] * 60)
            cx, cy = IX + math.cos(a) * r, IY + math.sin(a) * r * .8
            pts = rot_pts([(-10, -8), (12, -5), (6, 10), (-8, 7)], cx, cy, a + g * 3, .8 + S[i + 200][2])
            poly(L.dark, pts, .8 * xs)
            line(L.body, pts + [pts[0]], 1.4, xs)
    burst(L, t, S, rays=30, size=1.0)
    residue(L, t, S, rise=0)


# ===================== THỜI: Tuế Nguyệt — đồng hồ thời gian =====================
def clock(L, x, y, r, k, t, back=False):
    ring(L.body, x, y, r, r, 2.4, k)
    ring(L.soft, x, y, r * .82, r * .82, 1.2, .6 * k)
    for i in range(12):
        a = i * TAU / 12
        r0 = r * (.78 if i % 3 == 0 else .86)
        line(L.body, [(x + math.cos(a) * r0, y + math.sin(a) * r0), (x + math.cos(a) * r * .95, y + math.sin(a) * r * .95)], 2 if i % 3 == 0 else 1.2, k)
    s = -1 if back else 1
    a1, a2 = s * t * 30 - math.pi / 2, s * t * 4 - math.pi / 2
    line(L.core, [(x, y), (x + math.cos(a1) * r * .75, y + math.sin(a1) * r * .75)], 2, k)
    line(L.body, [(x, y), (x + math.cos(a2) * r * .5, y + math.sin(a2) * r * .5)], 3.5, k)
    dot(L.core, x, y, 3, k)


def gear(L, x, y, r, k, a, n=10):
    pts = []
    for i in range(n * 2):
        rr = r * (1 if i % 2 == 0 else .8)
        b = a + i * math.pi / n
        pts.append((x + math.cos(b) * rr, y + math.sin(b) * rr))
    line(L.body, pts + [pts[0]], 1.6, k)


def fx_thoi(L, t, S):
    spiral_in(L, t, S, n=70)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        clock(L, OX, OY, 80 * sm(.04, .2, t), f, t)
        gear(L, OX + 70, OY - 60, 24, .7 * f, t * 6)
        gear(L, OX + 60, OY + 70, 18, .6 * f, -t * 8, 8)
    v = env(t, .42, .48, .69, .72)
    if v > 0:  # kim đồng hồ bay ra + bóng tàn ảnh
        hx, p = travel(t)
        for j in range(6):
            x = hx + j * 40
            kk = v * (1 - j / 6)
            for dy in (-14, 14):
                poly(L.body, [(x - 30, OY + dy), (x + 40, OY + dy - 4), (x + 50, OY + dy), (x + 40, OY + dy + 4)], kk)
        line(L.core, [(hx - 30, OY - 14), (hx + 40, OY - 14)], 1.5, v)
        line(L.core, [(hx - 30, OY + 14), (hx + 40, OY + 14)], 1.5, v)
        for i in range(30):
            d = S[i + 80][0] * 300
            dot(L.core, hx + d, OY + (S[i + 80][1] - .5) * 80, 1 + S[i + 80][2], v * (1 - d / 330))
    xs = env(t, .68, .71, .86, 1.0)
    if xs > 0:  # đồng hồ khổng lồ quay ngược ở quái
        clock(L, IX, IY, 70 + 20 * sm(.68, 1, t), xs, t, back=True)
        for j in range(3):
            rr = 40 + j * 30 + 40 * sm(.69, 1, t)
            ring(L.soft, IX, IY, rr, rr, 2, .5 * xs * (1 - j / 3))
    burst(L, t, S, rays=24, size=.8, ring_k=.4, frag=lambda L, x, y, s, k, a: gear(L, x, y, s * 2.2, k, a, 6))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: gear(L, x, y, s * 2, k, a + t * 10, 6), rise=10)


# ===================== KIM CƯƠNG: Phật chưởng vàng =====================
def fx_kimcuong(L, t, S):
    spiral_in(L, t, S, n=80)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for i in range(24):
            a = i * TAU / 24 + t * 2
            streak(L.soft, OX + math.cos(a) * 30, OY + math.sin(a) * 30, OX + math.cos(a) * 110, OY + math.sin(a) * 100, 3, .2, .6 * f, 0, seg=4)
        ring(L.body, OX, OY, 105, 100, 3, .7 * f)
        rune_ring(L.body, OX, OY, 85, .5 * f, -t * 3, 8)
        for i in range(8):  # chuỗi hạt
            a = t * 5 + i * TAU / 8
            dot(L.body, OX + math.cos(a) * 60, OY + math.sin(a) * 56, 6, f)
            dot(L.core, OX + math.cos(a) * 60, OY + math.sin(a) * 56, 2.5, f)
    charge(L, t, size=1.3)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        s = lerp(30, 62, sm(.38, .55, t))
        for j in range(4):  # tàn ảnh bàn tay
            palm(L.soft, hx + 40 + j * 45, OY + 20, s * (1 - j * .1), .5 * v * (1 - j / 4))
        palm(L.body, hx, OY + 20, s, v)
        ring(L.soft, hx, OY, s * 1.1, s * 1.2, 4, .6 * v)
        proj_tail(L, hx + s, OY, 260, 26, .5 * v)
    xs = env(t, .69, .71, .84, 1.0)
    if xs > 0:  # dấu chưởng in lên quái
        palm(L.body, IX + 10, IY + 25, 52, xs * (1 - sm(.75, 1, t)) + .2 * xs)
        for j in range(3):
            rr = 40 + j * 28 + 70 * sm(.69, 1, t)
            ring(L.body, IX, IY, rr, rr * .9, 3 - j * .6, xs * (1 - j / 3))
    burst(L, t, S, rays=40, size=1.1, frag=lambda L, x, y, s, k, a: diamond(L.body, x, y, s, k, a, 2))
    residue(L, t, S, rise=40)


# ===================== ĐAN: Dược Vọng — đan dược, ngọc diễm =====================
def pill(L, x, y, r, k, a):
    dot(L.soft, x, y, r * 1.6, .7 * k)
    dot(L.body, x, y, r, k)
    ring(L.core, x, y, r * 1.5, r * .5, 1.2, .8 * k, 0, 360)
    dot(L.core, x - r * .3, y - r * .3, r * .3, k)


def fx_dan(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for i in range(24):  # ngọc diễm xoáy
            a = t * 9 + i * TAU / 24
            r = 70 + 8 * math.sin(t * 50 + i)
            x, y = OX + math.cos(a) * r, OY + math.sin(a) * r * .7
            poly(L.body, rot_pts([(9, 0), (0, 3.5), (-4, 0), (0, -3.5)], x, y, a + math.pi / 2), .8 * f)
        for i in range(6):  # đan dược bay quanh
            a = -t * 7 + i * TAU / 6
            pill(L, OX + math.cos(a) * 44, OY + math.sin(a) * 36, 4, f, a)
        poly(L.dark, [(OX - 40, OY + 50), (OX + 40, OY + 50), (OX + 30, OY + 85), (OX - 30, OY + 85)], .5 * f)  # đỉnh lò
        ring(L.body, OX, OY + 50, 42, 8, 2, .7 * f)
    charge(L, t, size=1.2)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        r = lerp(10, 20, sm(.38, .5, t))
        for i in range(20):
            ln = 60 + S[i + 80][0] * 180
            dy = (S[i + 80][1] - .5) * r * 1.6
            streak(L.body, hx + r * .4, OY + dy * .6, hx + ln, OY + dy, r * .3, .4, .8 * v, 0, seg=6)
        pill(L, hx, OY, r, v, t * 30)
        for b in range(4):
            u = ((b / 4) + t * 3) % 1
            pill(L, hx + 60 + u * 200, OY + math.sin(b * 2 + t * 40) * 30, 4, v * (1 - u), 0)
    burst(L, t, S, rays=34, size=1.0, frag=lambda L, x, y, s, k, a: leaf(L.body, x, y, s * 1.3, a, k))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: pill(L, x, y, s * .9, k, a), rise=50)


# ===================== KHÍ: Thiên Công — pháp bảo, ấn vàng =====================
def seal(L, x, y, s, k, a=0):
    pts = rot_pts([(-s, -s), (s, -s), (s, s), (-s, s)], x, y, a)
    poly(L.dark, pts, .7 * k)
    line(L.body, pts + [pts[0]], max(1, s * .14), k)
    inner = rot_pts([(-s * .6, -s * .6), (s * .6, -s * .6), (s * .6, s * .6), (-s * .6, s * .6)], x, y, a)
    line(L.body, inner + [inner[0]], max(.8, s * .08), k)
    line(L.core, rot_pts([(-s * .3, 0), (s * .3, 0)], x, y, a), max(.8, s * .1), k)
    line(L.core, rot_pts([(0, -s * .3), (0, s * .3)], x, y, a), max(.8, s * .1), k)


def bell(L, x, y, s, k, a=0):
    pts = rot_pts([(-s * .5, -s), (s * .5, -s), (s, s), (-s, s)], x, y, a)
    poly(L.body, pts, k)
    dot(L.core, x, y + s * .4, s * .3, k)


def fx_khi(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for i in range(12):  # pháp bảo bay vòng: chuông, nhẫn, phi đao, ấn
            a = t * 7 + i * TAU / 12
            x, y = OX + math.cos(a) * 82, OY + math.sin(a) * 66
            kind = i % 4
            if kind == 0:
                bell(L, x, y, 7, f, a)
            elif kind == 1:
                ring(L.body, x, y, 8, 8, 2.2, f)
            elif kind == 2:
                draw_sword(L.core, L.body, x, y, 24, a + math.pi / 2, 1.6, f)
            else:
                seal(L, x, y, 6, f, a)
        rune_ring(L.body, OX, OY, 108, .4 * f, t * 3, 12)
    charge(L, t)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        s = lerp(14, 34, sm(.38, .55, t))
        for i in range(16):  # pháp bảo bay theo
            ph = (S[i + 80][0] + t * 2.5) % 1
            x = hx + 40 + ph * 320
            y = OY + (S[i + 80][1] - .5) * 140
            if i % 2:
                draw_sword(L.core, L.body, x, y, 22, math.pi, 1.5, v * (1 - ph))
            else:
                ring(L.body, x, y, 6, 6, 1.8, v * (1 - ph))
        proj_tail(L, hx + s, OY, 240, s * .8, .5 * v)
        seal(L, hx, OY, s, v, t * 25)  # đại ấn xoay
        dot(L.soft, hx, OY, s * 1.4, .6 * v)
    xs = env(t, .69, .71, .84, 1.0)
    if xs > 0:  # sóng vuông của đại ấn
        for j in range(3):
            s2 = 30 + j * 25 + 60 * sm(.69, 1, t)
            pts = [(IX - s2, IY - s2 * .8), (IX + s2, IY - s2 * .8), (IX + s2, IY + s2 * .8), (IX - s2, IY + s2 * .8)]
            line(L.body, pts + [pts[0]], 3 - j * .6, xs * (1 - j / 3))
    burst(L, t, S, rays=30, size=1.0, ring_k=.3, frag=lambda L, x, y, s, k, a: diamond(L.body, x, y, s, k, a, 2.5))
    residue(L, t, S, rise=20)


# ===================== TRẬN: Cửu Cung — bát quái trận đồ =====================
def bagua(L, x, y, r, k, a):
    o = ngon(x, y, r, 8, a)
    line(L.body, o + [o[0]], 2.4, k)
    o2 = ngon(x, y, r * .72, 8, a + math.pi / 8)
    line(L.soft, o2 + [o2[0]], 1.4, .8 * k)
    ring(L.body, x, y, r * .4, r * .4, 1.8, k)
    for i in range(8):  # quẻ: 3 vạch
        b = a + i * TAU / 8 + math.pi / 8
        for j in range(3):
            rr = r * (.52 + j * .1)
            cx, cy = x + math.cos(b) * rr, y + math.sin(b) * rr
            vx, vy = -math.sin(b), math.cos(b)
            ln = r * .12
            if (i >> j) & 1:
                line(L.core, [(cx - vx * ln, cy - vy * ln), (cx + vx * ln, cy + vy * ln)], 1.3, k)
            else:
                line(L.core, [(cx - vx * ln, cy - vy * ln), (cx - vx * ln * .25, cy - vy * ln * .25)], 1.3, k)
                line(L.core, [(cx + vx * ln * .25, cy + vy * ln * .25), (cx + vx * ln, cy + vy * ln)], 1.3, k)


def fx_tran(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .6, .7)
    if f > 0:
        bagua(L, OX, OY, 105 * sm(.04, .2, t) + 1, f, t * 3)
        ring(L.soft, OX, OY, 120, 120, 2, .4 * f)
    v = env(t, .44, .5, .7, .75)
    if v > 0:
        g = sm(.44, .62, t)
        bagua(L, IX, IY, 95 * g + 1, v, -t * 4)  # trận đồ thứ hai thành hình trên quái
        for i in range(8):  # tia nối hai trận
            b = t * 3 + i * TAU / 8
            sx, sy = OX + math.cos(b) * 100, OY + math.sin(b) * 100
            ex, ey = IX + math.cos(-t * 4 + i * TAU / 8) * 90 * g, IY + math.sin(-t * 4 + i * TAU / 8) * 90 * g
            u = sm(.46 + i * .01, .62, t)
            streak(L.body, lerp(sx, ex, u), lerp(sy, ey, u), sx, sy, 1.6, .6, .8 * v, .2 * v, seg=6)
    xp = env(t, .69, .71, .84, 1.0)
    if xp > 0:  # cột sáng từ 8 góc trận
        for i in range(8):
            b = -t * 4 + i * TAU / 8
            px = IX + math.cos(b) * 90
            streak(L.body, px, IY + math.sin(b) * 90, px, -10, 5, 2, xp * .9, 0, seg=6)
    burst(L, t, S, rays=24, size=.9, ring_k=.5, frag=lambda L, x, y, s, k, a: diamond(L.body, x, y, s, k, a, 2))
    residue(L, t, S, rise=20)


# ===================== THÚ: Vạn Thú — linh hổ vồ, móng vuốt =====================
def claw3(L, x, y, s, k):
    for i in range(3):
        crescent(L.body, x + i * s * .25, y + (i - 1) * s * .35, s, s * .12, k, 150, 230, 10)
        crescent(L.core, x + i * s * .25, y + (i - 1) * s * .35, s * .98, s * .04, k, 155, 225, 10)


def beast_head(L, x, y, s, k):
    """đầu linh hổ nhìn sang trái: mõm nhọn, 2 tai, mắt sáng"""
    pts = [(x - s * 1.3, y + s * .1), (x - s * .6, y - s * .55), (x - s * .1, y - s * .75), (x + s * .15, y - s * 1.25), (x + s * .45, y - s * .7),
           (x + s * .9, y - s * .8), (x + s * .8, y - s * .2), (x + s * 1.1, y + s * .4), (x + s * .3, y + s * .7), (x - s * .7, y + s * .55)]
    poly(L.body, pts, k)
    poly(L.dark, [(x - s * .9, y + s * .15), (x - s * .2, y + s * .05), (x - s * .5, y + s * .45)], .7 * k)
    dot(L.core, x - s * .35, y - s * .3, s * .12, k)


def fx_thu(L, t, S):
    spiral_in(L, t, S, n=70)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for i in range(20):  # linh khí thú xoáy
            a = t * 8 + i * TAU / 20
            r = 75 + 12 * math.sin(t * 40 + i)
            x, y = OX + math.cos(a) * r, OY + math.sin(a) * r * .8
            streak(L.soft, x, y, x - math.sin(a) * 26, y + math.cos(a) * 22, 3, .3, .8 * f, 0, seg=4)
        beast_head(L, OX, OY - 4, 30 * sm(.08, .3, t) + 1, .45 * f)  # hư ảnh đầu thú
    charge(L, t, k=.8)
    v = env(t, .38, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        s = lerp(24, 42, sm(.38, .55, t))
        for i in range(14):  # bờm lửa kéo dài
            dy = (S[i + 80][0] - .5) * s * 1.6
            streak(L.body, hx + s * .6, OY + dy * .6, hx + s + 100 + S[i + 80][1] * 160, OY + dy + math.sin(t * 50 + i) * 8, s * .18, .3, .8 * v, 0, seg=6)
        beast_head(L, hx, OY, s, v)
        dot(L.soft, hx, OY, s * 1.4, .5 * v)
    xs = env(t, .69, .7, .8, .9)
    if xs > 0:  # ba vết vuốt xé ngang quái
        claw3(L, IX + 30, IY, 70 * sm(.69, .73, t) + 5, xs)
    burst(L, t, S, rays=26, size=.9, frag=lambda L, x, y, s, k, a: diamond(L.body, x, y, s, k, a, 2.6))
    residue(L, t, S, rise=30)


# ===================== ÂM: Thiên Âm — sóng âm, nốt nhạc =====================
def fx_am(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for j in range(5):  # gợn sóng âm lan ra liên tục
            u = (j / 5 + t * 3) % 1
            rr = 20 + u * 100
            ring(L.body, OX, OY, rr, rr * .9, 2, f * (1 - u))
        for i in range(10):
            a = t * 6 + i * TAU / 10
            note(L.body, OX + math.cos(a) * 90, OY + math.sin(a) * 75, 3.5, f)
        # dây đàn
        for j in range(5):
            line(L.soft, [(OX - 60, OY - 30 + j * 15), (OX + 60, OY - 30 + j * 15 + math.sin(t * 200 + j) * 3)], 1, .6 * f)
    charge(L, t)
    for b in range(5):  # sóng âm lưỡi liềm nở to dần khi bay
        t0 = .44 + b * .03
        v = env(t, t0, t0 + .03, HIT_T, HIT_T + .03)
        if v > 0:
            x, p = travel(t, t0=t0, t1=HIT_T, ease=1.1)
            s = 20 + 60 * p
            crescent(L.body, x + s, OY, s, 5, v, 120, 240)
            crescent(L.soft, x + s + 6, OY, s + 6, 10, .6 * v, 120, 240)
    v = env(t, .44, .5, .69, .72)
    if v > 0:
        for i in range(16):
            ph = (S[i + 80][0] + t * 2) % 1
            note(L.body, lerp(OX - 40, IX + 30, ph), OY + (S[i + 80][1] - .5) * 130 + math.sin(t * 40 + i) * 8, 3, v * math.sin(ph * math.pi))
    xs = env(t, .69, .71, .86, 1.0)
    if xs > 0:
        for j in range(6):
            u = (j / 6 + t * 2.5) % 1
            rr = 20 + u * 140
            ring(L.body, IX, IY, rr, rr * .9, 2.4, xs * (1 - u))
    burst(L, t, S, rays=20, size=.8, ring_k=.4, frag=lambda L, x, y, s, k, a: note(L.body, x, y, s * 1.2, k))
    residue(L, t, S, fn=lambda L, x, y, s, k, a: note(L.body, x, y, s * 1.4, k), rise=50)


# ===================== CỔ: Vạn Cổ — bầy cổ trùng =====================
def bug(L, x, y, s, k, a, flap):
    ell(L.dark, x, y, s * 1.2, s * .7, .8 * k)
    dot(L.body, x - math.cos(a) * s * .8, y - math.sin(a) * s * .8, s * .45, k)
    w = s * (.6 + .5 * abs(flap))
    dot(L.soft, x - math.sin(a) * w, y + math.cos(a) * w, s * .6, .8 * k)
    dot(L.soft, x + math.sin(a) * w, y - math.cos(a) * w, s * .6, .8 * k)


def fx_co(L, t, S):
    f = env(t, 0, .15, .55, .64)
    if f > 0:
        for i in range(8):
            a = t * 2 + i * TAU / 8
            ell(L.dark, OX + math.cos(a) * 45, OY + math.sin(a) * 35, 26, 20, .3 * f)
        for i in range(60):  # bầy cổ trùng bay vòng
            a = t * (8 + S[i][0] * 6) + S[i][1] * TAU
            r = 40 + S[i][2] * 70
            x, y = OX + math.cos(a) * r, OY + math.sin(a) * r * .75
            bug(L, x, y, 2.2, f, a + math.pi / 2, math.sin(t * 300 + i))
        rune_ring(L.body, OX, OY, 105, .3 * f, -t * 3, 9)
    charge(L, t, k=.8)
    v = env(t, .42, .48, .7, .74)
    if v > 0:  # dòng trùng uốn lượn lao sang trái
        hx, p = travel(t, t1=HIT_T + .01, ease=1.3)
        for i in range(110):
            u = S[i + 100][0]
            x = hx + u * 380
            y = OY + math.sin(u * 10 - t * 50) * 22 * u + (S[i + 100][1] - .5) * 36
            bug(L, x, y, 2 + (1 - u) * 1.5, v * (1 - u * .6), math.pi, math.sin(t * 300 + i))
        dot(L.soft, hx, OY, 22, .7 * v)
    xs = env(t, .69, .72, .86, 1.0)
    if xs > 0:  # trùng vây quanh quái
        for i in range(70):
            a = t * 14 + S[i + 220][0] * TAU
            r = 30 + S[i + 220][1] * 60 + 30 * sm(.69, 1, t)
            bug(L, IX + math.cos(a) * r, IY + math.sin(a) * r * .8, 2.2, xs, a + math.pi / 2, math.sin(t * 300 + i))
    burst(L, t, S, rays=22, size=.9, ring_k=.5, frag=lambda L, x, y, s, k, a: dot(L.body, x, y, s, k))
    residue(L, t, S, rise=30)


# ===================== NHO: Hạo Nhiên — bút mực, hạo nhiên chính khí =====================
def fx_nho(L, t, S):
    spiral_in(L, t, S, n=70)
    f = env(t, .04, .18, .55, .64)
    if f > 0:
        g = sm(.04, .3, t)  # nét viên tướng (vòng mực) vẽ dần
        n = int(48 * g)
        pts = [(OX + math.cos(-math.pi / 2 + i / 48 * TAU * .92) * 85, OY + math.sin(-math.pi / 2 + i / 48 * TAU * .92) * 80) for i in range(n + 1)]
        if len(pts) > 1:
            for i in range(len(pts) - 1):
                w = 6 + 4 * math.sin(i / 48 * math.pi)
                line(L.dark, pts[i:i + 2], w, .95 * f)
            line(L.body, pts, 1.6, .9 * f)
        for i in range(6):  # thẻ tre phát sáng
            a = t * 4 + i * TAU / 6
            x, y = OX + math.cos(a) * 55, OY + math.sin(a) * 50
            poly(L.body, rot_pts([(-3, -11), (3, -11), (3, 11), (-3, 11)], x, y, math.sin(t * 20 + i) * .3), .8 * f)
    charge(L, t, size=1.1)
    v = env(t, .42, .48, .69, .73)
    if v > 0:  # nét bút mực khổng lồ quét sang trái
        hx, p = travel(t, ease=1.2)
        n = 30
        pts = [(lerp(hx, OX - 20, i / n), OY + math.sin(i / n * 4 + 1) * 18) for i in range(n + 1)]
        for i in range(n):
            u = i / n
            w = 22 * math.sin(math.pi * (.15 + .85 * u)) + 4
            line(L.dark, pts[i:i + 2], w, .95 * v)
            line(L.soft, pts[i:i + 2], w + 10, .7 * v)
        line(L.body, pts, 2, v)
        dot(L.core, hx, OY + math.sin(1) * 18, 5, v)
        for i in range(20):  # giọt mực văng
            d = S[i + 80][0] * 240
            ell(L.dark, hx + d, OY + (S[i + 80][1] - .5) * 90, 2 + S[i + 80][2] * 3, 2 + S[i + 80][2] * 2, .8 * v)
    xs = env(t, .69, .72, .84, 1.0)
    if xs > 0:  # mực bắn + kim quang chính khí
        g = sm(.69, .8, t)
        for i in range(14):
            a = S[i + 200][0] * TAU
            r = (30 + S[i + 200][1] * 70) * g
            ell(L.dark, IX + math.cos(a) * r, IY + math.sin(a) * r * .8, 6 + S[i + 200][2] * 8, 5 + S[i + 200][2] * 6, .85 * xs)
    burst(L, t, S, rays=36, size=1.0, frag=lambda L, x, y, s, k, a: poly(L.body, rot_pts([(-1.5, -5), (1.5, -5), (1.5, 5), (-1.5, 5)], x, y, a, s * .5), k))
    residue(L, t, S, rise=50)


# ===================== HÓA: Vạn Hóa — hồ điệp ảo ảnh, gương vỡ =====================
def mirror(L, x, y, s, k, a):
    pts = rot_pts([(-s, -s * 1.4), (s * .8, -s), (s, s * 1.2), (-s * .7, s)], x, y, a)
    poly(L.soft, pts, .5 * k)
    line(L.body, pts + [pts[0]], 1.2, k)
    line(L.core, [pts[0], pts[2]], .8, .7 * k)


def fx_hoa2(L, t, S):
    spiral_in(L, t, S, n=60)
    f = env(t, .04, .2, .55, .64)
    if f > 0:
        for i in range(14):  # hồ điệp bay vòng
            a = t * 7 + i * TAU / 14
            r = 60 + 25 * math.sin(i * 1.7)
            butterfly(L.body, OX + math.cos(a) * r, OY + math.sin(a) * r * .8 + math.sin(t * 80 + i) * 4, 5, math.sin(t * 260 + i), f, a + math.pi / 2)
        for i in range(6):  # mảnh gương lơ lửng
            a = -t * 4 + i * TAU / 6
            mirror(L, OX + math.cos(a) * 105, OY + math.sin(a) * 85, 8, .8 * f, a)
    charge(L, t)
    v = env(t, .4, .48, .69, .72)
    if v > 0:
        hx, p = travel(t)
        for j in range(4):  # ảo ảnh lưỡi liềm nhân bản
            kk = v * (1 - j / 4)
            crescent(L.body, hx + 40 + j * 50, OY + (j % 2) * 10 - 5, 46, 10, kk, 120, 240)
        crescent(L.core, hx + 40, OY - 5, 44, 3, v, 125, 235)
        for i in range(24):
            ph = (S[i + 80][0] + t * 2.2) % 1
            butterfly(L.body, hx + 20 + ph * 330, OY + (S[i + 80][1] - .5) * 140, 4 + S[i + 80][2] * 2, math.sin(t * 300 + i), v * (1 - ph * .7), math.pi / 2)
    xs = env(t, .69, .71, .84, 1.0)
    if xs > 0:  # gương vỡ toả ra
        g = sm(.69, 1, t)
        for i in range(16):
            a = S[i + 200][0] * TAU
            r = 20 + g * (60 + S[i + 200][1] * 70)
            mirror(L, IX + math.cos(a) * r, IY + math.sin(a) * r * .85, 7 + S[i + 200][2] * 5, xs, a + g * 4)
    burst(L, t, S, rays=26, size=.9, ring_k=.5)
    residue(L, t, S, fn=lambda L, x, y, s, k, a: butterfly(L.body, x, y, s * 2, math.sin(t * 300 + a * 10), k, a), rise=60)


CHARS = [k for k in PAL]


def render(cid, t):
    L = L4()
    globals()['fx_' + cid](L, t, Seeds(sum(map(ord, cid))))
    return compose(L, PAL[cid])


def _job(a):
    cid, i, t = a
    return i, render(cid, t)


def build(cid, n=N, cols=COLS, pool=None):
    rows = (n + cols - 1) // cols
    ts = [.02 + .96 * i / (n - 1) for i in range(n)] if n != 6 else [.14, .3, .44, .58, .72, .9]
    jobs = [(cid, i, t) for i, t in enumerate(ts)]
    res = pool.map(_job, jobs) if pool else map(_job, jobs)
    sheet = Image.new('RGBA', (CW * cols, CH * rows), (0, 0, 0, 0))
    for i, im in res:
        sheet.paste(im, ((i % cols) * CW, (i // cols) * CH))
    os.makedirs(FX_DIR, exist_ok=True)
    if n == 6:
        out = os.path.join(FX_DIR, cid + '-6.png')
        sheet.save(out, optimize=True)
    else:
        out = os.path.join(FX_DIR, cid + '.webp')
        sheet.save(out, quality=80, method=6)
    print('saved', out, sheet.size, flush=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    n = N
    if args[:1] == ['--n']:
        n = int(args[1]); args = args[2:]
    ids = args or CHARS
    with Pool() as pool:
        for cid in ids:
            if n == 6:
                build(cid, 6, 6, pool)
            else:
                build(cid, n, COLS, pool)
