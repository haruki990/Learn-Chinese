// ---------- Chiêu cuối 14 hệ ----------
// Hiệu ứng vẽ hoàn toàn bằng canvas (không cần file ảnh, ~0 KB tài nguyên), mỗi chiêu ~2,6 giây, khung vuông 1:1,
// nền trong suốt, không chữ. 6 pha: tụ khí → thức tỉnh → thi triển → trúng đích → bùng nổ → thu hồi.
// Mọi thứ được tính từ thời điểm t (không mô phỏng theo bước) nên có thể tua/xuất từng khung hình (spritesheet, GIF).
// c = [màu chính, màu sáng, màu đậm]
const GULT = {
  kim: { n: 'Vạn Kiếm Quy Tông', h: '万剑归宗', p: 'wàn jiàn guī zōng', c: ['#ffcf4a', '#fff6c8', '#a8741a'], sh: 'shard' },
  moc: { n: 'Thanh Mộc Triền Long', h: '青木缠龙', p: 'qīng mù chán lóng', c: ['#4cd06a', '#d8ffb8', '#1d6b34'], sh: 'leaf' },
  tho: { n: 'Sơn Băng Địa Liệt', h: '山崩地裂', p: 'shān bēng dì liè', c: ['#d39a52', '#f7ddb0', '#6b4420'], sh: 'rock' },
  thuy: { n: 'Thương Hải Long Đào', h: '沧海龙涛', p: 'cāng hǎi lóng tāo', c: ['#3aa8f0', '#c8f0ff', '#14508f'], sh: 'drop' },
  hoa: { n: 'Phần Thiên Liệt Diễm', h: '焚天烈焰', p: 'fén tiān liè yàn', c: ['#ff6a1f', '#ffe08a', '#a8180c'], sh: 'flame' },
  loi: { n: 'Cửu Thiên Lôi Phạt', h: '九天雷罚', p: 'jiǔ tiān léi fá', c: ['#9f7bff', '#f0eaff', '#3d2a9e'], sh: 'bolt' },
  bang: { n: 'Vạn Lý Băng Phong', h: '万里冰封', p: 'wàn lǐ bīng fēng', c: ['#7fe0ff', '#ffffff', '#2f7fb0'], sh: 'flake' },
  phong: { n: 'Cuồng Phong Toàn Vũ', h: '狂风旋舞', p: 'kuáng fēng xuán wǔ', c: ['#6ee8c8', '#eafff8', '#1f8a74'], sh: 'wind' },
  am: { n: 'U Minh Phệ Hồn', h: '幽冥噬魂', p: 'yōu míng shì hún', c: ['#a24cff', '#e2c4ff', '#2a0b45'], sh: 'smoke' },
  quang: { n: 'Thiên Quang Phổ Chiếu', h: '天光普照', p: 'tiān guāng pǔ zhào', c: ['#ffe680', '#ffffff', '#d9a520'], sh: 'ray' },
  doc: { n: 'Vạn Độc Phệ Tâm', h: '万毒噬心', p: 'wàn dú shì xīn', c: ['#8fe03a', '#e8ffb0', '#3f6b12'], sh: 'bubble' },
  khong: { n: 'Hư Không Liệt Giới', h: '虚空裂界', p: 'xū kōng liè jiè', c: ['#5b6cff', '#dfe4ff', '#1a1f5e'], sh: 'star' },
  thoi: { n: 'Quang Âm Đảo Lưu', h: '光阴倒流', p: 'guāng yīn dào liú', c: ['#f0c060', '#fff3d0', '#8a5a14'], sh: 'tick' },
  ao: { n: 'Kính Hoa Thủy Nguyệt', h: '镜花水月', p: 'jìng huā shuǐ yuè', c: ['#ff7fd0', '#ffe4f6', '#8a2f8a'], sh: 'petal' }
};
const GULT_ORDER = ['kim', 'moc', 'tho', 'thuy', 'hoa', 'loi', 'bang', 'phong', 'am', 'quang', 'doc', 'khong', 'thoi', 'ao'];
const GULT_T = 2.6; // tổng thời lượng (giây)
const GULT_P = [0, .42, .78, 1.22, 1.62, 2.1, 2.6]; // ranh giới 6 pha
const GULT_COMBO = 5; // cứ N câu đúng liên tiếp trong trận đánh quái thì tung chiêu cuối
const GULT_MULT = 2.5; // chiêu cuối = 1 đòn chắc chắn trúng, sát thương ×2.5

// ---- tiện ích ----
const gUH = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const gUC = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const gUE = u => 1 - Math.pow(1 - u, 3);
const gUI = u => u * u * u;
const gUP = (t, a, b) => gUC((t - a) / (b - a));
const gUL = (a, b, u) => a + (b - a) * u;
const gUA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const gUBell = (t, a, b) => { const u = gUP(t, a, b); return Math.sin(u * Math.PI); };
const GULT_GLOW = {};
function gUGlow(hex) { // sprite phát sáng dùng lại cho mọi hạt (nhanh hơn shadowBlur)
  if (GULT_GLOW[hex]) return GULT_GLOW[hex];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, gUA(hex, 1)); g.addColorStop(.25, gUA(hex, .55)); g.addColorStop(1, gUA(hex, 0));
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return GULT_GLOW[hex] = c;
}
function gUGlowAt(x, px, py, r, hex, a) { if (a <= 0 || r <= 0) return; x.globalAlpha = gUC(a); x.drawImage(gUGlow(hex), px - r, py - r, r * 2, r * 2); x.globalAlpha = 1; }

// ---- hình dạng hạt theo hệ ----
function gUShape(x, kind, px, py, s, rot, col, a) {
  if (a <= 0 || s <= 0) return;
  x.save(); x.translate(px, py); x.rotate(rot); x.globalAlpha = gUC(a);
  x.fillStyle = col; x.strokeStyle = col; x.lineWidth = Math.max(1, s * .22); x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  switch (kind) {
    case 'shard': x.moveTo(0, -s * 1.6); x.lineTo(s * .35, 0); x.lineTo(0, s * 1.6); x.lineTo(-s * .35, 0); x.closePath(); x.fill(); break;
    case 'leaf': x.ellipse(0, 0, s * .45, s, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(0,60,20,.45)'; x.lineWidth = s * .1; x.beginPath(); x.moveTo(0, -s * .9); x.lineTo(0, s * .9); x.stroke(); break;
    case 'rock': for (let k = 0; k < 6; k++) { const an = k / 6 * 6.283, r = s * (.7 + .3 * gUH(k, s)); k ? x.lineTo(Math.cos(an) * r, Math.sin(an) * r) : x.moveTo(r, 0); } x.closePath(); x.fill(); break;
    case 'drop': x.moveTo(0, -s * 1.2); x.quadraticCurveTo(s * .9, s * .2, 0, s * .8); x.quadraticCurveTo(-s * .9, s * .2, 0, -s * 1.2); x.fill(); break;
    case 'flame': x.moveTo(0, -s * 1.5); x.quadraticCurveTo(s, 0, 0, s * .8); x.quadraticCurveTo(-s, 0, 0, -s * 1.5); x.fill(); break;
    case 'bolt': x.moveTo(-s * .2, -s * 1.3); x.lineTo(s * .4, -s * .2); x.lineTo(-s * .2, s * .1); x.lineTo(s * .3, s * 1.3); x.stroke(); break;
    case 'flake': for (let k = 0; k < 3; k++) { x.rotate(1.047); x.moveTo(-s, 0); x.lineTo(s, 0); } x.stroke(); break;
    case 'wind': x.arc(0, 0, s, -.3, 2.2); x.stroke(); break;
    case 'smoke': x.arc(0, 0, s, 0, 7); x.fill(); break;
    case 'ray': x.moveTo(0, -s * 1.4); x.lineTo(s * .25, -s * .25); x.lineTo(s * 1.4, 0); x.lineTo(s * .25, s * .25); x.lineTo(0, s * 1.4); x.lineTo(-s * .25, s * .25); x.lineTo(-s * 1.4, 0); x.lineTo(-s * .25, -s * .25); x.closePath(); x.fill(); break;
    case 'bubble': x.lineWidth = s * .18; x.arc(0, 0, s, 0, 7); x.stroke(); x.beginPath(); x.globalAlpha *= .8; x.fillStyle = '#fff'; x.arc(-s * .35, -s * .35, s * .22, 0, 7); x.fill(); break;
    case 'star': x.moveTo(0, -s * 1.2); x.lineTo(s * .2, -s * .2); x.lineTo(s * 1.2, 0); x.lineTo(s * .2, s * .2); x.lineTo(0, s * 1.2); x.lineTo(-s * .2, s * .2); x.lineTo(-s * 1.2, 0); x.lineTo(-s * .2, -s * .2); x.closePath(); x.fill(); break;
    case 'tick': x.lineWidth = s * .2; x.arc(0, 0, s, 0, 7); x.stroke(); x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -s * .7); x.moveTo(0, 0); x.lineTo(s * .5, 0); x.stroke(); break;
    case 'petal': x.moveTo(0, s); x.bezierCurveTo(s * 1.1, s * .1, s * .5, -s * 1.1, 0, -s * .4); x.bezierCurveTo(-s * .5, -s * 1.1, -s * 1.1, s * .1, 0, s); x.fill(); break;
    default: x.arc(0, 0, s, 0, 7); x.fill();
  }
  x.restore();
}

// ---- nhân vật và mục tiêu ----
function gUDisc(x, img, px, py, r, ring, tint) {
  x.save(); x.beginPath(); x.arc(px, py, r, 0, 7); x.closePath();
  if (img && img.complete && img.naturalWidth) { x.save(); x.clip(); const w = img.naturalWidth, h = img.naturalHeight, k = Math.max(2 * r / w, 2 * r / h); x.drawImage(img, px - w * k / 2, py - h * k / 2.6, w * k, h * k); x.restore(); }
  else { x.fillStyle = '#3a3550'; x.fill(); }
  if (tint) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = tint; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; }
  x.lineWidth = r * .1; x.strokeStyle = ring; x.beginPath(); x.arc(px, py, r, 0, 7); x.stroke(); x.restore();
}
// vòng pháp trận (không chữ: chỉ vạch quẻ và chấm)
function gURuneCircle(x, px, py, r, rot, col, a) {
  if (a <= 0) return; x.save(); x.translate(px, py); x.rotate(rot); x.globalAlpha = gUC(a); x.strokeStyle = col; x.lineWidth = r * .03;
  x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, r * .78, 0, 7); x.stroke();
  for (let k = 0; k < 8; k++) { x.save(); x.rotate(k * .785); for (let j = 0; j < 3; j++) { const y = -r * (.83 + j * .055), br = (k >> j) & 1; x.beginPath(); if (br) { x.moveTo(-r * .09, y); x.lineTo(-r * .02, y); x.moveTo(r * .02, y); x.lineTo(r * .09, y); } else { x.moveTo(-r * .09, y); x.lineTo(r * .09, y); } x.stroke(); } x.restore(); }
  x.beginPath(); for (let k = 0; k < 6; k++) { const an = k / 6 * 6.283; k ? x.lineTo(Math.cos(an) * r * .78, Math.sin(an) * r * .78) : x.moveTo(r * .78, 0); } x.closePath(); x.stroke();
  x.restore();
}

// ---- pha 3 (thi triển) và pha 4 (trúng đích) riêng cho từng hệ ----
// Mỗi hàm nhận (x, S, t, E, C, B): S = cạnh canvas, C/B = toạ độ nhân vật/mục tiêu (px)
const GULT_FX = {
  kim(x, S, t, E, C, B) {
    const u = gUP(t, .78, 1.3);
    for (let i = 0; i < 9; i++) { // kiếm bay hình quạt rồi hội tụ
      const d = i * .025, v = gUE(gUP(t, .78 + d, 1.25 + d)), off = (i - 4) * S * .045, mx = (C[0] + B[0]) / 2 - off * .6, my = (C[1] + B[1]) / 2 - off;
      if (v <= 0 || v >= 1) continue;
      const px = (1 - v) * (1 - v) * C[0] + 2 * (1 - v) * v * mx + v * v * B[0], py = (1 - v) * (1 - v) * C[1] + 2 * (1 - v) * v * my + v * v * B[1];
      const tx = 2 * (1 - v) * (mx - C[0]) + 2 * v * (B[0] - mx), ty = 2 * (1 - v) * (my - C[1]) + 2 * v * (B[1] - my);
      gUGlowAt(x, px, py, S * .05, E.c[0], .8); gUShape(x, 'shard', px, py, S * .022, Math.atan2(ty, tx) + 1.571, E.c[1], 1);
    }
    const f = gUP(t, 1.18, 1.42); // thanh cự kiếm giáng xuống
    if (f > 0 && t < 1.75) {
      const y = gUL(-S * .2, B[1], gUI(f)), a = 1 - gUP(t, 1.5, 1.75);
      gUGlowAt(x, B[0], y, S * .18, E.c[0], a);
      x.save(); x.globalAlpha = a; x.translate(B[0], y); x.fillStyle = E.c[1]; x.strokeStyle = E.c[2]; x.lineWidth = S * .006;
      x.beginPath(); x.moveTo(0, S * .02); x.lineTo(S * .04, -S * .1); x.lineTo(S * .03, -S * .42); x.lineTo(-S * .03, -S * .42); x.lineTo(-S * .04, -S * .1); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = E.c[0]; x.fillRect(-S * .09, -S * .44, S * .18, S * .025); x.fillRect(-S * .015, -S * .52, S * .03, S * .08); x.restore();
    }
    if (u >= 1 && t < 1.7) gURuneCircle(x, B[0], B[1], S * .2, t * 3, E.c[0], 1 - gUP(t, 1.4, 1.7));
  },
  moc(x, S, t, E, C, B) {
    for (let k = 0; k < 3; k++) { // 3 dây leo mọc từ nhân vật tới quái
      const g = gUE(gUP(t, .78 + k * .05, 1.25 + k * .05)), a = 1 - gUP(t, 1.7, 2.05); if (g <= 0 || a <= 0) continue;
      x.save(); x.globalAlpha = a; x.strokeStyle = k === 1 ? E.c[0] : E.c[2]; x.lineWidth = S * (.018 - k * .004); x.lineCap = 'round'; x.beginPath();
      const N = 40; for (let i = 0; i <= N * g; i++) { const v = i / N, px = gUL(C[0], B[0], v), py = gUL(C[1], B[1], v) + Math.sin(v * 9 + k * 2) * S * .05 * (1 - v * .6); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke();
      for (let i = 2; i < N * g; i += 5) { const v = i / N, px = gUL(C[0], B[0], v), py = gUL(C[1], B[1], v) + Math.sin(v * 9 + k * 2) * S * .05 * (1 - v * .6); gUShape(x, 'leaf', px, py, S * .014, v * 9 + k, E.c[0], a); }
      x.restore();
    }
    const w = gUP(t, 1.22, 1.55), a = 1 - gUP(t, 1.75, 2.1); // quấn quanh quái như rồng
    if (w > 0 && a > 0) {
      x.save(); x.globalAlpha = a; x.lineCap = 'round';
      for (let k = 0; k < 3; k++) { x.strokeStyle = [E.c[0], E.c[2], '#9be86a'][k]; x.lineWidth = S * .014; x.beginPath(); const st = t * 4 + k * 2.1; x.ellipse(B[0], B[1], S * (.15 + k * .015), S * .07, k * .9 - .6, st, st + w * 5.5); x.stroke(); }
      for (let i = 0; i < 7; i++) { const an = i * .9 + t * 2, r = S * .17, f = gUE(gUP(t, 1.3 + i * .03, 1.5 + i * .03)); for (let p = 0; p < 5; p++) gUShape(x, 'petal', B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r * .6, S * .012 * f, p * 1.257, p % 2 ? '#ffd2e8' : '#ff9fc8', a); }
      x.restore();
    }
  },
  tho(x, S, t, E, C, B) {
    for (let i = 0; i < 5; i++) { // đá bay theo đường parabol
      const v = gUP(t, .78 + i * .05, 1.2 + i * .05); if (v <= 0 || v >= 1) continue;
      const px = gUL(C[0], B[0], v), py = gUL(C[1], B[1], v) - Math.sin(v * Math.PI) * S * (.18 + i * .02);
      gUShape(x, 'rock', px, py, S * (.03 - i * .003), v * 8 + i, i % 2 ? E.c[0] : E.c[2], 1);
    }
    const g = gUP(t, 1.22, 1.4), a = 1 - gUP(t, 1.85, 2.15), base = B[1] + S * .16; // cột đá trồi lên
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a; x.strokeStyle = E.c[2]; x.lineWidth = S * .006;
      for (let k = 0; k < 7; k++) { // vết nứt đất
        x.beginPath(); x.moveTo(B[0], base); let px = B[0], py = base; const an = Math.PI + k / 6 * Math.PI;
        for (let j = 1; j <= 4; j++) { px = B[0] + Math.cos(an) * S * .07 * j * gUE(g) + (gUH(k, j) - .5) * S * .03; py = base - Math.sin(an) * S * .02 * j * gUE(g); x.lineTo(px, py); } x.stroke();
      }
      for (let k = 0; k < 6; k++) {
        const ox = (k - 2.5) * S * .055, hgt = S * (.14 + gUH(k, 3) * .14) * gUE(gUP(t, 1.22 + k * .025, 1.4 + k * .025)), w = S * .028;
        x.fillStyle = k % 2 ? E.c[0] : E.c[2]; x.beginPath(); x.moveTo(B[0] + ox - w, base); x.lineTo(B[0] + ox - w * .2, base - hgt); x.lineTo(B[0] + ox + w * .4, base - hgt * .9); x.lineTo(B[0] + ox + w, base); x.closePath(); x.fill();
        x.fillStyle = E.c[1]; x.globalAlpha = a * .5; x.beginPath(); x.moveTo(B[0] + ox - w * .2, base - hgt); x.lineTo(B[0] + ox + w * .4, base - hgt * .9); x.lineTo(B[0] + ox, base - hgt * .6); x.closePath(); x.fill(); x.globalAlpha = a;
      }
      x.restore();
    }
  },
  thuy(x, S, t, E, C, B) {
    const v = gUP(t, .78, 1.28), a = 1 - gUP(t, 1.25, 1.4); // con sóng thủy long
    if (v > 0 && a > 0) {
      x.save(); x.globalAlpha = a; const hx = gUL(C[0], B[0], gUE(v)), hy = gUL(C[1], B[1], gUE(v));
      for (let layer = 0; layer < 2; layer++) {
        x.fillStyle = layer ? E.c[0] : E.c[2]; x.beginPath();
        for (let i = 0; i <= 30; i++) { const w = i / 30, px = gUL(C[0], hx, w), py = gUL(C[1], hy, w) + Math.sin(w * 10 - t * 18) * S * .03 * w - S * (.04 - layer * .015) * Math.sin(w * Math.PI); i ? x.lineTo(px, py) : x.moveTo(px, py); }
        for (let i = 30; i >= 0; i--) { const w = i / 30, px = gUL(C[0], hx, w), py = gUL(C[1], hy, w) + Math.sin(w * 10 - t * 18) * S * .03 * w + S * (.04 - layer * .015) * Math.sin(w * Math.PI); x.lineTo(px, py); }
        x.fill();
      }
      gUGlowAt(x, hx, hy, S * .09, E.c[1], 1); x.restore();
    }
    const w = gUP(t, 1.22, 1.9), b = 1 - gUP(t, 1.75, 2.1); // xoáy nước quanh mục tiêu
    if (w > 0 && b > 0) {
      x.save(); x.globalAlpha = b; x.lineCap = 'round';
      for (let k = 0; k < 5; k++) { x.strokeStyle = k % 2 ? E.c[1] : E.c[0]; x.lineWidth = S * (.016 - k * .002); x.beginPath(); const r = S * (.06 + k * .03) * (1 + w * .3), st = -t * (8 - k) + k; x.ellipse(B[0], B[1], r, r * .55, 0, st, st + 3.8); x.stroke(); }
      for (let i = 0; i < 14; i++) { const an = i / 14 * 6.283, u = gUE(gUP(t, 1.25, 1.75)), r = S * .2 * u; gUShape(x, 'drop', B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r - u * S * .05, S * .012, an + 1.571, E.c[1], 1 - u); }
      x.restore();
    }
  },
  hoa(x, S, t, E, C, B) {
    const v = gUP(t, .78, 1.24);
    if (v > 0 && v < 1) { // hoả cầu kéo đuôi lửa
      const e = gUI(v) * .6 + v * .4, px = gUL(C[0], B[0], e), py = gUL(C[1], B[1], e) - Math.sin(e * Math.PI) * S * .08;
      for (let i = 0; i < 18; i++) { const w = i / 18, q = Math.max(0, e - w * .25); gUShape(x, 'flame', gUL(C[0], B[0], q) + (gUH(i, 1) - .5) * S * .03, gUL(C[1], B[1], q) - Math.sin(q * Math.PI) * S * .08, S * .03 * (1 - w), gUH(i, 2) - .5, w < .4 ? E.c[1] : E.c[0], 1 - w); }
      gUGlowAt(x, px, py, S * .13, E.c[0], 1); gUGlowAt(x, px, py, S * .06, E.c[1], 1);
    }
    const f = gUP(t, 1.22, 1.5), a = 1 - gUP(t, 1.8, 2.15); // đôi cánh phượng hoàng lửa
    if (f > 0 && a > 0) {
      x.save(); x.globalAlpha = a; const sp = gUE(f);
      for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) {
        const len = S * (.26 - k * .03) * sp, an = -.5 - k * .22 + Math.sin(t * 9) * .05;
        x.fillStyle = k < 2 ? E.c[0] : k < 4 ? '#ffb02e' : E.c[1]; x.beginPath(); x.moveTo(B[0], B[1]);
        x.quadraticCurveTo(B[0] + sd * Math.cos(an + .25) * len * .6, B[1] + Math.sin(an + .25) * len * .6 - S * .05, B[0] + sd * Math.cos(an) * len, B[1] + Math.sin(an) * len);
        x.quadraticCurveTo(B[0] + sd * Math.cos(an - .2) * len * .5, B[1] + Math.sin(an - .2) * len * .5, B[0], B[1]); x.fill();
      }
      for (let i = 0; i < 16; i++) { const u = (t * 1.6 + gUH(i, 5)) % 1; gUShape(x, 'flame', B[0] + (gUH(i, 6) - .5) * S * .26, B[1] + S * .12 - u * S * .35, S * .025 * (1 - u), 0, u < .3 ? E.c[1] : E.c[0], (1 - u) * a); }
      x.restore();
    }
  },
  loi(x, S, t, E, C, B) {
    const bolt = (x0, y0, x1, y1, seed, w, a) => { // tia sét răng cưa, đổi hình mỗi 1/20 giây
      x.save(); x.globalAlpha = a; x.lineCap = 'round'; x.lineJoin = 'round';
      const pts = [[x0, y0]], n = 9, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      for (let i = 1; i < n; i++) { const o = (gUH(seed, i) - .5) * L * .18; pts.push([x0 + dx * i / n + nx * o, y0 + dy * i / n + ny * o]); } pts.push([x1, y1]);
      for (const [lw, col] of [[w * 3, gUA(E.c[0], .35)], [w * 1.6, E.c[0]], [w * .6, E.c[1]]]) { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }
      x.restore();
    };
    const fr = Math.floor(t * 20);
    if (t > .8 && t < 1.25) { const v = gUE(gUP(t, .8, 1)); bolt(C[0], C[1], gUL(C[0], B[0], v), gUL(C[1], B[1], v), fr, S * .008, 1); }
    if (t > 1.2 && t < 1.85) {
      const a = 1 - gUP(t, 1.6, 1.85);
      for (let k = 0; k < 4; k++) if ((fr + k) % 3) bolt(B[0] + (k - 1.5) * S * .12, -S * .02, B[0] + (gUH(fr, k) - .5) * S * .05, B[1], fr * 7 + k, S * .007, a);
      gUGlowAt(x, B[0], B[1], S * .25, E.c[0], a * (fr % 2 ? .9 : .5));
    }
  },
  bang(x, S, t, E, C, B) {
    for (let i = 0; i < 7; i++) { // băng trùy
      const v = gUP(t, .78 + i * .035, 1.2 + i * .035); if (v <= 0 || v >= 1) continue;
      const oy = (i - 3) * S * .025, px = gUL(C[0], B[0], gUE(v)), py = gUL(C[1] + oy, B[1] + oy * .3, gUE(v)), an = Math.atan2(B[1] - C[1], B[0] - C[0]);
      x.save(); x.translate(px, py); x.rotate(an); x.fillStyle = E.c[0]; x.beginPath(); x.moveTo(S * .05, 0); x.lineTo(-S * .03, -S * .012); x.lineTo(-S * .03, S * .012); x.closePath(); x.fill();
      x.fillStyle = E.c[1]; x.beginPath(); x.moveTo(S * .05, 0); x.lineTo(-S * .02, -S * .005); x.lineTo(-S * .02, 0); x.closePath(); x.fill(); x.restore();
    }
    const g = gUP(t, 1.22, 1.45), a = 1 - gUP(t, 1.95, 2.25); // gai băng đóng băng mục tiêu
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a;
      const fz = x.createRadialGradient(B[0], B[1], 0, B[0], B[1], S * .2); fz.addColorStop(0, gUA(E.c[1], .55)); fz.addColorStop(1, gUA(E.c[0], 0)); x.fillStyle = fz; x.beginPath(); x.arc(B[0], B[1], S * .2, 0, 7); x.fill();
      for (let k = 0; k < 12; k++) {
        const an = k / 12 * 6.283 + .2, L = S * (.14 + gUH(k, 9) * .09) * gUE(gUP(t, 1.22 + k * .012, 1.42 + k * .012)), w = S * .022;
        x.save(); x.translate(B[0], B[1]); x.rotate(an); x.fillStyle = k % 2 ? E.c[0] : E.c[2];
        x.beginPath(); x.moveTo(S * .05, -w); x.lineTo(S * .05 + L, 0); x.lineTo(S * .05, w); x.closePath(); x.fill();
        x.fillStyle = E.c[1]; x.beginPath(); x.moveTo(S * .05, -w * .4); x.lineTo(S * .05 + L, 0); x.lineTo(S * .05, 0); x.closePath(); x.fill(); x.restore();
      }
      x.restore();
    }
  },
  phong(x, S, t, E, C, B) {
    for (let i = 0; i < 4; i++) { // phong nhận hình lưỡi liềm
      const v = gUP(t, .78 + i * .06, 1.18 + i * .06); if (v <= 0 || v >= 1) continue;
      const px = gUL(C[0], B[0], v), py = gUL(C[1], B[1], v) + Math.sin(v * 6 + i) * S * .04, an = Math.atan2(B[1] - C[1], B[0] - C[0]);
      x.save(); x.translate(px, py); x.rotate(an); x.fillStyle = gUA(E.c[0], .9); x.beginPath(); x.arc(0, 0, S * .07, -1.2, 1.2); x.arc(-S * .025, 0, S * .06, 1.1, -1.1, true); x.closePath(); x.fill();
      x.strokeStyle = E.c[1]; x.lineWidth = S * .004; x.beginPath(); x.arc(0, 0, S * .07, -1, 1); x.stroke(); x.restore();
    }
    const g = gUP(t, 1.18, 1.4), a = 1 - gUP(t, 1.85, 2.15); // lốc xoáy
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a; x.lineCap = 'round';
      for (let k = 0; k < 11; k++) {
        const y = B[1] + S * .2 - k * S * .04 * gUE(g), r = S * (.03 + k * .016), st = t * 14 + k * .7 + Math.sin(t * 5 + k) * .3;
        x.strokeStyle = k % 3 ? E.c[0] : E.c[1]; x.lineWidth = S * .008; x.beginPath(); x.ellipse(B[0] + Math.sin(t * 6 + k * .4) * S * .015, y, r, r * .28, 0, st, st + 4.2); x.stroke();
      }
      for (let i = 0; i < 12; i++) { const an = t * 10 + i * .52, r = S * (.06 + (i % 4) * .04), y = B[1] + S * .18 - (i * .037 % 1) * S * .4; gUShape(x, 'leaf', B[0] + Math.cos(an) * r, y, S * .009, an, '#c8ffe0', .8); }
      x.restore();
    }
  },
  am(x, S, t, E, C, B) {
    const v = gUP(t, .78, 1.24);
    if (v > 0 && v < 1) { // ám cầu với xúc tu
      const px = gUL(C[0], B[0], gUI(v) * .5 + v * .5), py = gUL(C[1], B[1], gUI(v) * .5 + v * .5);
      x.save(); x.strokeStyle = E.c[0]; x.lineWidth = S * .006; x.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const an = k * 1.05 + t * 5; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(an) * S * .05, py + Math.sin(an) * S * .05, px + Math.cos(an + .8) * S * .08, py + Math.sin(an + .8) * S * .08); x.stroke(); }
      x.fillStyle = E.c[2]; x.beginPath(); x.arc(px, py, S * .04, 0, 7); x.fill(); x.restore(); gUGlowAt(x, px, py, S * .1, E.c[0], .9);
    }
    const g = gUP(t, 1.2, 1.45), a = 1 - gUP(t, 1.85, 2.2); // hố đen nuốt hồn
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a; const R = S * .2 * gUE(g);
      for (let k = 0; k < 4; k++) { x.strokeStyle = k % 2 ? E.c[0] : E.c[1]; x.lineWidth = S * .007; x.beginPath(); const st = t * (6 + k) + k * 1.6; x.ellipse(B[0], B[1], R * (1 - k * .15), R * (1 - k * .15) * .45, -.3, st, st + 2.6); x.stroke(); }
      const hg = x.createRadialGradient(B[0], B[1], 0, B[0], B[1], R * .6); hg.addColorStop(0, '#000'); hg.addColorStop(.7, gUA(E.c[2], .95)); hg.addColorStop(1, gUA(E.c[0], 0));
      x.fillStyle = hg; x.beginPath(); x.arc(B[0], B[1], R * .6, 0, 7); x.fill();
      for (let i = 0; i < 18; i++) { const u = (t * 1.3 + gUH(i, 2)) % 1, an = gUH(i, 3) * 6.283 + u * 3, r = S * .32 * (1 - u); gUShape(x, 'smoke', B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r, S * .012 * (1 - u) + 1, 0, i % 2 ? E.c[1] : E.c[0], u * a); }
      x.restore();
    }
  },
  quang(x, S, t, E, C, B) {
    if (t > .82 && t < 1.3) { // thánh quang trụ bắn thẳng
      const v = gUE(gUP(t, .82, .96)), a = 1 - gUP(t, 1.15, 1.3), ex = gUL(C[0], B[0], v), ey = gUL(C[1], B[1], v);
      x.save(); x.globalAlpha = a; x.lineCap = 'round';
      for (const [w, col] of [[.05, gUA(E.c[0], .35)], [.026, E.c[0]], [.01, '#fff']]) { x.strokeStyle = col; x.lineWidth = S * w * (1 + Math.sin(t * 60) * .1); x.beginPath(); x.moveTo(C[0], C[1]); x.lineTo(ex, ey); x.stroke(); }
      x.restore();
    }
    const g = gUP(t, 1.2, 1.35), a = 1 - gUP(t, 1.75, 2.1); // cột sáng từ trời + thập tự tinh
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a; const w = S * .12 * gUE(g);
      const lg = x.createLinearGradient(B[0] - w, 0, B[0] + w, 0); lg.addColorStop(0, gUA(E.c[0], 0)); lg.addColorStop(.35, gUA(E.c[0], .7)); lg.addColorStop(.5, 'rgba(255,255,255,.95)'); lg.addColorStop(.65, gUA(E.c[0], .7)); lg.addColorStop(1, gUA(E.c[0], 0));
      x.fillStyle = lg; x.fillRect(B[0] - w, 0, w * 2, B[1] + S * .05);
      x.translate(B[0], B[1]); x.rotate(t * 1.5); x.fillStyle = '#fff'; const L = S * .3 * gUE(g);
      x.beginPath(); x.moveTo(0, -L); x.lineTo(S * .015, 0); x.lineTo(0, L); x.lineTo(-S * .015, 0); x.closePath(); x.moveTo(-L, 0); x.lineTo(0, S * .015); x.lineTo(L, 0); x.lineTo(0, -S * .015); x.closePath(); x.fill();
      x.restore(); gUGlowAt(x, B[0], B[1], S * .22, E.c[1], a);
    }
  },
  doc(x, S, t, E, C, B) {
    for (let i = 0; i < 10; i++) { // mây độc cuồn cuộn
      const v = gUP(t, .78 + i * .03, 1.25 + i * .03); if (v <= 0 || v >= 1) continue;
      const px = gUL(C[0], B[0], v) + Math.sin(v * 8 + i) * S * .03, py = gUL(C[1], B[1], v) + Math.cos(v * 7 + i) * S * .03;
      gUShape(x, 'smoke', px, py, S * (.03 + gUH(i, 1) * .02), 0, i % 2 ? E.c[0] : E.c[2], .75 * Math.sin(v * Math.PI));
    }
    const g = gUP(t, 1.2, 1.5), a = 1 - gUP(t, 1.85, 2.2); // sương độc bao trùm, bong bóng sôi, giọt độc
    if (g > 0 && a > 0) {
      x.save();
      for (let i = 0; i < 9; i++) { const an = i / 9 * 6.283 + t, r = S * .1 * gUE(g); gUShape(x, 'smoke', B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r * .6, S * .07 * gUE(g), 0, i % 2 ? E.c[2] : E.c[0], .45 * a); }
      for (let i = 0; i < 16; i++) { const u = (t * 1.5 + gUH(i, 4)) % 1; gUShape(x, 'bubble', B[0] + (gUH(i, 5) - .5) * S * .3, B[1] + S * .1 - u * S * .3, S * (.008 + gUH(i, 6) * .014), 0, E.c[1], (1 - u) * a); }
      for (let i = 0; i < 6; i++) { const u = (t * 2 + gUH(i, 8)) % 1; gUShape(x, 'drop', B[0] + (gUH(i, 7) - .5) * S * .2, B[1] + u * S * .2, S * .012, 3.14, E.c[0], (1 - u) * a); }
      x.restore();
    }
  },
  khong(x, S, t, E, C, B) {
    const portal = (px, py, r, a, rot) => { if (a <= 0 || r <= 0) return; x.save(); x.globalAlpha = a; x.translate(px, py); x.rotate(rot);
      for (let k = 0; k < 5; k++) { x.strokeStyle = k % 2 ? E.c[1] : E.c[0]; x.lineWidth = r * .08; x.beginPath(); x.ellipse(0, 0, r * (1 - k * .14), r * .45 * (1 - k * .14), 0, k, k + 4.5); x.stroke(); }
      x.fillStyle = gUA(E.c[2], .9); x.beginPath(); x.ellipse(0, 0, r * .4, r * .18, 0, 0, 7); x.fill(); x.restore(); };
    portal(C[0] + S * .1, C[1] - S * .1, S * .08 * gUBell(t, .75, 1.15), 1, t * 2); portal(B[0], B[1] - S * .1, S * .1 * gUBell(t, .9, 1.35), 1, -t * 2);
    if (t > .95 && t < 1.25) { const v = gUP(t, .95, 1.22); gUGlowAt(x, B[0], gUL(B[1] - S * .1, B[1], v), S * .08, E.c[1], 1); }
    const g = gUP(t, 1.22, 1.32), a = 1 - gUP(t, 1.75, 2.1); // vết nứt không gian
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a; x.lineJoin = 'miter';
      for (let k = 0; k < 6; k++) {
        const an = k / 6 * 6.283 + .3; let px = B[0], py = B[1]; x.beginPath(); x.moveTo(px, py);
        for (let j = 1; j <= 5; j++) { const L = S * .05 * gUE(g), b = an + (gUH(k, j) - .5) * .9; px += Math.cos(b) * L; py += Math.sin(b) * L; x.lineTo(px, py); }
        x.strokeStyle = E.c[2]; x.lineWidth = S * .016; x.stroke(); x.strokeStyle = '#fff'; x.lineWidth = S * .005; x.stroke();
      }
      for (let i = 0; i < 10; i++) { // mảnh không gian vỡ trôi lệch
        const an = gUH(i, 1) * 6.283, r = S * (.1 + gUH(i, 2) * .1) + gUP(t, 1.3, 2) * S * .06, s = S * .025;
        x.save(); x.translate(B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r); x.rotate(an + t * 2); x.fillStyle = gUA(E.c[0], .55); x.strokeStyle = E.c[1]; x.lineWidth = 1;
        x.beginPath(); x.moveTo(-s, -s * .5); x.lineTo(s * .8, -s * .7); x.lineTo(s * .4, s * .7); x.closePath(); x.fill(); x.stroke(); x.restore();
      }
      x.restore();
    }
  },
  thoi(x, S, t, E, C, B) {
    const clock = (px, py, r, rot, a, spin) => { if (a <= 0 || r <= 0) return; x.save(); x.globalAlpha = a; x.translate(px, py); x.rotate(rot);
      x.strokeStyle = E.c[0]; x.lineWidth = r * .06; x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); x.lineWidth = r * .025; x.beginPath(); x.arc(0, 0, r * .85, 0, 7); x.stroke();
      for (let k = 0; k < 12; k++) { const an = k / 12 * 6.283, l = k % 3 ? .08 : .16; x.beginPath(); x.moveTo(Math.cos(an) * r * .85, Math.sin(an) * r * .85); x.lineTo(Math.cos(an) * r * (.85 - l), Math.sin(an) * r * (.85 - l)); x.stroke(); }
      x.strokeStyle = E.c[1]; x.lineCap = 'round'; x.lineWidth = r * .05; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(spin) * r * .7, Math.sin(spin) * r * .7); x.moveTo(0, 0); x.lineTo(Math.cos(spin / 12) * r * .45, Math.sin(spin / 12) * r * .45); x.stroke();
      x.fillStyle = E.c[1]; x.beginPath(); x.arc(0, 0, r * .06, 0, 7); x.fill(); x.restore(); };
    const v = gUP(t, .78, 1.22);
    if (v > 0 && v < 1) clock(gUL(C[0], B[0], gUE(v)), gUL(C[1], B[1], gUE(v)), S * .06, v * 6, 1, -t * 30);
    const g = gUP(t, 1.2, 1.4), a = 1 - gUP(t, 1.85, 2.2); // đồng hồ khổng lồ quay ngược, gợn sóng thời gian
    if (g > 0 && a > 0) {
      for (let k = 0; k < 3; k++) { const u = (gUP(t, 1.22, 2) * 1.5 + k / 3) % 1; x.save(); x.globalAlpha = (1 - u) * a * .7; x.strokeStyle = E.c[0]; x.lineWidth = S * .004; x.beginPath(); x.arc(B[0], B[1], S * (.12 + u * .2), 0, 7); x.stroke(); x.restore(); }
      clock(B[0], B[1], S * .2 * gUE(g), 0, a * .9, -t * 40); clock(B[0], B[1], S * .11 * gUE(g), 0, a * .7, t * 25);
    }
  },
  ao(x, S, t, E, C, B, imgs) {
    for (let k = 0; k < 4; k++) { // phân thân ảo ảnh lướt tới
      const v = gUP(t, .78 + k * .05, 1.2 + k * .05); if (v <= 0 || v >= 1) continue;
      const an = (k - 1.5) * .5, px = gUL(C[0], B[0] + Math.cos(an + 3.6) * S * .12, gUE(v)), py = gUL(C[1], B[1] + Math.sin(an + 3.6) * S * .12, gUE(v));
      x.save(); x.globalAlpha = .55 * Math.sin(v * Math.PI); gUDisc(x, imgs.c, px, py, S * .07, E.c[0], gUA(E.c[0], .45)); x.restore();
    }
    const g = gUP(t, 1.2, 1.45), a = 1 - gUP(t, 1.85, 2.2); // kính vạn hoa: mảnh gương và cánh hoa xoay
    if (g > 0 && a > 0) {
      x.save(); x.globalAlpha = a;
      for (let k = 0; k < 8; k++) { const an = k / 8 * 6.283 + t * 2, r = S * .16 * gUE(g), s = S * .035;
        x.save(); x.translate(B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r); x.rotate(an); const lg = x.createLinearGradient(-s, -s, s, s); lg.addColorStop(0, E.c[1]); lg.addColorStop(.5, '#ffffff'); lg.addColorStop(1, E.c[0]);
        x.fillStyle = lg; x.globalAlpha = a * .8; x.beginPath(); x.moveTo(0, -s * 1.3); x.lineTo(s * .7, 0); x.lineTo(0, s * 1.3); x.lineTo(-s * .7, 0); x.closePath(); x.fill(); x.restore(); }
      for (let i = 0; i < 24; i++) { const an = i / 24 * 6.283 - t * 3, r = S * (.05 + (i % 3) * .035) * gUE(g); gUShape(x, 'petal', B[0] + Math.cos(an) * r, B[1] + Math.sin(an) * r, S * .014, an + 1.571, i % 2 ? E.c[0] : E.c[1], 1); }
      x.restore();
    }
  }
};

// ---- vẽ một khung hình ở thời điểm t ----
// imgs = { c: ảnh nhân vật, b: ảnh quái } (có thể null)
function gUltRender(x, S, t, el, imgs) {
  const E = GULT[el] || GULT.kim; imgs = imgs || {};
  x.clearRect(0, 0, S, S);
  const C0 = [S * .27, S * .7], B0 = [S * .71, S * .33];
  // rung màn hình khi trúng đích
  const sk = gUP(t, 1.22, 1.75) > 0 && t < 1.75 ? (1 - gUP(t, 1.22, 1.75)) * S * .018 : 0;
  x.save(); if (sk) x.translate(Math.sin(t * 97) * sk, Math.cos(t * 83) * sk);
  // nhân vật: rung khi tụ khí, lao tới khi thi triển, về chỗ khi thu hồi
  const lunge = gUBell(t, .7, 1.5) * .06, shake = t < .78 ? Math.sin(t * 70) * S * .004 * gUP(t, .1, .7) : 0;
  const C = [C0[0] + (B0[0] - C0[0]) * lunge + shake, C0[1] + (B0[1] - C0[1]) * lunge];
  // mục tiêu: bị đánh bật ra khi trúng đích
  const kb = gUBell(t, 1.22, 2.1) * S * .03, B = [B0[0] + kb, B0[1] - kb * .4];
  x.globalCompositeOperation = 'lighter';
  // pha 2: hào quang (nền phát sáng phía sau nhân vật)
  const aura = gUP(t, .3, .6) * (1 - gUP(t, 1.5, 2.1));
  gUGlowAt(x, C[0], C[1], S * (.24 + Math.sin(t * 12) * .01), E.c[0], aura * .9);
  x.globalCompositeOperation = 'source-over';
  gURuneCircle(x, C[0], C[1] + S * .08, S * .2 * gUE(gUP(t, .42, .7)), t * 1.2, E.c[0], aura * .85);
  // mục tiêu
  const hitT = gUBell(t, 1.22, 1.7);
  gUDisc(x, imgs.b, B[0], B[1], S * .15, hitT > .1 ? E.c[1] : 'rgba(255,255,255,.5)', hitT > 0 ? gUA(E.c[0], hitT * .55) : null);
  // nhân vật (khung viền đổi màu theo hệ khi thức tỉnh)
  const ringA = gUP(t, .42, .6) * (1 - gUP(t, 2.1, 2.5));
  gUDisc(x, imgs.c, C[0], C[1], S * .14, ringA > .5 ? E.c[0] : 'rgba(255,255,255,.75)', null);
  x.globalCompositeOperation = 'lighter';
  // pha 1: hạt tụ về nhân vật
  for (let i = 0; i < 46; i++) {
    const d = gUH(i, 3) * .3, u = gUP(t, .02 + d, .42 + d); if (u <= 0 || u >= 1) continue;
    const an = gUH(i, 1) * 6.283 + u * 2, r = S * (.16 + gUH(i, 2) * .2) * (1 - gUE(u)), px = C[0] + Math.cos(an) * r, py = C[1] + Math.sin(an) * r;
    gUGlowAt(x, px, py, S * .025, E.c[0], Math.sin(u * Math.PI));
    gUShape(x, E.sh, px, py, S * .008, an, E.c[1], Math.sin(u * Math.PI));
  }
  // pha 2: tia sáng bốc lên quanh nhân vật
  for (let i = 0; i < 14; i++) {
    const u = (t * 1.4 + gUH(i, 7)) % 1, a = aura * Math.sin(u * Math.PI);
    gUShape(x, E.sh, C[0] + (gUH(i, 8) - .5) * S * .26, C[1] + S * .1 - u * S * .3, S * .011, u * 3, E.c[1], a);
  }
  x.globalCompositeOperation = 'source-over';
  // pha 3 + 4
  (GULT_FX[el] || GULT_FX.kim)(x, S, t, E, C, B, imgs);
  // pha 5: bùng nổ: chớp sáng, sóng xung kích, hạt văng
  x.globalCompositeOperation = 'lighter';
  const fl = gUBell(t, 1.5, 1.85);
  gUGlowAt(x, B[0], B[1], S * .3, E.c[0], fl * .9); gUGlowAt(x, B[0], B[1], S * .16, '#ffffff', fl * .8);
  for (let k = 0; k < 2; k++) {
    const u = gUP(t, 1.55 + k * .1, 2.05 + k * .1); if (u <= 0 || u >= 1) continue;
    x.globalAlpha = 1 - u; x.strokeStyle = k ? E.c[1] : E.c[0]; x.lineWidth = S * .02 * (1 - u) + 1;
    x.beginPath(); x.ellipse(B[0], B[1], S * .27 * gUE(u), S * .22 * gUE(u), 0, 0, 7); x.stroke(); x.globalAlpha = 1;
  }
  for (let i = 0; i < 52; i++) {
    const u = gUP(t, 1.58, 2.05 + gUH(i, 4) * .4); if (u <= 0 || u >= 1) continue;
    const an = gUH(i, 5) * 6.283, sp = S * (.14 + gUH(i, 6) * .16), e = gUE(u), px = B[0] + Math.cos(an) * sp * e, py = B[1] + Math.sin(an) * sp * e + u * u * S * .08;
    if (i % 3 === 0) gUGlowAt(x, px, py, S * .03, E.c[0], 1 - u);
    gUShape(x, E.sh, px, py, S * (.007 + gUH(i, 9) * .008) * (1 - u * .5), an + u * 4, i % 2 ? E.c[1] : E.c[0], 1 - u);
  }
  // pha 6: thu hồi: vài đốm sáng bay về nhân vật rồi tan
  for (let i = 0; i < 12; i++) {
    const u = gUP(t, 2 + gUH(i, 11) * .15, 2.5); if (u <= 0 || u >= 1) continue;
    const px = gUL(B[0] + (gUH(i, 12) - .5) * S * .3, C[0], gUE(u)), py = gUL(B[1] + (gUH(i, 13) - .5) * S * .3, C[1], gUE(u)) - Math.sin(u * Math.PI) * S * .1;
    gUGlowAt(x, px, py, S * .02, E.c[0], Math.sin(u * Math.PI) * .8);
  }
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  x.restore();
}

// ---- phát hiệu ứng toàn màn hình ----
// opts: { char: id nhân vật, boss: src ảnh quái, loop: lặp lại, label: hiện tên chiêu }
// trả về Promise khi xong (hoặc khi người chơi chạm để bỏ qua)
// Video chiêu cuối do người dùng tạo (thư mục ult-video/). Hệ nào có video thì phát video, hệ khác dùng hiệu ứng canvas.
// Nếu video lỗi/thiếu file thì tự quay về hiệu ứng canvas.
const GULT_VID = { kim: 'ult-video/kim', hoa: 'ult-video/hoa', thuy: 'ult-video/thuy' }; // video theo HỆ (có cả .webm và .mp4)
// Video chiêu cuối theo từng NHÂN VẬT: đặt file ult-video/<id nhân vật>.webm và/hoặc .mp4 (vd kiem.mp4, loi.webm).
// Liệt kê id ở đây để app thử phát; thiếu file thì tự quay về video theo hệ rồi tới hiệu ứng canvas.
const GULT_CVID = ['kiem', 'hoa', 'thuy', 'moc', 'dia', 'loi', 'bang', 'phong', 'hon', 'quang', 'doc', 'khong', 'thoi', 'kimcuong', 'dan', 'khi'];
function gUltPlay(el, opts) {
  opts = opts || {};
  return new Promise(res => {
    const E = GULT[el] || GULT.kim, ov = document.createElement('div');
    ov.className = 'ult-ov';
    const sz = Math.floor(Math.min(innerWidth - 16, innerHeight - 120, 560)), dpr = Math.min(2, window.devicePixelRatio || 1);
    ov.innerHTML = '<div class="ult-st"></div>' +
      (opts.label === false ? '' : `<div class="ult-nm" style="--uc:${E.c[0]}"><span class="han">${E.h}</span><small>${E.p}</small><b>${GEL[el] ? GEL[el].e + ' ' : ''}${esc(E.n)}</b></div>`) +
      `<div class="ult-sk">${opts.loop ? 'Chạm hoặc Enter để đóng' : 'Chạm hoặc Enter để bỏ qua'}</div>`;
    document.body.appendChild(ov);
    const st = ov.querySelector('.ult-st');
    let done = false, raf, vid = null;
    // Enter / Space / Esc: bỏ qua hoạt cảnh (bắt ở window, pha capture, để phím không lọt xuống trận đấu)
    const key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); } };
    window.addEventListener('keydown', key, true);
    const end = () => { if (done) return; done = true; window.removeEventListener('keydown', key, true); cancelAnimationFrame(raf); if (vid) vid.pause(); ov.classList.add('out'); setTimeout(() => ov.remove(), 220); res(); };
    ov.onclick = end;
    const canvasFx = () => {
      if (done) return;
      if (vid) { vid.remove(); vid = null; }
      st.innerHTML = `<canvas width="${Math.round(sz * dpr)}" height="${Math.round(sz * dpr)}" style="width:${sz}px;height:${sz}px"></canvas>`;
      const cv = st.querySelector('canvas'), x = cv.getContext('2d'), SZ = cv.width;
      const ld = src => { if (!src) return null; const im = new Image(); im.src = src; return im; };
      const imgs = { c: ld(typeof charImg === 'function' ? charImg(opts.char || (S && S.hero && S.hero.char) || 'kiem', 'bust') : null), b: ld(opts.boss) };
      let t0 = performance.now();
      const fr = now => {
        if (done) return;
        let t = (now - t0) / 1000;
        if (t >= GULT_T) { if (!opts.loop) return end(); t0 = now; t = 0; }
        gUltRender(x, SZ, t, el, imgs); raf = requestAnimationFrame(fr);
      };
      raf = requestAnimationFrame(fr);
    };
    const cid = opts.char || (S && S.hero && S.hero.char) || 'kiem', srcs = [];
    const addSrc = base => { if (!base) return; const t = document.createElement('video'); if (t.canPlayType('video/webm; codecs="vp9, opus"')) srcs.push(base + '.webm'); srcs.push(base + '.mp4'); };
    if (!opts.elOnly && GULT_CVID.includes(cid)) addSrc('ult-video/' + cid);
    addSrc(GULT_VID[el]);
    if (!srcs.length || opts.canvas) return canvasFx();
    vid = document.createElement('video');
    vid.className = 'ult-vd'; vid.playsInline = true; vid.preload = 'auto'; vid.loop = !!opts.loop;
    vid.style.width = Math.floor(Math.min(innerWidth - 16, 640)) + 'px';
    // phát có tiếng; nếu trình duyệt chặn tự phát có tiếng (NotAllowedError) thì phát không tiếng. File thiếu/lỗi do onerror xử lý.
    const tryPlay = () => vid.play().catch(e => { if (!vid || done || !e || e.name !== 'NotAllowedError') return; vid.muted = true; vid.play().catch(() => {}); });
    let si = 0; vid.onerror = () => { if (done || !vid) return; si++; if (si < srcs.length) { vid.src = srcs[si]; tryPlay(); } else canvasFx(); };
    vid.onended = () => { if (!opts.loop) end(); };
    vid.src = srcs[0]; st.appendChild(vid);
    tryPlay();
    // chống treo: nếu sau 2 giây video vẫn chưa chạy thì dùng hiệu ứng canvas
    setTimeout(() => { if (vid && !done && vid.currentTime === 0) canvasFx(); }, 2000 + 600 * (srcs.length - 1));
  });
}
// hệ của nhân vật đang dùng
const gUltEl = () => gElOf((S.hero && S.hero.char) || 'kiem');

// ---- màn hình xem trước 14 chiêu cuối ----
function vUltGallery() {
  const me = gUltEl(), W = S.week, bs = W ? GBOSS[W.boss] : null, boss = bs ? GIMG['m_' + bs.id + '_art'] : null;
  view.innerHTML = `<div class="card" style="text-align:left"><h3 style="margin:0 0 4px">🌟 Chiêu cuối 14 hệ</h3>
    <p class="mut" style="margin:0">Trong trận đánh quái tuần, cứ <b>${GULT_COMBO} câu đúng liên tiếp</b> nhân vật sẽ tung chiêu cuối theo hệ của mình: 1 đòn chắc chắn trúng, sát thương ×${GULT_MULT}. Hệ của bạn: <b>${gElLabel(S.hero.char || 'kiem')}</b>. Chạm một chiêu để xem (hiệu ứng dùng ảnh nhân vật hiện tại của bạn).</p></div>
  <div class="ult-grid">${GULT_ORDER.map(k => { const E = GULT[k]; return `<button class="ult-c${k === me ? ' me' : ''}" data-el="${k}" style="--uc:${E.c[0]}"><span class="ue">${GEL[k].e}</span><span class="han" style="font-size:20px">${E.h}</span><small>${E.p}</small><b>${esc(E.n)}</b><small class="mut">Hệ ${GEL[k].n}${GULT_VID[k] ? ' · 🎬 video' : ''}${k === me ? ' · của bạn' : ''}</small></button>`; }).join('')}</div>
  <div class="row"><button id="ug-back">← Về trận chiến</button></div>`;
  scrollTo(0, 0);
  view.querySelector('.ult-grid').onclick = e => { const b = e.target.closest('.ult-c'); if (b) gUltPlay(b.dataset.el, { boss, loop: true, elOnly: b.dataset.el !== me }); };
  $('#ug-back').onclick = () => go('fight');
}
