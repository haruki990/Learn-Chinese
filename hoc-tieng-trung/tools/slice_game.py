"""Cắt vukhi.png, boss.png, gamestype.png thành icon vật phẩm và quái, nhúng vào game-data.js.
Chạy: python tools/slice_game.py   (ảnh nguồn nằm ở thư mục cha của hoc-tieng-trung)"""
import base64, io, json, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT.parent
OUT = ROOT / "game"; OUT.mkdir(exist_ok=True)

def enc(im, w, q=84):
    im = im.convert("RGB"); h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=q)
    return "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()

data = {}
# --- vũ khí: 8 phẩm x 6 loại ---
v = Image.open(SRC / "vukhi.png")
XC = [(198, 410), (421, 633), (646, 857), (870, 1081), (1094, 1306), (1319, 1531)]
YR = [(56, 172), (180, 295), (302, 418), (425, 541), (549, 665), (672, 788), (793, 889), (895, 983)]
TYPES = ["kiem", "dao", "thuong", "truong", "cung", "phien"]
for t, (y0, y1) in enumerate(YR, 1):
    for k, (x0, x1) in enumerate(XC):
        data[f"w_{t}_{TYPES[k]}"] = enc(v.crop((x0, y0, x1, y1)), 150)
# --- quái Sơn Hải ---
b = Image.open(SRC / "boss.png")
BX = [(44, 344), (366, 677), (699, 1010), (1032, 1333)]
BY = [(122, 267), (277, 425), (437, 585), (597, 745)]
MON = ["thaothiet", "cungky", "daongot", "hondon", "cuuvihồ", "bachtrach", "phuchu", "chuyem",
       "tuonglieu", "quynguu", "biphuong", "anhchieu", "unglong", "chuclong", "thanhlong", "phuonghoang"]
MON[4] = "cuuviho"
for i, mid in enumerate(MON):
    x0, x1 = BX[i % 4]; y0, y1 = BY[i // 4]
    card = b.crop((x0, y0, x1, y1))
    data[f"m_{mid}_card"] = enc(card, 300)
    data[f"m_{mid}_art"] = enc(card.crop((0, 0, card.width, card.height - 30)), 300)
# --- icon trang bị khác (gamestype.png) ---
g = Image.open(SRC / "gamestype.png")
def sq(cx, cy, half=44): return g.crop((cx - half, cy - half, cx + half, cy + half))
TREAS = [("baothap", 72), ("holo", 164), ("linhchung", 254), ("kinh", 354), ("phikiem", 444), ("sonha", 530), ("tranyeu", 622), ("dinhhon", 712)]
for tid, cx in TREAS: data[f"t_{tid}"] = enc(sq(cx, 915), 96)
data["s_pendant"] = enc(sq(805, 915), 96); data["s_ring"] = enc(sq(890, 915), 96)
data["s_talisman"] = enc(sq(968, 915), 96); data["s_armor"] = enc(sq(1117, 466, 38), 96)
(ROOT / "game-data.js").write_text("window.GIMG=" + json.dumps(data) + ";", encoding="utf-8")
# ảnh xem trước để kiểm tra khung cắt
for k, im in list(data.items()):
    pass
print(len(data), "ảnh")
