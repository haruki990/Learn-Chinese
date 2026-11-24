"""Cắt sprite sheet chibi_character_i.png thành từng nhân vật.
Chạy: python tools/slice_avatars.py [đường_dẫn_ảnh]
Tạo: avatars/<id>_card.webp (cả thẻ), avatars/<id>_bust.webp (ảnh đầu-vai vuông)
và avatars-data.js (nhúng base64 để app chạy được cả khi mở bằng file://)."""
import base64, json, pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "chibi_character_i.png"
OUT = ROOT / "avatars"; OUT.mkdir(exist_ok=True)

COLS = [(5, 270), (276, 521), (527, 766), (773, 1014), (1020, 1272), (1278, 1528)]
ROWS = [(4, 301), (307, 567), (573, 797), (801, 1021)]
# (id, tên môn phái, hệ, kỹ năng, hàng, cột)
CHARS = [
 ("kiem",   "Vạn Kiếm Tông",       "Kiếm Tu",        "Kiếm khí · Sát phạt",        0, 1),
 ("hoa",    "Viêm Dương Tông",     "Pháp Tu - Hỏa",  "Hỏa công · Bùng nổ",         0, 2),
 ("thuy",   "Huyền Thủy Cung",     "Pháp Tu - Thủy", "Khống chế · Hồi phục",       0, 3),
 ("moc",    "Thanh Mộc Tông",      "Mộc Tu",         "Hồi phục · Sinh tồn",        0, 4),
 ("dia",    "Đại Địa Tông",        "Thể Tu",         "Phòng thủ · Chống chịu",     0, 5),
 ("loi",    "Tử Tiêu Tông",        "Lôi Tu",         "Tốc độ · Sát thương",        1, 0),
 ("bang",   "Thiên Sơn Băng Cung", "Băng Tu",        "Đóng băng · Khống chế",      1, 1),
 ("phong",  "Phiêu Miểu Phong",    "Phong Tu",       "Tốc độ · Né tránh",          1, 2),
 ("hon",    "U Minh Điện",         "Hồn Tu",         "Ám sát · Hút sinh lực",      1, 3),
 ("quang",  "Thánh Quang Tông",    "Hỗ trợ",         "Hồi phục · Thanh tẩy",       1, 4),
 ("doc",    "Vạn Độc Cốc",         "Độc Tu",         "Độc tố · Suy yếu",           1, 5),
 ("khong",  "Hư Không Điện",       "Không Gian Tu",  "Dịch chuyển · Biến đổi",     2, 0),
 ("thoi",   "Tuế Nguyệt Cung",     "Thời Gian Tu",   "Điều khiển thời gian",       2, 1),
 ("kimcuong","Kim Cương Tông",     "Thể Tu",         "Bất hoại · Phòng thủ",       2, 2),
 ("dan",    "Dược Vọng Cốc",       "Đan Tu",         "Luyện đan · Dược đạo",       2, 3),
 ("khi",    "Thiên Công Các",      "Khí Tu",         "Luyện khí · Pháp bảo",       2, 4),
 ("tran",   "Cửu Cung Trận Tông",  "Trận Tu",        "Trận pháp · Khống chế",      2, 5),
 ("thu",    "Vạn Thú Sơn",         "Ngự Thú",        "Triệu hồi · Điều khiển",     3, 0),
 ("am",     "Thiên Âm Các",        "Âm Tu",          "Âm công · Khống chế",        3, 1),
 ("co",     "Vạn Cổ Môn",          "Cổ Tu",          "Độc thuật · Triệu hồi",      3, 2),
 ("nho",    "Hạo Nhiên Thư Viện",  "Nho Tu",         "Văn đạo · Hỗ trợ",           3, 3),
 ("hoa2",   "Vạn Hóa Môn",         "Hóa Tu",         "Biến hóa · Ẩn thân",         3, 4),
]
# phần tranh nhân vật tính theo (đầu, cuối) tương đối trong thẻ của từng hàng, để bỏ băng tên và nhãn
ART = {0: (62, 266), 1: (52, 232), 2: (50, 196), 3: (58, 190)}

im = Image.open(SRC).convert("RGB")
data, meta = {}, []
for cid, name, kind, skill, r, c in CHARS:
    x0, x1 = COLS[c]; y0, y1 = ROWS[r]
    card = im.crop((x0, y0, x1, y1))
    a0, a1 = ART[r]
    art = im.crop((x0 + 6, y0 + a0, x1 - 6, y0 + a1))
    cx, w = art.width // 2, min(art.width, 150)
    side = min(art.height - 6, 150)
    bust = art.crop((cx - side // 2, 4, cx - side // 2 + side, 4 + side)).resize((128, 128), Image.LANCZOS)
    card.save(OUT / f"{cid}_card.webp", quality=88)
    bust.save(OUT / f"{cid}_bust.webp", quality=88)
    for kind_, img in (("card", card), ("bust", bust)):
        pass
    def b64(p): return "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
    data[cid] = {"card": b64(OUT / f"{cid}_card.webp"), "bust": b64(OUT / f"{cid}_bust.webp")}
    meta.append({"id": cid, "name": name, "kind": kind, "skill": skill})
(ROOT / "avatars-data.js").write_text("window.AVATARS=" + json.dumps(data) + ";window.AVATAR_META=" + json.dumps(meta, ensure_ascii=False) + ";", encoding="utf-8")
print(len(meta), "nhân vật")

