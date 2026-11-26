// ============================================================
//  HỆ THỐNG NHẬP VAI TU TIÊN: trang bị, chuỗi đúng liên tục, quái tuần
//  Phụ thuộc vào index.html: S, view, go, esc, shuffle, pick, toast, addXP, header,
//  realmInfo, REALMS, lw, speak, save, today, DAY, itemOf ... (dùng lúc chạy)
// ============================================================
const GCFG = {
  comboDrop: 10,      // cứ N câu đúng liên tiếp thì rơi 1 món
  dropsPerDay: 6,     // trần số món rơi từ combo mỗi ngày (chống cày)
  battleSec: 90,      // thời gian mỗi trận
  cooldownH: 3,       // giờ chờ giữa 2 trận
  // HP quái tuần theo cảnh giới của người chơi (Luyện Khí... Độ Kiếp). Quái luôn cùng cảnh giới với bạn.
  bossHp: [2000, 4800, 8400, 13000, 19000, 27000, 36000, 48000, 64000],
  timeBonus: 1,       // mỗi câu đúng khi đánh quái được cộng thêm bao nhiêu giây vào tổng thời gian
  xpDayCap: 700,      // tu vi tối đa nhận được mỗi ngày (mọi nguồn)
  daysPerRealm: 7,    // số ngày học đều tối thiểu để lên 1 cảnh giới (tu vi mỗi cảnh = xpDayCap x daysPerRealm)
  pillsPerDay: 3,     // số đan dược tối đa dùng mỗi ngày
  bagMax: 80,         // sức chứa hành trang
  pillCD: 60,         // giá Hồi Linh Đan (xóa thời gian chờ)
  practiceCap: 100,   // số câu luyện tập tự do/ngày được tính thưởng (chống cày)
  tribCdMin: 10,      // phút chờ giữa 2 lần thi độ kiếp
  testQ: 20,          // số câu bài test độ kiếp
  testPass: 0.8       // tỉ lệ đúng tối thiểu để qua độ kiếp
};
// Hệ số linh thạch theo cảnh giới (ri = 0..8): càng lên cao càng nhận nhiều để theo kịp giá đồ
const LSM = [1, 1.4, 2, 2.6, 3.4, 4.4, 5.6, 7, 9];
const gXpRoom = () => Math.max(0, GCFG.xpDayCap - (S.xpDay === today() ? (S.xpToday || 0) : 0));
const lsGain = n => Math.max(1, Math.round(n * LSM[Math.min(realmInfo(S.xp).ri, 8)]));
const GHSK_AVAIL = [1, 2, 3, 4, 5]; // các HSK đã có nội dung trong app
function gPracOK() {
  const d = today(); if (S.pracDay !== d) { S.pracDay = d; S.pracN = 0; }
  if (S.pracN >= GCFG.practiceCap) return false;
  S.pracN++; return true;
}
const GT = [
  { n: 'Phàm Khí', c: '#9aa0a6', m: 1, pref: 'Phàm Thiết', minRealm: 0 },
  { n: 'Linh Khí', c: '#4a90e2', m: 1.9, pref: 'Thanh Linh', minRealm: 1 },
  { n: 'Pháp Khí', c: '#3fbf7f', m: 3.3, pref: 'Bích Diễm', minRealm: 2 },
  { n: 'Bảo Khí', c: '#9b6bd6', m: 5.5, pref: 'Tử Hà', minRealm: 3 },
  { n: 'Linh Bảo', c: '#e0b84f', m: 9, pref: 'Kim Huy', minRealm: 4 },
  { n: 'Tiên Khí', c: '#f08a3c', m: 14.5, pref: 'Xích Viêm', minRealm: 5 },
  { n: 'Thần Khí', c: '#e0457b', m: 23, pref: 'Thần Quang', minRealm: 7 },
  { n: 'Hỗn Độn Chí Bảo', c: '#c77dff', m: 38, pref: 'Hỗn Nguyên', minRealm: 8, rainbow: true }
];
GT.forEach(t => { t.frame = t.rainbow ? 'linear-gradient(135deg,#ff6b6b,#ffd93d,#6bcb77,#4d96ff,#c77dff)' : t.c; });
const GSLOTS = ['weapon', 'treasure', 'armor', 'pendant', 'ring', 'talisman'];
const GSLOTN = { weapon: 'Vũ khí', treasure: 'Pháp bảo', armor: 'Trang bị', pendant: 'Hộ tâm', ring: 'Giới chỉ', talisman: 'Linh phù' };
const GKINDS = {
  weapon: [{ id: 'kiem', n: 'Kiếm' }, { id: 'dao', n: 'Đao' }, { id: 'thuong', n: 'Thương' }, { id: 'truong', n: 'Pháp Trượng' }, { id: 'cung', n: 'Cung' }, { id: 'phien', n: 'Phiến' }],
  treasure: [{ id: 'baothap', n: 'Bảo Tháp', x: { def: 3, hp: 20 } }, { id: 'holo', n: 'Hồ Lô', x: { hp: 40 } }, { id: 'linhchung', n: 'Linh Chung', x: { def: 3, spd: 1 } },
    { id: 'kinh', n: 'Càn Khôn Kính', x: { hit: 2, crit: .5 } }, { id: 'phikiem', n: 'Phi Kiếm', x: { atk: 5, spd: 1 } }, { id: 'sonha', n: 'Sơn Hà Đồ', x: { hp: 30, def: 2 } },
    { id: 'tranyeu', n: 'Trấn Yêu Tháp', x: { atk: 4, def: 3 } }, { id: 'dinhhon', n: 'Định Hồn Châu', x: { crit: .8, hit: 2 } }],
  armor: [{ id: 'a1', n: 'Pháp Y' }, { id: 'a2', n: 'Đạo Bào' }, { id: 'a3', n: 'Chiến Giáp' }],
  pendant: [{ id: 'p1', n: 'Ngọc Bội' }, { id: 'p2', n: 'Hộ Tâm Kính' }, { id: 'p3', n: 'Bình An Bài' }],
  ring: [{ id: 'r1', n: 'Giới Chỉ' }, { id: 'r2', n: 'Nạp Giới' }, { id: 'r3', n: 'Phù Giới' }],
  talisman: [{ id: 'l1', n: 'Linh Phù' }, { id: 'l2', n: 'Bảo Phù' }, { id: 'l3', n: 'Trấn Phù' }]
};
const GBASE = {
  weapon: { atk: 10, hit: 3, crit: .8, spd: 1 },
  treasure: { atk: 5, hp: 30, spd: 2, crit: .5 },
  armor: { hp: 80, def: 8 },
  pendant: { hp: 50, def: 5, luck: 1, expb: .5 },
  ring: { atk: 3, crit: 1.2, hit: 4, spd: 2 },
  talisman: { spd: 3, crit: 1, hp: 30, luck: 1 }
};
const GSTATN = { hp: 'HP', atk: 'ATK', def: 'DEF', crit: 'CRIT%', spd: 'SPD', hit: 'HIT', luck: 'Vận', expb: 'EXP%' };
const GDEC = { crit: 1, hit: 1, luck: 1, expb: 1 };
const GEPI = ['Trảm Nguyệt', 'Phá Thiên', 'Truy Phong', 'Tuyệt Trần', 'Liệt Dương', 'Hàn Băng', 'Thanh Vân', 'Long Ngâm', 'Hổ Khiếu', 'Tinh Hà', 'Ngự Lôi', 'Huyền Minh', 'Chiếu Dạ', 'Vô Cực', 'Thái Ất', 'Bích Lạc', 'Phi Tuyết', 'Ly Hỏa', 'Càn Nguyên', 'Khôn Đức'];
const GFX = {
  vamp: { n: 'Hút huyết', base: 6, d: v => `Hồi ${v}% sát thương gây ra thành HP` },
  burn: { n: 'Thiêu đốt', base: 8, d: v => `+${v}% sát thương gây ra` },
  pierce: { n: 'Xuyên giáp', base: 15, d: v => `Bỏ qua ${v}% DEF của quái` },
  guard: { n: 'Hộ thể', base: 8, d: v => `Giảm ${v}% sát thương nhận vào` },
  swift: { n: 'Thần tốc', base: 2, d: v => `+${v} giây mỗi trận đánh quái` },
  fortune: { n: 'Phúc vận', base: 8, d: v => `+${v}% cơ hội rơi đồ phẩm cao hơn` }
};
// Phẩm cấp trong cùng một phẩm (cảnh giới): q = 1..5. m = hệ số chỉ số, x = số dòng thuộc tính cộng thêm, fx = hệ số hiệu ứng.
// Đồ cũ (chưa có it.q) được coi là Trung Phẩm, chỉ số giữ nguyên.
const GQ = [
  { n: 'Hạ Phẩm', c: '#9aa0a6', m: .85, x: 0, fx: .9 },
  { n: 'Trung Phẩm', c: '#5fb878', m: 1, x: 0, fx: 1 },
  { n: 'Thượng Phẩm', c: '#4a90e2', m: 1.15, x: 1, fx: 1.1 },
  { n: 'Cực Phẩm', c: '#b06ce0', m: 1.32, x: 2, fx: 1.2 },
  { n: 'Tuyệt Phẩm', c: '#ff9f1c', m: 1.55, x: 3, fx: 1.35 }
];
// Tỉ lệ (%) ra từng phẩm cấp theo nguồn rơi [Hạ, Trung, Thượng, Cực, Tuyệt]
const GQW = {
  normal: [40, 33, 18, 7, 2],   // combo, luyện tập, Tiên Phủ
  trib: [0, 45, 35, 15, 5],     // độ kiếp, rương chuỗi < 21 ngày
  boss: [0, 0, 65, 27, 8],      // mọi đồ rơi từ boss: chắc chắn Thượng Phẩm trở lên
  kill: [0, 0, 0, 75, 25]       // thưởng kết liễu boss phòng online
};
// Giá trị gốc của một dòng thuộc tính cộng thêm (nhân với hệ số phẩm và phẩm cấp)
const GXS = { hp: 40, atk: 5, def: 4, crit: .8, spd: 1.5, hit: 2.5, luck: 1, expb: .6 };
const gQOf = it => Math.max(1, Math.min(5, it.q || 2));
const gQTag = it => { const g = GQ[gQOf(it) - 1]; return `<span style="color:${g.c};font-weight:700">${'★'.repeat(gQOf(it))} ${g.n}</span>`; };
function gRollQ(src, rng, luck) {
  const r = rng || Math.random, w = GQW[src] || GQW.normal, tot = w.reduce((a, b) => a + b, 0);
  let x = r() * tot, q = 1;
  for (let i = 0; i < 5; i++) { if (x < w[i]) { q = i + 1; break; } x -= w[i]; q = i + 1; }
  if (luck && q < 5 && r() < luck) q++; // Phúc vận: có cơ hội lên thêm 1 phẩm cấp
  return q;
}
const GFXSLOT = { weapon: ['burn', 'pierce', 'vamp'], treasure: ['pierce', 'burn', 'swift'], armor: ['guard', 'vamp'], pendant: ['guard', 'fortune'], ring: ['burn', 'fortune'], talisman: ['swift', 'fortune', 'guard'] };

// ---------- tiện ích ----------
const gRoundStat = (s, v) => GDEC[s] ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
function gRng(seedStr) { // mulberry32 từ chuỗi
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const gMult = lvl => 1 + .08 * lvl + (lvl >= 4 ? .05 : 0) + (lvl >= 10 ? .15 : 0);
const gStatOf = (it, s) => gRoundStat(s, (it.st[s] || 0) * gMult(it.lvl));
const gFxVal = it => { const f = GFX[it.fx]; if (!f) return 0; const v = f.base * (1 + (it.tier - 1) * .2) * (it.lvl >= 10 ? 1.5 : 1) * GQ[gQOf(it) - 1].fx; return Math.round(v); };
const gFxLv = it => gQOf(it) >= 5 ? 4 : 7; // Tuyệt Phẩm mở hiệu ứng sớm từ +4
const gFxOn = it => it.fx && it.lvl >= gFxLv(it);
const gTierForRealm = ri => [1, 2, 3, 4, 5, 6, 6, 7, 8][Math.min(ri, 8)];
const gCanUse = it => realmInfo(S.xp).ri >= GT[it.tier - 1].minRealm;
const gSellPrice = it => Math.round(8 * GT[it.tier - 1].m * GQ[gQOf(it) - 1].m * (1 + it.lvl * .5));
const gUpCost = it => ({ ls: Math.round(15 * GT[it.tier - 1].m * (it.lvl + 1)), cores: it.lvl + 1 });
const gIconSrc = it => (window.GIMG || {})[it.slot === 'weapon' ? `w_${it.tier}_${it.kind}` : it.slot === 'treasure' ? `t_${it.kind}` : `s_${it.slot}`] || '';
function gIconHTML(it, w) {
  const t = GT[it.tier - 1], wide = it.slot === 'weapon', ww = w || (wide ? 92 : 54);
  return `<span class="gi" style="width:${ww}px;background:${t.frame}"><img src="${gIconSrc(it)}" alt="" style="width:100%;display:block;border-radius:8px"></span>`;
}
const gName = it => `${esc(it.name)}${it.lvl ? ' +' + it.lvl : ''}`;

// ---------- sinh trang bị ----------
function gGen(slot, tier, rng, q) {
  const r = rng || Math.random, kinds = GKINDS[slot], k = kinds[(r() * kinds.length) | 0], st = {};
  q = q || gRollQ('normal', r);
  const g = GQ[q - 1], m = GT[tier - 1].m * g.m;
  Object.entries(GBASE[slot]).forEach(([s, b]) => { st[s] = gRoundStat(s, b * m * (.8 + r() * .4)); });
  if (k.x) Object.entries(k.x).forEach(([s, b]) => { st[s] = gRoundStat(s, (st[s] || 0) + b * m * (.8 + r() * .4)); });
  // phẩm cấp cao: thêm dòng thuộc tính mới (ưu tiên chỉ số món này chưa có)
  const xs = [];
  for (let n = 0; n < g.x; n++) {
    const free = Object.keys(GXS).filter(s2 => !(s2 in st)), pool = free.length ? free : Object.keys(st).filter(s2 => !xs.includes(s2));
    if (!pool.length) break;
    const s2 = pool[(r() * pool.length) | 0]; st[s2] = gRoundStat(s2, (st[s2] || 0) + GXS[s2] * m * (.8 + r() * .4)); xs.push(s2);
  }
  const fxl = GFXSLOT[slot], fx = fxl[(r() * fxl.length) | 0];
  const name = `${GT[tier - 1].pref} ${k.n}·${GEPI[(r() * GEPI.length) | 0]}`;
  return { uid: 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36), slot, kind: k.id, tier, q, xs, name, st, lvl: 0, fx };
}
// Phẩm chất đồ rơi theo NGUỒN:
//  - combo / luyện tập: chỉ ra đúng phẩm của cảnh giới hiện tại (T) hoặc thấp hơn 1 bậc (T-1), KHÔNG bao giờ cao hơn.
//    Combo càng dài thì càng dễ ra T thay vì T-1.
//  - boss (quái tuần): mốc 25/50% như combo; mốc 75% có cơ hội T+1; mốc 100% chắc chắn T+1; hạ gục có cơ hội T+2.
//  - trib (độ kiếp thành công): đồ phẩm của cảnh giới mới + 1 bậc.
//  - streak (rương chuỗi ngày): chuỗi < 7 ngày ra T; chuỗi từ 7 ngày ra T+1; từ 21 ngày ra T+2.
function gRollTier(src, arg) {
  const ri = realmInfo(S.xp).ri, T = gTierForRealm(ri), luck = (gStats().fx.fortune || 0) / 100, r = Math.random();
  let t = T;
  if (src === 'kill') src = 'boss', arg = 1;
  if (src === 'combo') { const pT = Math.min(.95, .6 + .1 * (arg || 0) + luck); t = r < pT ? T : T - 1; }
  else if (src === 'boss') {
    if (arg <= .5) t = r < .75 + luck ? T : T - 1;
    else if (arg < 1) t = r < .4 + luck ? T + 1 : T;
    else t = T + 1 + (r < .3 + luck ? 1 : 0);
  }
  else if (src === 'trib') t = gTierForRealm(Math.min(ri + 1, 8)) + 1;
  else if (src === 'streak') t = T + (arg >= 21 ? 2 : arg >= 7 ? 1 : 0);
  return Math.max(1, Math.min(8, t));
}
// phẩm cấp theo nguồn: boss (quái tuần, tháp, phòng online) luôn từ Thượng Phẩm; kết liễu boss phòng từ Cực Phẩm
function gQSrc(src, arg) { return src === 'kill' ? 'kill' : src === 'boss' || src === 'coop' ? 'boss' : src === 'trib' ? 'trib' : src === 'streak' ? (arg >= 21 ? 'boss' : 'trib') : 'normal'; }
function gDrop(src, arg) {
  const luck = (gStats().fx.fortune || 0) / 100;
  const slot = Math.random() < .25 ? 'weapon' : pick(GSLOTS), it = gGen(slot, gRollTier(src || 'combo', arg || 0), null, gRollQ(gQSrc(src, arg), null, luck));
  it.isNew = true; it.src = src || 'combo';
  if (S.bag.length >= GCFG.bagMax) { const p = gSellPrice(it); S.ls += p; it.autoSold = p; }
  else S.bag.push(it);
  return it;
}const gDropHTML = it => `<div style="margin-top:8px;padding:8px;border-radius:10px;border:2px solid ${GT[it.tier - 1].c};text-align:left;display:flex;gap:10px;align-items:center">${gIconHTML(it, 60)}<span><b>🎁 Rơi trang bị!</b><br><span style="color:${GT[it.tier - 1].c};font-weight:700">${GT[it.tier - 1].n}</span> · ${gQTag(it)}<br>${esc(it.name)}${it.autoSold ? '<br><span class="mut">Hành trang đầy, tự bán +' + it.autoSold + ' 💎</span>' : ''}</span></div>`;
// gọi mỗi khi có câu trả lời (trắc nghiệm, gõ pinyin, bài học, đánh quái)
function rpgOnAnswer(right) {
  if (!right) { S.combo = 0; save(); header(); return null; }
  S.combo = (S.combo || 0) + 1;
  let drop = null;
  if (S.combo % GCFG.comboDrop === 0) {
    const d = today();
    if (S.dropsDay !== d) { S.dropsDay = d; S.dropsToday = 0; }
    if (S.dropsToday < GCFG.dropsPerDay) { S.dropsToday++; drop = gDrop('combo', Math.min(3, S.combo / GCFG.comboDrop - 1)); toast('🎁 Combo ' + S.combo + '! Rơi ' + GT[drop.tier - 1].n + ' ' + GQ[gQOf(drop) - 1].n + ': ' + drop.name); }
    else toast('⚡ Combo ' + S.combo + ' nhưng hôm nay đã nhặt đủ ' + GCFG.dropsPerDay + ' món rơi.');
  }
  save(); header();
  return drop;
}
const gComboTxt = () => `⚡ ${S.combo || 0} · rơi đồ ở ${(Math.floor((S.combo || 0) / GCFG.comboDrop) + 1) * GCFG.comboDrop}`;

// ---------- chỉ số ----------
function gBaseStats() {
  const f = Math.min(realmInfo(S.xp).flat, FLAT.length - 1);
  return { hp: 100 + 30 * f, atk: 10 + 4 * f, def: 5 + 2 * f, crit: Math.round((5 + .05 * f) * 10) / 10, spd: 10 + f, hit: Math.round((100 + .3 * f) * 10) / 10, luck: 0, expb: 0 };
}
function gStats() {
  const t = gBaseStats(), fx = {};
  GSLOTS.forEach(sl => {
    const it = (S.bag || []).find(i => i.uid === (S.eq || {})[sl]);
    if (!it || !gCanUse(it)) return;
    Object.keys(it.st).forEach(s => { t[s] = (t[s] || 0) + gStatOf(it, s); });
    if (gFxOn(it)) fx[it.fx] = (fx[it.fx] || 0) + gFxVal(it);
  });
  Object.keys(t).forEach(s => { t[s] = gRoundStat(s, t[s]); });
  t.fx = fx; return t;
}
const gCP = st => Math.round(st.hp / 8 + st.atk * 3 + st.def * 2 + st.crit * 4 + st.spd * 2 + (st.hit - 100) * 2);
const gExpBonus = () => (gStats().expb || 0);

// ---------- khởi tạo & di trú dữ liệu ----------
function rpgInit() {
  S.bag = S.bag || []; S.eq = S.eq || {}; S.cores = S.cores || 0; S.combo = S.combo || 0;
  S.hist = S.hist || []; S.beast = S.beast || []; S.nextBattle = S.nextBattle || 0; S.bt = S.bt || {}; S.cdPills = S.cdPills || 0;
  S.shop = S.shop || { d: '', sold: [] };
  if (S.btv !== 2) { // bản mới: mọi cảnh giới đều phải qua bài test HSK, nên dồn tu vi về đỉnh cảnh giới đầu chưa độ kiếp
    S.btv = 2; S.bt = {};
    for (let i = 0; i < REALMS.length; i++) if (S.xp >= REND[i]) { S.xp = REND[i] - 1; break; }
  }
  if (!S.rpgStarter) { // bộ đồ khởi đầu
    S.rpgStarter = true;
    const w = gGen('weapon', 1, null, 2), a = gGen('armor', 1, null, 2);
    w.name = 'Phàm Thiết Kiếm·Sơ Nhập'; w.kind = 'kiem'; a.name = 'Phàm Y·Sơ Nhập';
    S.bag.push(w, a); S.eq.weapon = w.uid; S.eq.armor = a.uid;
  }
  save();
}

// ---------- hệ (thuộc tính) và tương khắc ----------
// k = các hệ mà hệ này khắc chế. Ngũ hành: Kim > Mộc > Thổ > Thủy > Hỏa > Kim. Thêm các hệ mở rộng.
const GEL = {
  kim: { n: 'Kim', e: '⚔️', k: ['moc'] }, moc: { n: 'Mộc', e: '🌿', k: ['tho'] }, tho: { n: 'Thổ', e: '⛰️', k: ['thuy'] },
  thuy: { n: 'Thủy', e: '💧', k: ['hoa'] }, hoa: { n: 'Hỏa', e: '🔥', k: ['kim', 'bang'] },
  loi: { n: 'Lôi', e: '⚡', k: ['thuy', 'am', 'doc'] }, bang: { n: 'Băng', e: '❄️', k: ['hoa', 'phong'] }, phong: { n: 'Phong', e: '🌪️', k: ['tho', 'doc'] },
  am: { n: 'Ám', e: '🌑', k: ['quang', 'ao'] }, quang: { n: 'Quang', e: '✨', k: ['am', 'doc'] }, doc: { n: 'Độc', e: '☠️', k: ['moc', 'thuy'] },
  khong: { n: 'Không gian', e: '🌀', k: ['thoi', 'am'] }, thoi: { n: 'Thời gian', e: '⏳', k: ['khong', 'phong'] }, ao: { n: 'Ảo', e: '🔮', k: ['quang', 'kim'] }
};
const GELV = { 'Kim': 'kim', 'Mộc': 'moc', 'Thổ': 'tho', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Lôi': 'loi', 'Băng': 'bang', 'Phong': 'phong', 'Ám': 'am', 'Quang': 'quang', 'Độc': 'doc', 'Không gian': 'khong', 'Thời gian': 'thoi', 'Ảo': 'ao' };
const CELEM = { kiem: 'kim', hoa: 'hoa', thuy: 'thuy', moc: 'moc', dia: 'tho', loi: 'loi', bang: 'bang', phong: 'phong', hon: 'am', quang: 'quang', doc: 'doc', khong: 'khong', thoi: 'thoi', kimcuong: 'kim', dan: 'moc', khi: 'kim', tran: 'khong', thu: 'moc', am: 'am', co: 'doc', nho: 'quang', hoa2: 'ao' };
const gElOf = cid => CELEM[cid] || 'kim';
const gElLabel = cid => { const e = GEL[gElOf(cid)]; return e.e + ' ' + e.n; };
const gBossEls = b => b.el.split('·').map(s => GELV[s.trim()]).filter(Boolean);
const gElChips = els => els.map(x => GEL[x].e + ' ' + GEL[x].n).join(' · ');
// Kết quả tương khắc giữa nhân vật hiện tại và quái tuần: dmg = hệ số sát thương gây ra, taken = hệ số sát thương nhận vào
function gMatchup() {
  const me = gElOf(S.hero.char || 'kiem'), els = gBossEls(GBOSS[S.week.boss]);
  const a = els.filter(e => GEL[me].k.includes(e)).length, d = els.filter(e => GEL[e].k.includes(me)).length, net = a - d;
  const dmg = net >= 2 ? 1.75 : net === 1 ? 1.5 : net === 0 ? 1 : .8, taken = net > 0 ? .85 : net === 0 ? 1 : 1.25;
  const cls = net > 0 ? 'ok-t' : net < 0 ? 'bad-t' : 'mut';
  const txt = net > 0 ? `Khắc chế! Sát thương gây ra ×${dmg}, nhận vào ×${taken}` : net < 0 ? `Bị khắc! Sát thương gây ra ×${dmg}, nhận vào ×${taken}` : 'Hệ trung lập: không tăng giảm sát thương';
  return { me, els, dmg, taken, net, cls, txt };
}
// ---------- quái tuần ----------
const gWeekIdx = () => Math.floor((Date.now() - Date.UTC(2026, 0, 5)) / (7 * DAY));
const gBossRi = () => Math.min(realmInfo(S.xp).ri, GCFG.bossHp.length - 1);
// Chỉ số quái theo cảnh giới: HP cố định theo bảng, ATK ~9% HP điển hình của người chơi, DEF ~30% ATK điển hình
function gBossStats(ri) {
  const M = [1, 1.9, 3.3, 5.5, 9, 14.5, 14.5, 23, 38][ri], typAtk = 26 + 36 * ri + 18 * M, typHp = 220 + 270 * ri + 190 * M;
  return { max: GCFG.bossHp[ri], atk: Math.round(typHp * .09), def: Math.round(typAtk * .3) };
}
function gEnsureWeek() {
  const k = gWeekIdx(), ri = gBossRi(), b = gBossStats(ri);
  if (!S.week || S.week.k !== k) {
    if (S.week) { S.hist.push({ k: S.week.k, boss: S.week.boss, dmg: S.week.dmg, max: S.week.max, dead: S.week.dead }); S.hist = S.hist.slice(-12); }
    const boss = ((k % GBOSS.length) + GBOSS.length) % GBOSS.length;
    S.week = { k, boss, ri, max: b.max, hp: b.max, atk: b.atk, def: b.def, dmg: 0, battles: 0, claimed: [], dead: false };
    save();
  } else if ((S.week.ri == null ? -1 : S.week.ri) < ri) { // bạn đột phá giữa tuần: quái lớn theo cảnh giới, giữ nguyên % máu còn lại
    const frac = S.week.max ? S.week.hp / S.week.max : 1;
    Object.assign(S.week, { ri, max: b.max, hp: Math.round(frac * b.max), atk: b.atk, def: b.def }); save();
  }
  return S.week;
}const gDaysLeft = () => { const end = Date.UTC(2026, 0, 5) + (gWeekIdx() + 1) * 7 * DAY, ms = end - Date.now(); return Math.max(0, Math.ceil(ms / DAY)); };
const gCD = () => Math.max(0, (S.nextBattle || 0) - Date.now());
const gFmt = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}g ${m}p` : `${m}p ${s % 60}s`; };

// ---------- câu hỏi trong trận ----------
const GPY = { '是': 'shì', '有': 'yǒu', '在': 'zài', '吃': 'chī', '叫': 'jiào', '吗': 'ma', '呢': 'ne', '吧': 'ba', '了': 'le', '个': 'gè', '本': 'běn', '杯': 'bēi', '只': 'zhī', '哪儿': 'nǎr', '谁': 'shéi', '什么': 'shénme', '几': 'jǐ', '也': 'yě', '都': 'dōu', '很': 'hěn', '太': 'tài', '贵': 'guì', '看': 'kàn', '去': 'qù', '点': 'diǎn', '岁': 'suì', '块': 'kuài', '想': 'xiǎng', '哪': 'nǎ', '没': 'méi', '不': 'bù', '别': 'bié', '所以': 'suǒyǐ', '但是': 'dànshì', '如果': 'rúguǒ', '还': 'hái', '因为': 'yīnwèi', '或者': 'huòzhě', '正': 'zhèng', '才': 'cái', '就': 'jiù', '更': 'gèng', '离': 'lí', '从': 'cóng', '给': 'gěi', '比': 'bǐ', '和': 'hé', '跟': 'gēn', '把': 'bǎ', '被': 'bèi', '往': 'wǎng', '过': 'guò', '着': 'zhe', '啊': 'a', '张': 'zhāng', '一边': 'yìbiān', '一起': 'yìqǐ', '一下': 'yíxià', '一点': 'yìdiǎn', '再': 'zài', '又': 'yòu', '得': 'de', '的': 'de', '地': 'de', '虽然': 'suīrán', '因为': 'yīnwèi', '只要': 'zhǐyào', '关于': 'guānyú', '对于': 'duìyú', '由于': 'yóuyú', '至于': 'zhìyú', '然后': 'ránhòu', '条': 'tiáo', '双': 'shuāng', '件': 'jiàn', '非常': 'fēicháng', '越': 'yuè', '最': 'zuì', '但是': 'dànshì' };
const gPy = t => GPY[t] || ((S.words.find(w => w.h === t) || {}).p) || '';
const pyHTML = p => p ? `<br><span class="pyn">${esc(p)}</span>` : '';
// ---- câu hỏi: nhiều dạng + chống lặp (S.gq lưu lịch sử gần đây) ----
const GTONE = ['āáǎà', 'ēéěè', 'īíǐì', 'ōóǒò', 'ūúǔù', 'ǖǘǚǜ'];
function gToneVar(p) { // các biến thể sai thanh điệu của pinyin (đổi dấu 1 âm tiết)
  const ch = [...(p || '')], out = new Set();
  ch.forEach((c, i) => { const s = GTONE.find(s => s.includes(c)); if (s) [...s].forEach(t => { if (t !== c) { const v = ch.slice(); v[i] = t; out.add(v.join('')); } }); });
  return shuffle([...out]);
}
function gDistract(w, pool, key, n) { // n đáp án nhiễu khác nhau theo key, ưu tiên cùng số chữ
  n = n || 3;
  const c = shuffle(pool.filter(x => x.id !== w.id && x.m !== w.m && x.h !== w.h && x.p !== w.p));
  const same = c.filter(x => x.h.length === w.h.length), oth = c.filter(x => x.h.length !== w.h.length);
  const seen = new Set([w[key]]), res = [];
  for (const x of (Math.random() < .75 ? same.concat(oth) : c)) { if (res.length >= n) break; if (!seen.has(x[key])) { seen.add(x[key]); res.push(x); } }
  if (res.length < n) for (const x of shuffle(S.words)) { if (res.length >= n) break; if (x.id !== w.id && !seen.has(x[key])) { seen.add(x[key]); res.push(x); } }
  return res;
}
function gGramQ(g, showPy, mode) {
  if (showPy === undefined) showPy = true;
  mode = mode || 'fill';
  const full = i => g.q.replace(/_+|＿+/, g.o[i]), right = full(g.a);
  const expl = `<b>${esc(right)}</b><br>${esc(g.t)}<br><span class="mut">${esc(g.e)}</span>`;
  if (mode === 'trans') { // cho nghĩa tiếng Việt, chọn câu tiếng Trung đúng
    const opts = shuffle(g.o.map((t, i) => ({ label: `<span style="font-size:20px">${esc(full(i))}</span>`, ok: i === g.a })));
    return { stem: `<div class="mut">Ngữ pháp · chọn câu tiếng Trung đúng nghĩa</div><div class="mean" style="font-size:24px;margin:12px 0">${esc(g.t)}</div>`, opts, expl };
  }
  if (mode === 'g2m') { // cho câu hoàn chỉnh, chọn nghĩa đúng
    const others = shuffle(GRAM.filter(x => x !== g && x.t !== g.t)), sl = others.filter(x => x.l === g.l), seen = new Set([g.t]), ds = [];
    for (const x of sl.concat(others)) { if (ds.length >= 3) break; if (!seen.has(x.t)) { seen.add(x.t); ds.push(x.t); } }
    const opts = shuffle([{ label: esc(g.t), ok: true }].concat(ds.map(t => ({ label: esc(t), ok: false }))));
    return { stem: `<div class="mut">Ngữ pháp · câu này nghĩa là gì?</div><div class="han" style="font-size:34px;margin:10px 0">${esc(right)}</div>`, opts, expl };
  }
  const opts = shuffle(g.o.map((t, i) => ({ label: `<span style="font-size:20px">${esc(t)}</span>` + (showPy ? pyHTML(g.py ? g.py[i] : gPy(t)) : ''), ok: i === g.a })));
  return { stem: `<div class="mut">Ngữ pháp · chọn từ điền vào chỗ trống</div><div class="han" style="font-size:38px;margin:10px 0">${esc(g.q)}</div>`, opts, expl };
}
function gVocabQ(w, pool, showPy, types) {
  if (showPy === undefined) showPy = true;
  const type = pick(types && types.length ? types : ['h2m', 'm2h', 'listen']);
  const big = s => `<span style="font-size:24px">${esc(s)}</span>`;
  let opts, stem;
  if (type === 'h2m' || type === 'listen2m') {
    opts = [w].concat(gDistract(w, pool, 'm')).map(x => ({ label: esc(x.m), ok: x.id === w.id }));
    stem = type === 'h2m' ? `<div class="mut">Từ vựng · chọn nghĩa đúng</div><div class="han" style="font-size:56px">${esc(w.h)}</div><div class="pin">${esc(w.p)}</div>`
      : `<div class="mut">Nghe và chọn nghĩa đúng</div><button class="sp" id="gq-spk" style="font-size:44px">🔊</button>`;
  } else if (type === 'h2p') { // chọn pinyin đúng (có cả đáp án sai thanh điệu)
    const tv = gToneVar(w.p).slice(0, Math.random() < .5 ? 1 : 2), seen = new Set([w.p].concat(tv)), ps = tv.slice();
    for (const x of gDistract(w, pool, 'p', 6)) { if (ps.length >= 3) break; if (!seen.has(x.p)) { seen.add(x.p); ps.push(x.p); } }
    opts = [{ label: big(w.p), ok: true }].concat(ps.map(p => ({ label: big(p), ok: false })));
    stem = `<div class="mut">Từ vựng · chọn pinyin (thanh điệu) đúng</div><div class="han" style="font-size:56px">${esc(w.h)}</div><div class="mut">${esc(w.m)}</div>`;
  } else if (type === 'p2h') { // cho pinyin, chọn chữ Hán
    opts = [w].concat(gDistract(w, pool, 'h')).map(x => ({ label: big(x.h), ok: x.id === w.id }));
    stem = `<div class="mut">Từ vựng · pinyin này là chữ nào?</div><div class="pin" style="font-size:36px;margin:12px 0">${esc(w.p)}</div>`;
  } else {
    opts = [w].concat(gDistract(w, pool, 'h')).map(x => ({ label: big(x.h) + (showPy ? pyHTML(x.p) : ''), ok: x.id === w.id }));
    stem = type === 'm2h' ? `<div class="mut">Từ vựng · chọn chữ Hán đúng</div><div class="mean" style="font-size:26px;margin:12px 0">${esc(w.m)}</div>`
      : `<div class="mut">Nghe và chọn chữ Hán đúng</div><button class="sp" id="gq-spk" style="font-size:44px">🔊</button>`;
  }
  const listen = type === 'listen' || type === 'listen2m';
  return { stem, opts: shuffle(opts), expl: `<b>${esc(w.h)}</b> ${esc(w.p)} · ${esc(w.m)}`, word: w, type, speakOnShow: listen || type === 'h2m', speakOnAnswer: !listen && type !== 'h2m' };
}
function gQState() {
  if (!S.gq || typeof S.gq !== 'object') S.gq = {};
  const q = S.gq; ['w', 'deck', 'vt', 'gm'].forEach(k => { if (!Array.isArray(q[k])) q[k] = []; });
  return q;
}
function gPickWord(L) { // trộn: cấp hiện tại / từ đã học / từ yếu / cấp dưới; tránh từ vừa gặp
  const st = gQState(), cards = S.cards || {}, now = Date.now();
  const cur = lw(L), learned = S.words.filter(w => cards[w.id] && w.l <= L);
  const weak = learned.filter(w => cards[w.id].due <= now || cards[w.id].ease < 2.3), low = S.words.filter(w => w.l < L);
  const r = Math.random();
  let src = r < .2 && weak.length >= 6 ? weak : r < .45 && learned.length >= 10 ? learned : r < .6 && low.length >= 10 ? low : cur;
  if (src.length < 4) src = cur.length >= 4 ? cur : S.words;
  const recent = new Set(st.w);
  let fresh = src.filter(w => !recent.has(w.id));
  if (!fresh.length) fresh = S.words.filter(w => w.l <= L && !recent.has(w.id));
  const w = pick(fresh.length ? fresh : src);
  st.w.push(w.id);
  const cap = Math.max(8, Math.min(250, Math.floor(S.words.length * .5)));
  if (st.w.length > cap) st.w.splice(0, st.w.length - cap);
  return w;
}
function gPickGram(L) { // "bộ bài": dùng hết mọi câu ngữ pháp hợp cấp rồi mới xáo lại
  const st = gQState(), ok = i => GRAM[i] && GRAM[i].l <= L;
  st.deck = st.deck.filter(ok);
  if (!st.deck.length) {
    st.deck = shuffle(GRAM.map((g, i) => i).filter(ok));
    if (st.deck.length > 1 && st.deck[st.deck.length - 1] === st.lastG) st.deck.unshift(st.deck.pop());
  }
  const i = st.deck.pop(); st.lastG = i;
  return GRAM[i] || pick(GRAM);
}
function gPickMode(list, hist) { // chọn dạng câu, tránh trùng 2 dạng vừa dùng
  const avoid = hist.slice(-2), c = list.filter(t => !avoid.includes(t)), m = pick(c.length ? c : list);
  hist.push(m); if (hist.length > 6) hist.splice(0, hist.length - 6);
  return m;
}
function gQuestion() {
  const L = S.level || 1, st = gQState();
  const gn = GRAM.filter(g => g.l <= L).length, gr = Math.min(.35, Math.max(.15, gn / 90)); // ít câu ngữ pháp thì hỏi ngữ pháp ít hơn
  if (gn && Math.random() < gr) return gGramQ(gPickGram(L), true, gPickMode(['fill', 'fill', 'trans', 'g2m'], st.gm));
  const w = gPickWord(L), pool = lw(w.l).length >= 4 ? lw(w.l) : S.words;
  const hasAudio = !!(window.AUDIO && AUDIO[w.id]);
  const types = ['h2m', 'm2h', 'h2p', 'p2h'].concat(hasAudio ? ['listen', 'listen2m'] : []);
  return gVocabQ(w, pool, true, [gPickMode(types, st.vt)]);
}
// ---------- trận đánh ----------
let GB = null, GTM = null;
function gHit() {
  const st = GB.st, W = S.week, bs = GBOSS[W.boss];
  const hc = Math.min(.97, Math.max(.55, st.hit / (st.hit + bs.eva)));
  if (Math.random() > hc) return { miss: true, dmg: 0 };
  let d = st.atk * (.9 + Math.random() * .2), crit = false, charmed = false;
  if (Math.random() * 100 < st.crit) { d *= 1.8; crit = true; }
  d *= 1 + Math.min(.3, GB.combo * .03);
  d *= 1 + (st.fx.burn || 0) / 100;
  d *= GB.mu.dmg;
  d = Math.max(1, d - W.def * (1 - (st.fx.pierce || 0) / 100) * .5);
  if (bs.ab === 'charm' && Math.random() < .15) { d *= .4; charmed = true; }
  if (bs.ab === 'shield') d *= .85;
  return { dmg: Math.round(d), crit, charmed };
}
function gBossHit() {
  const W = S.week, bs = GBOSS[W.boss], st = GB.st;
  let atk = W.atk; if (bs.ab === 'rage') atk *= 1 + .6 * (1 - W.hp / W.max);
  let d = atk * (.9 + Math.random() * .2), crit = false;
  if (bs.ab === 'crit' && Math.random() < .3) { d *= 1.8; crit = true; }
  if (bs.ab === 'burn') d *= 1.4;
  d = Math.max(1, d * GB.mu.taken - st.def * .5) * (1 - (st.fx.guard || 0) / 100);
  return { dmg: Math.round(d), crit };
}
function gStartBattle() {
  const W = gEnsureWeek();
  if (W.dead) return toast('Quái tuần này đã bị hạ. Hãy chờ tuần sau!');
  if (gCD() > 0) return toast('Chưa hồi sức: còn ' + gFmt(gCD()));
  const st = gStats(), t = GCFG.battleSec + (st.fx.swift || 0);
  GB = { mu: gMatchup(), st, pmax: st.hp, php: st.hp, endAt: Date.now() + t * 1000, total: t, correct: 0, wrong: 0, dmg: 0, poison: 0, combo: 0, over: false, locked: false, drops: [], q: null, log: '' };
  S.nextBattle = Date.now() + GCFG.cooldownH * 3600000; S.week.battles++; save();
  gDrawBattle(); gNextQ();
  clearInterval(GTM); GTM = setInterval(gTick, 250);
}
function gTick() {
  if (!GB || GB.over) return clearInterval(GTM);
  if (GB.pauseAt) return; // đang diễn chiêu cuối: dừng đồng hồ
  const left = Math.max(0, GB.endAt - Date.now()), el = $('#gb-tm');
  if (el) { el.textContent = Math.ceil(left / 1000) + 's'; $('#gb-tb').style.width = (left / (GB.total * 1000) * 100) + '%'; }
  if (left <= 0) gEndBattle('time');
}
function gBars() {
  const W = S.week, hb = $('#gb-bh'), pb = $('#gb-ph');
  if (hb) { hb.style.width = Math.max(0, W.hp / W.max * 100) + '%'; $('#gb-bt').textContent = Math.max(0, W.hp) + ' / ' + W.max; }
  if (pb) { pb.style.width = Math.max(0, GB.php / GB.pmax * 100) + '%'; $('#gb-pt').textContent = Math.max(0, Math.round(GB.php)) + ' / ' + GB.pmax; }
}
function gDrawBattle() {
  const W = S.week, bs = GBOSS[W.boss];
  view.innerHTML = `<div class="card" style="padding:10px"><img src="${GIMG['m_' + bs.id + '_art']}" alt="" style="width:100%;max-width:300px;border-radius:12px;display:block;margin:auto">
    <div style="text-align:left;margin-top:6px"><b>${esc(bs.n)}</b> ${bs.h} <span class="mut">· ${esc(bs.el)}</span>
    <div class="bar" style="height:14px"><i id="gb-bh" style="width:100%;background:#d0402f"></i></div><div class="mut" id="gb-bt"></div>
    <div class="mut">${esc(bs.abn)}</div><div class="${GB.mu.cls}" style="font-size:13px">${gElChips(GB.mu.els)} vs ${gElLabel(S.hero.char || 'kiem')}: ${GB.mu.txt}</div></div></div>
  <div class="card" style="padding:10px;text-align:left"><div style="display:flex;align-items:center;gap:10px">${bustImg(44)}<div style="flex:1"><b>${esc(S.hero.name)}</b> <span class="mut" id="gb-cb"></span>
    <div class="bar"><i id="gb-ph" style="width:100%"></i></div><div class="mut" id="gb-pt"></div></div><div style="text-align:center"><b id="gb-tm" style="font-size:22px">${GB.total}s</b></div></div>
    <div class="bar g"><i id="gb-tb" style="width:100%"></i></div></div>
  <div class="card" id="gb-q"></div><div id="gb-log" class="mut" style="min-height:44px;text-align:center">Phím 1–4: chọn đáp án · Enter: sang câu tiếp / bỏ qua chiêu cuối</div>`;
  gBars();
}
function gNextQ() {
  if (!GB || GB.over) return;
  if (GB.poison > 0) { const pd = GB.poison * Math.max(2, Math.round(S.week.atk * .05)); GB.php -= pd; gBars(); if (GB.php <= 0) return gEndBattle('dead'); }
  const q = GB.q = gQuestion(); GB.locked = false;
  $('#gb-q').innerHTML = `${q.stem}<div id="gb-o">${q.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="kn">${i + 1}</span>${o.label}</button>`).join('')}</div>`;
  $('#gb-cb').textContent = GB.combo ? 'Liên kích x' + GB.combo : '';
  const sp = $('#gq-spk'); if (sp) sp.onclick = () => speak(q.word);
  if (q.speakOnShow && q.word) speak(q.word);
  $('#gb-o').onclick = e => { const b = e.target.closest('.opt'); if (b && !GB.locked && !GB.over) gAnswer(+b.dataset.i); };
}
function gAnswer(i) {
  GB.locked = true;
  const q = GB.q, W = S.week, bs = GBOSS[W.boss], right = q.opts[i].ok;
  const btns = [...document.querySelectorAll('#gb-o .opt')];
  btns[i].classList.add(right ? 'ok' : 'no'); const okIdx = q.opts.findIndex(o => o.ok); btns[okIdx].classList.add('ok');
  if (q.speakOnAnswer && q.word) speak(q.word);
  let log = '', ult = null;
  const dr = rpgOnAnswer(right);
  if (dr) GB.drops.push(dr);
  if (right) {
    GB.correct++; GB.combo++; GB.endAt += GCFG.timeBonus * 1000; GB.total += GCFG.timeBonus;
    let h = gHit(), total = 0;
    if (h.miss) log = '💨 Đòn đánh trượt!';
    else {
      total = h.dmg; log = `⚔️ ${h.crit ? 'CHÍ MẠNG ' : ''}${h.dmg} sát thương${GB.mu.net > 0 ? ' (khắc chế ×' + GB.mu.dmg + ')' : GB.mu.net < 0 ? ' (bị kháng ×' + GB.mu.dmg + ')' : ''}${h.charmed ? ' (bị mê hoặc)' : ''}`;
      if (Math.random() < Math.min(.3, GB.st.spd / 300)) { const h2 = gHit(); if (!h2.miss) { total += h2.dmg; log += ` + liên kích ${h2.dmg}`; } }
    }
    if (window.fxOnRight) log += fxOnRight(GB); // hiệu ứng hỗ trợ của nhân vật gacha (features.js)
    if (GB.combo % (window.fxUltCombo ? fxUltCombo() : GULT_COMBO) === 0) { // chiêu cuối theo hệ nhân vật: chắc chắn trúng, sát thương ×GULT_MULT
      const uh = gHit(), ud = Math.round((uh.miss ? Math.max(1, GB.st.atk * GB.mu.dmg - W.def * .5) : uh.dmg) * GULT_MULT * (window.fxUltMul ? fxUltMul() : 1)), ue = gUltEl();
      total += ud; ult = ue; log = `🌟 <b>Chiêu cuối ${GULT[ue].h} ${esc(GULT[ue].n)}</b>: ${ud} sát thương<br>` + log;
    }
    if (total) {
      W.hp = Math.max(0, W.hp - total); W.dmg += total; GB.dmg += total;
      if (GB.st.fx.vamp) { const hl = Math.round(total * GB.st.fx.vamp / 100); GB.php = Math.min(GB.pmax, GB.php + hl); if (hl) log += ` · hồi ${hl} HP`; }
    }
    log += ' · +' + GCFG.timeBonus + ' giây';
  } else {
    GB.wrong++;
    const sv = window.fxOnWrong ? fxOnWrong(GB) : null; // băng giáp / né đòn của nhân vật gacha
    if (!sv || !sv.keepCombo) GB.combo = 0;
    if (sv) log = sv.log; else { const b = gBossHit(); GB.php -= b.dmg; log = `💥 ${bs.n} phản công${b.crit ? ' CHÍ MẠNG' : ''}: -${b.dmg} HP`; }
    if (bs.ab === 'heal') { const hl = Math.round(W.max * .04); W.hp = Math.min(W.max, W.hp + hl); log += ` · quái hồi ${hl}`; }
    if (bs.ab === 'time') { GB.endAt -= 4000; log += ' · -4 giây'; }
    if (bs.ab === 'poison') { GB.poison = Math.min(5, GB.poison + 1); log += ` · trúng độc x${GB.poison}`; }
  }
  gBars();
  $('#gb-log').innerHTML = `${log}<div class="mut" style="margin-top:4px">${q.expl}</div>${dr ? gDropHTML(dr) : ''}`;
  // sang câu tiếp: tự động sau 1,1 giây (sai: 1,7 giây) hoặc ngay khi bấm Enter (GB.goNext)
  const goQ = () => {
    if (!GB || GB.over || GB.goNext !== goQ) return;
    clearTimeout(GB.nt); GB.goNext = null;
    if (GB.pauseAt) { GB.endAt += Date.now() - GB.pauseAt; GB.pauseAt = 0; } // hết tạm dừng khi câu mới hiện ra
    gNextQ();
  };
  const next = () => {
    if (W.hp <= 0) return setTimeout(() => gEndBattle('win'), 900);
    if (GB.php <= 0) return setTimeout(() => gEndBattle('dead'), 900);
    GB.goNext = goQ; GB.nt = setTimeout(goQ, right ? 1100 : 1700);
  };
  if (!ult) return next();
  // chiêu cuối: dừng đồng hồ từ lúc tung chiêu đến khi câu hỏi mới hiện ra
  GB.pauseAt = Date.now(); const tm = $('#gb-tm'); if (tm) tm.textContent = '⏸';
  gUltPlay(ult, { boss: GIMG['m_' + bs.id + '_art'] }).then(() => { if (GB && !GB.over) next(); });
}
function gClaimMilestones(W, lines) {
  [[.25, 20, 0], [.5, 40, 0], [.75, 80, 1], [1, 200, 2]].forEach(([thr, base, bonus]) => {
    const ls = lsGain(base);
    if (!W.claimed.includes(thr) && (W.max - W.hp) >= thr * W.max - 0.5) {
      W.claimed.push(thr); S.ls += ls; const it = gDrop('boss', thr); GB.drops.push(it);
      lines.push(`🏆 Mốc ${thr * 100}% HP quái: +${ls} 💎 và <b style="color:${GT[it.tier - 1].c}">${esc(it.name)}</b>`);
    }
  });
}
function gEndBattle(reason, silent) {
  if (!GB || GB.over) return; GB.over = true; clearInterval(GTM);
  const W = S.week, bs = GBOSS[W.boss], lines = [];
  const frac = W.max ? GB.dmg / W.max : 0;
  const ls = lsGain(Math.round(8 + Math.min(60, GB.dmg / (W.max / 30)))), cores = Math.max(1, Math.round(frac * 30)), xp = 15 + GB.correct * 8;
  S.ls += ls; S.cores += cores;
  gClaimMilestones(W, lines);
  let story = false;
  if (W.hp <= 0 && !W.dead) {
    W.dead = true; const kg = lsGain(150); S.ls += kg; S.cores += 8; lines.push('👑 Hạ gục quái tuần! +' + kg + ' 💎, +8 Yêu Đan');
    if (!S.beast.includes(bs.id)) { S.beast.push(bs.id); story = true; }
  }
  save(); addXP(xp);
  const R = { win: '🎉 Bạn đã hạ gục ' + bs.n + '!', dead: '😵 Bạn bị trọng thương!', time: '⏳ Hết giờ!', leave: 'Bạn đã rời trận.' }[reason];
  if (silent) { toast(R + ' Nhận +' + ls + ' 💎, +' + cores + ' Yêu Đan'); return; }
  view.innerHTML = `<div class="card"><div class="han" style="font-size:52px">${reason === 'win' ? '👑' : '⚔️'}</div><h3 style="margin:4px 0">${R}</h3>
    <div class="mean">Sát thương: <b>${GB.dmg}</b> · Đúng ${GB.correct} · Sai ${GB.wrong}</div>
    <p style="margin:8px 0"><b>Phần thưởng tham gia:</b> +${ls} 💎 · +${cores} Yêu Đan · +${xp} tu vi</p>
    ${lines.map(l => `<p style="margin:4px 0">${l}</p>`).join('')}
    ${GB.drops.length ? GB.drops.map(gDropHTML).join('') : ''}
    ${story ? `<p style="margin-top:10px"><b>📜 Mở khóa truyện:</b> ${esc(bs.n)}</p>` : ''}
    <p class="mut">Lượt đánh tiếp theo mở sau ${GCFG.cooldownH} giờ.</p></div>
    <div class="row">${story ? '<button class="pri" id="gr-story">Đọc truyện</button>' : ''}<button id="gr-back">Về trận chiến</button></div>`;
  $('#gr-back').onclick = () => go('fight');
  if (story) $('#gr-story').onclick = () => vBeast(bs.id);
  GB = null;
}
function gLeave() { if (GB && !GB.over) gEndBattle('leave', true); GB = null; }
window.addEventListener('pagehide', () => { try { gLeave(); } catch (e) {} });

// ---------- màn hình chiến đấu ----------
function vFight() {
  const W = gEnsureWeek(), bs = GBOSS[W.boss], st = gStats(), cd = gCD(), pct = Math.max(0, W.hp / W.max * 100);
  const ms = [.25, .5, .75, 1].map(t => `<span class="chip" style="${W.claimed.includes(t) ? 'background:var(--ac2);color:#fff' : ''}">${W.claimed.includes(t) ? '✓' : '🔒'} ${t * 100}%</span>`).join(' ');
  view.innerHTML = `
  <div class="card" style="padding:10px"><div class="mut" style="text-align:left">Quái tuần ${(W.k % 52) + 1} · cảnh giới ${REALMS[W.ri].h} ${REALMS[W.ri].n} · còn ${gDaysLeft()} ngày</div>
    <img src="${GIMG['m_' + bs.id + '_card']}" alt="" style="width:100%;max-width:340px;border-radius:12px;display:block;margin:6px auto">
    <div style="text-align:left"><b>${esc(bs.n)}</b> <span style="font-size:20px">${bs.h}</span> <span class="mut">${bs.p} · ${esc(bs.el)}</span>
    <div class="bar" style="height:14px"><i style="width:${pct}%;background:#d0402f"></i></div>
    <div class="mut">HP ${W.hp} / ${W.max} · Sát thương của bạn: <b>${W.dmg}</b> · Số trận: ${W.battles}</div>
    <div class="mut" style="margin:4px 0">${esc(bs.abn)}</div>${(() => { const m = gMatchup(); return '<div style="margin:6px 0">Hệ quái: <b>' + gElChips(m.els) + '</b> · Hệ của bạn: <b>' + gElLabel(S.hero.char || 'kiem') + '</b><br><span class="' + m.cls + '">' + m.txt + '</span><br><span class="mut" style="font-size:12px">Đổi nhân vật ở Tu tiên → Phường thị để khắc chế quái tuần.</span></div>'; })()}<div style="margin:6px 0">Mốc thưởng: ${ms}</div></div>
    ${W.dead ? '<div class="mean ok-t">👑 Đã hạ gục. Quái mới xuất hiện vào thứ Hai.</div>' : cd > 0
      ? `<div class="mean">⏳ Hồi sức: <b id="gcd">${gFmt(cd)}</b></div><div class="row"><button id="gpill" ${S.cdPills > 0 ? '' : 'disabled'}>Dùng Hồi Linh Đan (${S.cdPills})</button><button id="gbuyp" ${S.ls >= GCFG.pillCD ? '' : 'disabled'}>Mua 💎${GCFG.pillCD}</button></div>`
      : `<div class="row"><button class="pri" id="gfight">⚔️ Khiêu chiến (${GCFG.battleSec}s)</button></div>`}
    <p class="mut" style="text-align:left;margin:8px 0 0">Mỗi trận là một chuỗi câu hỏi từ vựng và ngữ pháp trong ${GCFG.battleSec} giây, mỗi câu đúng được cộng thêm ${GCFG.timeBonus} giây. Đúng thì bạn tấn công (sát thương theo ATK, CRIT, HIT, SPD và trang bị của bạn), sai thì quái phản công. Mẹo: nhấn phím 1–4 để chọn nhanh, Enter để qua câu. Sau trận phải chờ ${GCFG.cooldownH} giờ.</p></div>
  <div class="card" style="text-align:left"><b>Sức chiến đấu: ${gCP(st)}</b> <span class="mut">(HP ${st.hp} · ATK ${st.atk} · DEF ${st.def} · CRIT ${st.crit}% · SPD ${st.spd} · HIT ${st.hit})</span>
    <p class="mut" style="margin:6px 0 0">Trang bị mạnh hơn ở tab Tu tiên → Trang bị. Đồ rơi theo đúng phẩm cảnh giới hiện tại khi đúng liên tiếp ${GCFG.comboDrop} câu; phẩm cao hơn chỉ có từ quái tuần, độ kiếp và rương chuỗi ngày cao.</p></div>
  <div class="card" style="text-align:left"><b>🌟 Chiêu cuối:</b> ${GEL[gUltEl()].e} ${GULT[gUltEl()].h} ${esc(GULT[gUltEl()].n)} <span class="mut">· tung ra khi đúng liên tiếp ${GULT_COMBO} câu trong trận (×${GULT_MULT} sát thương)</span>
    <div class="row" style="margin-top:6px"><button id="gult">🎬 Xem chiêu cuối 14 hệ</button></div></div>
  <h3 style="margin:14px 0 6px;text-align:left">📜 Sơn Hải Chí <span class="mut" style="font-size:14px">(${S.beast.length}/${GBOSS.length} đã mở)</span></h3>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${GBOSS.map(b => { const u = S.beast.includes(b.id); return `<button class="chest" data-b="${b.id}" style="display:block;padding:6px;${u ? '' : 'filter:grayscale(1) brightness(.5)'}"><img src="${GIMG['m_' + b.id + '_card']}" alt="" style="width:100%;border-radius:8px;display:block"><span class="mut">${u ? 'Đọc truyện' : 'Hạ gục để mở khóa'}</span></button>`; }).join('')}</div>
  ${S.hist.length ? `<h3 style="margin:14px 0 6px;text-align:left">Lịch sử các tuần</h3><div class="card" style="padding:6px 10px;text-align:left">${S.hist.slice().reverse().map(h => `<div class="realm"><span style="flex:1">Tuần ${(h.k % 52) + 1}: ${esc(GBOSS[h.boss].n)}</span><span class="mut">${h.dmg} sát thương ${h.dead ? '· 👑 hạ gục' : ''}</span></div>`).join('')}</div>` : ''}
  <p class="mut" style="text-align:left">Lưu ý: app chạy trên máy bạn nên "bảng xếp hạng" chỉ ghi kỷ lục của chính bạn, không so với người khác.</p>`;
  const f = $('#gfight'); if (f) f.onclick = gStartBattle;
  $('#gult').onclick = vUltGallery;
  const pl = $('#gpill'); if (pl) pl.onclick = () => { S.cdPills--; S.nextBattle = 0; save(); toast('Đã hồi sức hoàn toàn'); vFight(); };
  const bp = $('#gbuyp'); if (bp) bp.onclick = () => { S.ls -= GCFG.pillCD; S.cdPills++; save(); header(); vFight(); };
  view.onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; if (S.beast.includes(b.dataset.b)) vBeast(b.dataset.b); else toast('Hãy hạ gục quái này vào tuần nó xuất hiện.'); };
  if (cd > 0 && !W.dead) { const t = setInterval(() => { const el = $('#gcd'); if (!el || tab !== 'fight') return clearInterval(t); const c = gCD(); if (c <= 0) { clearInterval(t); vFight(); } else el.textContent = gFmt(c); }, 1000); }
}
function vBeast(id) {
  const b = GBOSS.find(x => x.id === id);
  view.innerHTML = `<div class="card story"><div class="mut">Sơn Hải Chí</div><img src="${GIMG['m_' + id + '_art']}" alt="" style="width:100%;max-width:300px;border-radius:12px;display:block;margin:8px auto">
    <div class="hz">${b.h}</div><div class="pin" style="font-size:20px">${b.p}</div><h3 style="margin:6px 0">${esc(b.n)}</h3><div class="mut">${esc(b.el)}</div>
    <p>${esc(b.s)}</p><div class="idiom">⚔️ <b>Kỹ năng trong trận:</b> ${esc(b.abn)}</div></div><div class="row"><button class="pri" id="bk">← Quay lại</button></div>`;
  $('#bk').onclick = () => go('fight');
}

// ---------- Tu tiên: nhân vật + trang bị + Tiên Phủ ----------
let gSub = 'char';
function gSubNav() {
  return `<div class="pills" id="gsub">${[['char', 'Nhân vật'], ['gear', 'Trang bị'], ['store', 'Tiên Phủ']].map(([k, n]) => `<button data-sub="${k}" class="${gSub === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
}
function gStatsPanel() {
  const st = gStats(), ri = realmInfo(S.xp), inRealm = ri.ri < REALMS.length, capped = inRealm && !S.bt[ri.ri] && S.xp >= REND[ri.ri] - 1;
  const eq = GSLOTS.map(sl => { const it = S.bag.find(i => i.uid === S.eq[sl]); return `<div style="text-align:center;font-size:12px;color:var(--mut)">${it ? gIconHTML(it, sl === 'weapon' ? 80 : 50) : `<span class="gi" style="width:50px;background:var(--bd);height:50px;opacity:.5"></span>`}<br>${GSLOTN[sl]}</div>`; }).join('');
  return `<div class="card" style="text-align:left"><div style="display:flex;justify-content:space-between;align-items:center"><b>Chiến lực (CP)</b><b style="font-size:26px;color:var(--ac)">${gCP(st)}</b></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0;font-size:13px">${['hp', 'atk', 'def', 'crit', 'spd', 'hit', 'luck', 'expb'].map(s => `<div class="stat" style="padding:6px"><b style="font-size:17px">${st[s]}</b>${GSTATN[s]}</div>`).join('')}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-around;align-items:end">${eq}</div>
    <p class="mut" style="margin:8px 0 0">Yêu Đan: <b>${S.cores}</b> · Đã dùng được trang bị đến <b style="color:${GT[gTierForRealm(ri.ri) - 1].c}">${GT[gTierForRealm(ri.ri) - 1].n}</b>${st.fx && Object.keys(st.fx).length ? '<br>Hiệu ứng: ' + Object.entries(st.fx).map(([k, v]) => GFX[k].n + ' ' + GFX[k].d(v)).join(' · ') : ''}</p>
    ${inRealm ? gTribPanel(ri, capped) : ''}</div>`;
}
function gTribPanel(ri, capped) {
  const r = REALMS[ri.ri], sc = gScope(ri.ri), left = Math.max(0, REND[ri.ri] - 1 - S.xp);
  const scope = r.scope === 'half' ? 'nửa đầu bài HSK' + r.hsk : 'toàn bộ bài HSK' + r.hsk;
  let st;
  if (!sc.avail) st = `Nội dung HSK${r.hsk} chưa có trong app, nên chưa thể vượt qua ${r.h} ${r.n}.`;
  else if (!capped) st = `Còn ${left} tu vi nữa tới đỉnh ${r.n}. Bài học đã qua: ${sc.done}/${sc.n}.`;
  else if (!sc.ready) st = `Đã đạt đỉnh ${r.n}! Cần qua nốt ${sc.n - sc.done} bài HSK${sc.L} để đủ điều kiện độ kiếp (đã xong ${sc.done}/${sc.n}).`;
  else st = `Đã đạt đỉnh ${r.n} và hoàn thành bài học. Có thể độ kiếp!`;
  return `<div class="idiom" style="${capped && sc.ready ? 'border:2px solid var(--gold)' : ''}">⚡ <b>Độ kiếp ${r.h} ${r.n} → ${REALMS[ri.ri + 1] ? REALMS[ri.ri + 1].n : 'Phi Thăng'}</b><br>Bài test HSK${r.hsk} (${scope}), ${GCFG.testQ} câu từ vựng + ngữ pháp, đúng ≥ ${Math.round(GCFG.testPass * 100)}%.<br><span class="mut">${st}</span>${capped && sc.ready ? '<div class="row"><button class="pri" id="gtrib">⚡ Độ kiếp</button></div>' : ''}</div>`;
}
function vHero() {
  gSub = gSub || 'char';
  if (gSub === 'gear') return gGear();
  if (gSub === 'store') return gStore();
  vHeroChar();
  const old = view.onclick;
  view.insertAdjacentHTML('afterbegin', gSubNav());
  const c = view.querySelectorAll('.card')[0]; if (c) c.insertAdjacentHTML('afterend', gStatsPanel());
  const c2 = view.querySelectorAll('.card')[1]; if (c2) c2.insertAdjacentHTML('afterend', '<div class="row" style="margin:-2px 0 10px"><button id="gslots">📂 Nhân vật đã lưu</button><button id="gnew">🆕 Tạo nhân vật mới</button></div>');
  view.onclick = e => { const b = e.target.closest('[data-sub]'); if (b) { gSub = b.dataset.sub; return vHero(); } if (e.target.closest('#gtrib')) return gTribulation(); if (e.target.closest('#gnew')) return vNewChar(); if (e.target.closest('#gslots')) return vSlots(); if (old) old(e); };
}
// Phạm vi bài test độ kiếp của một cảnh giới: nửa đầu hoặc toàn bộ bài học của HSK tương ứng
function gScope(ri) {
  const r = REALMS[ri], L = r.hsk;
  if (!GHSK_AVAIL.includes(L)) return { L, avail: false };
  const ls = lessonsOf(L), n = r.scope === 'half' ? Math.ceil(ls.length / 2) : ls.length, lessons = ls.slice(0, n);
  const done = lessons.filter((_, k) => passed(L, k)).length;
  return { L, avail: true, n, done, ready: done === n, words: [].concat(...lessons), pool: lw(L) };
}
// Giao diện làm bài test tuần tự (không đồng hồ, không rơi đồ)
function gTestUI(items, title, onDone) {
  let i = 0, ok = 0;
  const next = () => {
    if (i >= items.length) return onDone(ok, items.length);
    const q = items[i];
    view.innerHTML = `<div class="mut" style="text-align:right">${esc(title)} · ${i + 1}/${items.length}</div><div class="bar"><i style="width:${i / items.length * 100}%"></i></div>
      <div class="card">${q.stem}<div id="gt-o">${q.opts.map((o, k) => `<button class="opt" data-i="${k}"><span class="kn">${k + 1}</span>${o.label}</button>`).join('')}</div><div id="gt-f" style="margin-top:10px;min-height:24px"></div></div>
      <div class="row"><button class="pri hide" id="gt-n">${i + 1 < items.length ? 'Câu tiếp →' : 'Xem kết quả'}</button></div>`;
    const sp = $('#gq-spk'); if (sp) sp.onclick = () => speak(q.word);
    if (q.speakOnShow && q.word) speak(q.word);
    let done = false;
    $('#gt-o').onclick = e => {
      const b = e.target.closest('.opt'); if (!b || done) return; done = true;
      const k = +b.dataset.i, right = q.opts[k].ok, btns = [...document.querySelectorAll('#gt-o .opt')];
      btns[k].classList.add(right ? 'ok' : 'no'); btns[q.opts.findIndex(o => o.ok)].classList.add('ok');
      if (right) ok++;
      if (q.speakOnAnswer && q.word) speak(q.word);
      $('#gt-f').innerHTML = (right ? '<span class="ok-t">✓ Đúng!</span> ' : '<span class="bad-t">✗ Chưa đúng.</span> ') + q.expl;
      $('#gt-n').classList.remove('hide');
    };
    $('#gt-n').onclick = () => { i++; next(); };
  };
  next();
}
function gTribulation() {
  const ri = realmInfo(S.xp).ri, r = REALMS[ri], sc = gScope(ri);
  if (!sc.avail) return toast('Nội dung HSK' + r.hsk + ' chưa có trong app nên chưa thể độ kiếp.');
  if (!sc.ready) return toast(`Cần qua ${sc.n} bài HSK${sc.L} (đã xong ${sc.done}/${sc.n}) trước khi độ kiếp.`);
  const wait = (S.tribNext || 0) - Date.now();
  if (wait > 0) return toast('Thiên Kiếp chưa tan, thử lại sau ' + gFmt(wait));
  const N = GCFG.testQ, gl = GRAM.filter(g => g.l === sc.L), gn = Math.min(gl.length, Math.round(N * .3));
  const items = shuffle(Array.from({ length: N - gn }, (_, i) => gVocabQ(shuffle(sc.words)[i % sc.words.length], sc.pool, false))
    .concat(shuffle(gl).slice(0, gn).map(g => gGramQ(g, false))));
  gTestUI(shuffle(items), 'Độ kiếp · test HSK' + sc.L, (ok, t) => {
    const pass = ok / t >= GCFG.testPass; let it = null, gift = 0;
    if (pass) { S.bt[ri] = true; S.xp = REND[ri]; gift = lsGain(60 * (ri + 1)); S.ls += gift; it = gDrop('trib'); S.tribNext = 0; save(); header(); }
    else { S.tribNext = Date.now() + GCFG.tribCdMin * 60000; save(); }
    const nxt = REALMS[ri + 1];
    view.innerHTML = `<div class="card"><div class="han" style="font-size:56px">${pass ? '⚡' : '💦'}</div><div class="mean"><b>${ok}/${t}</b> câu đúng (cần ≥ ${Math.round(GCFG.testPass * 100)}%)</div>
      <p>${pass ? `Độ kiếp thành công! Bạn đã bước vào <b>${nxt ? nxt.h + ' ' + nxt.n : 'Phi Thăng'}</b>. +${gift} 💎` : `Thiên Kiếp chưa qua. Hãy ôn lại từ vựng HSK${sc.L} ở mục Ôn tập, rồi thử lại sau ${GCFG.tribCdMin} phút.`}</p>${it ? gDropHTML(it) : ''}</div>
      <div class="row"><button class="pri" id="tb">${pass ? 'Tiếp tục' : 'Về nhân vật'}</button></div>`;
    $('#tb').onclick = () => { gSub = 'char'; go('hero'); };
  });
}// Hành trang
let gFilter = 'all';
function gItemRow(it, shop) {
  const t = GT[it.tier - 1], eqd = S.eq[it.slot] === it.uid, cur = S.bag.find(i => i.uid === S.eq[it.slot]);
  const delta = cur && cur.uid !== it.uid ? gCPslot(it) - gCPslot(cur) : null;
  const xs = it.xs || [], gq = GQ[gQOf(it) - 1];
  const chips = Object.keys(it.st).map(s => xs.includes(s)
    ? `<span class="chip" style="font-size:12px;padding:2px 7px;border-color:${gq.c};color:${gq.c}" title="Thuộc tính thêm của ${gq.n}">✦ ${GSTATN[s]} +${gStatOf(it, s)}</span>`
    : `<span class="chip" style="font-size:12px;padding:2px 7px">${GSTATN[s]} +${gStatOf(it, s)}</span>`).join(' ');
  const fx = it.fx ? `<div class="mut" style="font-size:12px">${it.lvl >= gFxLv(it) ? '✨' : '🔒 (+' + gFxLv(it) + ')'} ${GFX[it.fx].n}: ${GFX[it.fx].d(gFxVal(it))}</div>` : '';
  const can = gCanUse(it), up = gUpCost(it);
  return `<div class="item" style="align-items:flex-start;${eqd ? 'border-color:var(--ac2)' : ''}">${gIconHTML(it)}
    <div class="nm"><b style="color:${t.c}">${gName(it)}</b>${it.isNew ? ' <span class="ok-t">MỚI</span>' : ''}${eqd ? ' <span class="ok-t">• đang mặc</span>' : ''}
    <small>${t.n} · ${gQTag(it)} · ${GSLOTN[it.slot]} · yêu cầu ${REALMS[t.minRealm].h} ${REALMS[t.minRealm].n}${can ? '' : ' <span class="bad-t">(chưa đủ cảnh giới)</span>'}</small>
    <div style="margin:4px 0">${chips}</div>${fx}${delta != null ? `<div class="${delta >= 0 ? 'ok-t' : 'bad-t'}" style="font-size:12px">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} CP so với đồ đang mặc</div>` : ''}
    <div class="row" style="margin-top:6px">${shop
      ? `<button class="buy" data-buy="${shop.i}" ${shop.sold || S.ls < shop.price ? 'disabled' : ''}>${shop.sold ? 'Đã mua' : 'Mua 💎' + shop.price}</button>`
      : `<button data-eq="${it.uid}" class="${eqd ? '' : 'use'}" ${can || eqd ? '' : 'disabled'}>${eqd ? 'Tháo' : 'Mặc'}</button>
    <button data-up="${it.uid}" ${it.lvl >= 10 ? 'disabled' : ''}>${it.lvl >= 10 ? 'Tối đa +10' : `Cường hóa 💎${up.ls} · ${up.cores} Yêu Đan`}</button>
    <button data-sell="${it.uid}" ${eqd ? 'disabled' : ''}>Bán 💎${gSellPrice(it)}</button>`}</div></div></div>`;
}
function gCPslot(it) { const o = {}; Object.keys(it.st).forEach(s => o[s] = gStatOf(it, s)); return gCP({ hp: o.hp || 0, atk: o.atk || 0, def: o.def || 0, crit: o.crit || 0, spd: o.spd || 0, hit: 100 + (o.hit || 0), luck: 0, expb: 0 }); }
function gGear() {
  const items = S.bag.filter(i => gFilter === 'all' || i.slot === gFilter).sort((a, b) => b.tier - a.tier || gQOf(b) - gQOf(a) || b.lvl - a.lvl);
  view.innerHTML = gSubNav() + gStatsPanel() + `<div class="pills" id="gfl">${[['all', 'Tất cả']].concat(GSLOTS.map(s => [s, GSLOTN[s]])).map(([k, n]) => `<button data-fl="${k}" class="${gFilter === k ? 'on' : ''}">${n}</button>`).join('')}</div>
    <div class="mut" style="margin-bottom:6px">Hành trang ${S.bag.length}/${GCFG.bagMax} · 💎 ${S.ls} · Yêu Đan ${S.cores}</div>${items.map(i => gItemRow(i)).join('') || '<div class="card">Chưa có trang bị. Hãy trả lời đúng liên tiếp để nhặt đồ!</div>'}
    <p class="mut" style="text-align:left">Cường hóa +0→+10 (mỗi cấp +8% chỉ số): +4 mở thêm 5%, +7 kích hoạt hiệu ứng đặc biệt, +10 thức tỉnh (+15% chỉ số, hiệu ứng x1.5). Trang bị cao hơn cảnh giới thì chưa mặc được.<br>Phẩm cấp trong cùng phẩm: ${GQ.map((g, i) => `<span style="color:${g.c}">${g.n}</span> ×${g.m}${g.x ? ' +' + g.x + ' thuộc tính' : ''}`).join(' · ')}. Tuyệt Phẩm mở hiệu ứng từ +4. Đồ rơi từ boss luôn từ Thượng Phẩm trở lên.</p>`;
  S.bag.forEach(i => delete i.isNew); save();
  view.onclick = e => {
    const q = a => e.target.closest('[' + a + ']'); let b;
    if ((b = q('data-sub'))) { gSub = b.dataset.sub; return vHero(); }
    if (e.target.id === 'gtrib') return gTribulation();
    if ((b = q('data-fl'))) { gFilter = b.dataset.fl; return gGear(); }
    if ((b = q('data-eq'))) { const it = S.bag.find(i => i.uid === b.dataset.eq); if (S.eq[it.slot] === it.uid) delete S.eq[it.slot]; else S.eq[it.slot] = it.uid; save(); return gGear(); }
    if ((b = q('data-up'))) {
      const it = S.bag.find(i => i.uid === b.dataset.up), c = gUpCost(it);
      if (S.ls < c.ls || S.cores < c.cores) return toast('Thiếu linh thạch hoặc Yêu Đan (đánh quái tuần để có Yêu Đan).');
      S.ls -= c.ls; S.cores -= c.cores; it.lvl++; save(); header();
      toast(it.lvl === 10 ? '🌟 Thức tỉnh! ' + it.name : it.lvl === gFxLv(it) ? '✨ Mở hiệu ứng đặc biệt: ' + GFX[it.fx].n : it.lvl === 4 ? '✨ Linh quang bộc phát +5%' : 'Cường hóa thành công +' + it.lvl);
      return gGear();
    }
    if ((b = q('data-sell'))) { const it = S.bag.find(i => i.uid === b.dataset.sell); if (!confirm('Bán ' + it.name + ' với giá ' + gSellPrice(it) + ' 💎?')) return; S.ls += gSellPrice(it); S.bag = S.bag.filter(i => i.uid !== it.uid); save(); header(); return gGear(); }
  };
}
// Tiên Phủ: cửa hàng trang bị theo ngày
function gStock() {
  const d = today(), T = gTierForRealm(realmInfo(S.xp).ri);
  if (S.shop.d !== d) S.shop = { d, sold: [] };
  return GSLOTS.map((sl, i) => { const r = gRng(d + sl + 'x'), tier = Math.max(1, T - (r() < .45 ? 1 : 0)); const it = gGen(sl, tier, r); it.uid = 'shop-' + d + '-' + i; return { it, price: Math.round(45 * GT[tier - 1].m * GQ[gQOf(it) - 1].m ** 2), i }; });
}
function gStore() {
  const stock = gStock();
  view.innerHTML = gSubNav() + `<div class="card" style="text-align:left"><b>🏯 Tiên Phủ</b><p class="mut" style="margin:4px 0 0">Hàng đổi mới mỗi ngày, theo cảnh giới của bạn. Giá 💎: ${S.ls} · Hồi Linh Đan xóa thời gian chờ đánh quái (mua ở màn hình Chiến đấu).</p></div>`
    + stock.map(({ it, price, i }) => gItemRow(it, { i, price, sold: S.shop.sold.includes(i) })).join('')
    + '<p class="mut" style="text-align:left">Đồ trong Tiên Phủ có chỉ số ngẫu nhiên trong dải của phẩm chất. Món tốt hơn thường rơi từ combo và quái tuần.</p>';
  view.onclick = e => {
    const b = e.target.closest('[data-sub]'); if (b) { gSub = b.dataset.sub; return vHero(); }
    const by = e.target.closest('[data-buy]'); if (!by) return;
    const i = +by.dataset.buy, s = stock.find(x => x.i === i);
    if (S.ls < s.price || S.shop.sold.includes(i)) return;
    if (S.bag.length >= GCFG.bagMax) return toast('Hành trang đầy, hãy bán bớt đồ.');
    S.ls -= s.price; S.shop.sold.push(i); const it = Object.assign({}, s.it, { uid: 'g' + Date.now().toString(36) + i, isNew: true }); S.bag.push(it); save(); header(); toast('Đã mua ' + it.name); gStore();
  };
}

// ============================================================
//  TẠO NHÂN VẬT MỚI + BÀI TEST XẾP TRÌNH ĐỘ
// ============================================================
// Xóa dữ liệu nhân vật. keepLearning=true thì giữ bài đã qua, thẻ ôn tập, chuỗi ngày và rương truyện.
function gResetChar(name, keepLearning, saveFirst) {
  if (saveFirst) { slotSave(); S.slotId = null; }
  S.hero = { name: (name || '').trim().slice(0, 16) || 'Đạo hữu', char: 'kiem' };
  S.xp = 0; S.ls = 0; S.inv = {}; S.equip = {}; S.freezes = 0; S.frozen = {};
  S.bag = []; S.eq = {}; S.cores = 0; S.combo = 0; S.week = null; S.hist = []; S.beast = [];
  S.nextBattle = 0; S.bt = {}; S.btv = 2; S.tribNext = 0; S.cdPills = 0; S.rpgStarter = false;
  S.shop = { d: '', sold: [] }; S.dropsDay = null; S.dropsToday = 0; S.pracDay = null; S.pracN = 0;
  if (!keepLearning) { S.lessons = {}; S.perfect = {}; S.cards = {}; S.log = {}; S.opened = []; S.bestStreak = 0; }
  rpgInit(); save();
}
const gRealmStart = ri => ri <= 0 ? 0 : REND[ri - 1];
function vNewChar() {
  view.onclick = null;
  view.innerHTML = `<div class="card" style="text-align:left"><h3 style="margin:0 0 6px">🆕 Tạo nhân vật mới</h3>
    <input id="nc-name" maxlength="16" placeholder="Đạo hiệu của nhân vật mới" value="${esc(S.hero.name)}">
    <label style="display:flex;gap:8px;align-items:center;margin:10px 0 4px"><input type="checkbox" id="nc-save" checked style="width:auto;margin:0"> <b>Lưu nhân vật hiện tại</b> vào danh sách để quay lại chơi sau</label>
    <p class="mut" style="margin:6px 0 4px"><b>Nhân vật hiện tại sẽ bị xóa (nếu không tích lưu ở trên):</b> tu vi, cảnh giới, linh thạch, trang bị, Yêu Đan, đồ trang trí đã mua, quái tuần và truyện Sơn Hải.</p>
    <label style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="nc-keep" checked style="width:auto;margin:0"> Giữ tiến độ học (bài đã qua, thẻ ôn tập, chuỗi ngày, rương truyện)</label>
    <div class="mut" style="margin:10px 0 4px">Chọn điểm xuất phát:</div>
    <div class="row"><button id="nc-zero">Bắt đầu từ đầu<br><span class="mut">HSK1 · Luyện Khí tầng 1</span></button>
    <button class="pri" id="nc-test">Làm bài test xếp trình độ<br><span style="font-size:13px">tối đa 50 câu, tự xác định cảnh giới</span></button></div>
    <div class="row"><button id="nc-cancel">Hủy</button></div></div>`;
  const name = () => $('#nc-name').value, keep = () => $('#nc-keep').checked, saveCur = () => $('#nc-save').checked;
  $('#nc-cancel').onclick = () => go('hero');
  $('#nc-zero').onclick = () => { if (!confirm('Tạo nhân vật mới bắt đầu từ đầu? Dữ liệu nhân vật hiện tại sẽ bị xóa và không hoàn tác được.')) return; gResetChar(name(), keep(), saveCur()); S.level = S.level || 1; gSub = 'char'; save(); toast('Đã tạo nhân vật mới!'); go('hero'); };
  $('#nc-test').onclick = () => { if (!confirm('Làm bài test xếp trình độ rồi tạo nhân vật mới? Dữ liệu nhân vật hiện tại chỉ bị xóa SAU KHI bạn làm xong bài test.')) return; gPlacement(name(), keep(), saveCur()); };
}
// Bài test xếp trình độ: HSK1 -> ... -> HSK5, mỗi cấp 10 câu (7 từ vựng + 3 ngữ pháp), đúng >= 8 thì làm tiếp cấp sau
function gPlacement(name, keep, saveFirst) {
  const res = []; let L = 1;
  const build = L => {
    const pool = lw(L).length >= 4 ? lw(L) : S.words, gl = shuffle(GRAM.filter(g => g.l === L)).slice(0, 3);
    return shuffle(shuffle(pool).slice(0, 10 - gl.length).map(w => gVocabQ(w, pool, false)).concat(gl.map(g => gGramQ(g, false))));
  };
  const runLevel = () => gTestUI(build(L), 'Xếp trình độ · HSK' + L, ok => {
    res.push(ok);
    if (ok >= 8 && L < 5) { L++; toast('Đạt HSK' + (L - 1) + '! Tiếp tục HSK' + L); runLevel(); } else finish();
  });
  const finish = () => {
    let passed = 0; while (passed < res.length && res[passed] >= 8) passed++;
    const partial = passed < 5 ? (res[passed] || 0) : 0, stage = Math.min(4, Math.floor(partial / 10 * 5));
    const r0 = Math.min(8, 2 * passed);               // cảnh giới đầu tiên của HSK kế tiếp
    gResetChar(name, keep, saveFirst);
    for (let lv = 1; lv <= passed; lv++) lessonsOf(lv).forEach((_, k) => { const key = lkey(lv, k); if ((S.lessons[key] || 0) < PASS) S.lessons[key] = PASS; });
    for (let i = 0; i < r0; i++) S.bt[i] = true;
    S.xp = gRealmStart(r0) + (passed >= 5 ? 8 * REALMS[r0].c : stage * REALMS[r0].c);
    S.level = Math.min(5, passed + 1);
    save(); header();
    const ri = realmInfo(S.xp);
    view.innerHTML = `<div class="card"><div class="han" style="font-size:56px">🧭</div><h3 style="margin:4px 0">Kết quả xếp trình độ</h3>
      ${res.map((s, i) => `<div class="mean">HSK${i + 1}: <b>${s}/10</b> ${s >= 8 ? '✓' : ''}</div>`).join('')}
      <p style="margin:10px 0">Bạn bắt đầu ở <b style="color:var(--ac)">${ri.h} ${ri.name}</b>, học tiếp <b>HSK${S.level}</b>.</p>
      <p class="mut">${passed ? 'Các bài HSK1' + (passed > 1 ? '–' + passed : '') + ' được đánh dấu đã qua.' : 'Bạn bắt đầu học từ bài đầu tiên của HSK1.'}${passed >= 5 ? ' Bạn đã ở tầng cao nhất, ôn tập đủ bài HSK5 rồi độ kiếp để Phi Thăng!' : ''}</p></div>
      <div class="row"><button class="pri" id="pl-go">Bắt đầu tu luyện</button></div>`;
    $('#pl-go').onclick = () => { gSub = 'char'; go('home'); };
  };
  runLevel();
}

// ---------- phím tắt: 1-4 chọn đáp án, Enter/Space qua câu ----------
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tg = e.target; if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
  const v = document.getElementById('view'); if (!v) return;
  if (/^[1-4]$/.test(e.key)) {
    const opts = [...v.querySelectorAll('.opt')];
    if (!opts.length || opts.some(o => o.classList.contains('ok') || o.classList.contains('no'))) return;
    const b = opts[+e.key - 1]; if (b) { e.preventDefault(); b.click(); }
  } else if (e.key === 'Enter' || e.key === ' ') {
    if (GB && !GB.over && GB.goNext) { e.preventDefault(); return GB.goNext(); } // trận đánh quái: Enter sang câu tiếp ngay
    const n = v.querySelector('#nx:not(.hide), #gt-n:not(.hide)'); if (n) { e.preventDefault(); n.click(); }
  }
});

// ============================================================
//  LƯU NHIỀU NHÂN VẬT (hồ sơ) VÀ CHUYỂN QUA LẠI
// ============================================================
const SLOTKEY = 'zh_app_slots';
function slotsLoad() { try { return JSON.parse(localStorage.getItem(SLOTKEY)) || { slots: {} }; } catch (e) { return { slots: {} }; } }
function slotsSave(R) { try { localStorage.setItem(SLOTKEY, JSON.stringify(R)); return true; } catch (e) { toast('Bộ nhớ trình duyệt đầy, không lưu thêm được. Hãy xóa bớt nhân vật đã lưu.'); return false; } }
function slotSummary(st) {
  const ri = realmInfo(st.xp);
  return { name: st.hero.name, char: st.hero.char || 'kiem', realm: ri.h + ' ' + ri.name, level: st.level || 1, xp: st.xp, ls: st.ls, lessons: Object.values(st.lessons || {}).filter(v => v >= PASS).length, bag: (st.bag || []).length };
}
// Ghi nhân vật hiện tại vào danh sách (tạo mới nếu chưa có). Trả về id hoặc null nếu lỗi.
function slotSave(id) {
  id = id || S.slotId || ('p' + Date.now().toString(36));
  S.slotId = id; save();
  const R = slotsLoad(), prev = R.slots[id];
  R.slots[id] = { created: prev ? prev.created : Date.now(), t: Date.now(), sum: slotSummary(S), data: JSON.stringify(S) };
  return slotsSave(R) ? id : null;
}
function slotLoad(id) {
  if (id === S.slotId) return toast('Đây là nhân vật đang chơi.');
  const R0 = slotsLoad(); if (!R0.slots[id]) return;
  if (!slotSave()) return;                       // tự lưu nhân vật hiện tại trước khi chuyển
  const R = slotsLoad(), data = JSON.parse(R.slots[id].data);
  data.slotId = id;
  window.__noSave = true;                         // chặn mọi lần save() ghi đè khi trang đang tải lại
  localStorage.setItem(KEY, JSON.stringify(data));
  location.reload();
}
function vSlots() {
  const R = slotsLoad(), cur = S.slotId, list = Object.entries(R.slots).sort((a, b) => b[1].t - a[1].t);
  const when = t => new Date(t).toLocaleString('vi-VN');
  const live = slotSummary(S);
  view.onclick = null;
  view.innerHTML = `<div class="card" style="text-align:left"><h3 style="margin:0 0 6px">📂 Nhân vật đã lưu</h3>
    <p class="mut" style="margin:0 0 8px">Mỗi nhân vật có tu vi, trang bị, linh thạch và tiến độ học riêng. Chuyển nhân vật sẽ tự lưu nhân vật hiện tại trước.</p>
    <div class="item" style="border-color:var(--ac2)">${bustImg(44)}<div class="nm"><b>${esc(live.name)}</b> <span class="ok-t">• đang chơi</span><small>${esc(live.realm)} · HSK${live.level} · ${live.lessons} bài đã qua · ${S.bag.length} trang bị${cur && R.slots[cur] ? ' · lưu lúc ' + when(R.slots[cur].t) : ' · <b>chưa lưu</b>'}</small></div><button class="use" id="sl-save">💾 Lưu</button></div></div>
    ${list.filter(([id]) => id !== cur).map(([id, s]) => `<div class="item"><img class="pv" src="${charImg(s.sum.char, 'bust')}" alt="" style="object-fit:cover;padding:0"><div class="nm"><b>${esc(s.sum.name)}</b><small>${esc(s.sum.realm)} · HSK${s.sum.level} · ${s.sum.lessons} bài đã qua · ${s.sum.bag} trang bị<br>Lưu lúc ${when(s.t)}</small></div>
      <div style="display:flex;flex-direction:column;gap:6px"><button class="use" data-play="${id}">Chơi</button><button data-del="${id}">Xóa</button></div></div>`).join('') || '<p class="mut">Chưa có nhân vật nào khác được lưu. Bấm "Tạo nhân vật mới" (nhớ tích ô lưu) để chơi nhân vật khác mà vẫn giữ được nhân vật này.</p>'}
    <div class="row"><button id="sl-back">← Quay lại</button></div>`;
  $('#sl-back').onclick = () => go('hero');
  $('#sl-save').onclick = () => { if (slotSave()) { toast('Đã lưu nhân vật ' + S.hero.name); vSlots(); } };
  view.onclick = e => {
    const pl = e.target.closest('[data-play]'), dl = e.target.closest('[data-del]');
    if (pl) { const s = R.slots[pl.dataset.play]; if (confirm('Chuyển sang nhân vật "' + s.sum.name + '"? Nhân vật hiện tại sẽ được tự động lưu.')) slotLoad(pl.dataset.play); }
    if (dl) { const s = R.slots[dl.dataset.del]; if (confirm('Xóa nhân vật đã lưu "' + s.sum.name + '"? Không thể hoàn tác.')) { delete R.slots[dl.dataset.del]; slotsSave(R); vSlots(); } }
  };
}
// giữ bản lưu của nhân vật đang chơi luôn mới khi đóng trang
window.addEventListener('pagehide', () => { try { if (!window.__noSave && S.slotId && slotsLoad().slots[S.slotId]) slotSave(); } catch (e) {} });