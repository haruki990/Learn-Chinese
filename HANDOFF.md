# HANDOFF: App "Học tiếng Trung" (HSK1–3 + RPG tu tiên)

> Dành cho một cuộc trò chuyện mới với Claude. Đọc hết file này trước khi sửa code. Người dùng nói **tiếng Việt**, giao diện app cũng **tiếng Việt**. Hãy trả lời bằng tiếng Việt, ngắn gọn, nói rõ cái gì đã kiểm tra được và cái gì chưa.

## 1. Đây là gì
Ứng dụng web **chạy cục bộ trên máy** (HTML + JavaScript thuần, **không build, không server, không tài khoản**) để học tiếng Trung HSK1–5, kèm hệ thống nhập vai **tu tiên** để tạo động lực: học → nhận tu vi + linh thạch → lên cảnh giới → nhặt/cường hóa trang bị → đánh boss Sơn Hải Kinh bằng cách trả lời câu hỏi. Dữ liệu lưu trong `localStorage` của trình duyệt.

Ưu tiên của người dùng: việc học là chính, game chỉ là lớp tạo động lực; app nhẹ, dễ hiểu; mọi con số cân bằng phải chỉnh được.

## 2. Cấu trúc thư mục
```
Claude_code/                      (gốc dự án)
├─ HANDOFF.md                     (file này)
├─ chibi_character_i.png          ảnh gốc: sprite sheet 22 nhân vật chibi (người dùng tự tạo)
├─ vukhi.png                      ảnh gốc: 8 phẩm x 6 loại vũ khí
├─ boss.png                       ảnh gốc: 16 thần thú Sơn Hải
├─ gamestype.png                  ảnh gốc: hệ thống cảnh giới/trang bị/pháp bảo
├─ .claude/launch.json            cấu hình để khung trình duyệt của Claude chạy server (port 8765)
└─ hoc-tieng-trung/               <<< ứng dụng
   ├─ index.html                  CSS + toàn bộ logic "lõi" (học, SRS, cảnh giới, shop, thưởng...)
   ├─ rpg.js                      hệ thống RPG: trang bị, drop, boss, hệ tương khắc, độ kiếp, lưu nhân vật...
   ├─ ult-video/                  video chiêu cuối (hiện có kim, hoa, thuy; .webm + .mp4)
   ├─ ult-fx.js                   chiêu cuối 14 hệ: hiệu ứng vẽ bằng canvas (GULT, gUltRender, gUltPlay, vUltGallery)
   ├─ rpg-data.js                 dữ liệu: GBOSS (16 quái + truyện), GRAM (43 câu ngữ pháp)
   ├─ audio-data.js   (SINH RA)   977 mp3 base64: window.AUDIO[id]
   ├─ avatars-data.js (SINH RA)   22 nhân vật base64: window.AVATARS, window.AVATAR_META
   ├─ game-data.js    (SINH RA)   92 ảnh (vũ khí/quái/icon) base64: window.GIMG
   ├─ audio/*.mp3, avatars/*.webp ảnh/âm thanh nguồn từng file (để xem/dùng lại)
   ├─ start.bat                   chạy server Python rồi mở http://127.0.0.1:8765
   └─ tools/
      ├─ gen_audio.py             tạo mp3 từ SEED bằng edge-tts (cần internet + pip install edge-tts)
      ├─ slice_avatars.py         cắt chibi_character_i.png -> avatars/ + avatars-data.js
      └─ slice_game.py            cắt vukhi/boss/gamestype -> game-data.js
```
Các script đọc ảnh từ **thư mục cha của hoc-tieng-trung**, nên giữ 4 file PNG cạnh thư mục đó.

## 3. Cách chạy
- **Cách đơn giản nhất:** nhấp đúp `hoc-tieng-trung/index.html` (mở bằng Chrome/Edge, kiểu `file://`). Hoặc chạy `start.bat` (cần Python) để mở `http://127.0.0.1:8765`.
- **Cảnh báo:** `localStorage` tách theo "origin". Mở bằng `file://` và bằng `localhost:8765` là **hai nơi lưu khác nhau**. Dùng nút Xuất/Nhập sao lưu (tab Từ vựng) để chuyển tiến độ.
- **Khung trình duyệt trong Claude Code (desktop):** mở file local dạng `file://` chỉ là *bản chụp tĩnh* (`data:`), **không tải được các file script đi kèm** nên app trống/lỗi (app có hiện thông báo hướng dẫn). Để kiểm thử, chạy server rồi `navigate` tới `http://127.0.0.1:8765/index.html`:
  ```
  python -m http.server 8765 --bind 127.0.0.1   (chạy trong thư mục hoc-tieng-trung)
  ```
  Khi sửa file rồi tải lại bị dính cache cũ, dùng `fetch('rpg.js',{cache:'reload'})` cho từng file rồi `location.reload()`.

## 4. Kiến trúc và thứ tự nạp script (rất quan trọng)
Thứ tự trong `index.html`: `audio-data.js` → `avatars-data.js` → `game-data.js` → `rpg-data.js` → `rpg.js` → `ult-fx.js` → script báo lỗi nếu thiếu file → **script chính inline** (cuối file).
- Tất cả là *classic script* dùng chung phạm vi toàn cục: `const/let/function` trong `rpg.js` và script chính **không được trùng tên**. Mọi thứ của RPG dùng tiền tố `g...`/`G...`/`rpg...`/`slot...`.
- `rpg.js` chỉ định nghĩa hằng và hàm; nó gọi các hàm của script chính (`S, view, go, esc, shuffle, pick, toast, addXP, header, realmInfo, REALMS, REND, FLAT, lw, lessonsOf, passed, lkey, runQuiz, bustImg, charImg, itemOf...`) **lúc chạy**, không phải lúc nạp.
- Script chính cuối cùng chạy: `rpgInit(); applyFreeze(); render();`
- `render()` gọi `gLeave()` trước (rời trang khi đang đánh quái = kết thúc trận, nhận thưởng phần đã đánh), rồi `view.onclick = null`, rồi gọi hàm màn hình theo `tab`.
- Giao diện: một `<div id="view">` được viết lại bằng `innerHTML`; sự kiện dùng `view.onclick` (event delegation) hoặc gán `.onclick` sau khi render.
- Tab: `home` (Học), `review` (Ôn tập SRS), `practice` (Luyện tập), `hero` (Tu tiên), `fight` (Chiến đấu), `reward` (Thưởng), `words` (Từ vựng).
- `vHero()` (trong rpg.js) là bộ định tuyến 3 tab con (Nhân vật / Trang bị / Tiên Phủ); phần "Nhân vật" gọi `vHeroChar()` ở index.html (thẻ nhân vật + Phường thị mỹ phẩm) rồi chèn thêm bảng chỉ số và nút.

## 5. Dữ liệu trong localStorage
Khóa `zh_app_v1` = đối tượng trạng thái `S` (nhân vật đang chơi). Khóa `zh_app_slots` = `{slots:{id:{created,t,sum,data}}}` các nhân vật đã lưu (bản chụp JSON của `S`).
Các trường chính của `S`:
- Học: `words[]` ({id,h,p,m,l}), `cards{id:{ease,interval,reps,due}}`, `lessons{"L-k":điểm}`, `perfect{}`, `log{ngày:số câu}`, `level` (1–3), `deleted[]`.
- Tiến trình: `xp`, `xpDay/xpToday` (trần ngày), `bt{ri:true}` (đã độ kiếp), `btv`(=2), `tribNext`, `ls` (linh thạch), `cores` (Yêu Đan), `bestStreak`, `opened[]` (rương đã mở), `frozen{}`, `freezes`.
- Nhân vật: `hero{name,char}`, `inv{}` (đồ trang trí đã mua), `equip{pet,aura,frame,title}`, `slotId`.
- Trang bị RPG: `bag[]` (món: uid,slot,kind,tier,name,st{},lvl,fx,src), `eq{slot:uid}`, `combo`, `dropsDay/dropsToday`, `pracDay/pracN`, `pillDay/pillN`.
- Boss: `week{k,boss,ri,max,hp,atk,def,dmg,battles,claimed[],dead}`, `hist[]`, `beast[]` (truyện thú đã mở), `nextBattle`, `cdPills`, `shop{d,sold[]}`, `rpgStarter`.
- Cờ: `window.__noSave` chặn `save()` khi đang chuyển nhân vật/nhập sao lưu (tránh `pagehide` ghi đè).

## 6. Từ vựng và bài học
- `SEED` trong `index.html`: **977 từ** `汉字|pinyin|nghĩa tiếng Việt`, chia cấp bằng dòng `#N` (`#2`, `#3`, và các khối `#1/#2/#3` thêm sau). HSK1 408, HSK2 312, HSK3 257, HSK4 485, HSK5 826 (tổng 2.288; HSK4–5 thêm ngày 2026-11-20, gồm cả từ đời sống, mạng xã hội, tiếng lóng, phim cổ trang/cung đấu và tu tiên, không bám giáo trình). Có cả từ đời sống và từ tu tiên (sư phụ, linh khí, độ kiếp...).
- **Id từ = `s0, s1, ...` theo thứ tự dòng từ (bỏ dòng `#`). KHÔNG chèn từ vào giữa, chỉ THÊM CUỐI** (bằng khối `#N` mới), nếu không sẽ làm lệch tiến độ, âm thanh và thẻ ôn tập đã lưu.
- Bài học = 10 từ liền nhau của cùng cấp (`lessonsOf`): HSK1 41 bài, HSK2 32, HSK3 26, HSK4 49, HSK5 83. Qua bài cần đúng ≥ 80%.
- Sau khi thêm từ: chạy `python tools/gen_audio.py` (bỏ qua mp3 đã có) rồi chạy `python tools/build_audio_data.py` để dựng lại `audio-data.js` (gom `audio/*.mp3` thành `window.AUDIO={id:"data:audio/mpeg;base64,..."}`; xem lịch sử, lệnh dạng `python -c "import base64,glob,os,json; ..."`). `gen_audio.py` gửi chữ Hán tới dịch vụ đọc của Microsoft (người dùng đã đồng ý cho việc này).
- Giọng đọc: `edge-tts`, `zh-CN-XiaoxiaoNeural`, tốc độ -10%. Từ người dùng tự thêm không có mp3, dùng giọng trình duyệt (máy chỉ có giọng Anh nên có thể im lặng).
- Ôn tập: SM-2 rút gọn (4 mức Lại/Khó/Tốt/Dễ). Thẻ chỉ được tạo khi qua bài.

## 7. Luật chơi và các con số (đều nằm ở đầu `rpg.js` trong `GCFG`/`LSM`, hoặc `index.html`)
**Tu vi và cảnh giới**
- 9 cảnh giới × 9 tầng: Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Luyện Hư, Hợp Thể, Đại Thừa, Độ Kiếp (rồi Phi Thăng).
- `GCFG.xpDayCap = 700` tu vi/ngày (mọi nguồn), `daysPerRealm = 7` ⇒ mỗi cảnh giới **4.905 tu vi** (545/tầng). Tức **một cảnh giới = một tuần học đều** (đây là cách hiểu "cấp" = cảnh giới; nếu người dùng muốn "cấp" = tầng thì phải đổi công thức).
- Nguồn tu vi: câu đúng +10; qua bài lần đầu +20; hoàn hảo lần đầu +30 (lần sau +10); luyện tập tự do chỉ tính thưởng cho 100 câu/ngày (`practiceCap`).
- Đan dược: +30/+100/+250 tu vi, tính vào trần ngày, chỉ dùng sau khi đạt mục tiêu ngày (10 câu), tối đa 3 viên/ngày.
- **Độ kiếp (bắt buộc ở tầng 9 mới sang cảnh giới sau):** mỗi cảnh giới gắn một HSK: `RLV=[1,1,2,2,3,3,4,4,5]`. Cảnh giới đầu của mỗi HSK thi "nửa đầu bài", cảnh giới sau thi "toàn bộ bài". Điều kiện: qua đủ các bài trong phạm vi. Bài test 20 câu (70% từ vựng + 30% ngữ pháp, **ẩn pinyin**), đúng ≥ 80%; trượt phải chờ 10 phút. HSK4–5 đã có nội dung (`GHSK_AVAIL=[1..5]`); cảnh giới cuối Độ Kiếp thi toàn bộ 83 bài HSK5.
- Linh thạch nhân hệ số cảnh giới `LSM=[1,1.4,2,2.6,3.4,4.4,5.6,7,9]` (hàm `lsGain`). Nguồn: câu đúng +1, qua bài +10, hoàn hảo lần đầu +25, mục tiêu ngày +10, rương +20, boss/mốc, độ kiếp.
- Chuỗi ngày: mục tiêu ngày 10 câu; mốc rương `[1,2,3,5,7,10,14,21,30,50]` (mỗi rương: truyện + linh thạch + 1 trang bị); Hộ Chuỗi Phù tự giữ chuỗi nếu lỡ 1 ngày.

**Trang bị (rpg.js)**
- 6 ô (Vũ khí, Pháp bảo, Trang bị, Hộ tâm, Giới chỉ, Linh phù), 8 phẩm (Phàm Khí → Hỗn Độn Chí Bảo). Chỉ số HP/ATK/DEF/CRIT/SPD/HIT + Vận/EXP%. Cường hóa +0..+10 (+4 thêm 5%, +7 hiệu ứng, +10 thức tỉnh), tốn 💎 và Yêu Đan. Mặc được khi đủ cảnh giới (`GT[].minRealm`).
- **Phẩm đồ rơi theo nguồn** (`gRollTier`): combo/luyện tập chỉ ra phẩm hợp cảnh giới (T) hoặc T−1; quái tuần mốc 75%/100% và độ kiếp và rương chuỗi ≥7/≥21 ngày mới ra cao hơn. Combo: cứ 10 câu đúng liên tiếp rơi 1 món (tối đa 6 món/ngày). Sai 1 câu reset combo.
- Icon: vũ khí cắt từ `vukhi.png` theo (phẩm, loại); pháp bảo/ngọc/giới/phù/áo từ `gamestype.png`; khung màu theo phẩm.

**Boss tuần và chiến đấu**
- 16 thần thú xoay vòng theo tuần từ 2026-01-05 (`gWeekIdx`). HP quái **cố định theo cảnh giới của người chơi**: `bossHp=[2000,4800,8400,13000,19000,27000,36000,48000,64000]`; nếu đột phá giữa tuần quái lớn theo, giữ nguyên % máu.
- Một trận = 90 giây; **mỗi câu đúng +1 giây** (`timeBonus`); sau trận chờ 3 giờ (`cooldownH`) hoặc dùng Hồi Linh Đan (💎60). Đúng = tấn công theo chỉ số + trang bị + chí mạng + liên kích; sai = quái phản công. Mỗi quái có 1 kỹ năng (heal/crit/rage/time/charm/poison/burn/shield).
- **Hệ tương khắc** (`GEL`, `CELEM`, `gMatchup`): mỗi nhân vật có 1 hệ; khắc chế ×1,5 (×1,75 nếu khắc cả 2 hệ của quái) và nhận ×0,85; bị khắc ×0,8 và nhận ×1,25.
- **Chiêu cuối 14 hệ** (`ult-fx.js`): cứ đúng liên tiếp 5 câu trong trận (`GULT_COMBO`) nhân vật tung chiêu cuối theo hệ của mình (`gUltEl()` = `gElOf(char)`): thêm 1 đòn chắc chắn trúng ×2,5 (`GULT_MULT`), có hoạt cảnh 2,6 giây toàn màn hình (chạm để bỏ qua); đồng hồ trận dừng trong lúc diễn (`GB.pauseAt`). Hoạt cảnh vẽ hoàn toàn bằng canvas theo thời điểm t, 6 pha (tụ khí, thức tỉnh, thi triển, trúng đích, bùng nổ, thu hồi), dùng ảnh bust nhân vật và ảnh quái, không chữ, nền trong suốt. Mỗi hệ có hàm riêng trong `GULT_FX`. **Video thật cho 3 hệ:** Kim, Hỏa, Thủy phát video chibi do người dùng tạo (`ult-video/kim|hoa|thuy` .webm + .mp4, chuyển từ HEVC gốc trong thư mục `skill/` sang VP9/H.264 640px vì trình duyệt không chắc phát được HEVC), khai báo ở `GULT_VID`. Thêm video cho hệ khác: đặt file vào `ult-video/` và thêm vào `GULT_VID`. Video lỗi/thiếu thì tự quay về canvas. Xem thử cả 14 ở nút "🎬 Xem chiêu cuối 14 hệ" trong tab Chiến đấu. Bản xuất spritesheet PNG/GIF nằm ở `chieu-cuoi-14-he/` cạnh thư mục ứng dụng (không cần cho app).
- Mốc thưởng 25/50/75/100% máu quái; hạ gục mở truyện trong "Sơn Hải Chí" (mỗi thú một truyện).
- Câu hỏi trận (`gQuestion`, cập nhật 2026-11-23 để bớt lặp): tỉ lệ ngữ pháp = số câu `GRAM` hợp cấp / 90, kẹp trong 15–35% (HSK1 chỉ 16 câu nên ~18%). Ngữ pháp dùng kiểu "bộ bài" (`S.gq.deck`): hết mọi câu hợp cấp mới xáo lại; 3 dạng: điền chỗ trống, cho nghĩa Việt chọn câu Trung đúng, cho câu chọn nghĩa. Từ vựng 6 dạng (chọn nghĩa, chọn chữ Hán, chọn pinyin có đáp án sai thanh điệu, pinyin→chữ, nghe→chữ, nghe→nghĩa; dạng nghe chỉ khi từ có mp3), tránh lặp 2 dạng vừa dùng. Chọn từ: trộn cấp hiện tại, từ đã học, từ yếu (đến hạn/ease thấp), cấp dưới; nhớ ~250 từ vừa hỏi (`S.gq.w`, lưu qua các trận) để không hỏi lại. Đáp án nhiễu ưu tiên cùng số chữ. Bài test độ kiếp/xếp trình độ vẫn dùng 3 dạng cũ. Bản rpg.js trước khi đổi: `backup-truoc-da-dang-cau-hoi/`.
- Trận đánh quái: Enter sau khi trả lời = sang câu tiếp ngay (`GB.goNext`); Enter/Space/Esc khi đang diễn chiêu cuối = bỏ qua; đồng hồ dừng từ lúc tung chiêu tới khi câu mới hiện.
- Phím tắt: 1–4 chọn đáp án, Enter/Space qua câu (ở mọi màn có `.opt`). Đáp án chữ Hán có pinyin (trừ bài test độ kiếp và xếp trình độ).

**Nhân vật**
- 22 nhân vật (môn phái) cắt từ sprite sheet, id: kiem, hoa, thuy, moc, dia, loi, bang, phong, hon, quang, doc, khong, thoi, kimcuong, dan, khi, tran, thu, am, co, nho, hoa2. 5 nhân vật mặc định miễn phí (kiem, hoa, thuy, moc, dia); 17 nhân vật còn lại chỉ mở bằng gacha (xem mục 11, `features.js`).
- Phường thị (mỹ phẩm): danh hiệu, khung, hào quang, linh thú, đan dược, Hộ Chuỗi Phù. 14 món khung/hào quang/linh thú có ảnh nền trong suốt ở `hoc-tieng-trung/items/<id>.webp` (trường `img`; khung có thêm `hole` = tỉ lệ đường kính lỗ giữa / chiều rộng ảnh). `bustImg()` phủ khung lên ảnh tròn và đặt hào quang xoay phía sau; `heroCard()` vẽ hào quang sau thẻ, huy hiệu khung ở góc trên trái, linh thú lơ lửng góc dưới phải. Món không có `img` vẫn dùng kiểu cũ (gradient/emoji). Khung, hào quang, linh thú có trường `st` (chỉ số cộng khi đang mang, áp trong `gStats()` ở rpg.js qua `GCOS_ST`): hp/atk/def/spd tính % (bảng `GPET_PCT`), crit/hit/luck/expb cộng thẳng. Chỉ số Vận (`luck`) của trang bị và mỹ phẩm giờ cộng vào may mắn rơi đồ cùng Phúc vận (`gLuck()`, 1 điểm = 1%); chữ hiển thị qua `petStTxt()`. Tiên Phủ: 6 món trang bị đổi mỗi ngày (seed theo ngày).
- **Tạo nhân vật mới** (`vNewChar`): tùy chọn lưu nhân vật cũ, giữ/xóa tiến độ học, bắt đầu từ đầu hoặc **bài test xếp trình độ** (HSK1→HSK5, mỗi cấp 10 câu, ≥8 đúng thì làm tiếp; trượt cho tầng khởi điểm 1–5).
- **Lưu nhiều nhân vật** (`slotSave/slotLoad/vSlots`): mỗi nhân vật là bản chụp đầy đủ `S`; chuyển nhân vật = tự lưu cái cũ, ghi `S` mới vào `zh_app_v1`, `location.reload()`.
- Sao lưu: nút Xuất/Nhập ở tab Từ vựng (JSON kèm cả danh sách nhân vật đã lưu).

## 8. Quy ước và bẫy khi sửa code
- Ghi file bằng UTF-8 **không BOM**. Khi sửa bằng PowerShell, lưu ý CRLF/LF: nhiều lần `Replace` chuỗi nhiều dòng không khớp vì xuống dòng khác nhau. Ưu tiên neo vào **một dòng** hoặc dùng công cụ Edit.
- Template literal lồng trong chuỗi PowerShell dễ lỗi: backtick và `${}` cần escape; sau mỗi lần sửa nên đọc lại/`grep` kiểm tra.
- Mọi tác vụ đã thêm đều được kiểm thử bằng cách chạy server cục bộ và dùng `javascript_exec` trong khung trình duyệt để mô phỏng (làm bài đúng, đánh quái, mua đồ, chuyển nhân vật), kèm đọc console. Hãy làm tương tự thay vì chỉ đọc code.
- Các `GCFG` (cooldown, HP quái, trần ngày...) là con số do trợ lý tự đặt và **chưa được người dùng chơi thật để cân bằng**; sẵn sàng chỉnh theo phản hồi.
- Nghĩa tiếng Việt, pinyin và truyện do trợ lý viết từ trí nhớ; có thể có lỗi nhỏ. Danh sách từ **không** sao chép nguyên bảng HSK chính thức (tham khảo: HSK 2.0 cộng dồn 150/300/600; HSK 3.0 đề cương 2025 khoảng 300/500/1000; chuẩn 2021 khoảng 500/1272/2245; số liệu từ trang thương mại, chưa đối chiếu nguồn gốc).

- **Phím tắt Ôn tập (2026-11-23)**: trong tab Ôn tập (`vReview` trong index.html), Enter/Space hiện nghĩa (khi đã hiện thì = Tốt), → sang từ kế (chưa hiện = bỏ qua, đưa thẻ xuống cuối hàng; đã hiện = chấm Tốt), ← quay lại từ trước và hoàn tác lượt chấm (lịch sử `rvHist`, hàm `rvRate/rvSkip/rvBack`), 1–4 = Lại/Khó/Tốt/Dễ. Không chạy khi đang gõ trong ô nhập, ngoài tab Ôn tập, hoặc khi đang chiếu chiêu cuối. Có dòng gợi ý `.kb-hint` (ẩn trên màn hình cảm ứng). Bản cũ: `backup-truoc-phim-tat-on-tap/` trên máy.

## 9. Chưa làm / ý tưởng tiếp
- Ngữ pháp hiện 107 câu (HSK4: 33, HSK5: 31). Từ HSK4–5 cần chạy `tools/gen_audio.py` rồi `tools/build_audio_data.py` để có giọng đọc.
- Từ prompt gốc về RPG nhưng chưa làm: máy chủ, bảng xếp hạng thật và boss chung cộng đồng (app local nên bảng xếp hạng chỉ là lịch sử cá nhân), bản đồ thế giới, quái thường/tinh anh theo vùng, truyện chính/ẩn/tuần, thành tựu, chống gian lận phía server.
- Hiệu ứng riêng theo môn phái (đã có chiêu cuối theo hệ, chưa có theo từng nhân vật); luyện viết nét; nhiệm vụ hằng ngày; thêm đồ/cảnh giới cho shop.
- Nếu người dùng muốn "một cấp = một tầng/tuần" thay vì "một cảnh giới/tuần": đổi `r.c` trong khối `REALMS` của index.html và `xpDayCap`.

## 10. Gợi ý cách tiếp tục trong chat mới
1. Giải nén (giữ nguyên cấu trúc thư mục). Mở thư mục này làm thư mục làm việc.
2. Đọc `HANDOFF.md` rồi đọc nhanh `index.html` (script chính ở cuối), `rpg.js`, `rpg-data.js`.
3. Chạy server cục bộ để kiểm thử (mục 3). Mỗi thay đổi: sửa → tải lại (nhớ bỏ cache) → mô phỏng bằng JS → kiểm tra console → mới báo kết quả.
4. Nếu thêm từ vựng: thêm khối `#N` ở **cuối** SEED, chạy `tools/gen_audio.py`, dựng lại `audio-data.js`.

## 11. Gacha, Leo Tháp, Phòng boss online (2026-11-25, file `features.js`)
`features.js` nạp **sau** script chính (cuối `index.html`) và bọc lại `vHero`, `vReview`, `nextCard`, `drawCard`, `vFight`, `render`, `gStats`. `rpg.js` có 3 móc gọi tới nó trong `gAnswer`: `fxOnRight`, `fxOnWrong`, `fxUltCombo`/`fxUltMul`.
- **Gacha** (`FX_CFG`, `FX_RAR`, `FX_GACHA`): vé 💎160 (10 vé 💎1440), tỉ lệ Hiếm/Sử Thi/Truyền Thuyết 69/30/1%, bảo hiểm 100 lần ra Truyền Thuyết (`S.gacha.pity`). Độ hiếm cộng ATK/CRIT và nhân sát thương chiêu cuối; mỗi nhân vật có 1 hiệu ứng hỗ trợ (heal, time, dodge, shield, ult4, hoặc burn/pierce/vamp/guard/swift của hệ trang bị). Trùng: luôn hoàn 💎80 (50% giá vé) và +1★ nếu chưa tối đa (+3% ATK/sao, tối đa 5★). Ai đã mua nhân vật trước đây vẫn giữ (`S.inv`). Mỗi save được tặng 1 vé. Trạng thái: `S.gacha={t,pity,n,stars,given}`.
- **Leo Tháp Thông Thiên** (tab Ôn tập → nút 🗼): mỗi câu đúng +1 tầng, mốc lưu mỗi 10 tầng (`TW_CP`), sai rơi về mốc. Lần đầu đạt mốc: 💎 + Yêu Đan; mỗi 50 tầng thêm 1 vé và 1 trang bị. Từ tầng 30 ẩn pinyin. Trạng thái `S.tower={f,cp,best,got}`.
- **Phòng boss online** (thay cho bản LAN cũ, 2026-11-25): dùng Firestore `rooms/{mã}` = `{phase, round, boss, ri, max, dmg, ends, result, p:{uid:{name,char,xp,ri,dmg,seen}}}`, nghe thay đổi bằng `onSnapshot`. Phải đăng nhập (cloud.js). Sát thương cộng bằng `FieldValue.increment`; bắt đầu/kết thúc trận bằng transaction. Boss theo cảnh giới người tu vi cao nhất trong số người còn hoạt động (30 giây gần nhất), máu ×(1+0,6×(số người−1)), trận 150 giây, mỗi đòn tối đa 25% máu boss. Hạ boss: đồ rơi chỉ số +30% (tối đa 3 lần/ngày, `S.coop`). Rules Firestore cần thêm `match /rooms/{room} { allow read, write: if request.auth != null; }`.
- **Video chiêu cuối theo nhân vật**: đặt `ult-video/<id nhân vật>.webm` và/hoặc `.mp4`; danh sách id thử phát ở `GULT_CVID` (ult-fx.js). Thiếu file thì tự dùng video theo hệ (`GULT_VID`) rồi tới canvas.
  Hiện có video cho 18 nhân vật: kiem, hoa, thuy, moc, dia, loi, bang, phong, hon, quang, doc, khong, thoi, kimcuong, dan, khi, tran, thu (video gốc `Claude_code/skill/1.mp4`…`18.mp4` theo đúng thứ tự này). `GULT_VID` gán cho 13/14 hệ một video đại diện (Thổ = dia, Âm = hon), nên bảng xem chiêu cuối 14 hệ có video ở mọi hệ trừ Ảo; nhân vật am, co, nho dùng video hệ của mình, hoa2 (hệ Ảo) dùng canvas. Video đã chuyển sang H.264/AAC (.mp4) + VP9/Opus (.webm), rộng tối đa 1024px.

## 12. Lưu tiến độ lên mây (2026-11-25, `cloud.js`)
- Firebase project `learn-chinese-959b8` (config công khai nằm trong `CLOUD_CFG`). SDK compat 10.12.2 tải từ gstatic (cần Internet; thiếu thì game vẫn chạy offline như cũ).
- Đăng nhập bằng tên tài khoản + mật khẩu (tên đổi thành email ẩn `<tên>@hoc-tieng-trung.game` cho Firebase Email/Password, không có quên mật khẩu); nút ☁️ góc dưới phải. Firestore `saves/{uid}` = `{data: JSON S, slots, ts, name}`; Rules chỉ cho chủ tài khoản đọc/ghi.
- `save()` được bọc: ghi `S.__ts` rồi đẩy lên mây sau 4 giây (và khi ẩn tab). Khi đăng nhập: máy chưa gắn tài khoản này (`localStorage.zh_cloud_uid`) hoặc bản mây mới hơn → tải bản mây và reload; ngược lại đẩy bản máy lên.
- Không chạy với `file://`. Domain dùng được phải có trong Firebase Authentication → Authorized domains (localhost, 127.0.0.1, haruki990.github.io).

## 13. Vật phẩm hỗ trợ đánh boss (2026-11-26, cuối `features.js`)
Mua ở Tu tiên → Phường thị → Đan dược & Phù, lưu ở `S.bitems{id:số lượng}` (lên mây cùng save). Dùng bằng thanh nút dưới câu hỏi trong trận quái tuần và phòng boss online, mỗi loại tối đa `BI_MAX = 2` lần/trận:
Thiên Nhãn Phù 💎60 (sáng đáp án đúng), Phá Vọng Phù 💎30 (xóa 2 đáp án sai), Định Thời Phù 💎40 (dừng đồng hồ tới khi trả lời; không dùng trong phòng online), Hồi Xuân Đan 💎50 (+40% HP), Kim Chung Tráo 💎45 (lần sai kế tiếp không mất HP, giữ liên kích), Bạo Kích Đan 💎50 (đòn đúng kế tiếp chắc trúng ×2). Bảng `BITEMS`; hiệu ứng qua bọc `gNextQ/gAnswer/gHit`, `fxOnWrong` (B.iguard) và `cpHit` (B.ipow).

## 14. Phẩm cấp đồ và bảng sát thương phòng boss (2026-11-26)
- **Phẩm cấp trong cùng phẩm** (`GQ`, `GQW`, `GXS`, `gRollQ`, `gQSrc` trong `rpg.js`): mỗi món có `it.q` = 1..5: Hạ (×0,85), Trung (×1), Thượng (×1,15, +1 thuộc tính), Cực (×1,32, +2), Tuyệt Phẩm (×1,55, +3, mở hiệu ứng từ +4 thay vì +7). Thuộc tính thêm ghi trong `it.xs` (hiện chip ✦ màu phẩm cấp). Hiệu ứng mạnh hơn theo `GQ[].fx`, giá bán theo `GQ[].m`, giá Tiên Phủ theo `m²`.
- Tỉ lệ theo nguồn (`GQW`): thường (combo/luyện tập/Tiên Phủ) 40/33/18/7/2%; độ kiếp và rương chuỗi < 21 ngày từ Trung Phẩm; **mọi đồ boss** (quái tuần, mốc tháp, phòng online, rương ≥ 21 ngày) từ Thượng Phẩm (65/27/8%); thưởng kết liễu từ Cực Phẩm (75/25%). Phúc vận cho thêm cơ hội lên 1 cấp.
- Save cũ: món không có `q` được coi là Trung Phẩm, chỉ số giữ nguyên.
- **Phòng boss online** (`features.js`): bảng sát thương từng thành viên (`cpBoard`: hạng, thanh % máu boss, % đóng góp) hiện trong trận, màn kết thúc và sảnh (trận trước). Khi máu boss còn ≤ 15% + đòn, đòn đánh đi qua transaction và ghi `killer:{uid,name}` vào phòng; nếu không xác định được thì tính cho người sát thương cao nhất (`cpFinish`). Người kết liễu nhận thêm 1 món Cực Phẩm trở lên (+30% chỉ số như đồ phòng) và 💎 (`CP_CFG.killLs`), tối đa `killPerDay = 3` lần/ngày (`S.coop.kd/kn`).
- **Sân đấu động** (2026-11-26, `gArenaHTML`/`gArenaFx`/`GAR_CSS` trong `rpg.js`, dùng ở quái tuần và phòng online): quái góc trên trái (thở/nhún), nhân vật (ảnh `card`) góc trên phải (nhún nhẹ). Trả lời đúng: nhân vật lao tới, vệt chém, quái rung + số sát thương. Trượt: quái né. Trả lời sai: quái lao tới, 3 vết cào đỏ trên nhân vật, sân rung, viền đỏ toàn màn hình, thanh HP nháy, điện thoại rung nhẹ; đỡ được (Kim Chung Tráo/né của gacha) thì hiện khiên. Trúng độc hiện số xanh. CSS chèn một lần bằng thẻ `#gar-css`; tắt bớt khi máy bật giảm chuyển động.
- **Đánh quái vượt cấp** (2026-11-26, `gOverList`, `gW`, `gOverMul`, `GCFG.overMax/overTaken/overReward` trong `rpg.js`): ở tab Chiến đấu, dưới nút Khiêu chiến có mục "Vượt cấp khiêu chiến": cùng loài thú của tuần nhưng ở cảnh giới +1, +2 (Luyện Khí đánh được Trúc Cơ, Kim Đan). Mỗi cảnh giới có máu và mốc thưởng riêng trong tuần (`S.wx = {k, r:{ri: bản ghi giống S.week, x: số cảnh giới vượt}}`, đổi tuần thì làm mới), dùng chung thời gian hồi sức. Sát thương nhận vào (đòn phản công và độc) luôn ×2; 💎/Yêu Đan +50% mỗi cảnh giới vượt; đồ rơi mốc theo phẩm của cảnh giới quái (có thể chưa mặc được ngay). Mọi hàm trận đánh đọc quái qua `gW()` (= `GB.W` khi vượt cấp, ngược lại `S.week`).
- **Nền sân đấu theo boss** (2026-11-26, `GBGC`/`gScene`/`gPreloadBg` cuối `GAR_CSS` trong `rpg.js`): mỗi boss có ảnh `hoc-tieng-trung/bg/<id boss>.webp` (1280×720, nén từ PNG 1920×1080 của Haru). Trận quái tuần, vượt cấp (`gDrawBattle`) và phòng online (`cpStartFight`) bọc trong `.gbs`: ảnh phủ phần trên (tỉ lệ 16:9, tối thiểu cao 250px, `cover` canh trên giữa), mờ dần xuống màu `GBGC[id]` (màu đáy ảnh làm tối), các thẻ bên trong đổi sang kính tối để chữ dễ đọc ở cả giao diện sáng/tối. Đổi ảnh: chỉ cần thay file webp cùng tên (nhớ sửa màu trong `GBGC` nếu tông khác hẳn). 5 ảnh Tất Phương, Ứng Long, Chúc Long, Thanh Long, Phượng Hoàng đang là bản tạm (DRAFT).
- **Ảnh boss chibi mới** (2026-11-26): 16 ảnh nền trong suốt do người dùng tạo (quay mặt sang phải) ở `hoc-tieng-trung/bosses/<id boss>.webp` (cắt sát viền, rộng 480px). Hàm `gBossSrc(id)`, `gBossImgTag`, `gBossCard` (thẻ nền màu theo hệ `GELC` + tên) trong `rpg.js`; dùng ở sân đấu, thẻ quái tuần, Sơn Hải Chí, truyện thú, chiêu cuối (`gUDisc` vẽ ảnh boss vừa khung trên nền tối). Thiếu file thì tự quay về ảnh cũ trong `game-data.js` (cắt từ `boss.png`). Thay ảnh: chép đè file webp cùng tên.
- **Ảnh nhân vật chibi mới** (2026-11-26): 22 ảnh nền trong suốt do người dùng tạo (quay mặt sang phải) ở `hoc-tieng-trung/chars/<id>_card.webp` (toàn thân, cắt sát viền) và `chars/<id>_bust.webp` (chân dung 200px cắt phần đầu). `charImg(id,'card'|'bust')` trong index.html trỏ tới đây; ảnh lỗi/thiếu thì bộ bắt lỗi ảnh tự đổi về ảnh cũ trong `avatars-data.js`. CSS `img[src*="chars/"]` thêm nền tím tối cho ảnh trong suốt (trừ trong sân đấu `.ar`). Trong trận boss nhân vật được lật `transform:scaleX(-1)` ở thẻ `img` (`.ar-p .ar-i img`) để quay về phía boss; các hiệu ứng nhún/lao/trúng đòn chạy ở `.ar-i`/`.ar-u` nên không bị đè. Thay ảnh: chép đè file webp cùng tên (ảnh gốc 512px, chạy lại đoạn cắt bust nếu cần).
