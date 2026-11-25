// ============================================================
//  TÍNH NĂNG MỞ RỘNG: Gacha nhân vật · Leo Tháp Thông Thiên · Phòng boss LAN
//  Nạp SAU script chính (cuối index.html) để bọc lại vHero, vReview, vFight, gStats...
//  Phụ thuộc: index.html (S, view, $, esc, toast, save, header, go, ITEMS, META, CPRICE, itemOf, addXP, speak...)
//             rpg.js (gStats, gDrop, gGen, GT, gQuestion, gBossStats, GBOSS, GIMG...), ult-fx.js (gUltPlay, GULT...)
// ============================================================

// ---------------- 1. GACHA NHÂN VẬT ----------------
const FX_DEFAULT = ['kiem', 'hoa', 'thuy', 'moc', 'dia']; // 5 nhân vật mặc định: Kiếm, Hỏa, Thủy, Mộc, Địa
const FX_CFG = {
  ticket: 160,        // giá 1 vé quay (linh thạch)
  ten: 1440,          // giá 10 vé (giảm 10%)
  pity: 30,           // quay 30 lần chưa ra Truyền Thuyết thì lần thứ 30 chắc chắn ra
  rates: [0.6, 0.3, 0.1], // Hiếm / Sử Thi / Truyền Thuyết
  maxStar: 5,         // trùng nhân vật: +1 sao (mỗi sao +3% ATK), tối đa 5 sao
  dupRefund: 80       // đã 5 sao mà trùng nữa thì hoàn linh thạch
};
const FX_RAR = [null,
  { n: 'Hiếm', c: '#4a90e2', atk: .10, crit: 0, ult: 1.1 },
  { n: 'Sử Thi', c: '#9b6bd6', atk: .18, crit: 3, ult: 1.2 },
  { n: 'Truyền Thuyết', c: '#e0b84f', atk: .28, crit: 5, ult: 1.35 }];
// Hiệu ứng hỗ trợ riêng của từng nhân vật gacha. burn/pierce/vamp/guard/swift dùng hệ hiệu ứng trang bị sẵn có.
const FX_GACHA = {
  phong: { r: 1, fx: 'swift', v: 4 }, loi: { r: 1, fx: 'burn', v: 10 }, doc: { r: 1, fx: 'pierce', v: 20 },
  kimcuong: { r: 1, fx: 'guard', v: 10 }, dan: { r: 1, fx: 'heal', v: 4 }, nho: { r: 1, fx: 'time', v: 1 }, hoa2: { r: 1, fx: 'vamp', v: 8 },
  bang: { r: 2, fx: 'shield', v: 1 }, quang: { r: 2, fx: 'heal', v: 6 }, khi: { r: 2, fx: 'burn', v: 16 },
  thu: { r: 2, fx: 'dodge', v: 25 }, am: { r: 2, fx: 'pierce', v: 30 }, co: { r: 2, fx: 'vamp', v: 12 },
  hon: { r: 3, fx: 'ult4', v: 4 }, khong: { r: 3, fx: 'dodge', v: 35 }, thoi: { r: 3, fx: 'time', v: 2 }, tran: { r: 3, fx: 'shield', v: 2 }
};
const FX_SUPN = {
  heal: v => `Mỗi câu đúng hồi ${v}% HP`, time: v => `Mỗi câu đúng thêm +${v} giây`, dodge: v => `${v}% né phản công khi trả lời sai`,
  shield: v => `Băng giáp chặn ${v} lần sai mỗi trận (không mất HP, giữ liên kích)`, ult4: v => `Tung chiêu cuối sau ${v} câu đúng liên tiếp (thay vì 5)`,
  burn: v => `+${v}% sát thương`, pierce: v => `Bỏ qua ${v}% DEF của quái`, vamp: v => `Hồi ${v}% sát thương thành HP`,
  guard: v => `Giảm ${v}% sát thương nhận vào`, swift: v => `+${v} giây mỗi trận`
};
const fxG = () => { if (!S.gacha) S.gacha = { t: 0, pity: 0, n: 0, stars: {} }; return S.gacha; };
const fxIsGacha = id => !!FX_GACHA[id];
const fxOwns = id => FX_DEFAULT.includes(id) || !!S.inv[id];
const fxCur = () => { const id = (S.hero && S.hero.char) || 'kiem'; return FX_GACHA[id] && S.inv[id] ? Object.assign({ id, star: fxG().stars[id] || 1 }, FX_GACHA[id]) : null; };
const fxSupTxt = id => { const g = FX_GACHA[id]; return g ? FX_SUPN[g.fx](g.v) : ''; };

// giá nhân vật: 5 mặc định miễn phí, còn lại chỉ mở bằng gacha (giá chỉ dùng để sắp xếp danh sách)
ITEMS.forEach(it => {
  if (it.cat !== 'char') return;
  if (FX_DEFAULT.includes(it.id)) { it.price = 0; CPRICE[it.id] = 0; }
  else if (FX_GACHA[it.id]) { it.gacha = FX_GACHA[it.id].r; it.price = 1000 * it.gacha + (CPRICE[it.id] || 0); }
});

function fxInit() {
  const g = fxG();
  if (!g.given) { g.given = true; g.t = (g.t || 0) + 1; } // tặng 1 vé cho mọi người
  Object.keys(FX_GACHA).forEach(id => { if (S.inv[id] && !g.stars[id]) g.stars[id] = 1; }); // ai đã mua nhân vật từ trước vẫn giữ
  if (!fxOwns(S.hero.char || 'kiem')) S.hero.char = 'kiem';
  S.tower = S.tower || { f: 0, cp: 0, best: 0, got: 0 };
  S.coop = S.coop || { url: 'http://127.0.0.1:8770', room: '', d: '', n: 0, done: [] };
  save();
}

// chỉ số: cộng thưởng của nhân vật gacha đang dùng
const fx_gStats = gStats;
gStats = function () {
  const t = fx_gStats(), c = fxCur();
  if (!c) return t;
  const R = FX_RAR[c.r];
  t.atk = Math.round(t.atk * (1 + R.atk + .03 * (c.star - 1)));
  t.crit = Math.round((t.crit + R.crit) * 10) / 10;
  if (GFX[c.fx]) t.fx[c.fx] = (t.fx[c.fx] || 0) + c.v;
  return t;
};
// các móc được gọi từ gAnswer (rpg.js) và trận LAN
function fxUltCombo() { const c = fxCur(); return c && c.fx === 'ult4' ? c.v : GULT_COMBO; }
function fxUltMul() { const c = fxCur(); return c ? FX_RAR[c.r].ult : 1; }
function fxOnRight(B) {
  const c = fxCur(); if (!c) return '';
  if (c.fx === 'heal') { const h = Math.round(B.pmax * c.v / 100); B.php = Math.min(B.pmax, B.php + h); return ` · 💚 hồi ${h} HP`; }
  if (c.fx === 'time') { B.endAt += c.v * 1000; B.total += c.v; return ` · ⏳ +${c.v} giây`; }
  return '';
}
function fxOnWrong(B) {
  const c = fxCur(); if (!c) return null;
  if (c.fx === 'shield') { B.shield = B.shield == null ? c.v : B.shield; if (B.shield > 0) { B.shield--; return { log: `🛡️ Băng giáp chặn đòn phản công (còn ${B.shield} lần)`, keepCombo: true }; } }
  if (c.fx === 'dodge' && Math.random() * 100 < c.v) return { log: '💨 Né được đòn phản công!' };
  return null;
}

// quay
function fxRoll() {
  const g = fxG(); g.pity++; g.n++;
  let r = Math.random(), rar = r < FX_CFG.rates[2] ? 3 : r < FX_CFG.rates[2] + FX_CFG.rates[1] ? 2 : 1;
  if (g.pity >= FX_CFG.pity) rar = 3;
  if (rar === 3) g.pity = 0;
  const pool = Object.keys(FX_GACHA).filter(id => FX_GACHA[id].r === rar && META.some(m => m.id === id));
  const id = pick(pool), res = { id, r: rar };
  if (!S.inv[id]) { S.inv[id] = true; g.stars[id] = 1; res.isNew = true; }
  else if ((g.stars[id] || 1) < FX_CFG.maxStar) { g.stars[id] = (g.stars[id] || 1) + 1; res.star = g.stars[id]; }
  else { S.ls += FX_CFG.dupRefund; res.refund = FX_CFG.dupRefund; }
  return res;
}
function fxPull(n) {
  const g = fxG();
  if (g.t < n) return toast(`Cần ${n} vé quay (đang có ${g.t}).`);
  g.t -= n; const out = []; for (let i = 0; i < n; i++) out.push(fxRoll());
  save(); header(); fxShowPull(out);
}
function fxBuy(n) {
  const cost = n === 10 ? FX_CFG.ten : FX_CFG.ticket * n;
  if (S.ls < cost) return toast('Không đủ linh thạch 💎');
  S.ls -= cost; fxG().t += n; save(); header(); toast(`🎟️ Đã mua ${n} vé quay`); vHero();
}
function fxShowPull(out) {
  const best = Math.max(...out.map(o => o.r));
  view.innerHTML = `<div class="card"><h3 style="margin:0 0 8px">🎟️ Kết quả quay${best === 3 ? ' · ✨ Truyền Thuyết!' : ''}</h3>
    <div style="display:grid;grid-template-columns:repeat(${out.length > 1 ? 5 : 1},1fr);gap:8px">${out.map(o => {
      const m = META.find(x => x.id === o.id) || {}, R = FX_RAR[o.r];
      return `<div style="border:3px solid ${R.c};border-radius:12px;padding:4px;${o.r === 3 ? 'box-shadow:0 0 14px ' + R.c : ''}"><img src="${charImg(o.id, 'bust')}" alt="" style="width:100%;border-radius:8px;display:block">
        <b style="font-size:12px">${esc(m.name || o.id)}</b><br><small style="color:${R.c};font-weight:700">${R.n}</small><br><small>${o.isNew ? '🆕 Mới!' : o.refund ? '+' + o.refund + ' 💎' : '+1★ (' + o.star + '★)'}</small></div>`;
    }).join('')}</div>
    <p class="mut">Đảm bảo Truyền Thuyết sau ${FX_CFG.pity - fxG().pity} lần quay nữa · Còn ${fxG().t} vé</p></div>
    <div class="row"><button class="pri" id="fx-back">← Về Phường thị</button></div>`;
  scrollTo(0, 0);
  $('#fx-back').onclick = () => { gSub = 'char'; shopCat = 'char'; vHero(); };
}
function fxGachaPanel() {
  const g = fxG(), cur = fxCur();
  return `<div class="card" id="fx-gacha" style="text-align:left;border:2px solid var(--gold,#e0b84f)"><b>🎟️ Quay thưởng nhân vật</b> <span class="mut">· vé: <b>${g.t}</b> · 💎 ${S.ls}</span>
    <p class="mut" style="margin:6px 0">5 nhân vật mặc định: Kiếm, Hỏa, Thủy, Mộc, Địa. 17 nhân vật còn lại chỉ mở bằng vé quay. Tỉ lệ: Hiếm 60% (+10% ATK, chiêu cuối ×1,1) · Sử Thi 30% (+18% ATK, +3 CRIT, ×1,2) · Truyền Thuyết 10% (+28% ATK, +5 CRIT, ×1,35). Mỗi nhân vật quay được có thêm 1 hiệu ứng hỗ trợ riêng. Trùng nhân vật: +1★ (+3% ATK/sao). Đảm bảo Truyền Thuyết sau <b>${FX_CFG.pity - g.pity}</b> lần quay nữa.</p>
    ${cur ? `<p style="margin:4px 0">Đang dùng: <b style="color:${FX_RAR[cur.r].c}">${FX_RAR[cur.r].n} ${'★'.repeat(cur.star)}</b> · ${esc(fxSupTxt(cur.id))}</p>` : ''}
    <div class="row" style="flex-wrap:wrap"><button data-fxpull="1" ${g.t >= 1 ? 'class="pri"' : 'disabled'}>Quay 1</button><button data-fxpull="10" ${g.t >= 10 ? 'class="pri"' : 'disabled'}>Quay 10</button>
    <button data-fxbuy="1" ${S.ls >= FX_CFG.ticket ? '' : 'disabled'}>Mua 1 vé 💎${FX_CFG.ticket}</button><button data-fxbuy="10" ${S.ls >= FX_CFG.ten ? '' : 'disabled'}>Mua 10 vé 💎${FX_CFG.ten}</button></div></div>`;
}
const fx_vHero = vHero;
vHero = function () {
  fx_vHero();
  if (gSub !== 'char' || shopCat !== 'char') return;
  // thay nút "Mua" của nhân vật gacha bằng nhãn độ hiếm, chèn bảng quay thưởng
  view.querySelectorAll('[data-buy]').forEach(b => {
    const it = itemOf(b.dataset.buy); if (!it || it.cat !== 'char' || !it.gacha) return;
    const R = FX_RAR[it.gacha]; b.outerHTML = `<button disabled title="Chỉ mở bằng vé quay" style="color:${R.c};font-weight:700">🎟️ ${R.n}</button>`;
  });
  META.forEach(m => {
    const g = FX_GACHA[m.id]; if (!g) return;
    const row = [...view.querySelectorAll('.item')].find(r => r.querySelector('b') && r.querySelector('b').textContent === m.name), sm = row && row.querySelector('small'); if (!sm) return;
    const R = FX_RAR[g.r], st = fxG().stars[m.id];
    sm.insertAdjacentHTML('beforeend', `<br><span style="color:${R.c};font-weight:700">${R.n}${st ? ' ' + '★'.repeat(st) : ''}</span> · ${esc(fxSupTxt(m.id))}`);
  });
  const firstItem = view.querySelector('.item'); if (firstItem) firstItem.insertAdjacentHTML('beforebegin', fxGachaPanel());
  const old = view.onclick;
  view.onclick = e => {
    const p = e.target.closest('[data-fxpull]'); if (p) return fxPull(+p.dataset.fxpull);
    const b = e.target.closest('[data-fxbuy]'); if (b) return fxBuy(+b.dataset.fxbuy);
    if (old) old(e);
  };
};

// ---------------- 2. LEO THÁP THÔNG THIÊN (tab Ôn tập) ----------------
const TW_CP = 10; // cứ 10 tầng là một mốc lưu
let rvMode = 'card';
const rvPills = () => `<div class="pills" id="rvm"><button data-rvm="card" class="${rvMode === 'card' ? 'on' : ''}">🃏 Ôn thẻ</button><button data-rvm="tower" class="${rvMode === 'tower' ? 'on' : ''}">🗼 Leo Tháp</button></div>`;
const fx_vReview = vReview, fx_nextCard = nextCard, fx_drawCard = drawCard;
vReview = function () { if (rvMode === 'tower') return vTower(); fx_vReview(); };
nextCard = function () { fx_nextCard(); if (tab === 'review' && rvMode === 'card' && !$('#rvm')) view.insertAdjacentHTML('afterbegin', rvPills()); };
drawCard = function () { fx_drawCard(); if (tab === 'review' && rvMode === 'card' && !$('#rvm')) view.insertAdjacentHTML('afterbegin', rvPills()); };
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-rvm]'); if (!b || tab !== 'review') return;
  rvMode = b.dataset.rvm; if (rvMode === 'tower') { cur = null; rvHist = []; } render();
});
function twQ(floor) {
  if (floor < 30) return gQuestion();
  // từ tầng 30: ẩn pinyin ở đáp án
  const L = S.level || 1, st = gQState(), gn = GRAM.filter(g => g.l <= L).length;
  if (gn && Math.random() < .25) return gGramQ(gPickGram(L), false, gPickMode(['fill', 'fill', 'trans', 'g2m'], st.gm));
  const w = gPickWord(L), pool = lw(w.l).length >= 4 ? lw(w.l) : S.words, au = !!(window.AUDIO && AUDIO[w.id]);
  return gVocabQ(w, pool, false, [gPickMode(['m2h', 'h2p', 'p2h'].concat(au ? ['listen', 'listen2m'] : []), st.vt)]);
}
function twReward(cp) {
  const T = S.tower, lines = [];
  if (cp <= (T.got || 0)) return lines;
  T.got = cp;
  const ls = lsGain(15 + Math.min(60, cp / 4)), cores = 1 + Math.floor(cp / 50);
  S.ls += ls; S.cores += cores; lines.push(`🏯 Lần đầu đạt mốc tầng ${cp}: +${ls} 💎, +${cores} Yêu Đan`);
  if (cp % 50 === 0) { fxG().t++; const it = gDrop('boss', .75); lines.push('🎟️ +1 vé quay nhân vật'); lines.push(gDropHTML(it)); }
  return lines;
}
function vTower() {
  const T = S.tower;
  const draw = (fb) => {
    const q = twQ(T.f + 1), nextCp = (Math.floor(T.f / TW_CP) + 1) * TW_CP;
    view.innerHTML = rvPills() + `<div class="card" style="text-align:left"><div style="display:flex;justify-content:space-between;align-items:center"><b>🗼 Tháp Thông Thiên</b><b style="font-size:24px;color:var(--ac)">Tầng ${T.f}</b></div>
      <div class="bar g"><i style="width:${(T.f - T.cp) / TW_CP * 100}%"></i></div>
      <div class="mut">Mốc lưu: tầng <b>${T.cp}</b> · mốc kế: ${nextCp} · kỷ lục: ${T.best}${T.f + 1 >= 30 ? ' · 🔒 ẩn pinyin' : ''}</div>
      <div class="mut" style="font-size:12px">Trả lời đúng liên tục để leo. Sai sẽ rơi về mốc lưu gần nhất (cứ ${TW_CP} tầng một mốc). Lần đầu đạt mỗi mốc có thưởng 💎 + Yêu Đan; mỗi 50 tầng thêm vé quay và trang bị. Từ tầng 30 đáp án không có pinyin.</div></div>
      ${fb ? `<div class="card" style="text-align:left">${fb}</div>` : ''}
      <div class="card">${q.stem}<div id="tw-o">${q.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="kn">${i + 1}</span>${o.label}</button>`).join('')}</div><div id="tw-f" style="margin-top:10px;min-height:24px"></div></div>
      <div class="row"><button class="pri hide" id="nx">Tầng tiếp →</button></div>`;
    const sp = $('#gq-spk'); if (sp) sp.onclick = () => speak(q.word);
    if (q.speakOnShow && q.word) speak(q.word);
    let done = false, msg = '';
    $('#tw-o').onclick = e => {
      const b = e.target.closest('.opt'); if (!b || done) return; done = true;
      const k = +b.dataset.i, right = q.opts[k].ok, btns = [...document.querySelectorAll('#tw-o .opt')];
      btns[k].classList.add(right ? 'ok' : 'no'); btns[q.opts.findIndex(o => o.ok)].classList.add('ok');
      if (q.speakOnAnswer && q.word) speak(q.word);
      const dr = rpgOnAnswer(right);
      let lines = [];
      if (right) {
        T.f++; T.best = Math.max(T.best, T.f);
        if (gPracOK()) { S.ls += lsGain(1); addXP(10); }
        if (T.f % TW_CP === 0) { T.cp = T.f; lines = twReward(T.f); lines.unshift(`🚩 Đạt mốc lưu tầng ${T.f}!`); }
        $('#tw-f').innerHTML = `<span class="ok-t">✓ Đúng! Lên tầng ${T.f}.</span> ${q.expl}`;
      } else {
        const from = T.f; T.f = T.cp;
        $('#tw-f').innerHTML = `<span class="bad-t">✗ Sai! Rơi từ tầng ${from} về mốc tầng ${T.cp}.</span> ${q.expl}`;
      }
      if (dr) lines.push(gDropHTML(dr));
      msg = lines.join('<br>'); if (msg) $('#tw-f').insertAdjacentHTML('beforeend', '<div style="margin-top:6px">' + msg + '</div>');
      save(); header();
      $('#nx').classList.remove('hide');
    };
    $('#nx').onclick = () => draw(msg);
  };
  draw('');
}

// ---------------- 3. PHÒNG BOSS ONLINE (co-op qua Firebase) ----------------
// Người chơi đã đăng nhập (cloud.js) ở bất kỳ đâu nhập cùng một mã phòng. Phòng là tài liệu Firestore rooms/{mã}:
//   { phase: 'lobby'|'fight'|'done', round, boss, ri, max, dmg, ends(ms), result, p: { uid: {name,char,xp,ri,dmg,seen} } }
// Sát thương cộng bằng FieldValue.increment nên nhiều người đánh cùng lúc không ghi đè nhau.
const CP_CFG = { sec: 150, dropMul: 1.3, dropsPerDay: 3, hpPerPlayer: .6, idleMs: 30000, maxHitFrac: .25 };
let CP = null; // trạng thái phòng phía client
const cpRef = room => CL.db.collection('rooms').doc(room);
function cpActive(d) { const now = Date.now(); return Object.entries((d && d.p) || {}).filter(([, v]) => v && now - (v.seen || 0) < CP_CFG.idleMs); }
function cpState(d) {
  d = d || {}; const max = d.max || 0, hp = Math.max(0, max - (d.dmg || 0)), now = Date.now();
  return { phase: d.phase || 'lobby', round: d.round || 0, boss: d.boss || 0, ri: d.ri || 0, max, hp, result: d.result || null,
    left: d.phase === 'fight' ? Math.max(0, (d.ends || 0) - now) : 0,
    players: cpActive(d).map(([pid, v]) => ({ pid, name: v.name || 'Đạo hữu', char: v.char || 'kiem', xp: v.xp || 0, ri: v.ri || 0, dmg: v.dmg || 0 })) };
}
async function cpFinish(room, round) { // kết thúc trận (ai thấy trước thì ghi, chỉ ghi một lần)
  const ref = cpRef(room);
  await CL.db.runTransaction(async tx => {
    const d = (await tx.get(ref)).data() || {};
    if (d.phase !== 'fight' || d.round !== round) return;
    const win = (d.max || 0) - (d.dmg || 0) <= 0;
    if (!win && Date.now() < (d.ends || 0)) return;
    const board = Object.values(d.p || {}).filter(v => v.dmg > 0).map(v => ({ name: v.name, dmg: v.dmg })).sort((a, b) => b.dmg - a.dmg);
    tx.update(ref, { phase: 'done', result: { win, boss: d.boss, max: d.max, board, round } });
  });
}
async function cpApi(path, body) {
  if (!CL.user) throw new Error('Hãy đăng nhập tài khoản (nút ☁️) để vào phòng.');
  const uid = CL.user.uid, room = body.room, ref = cpRef(room), FV = firebase.firestore.FieldValue;
  const meRec = () => Object.assign({}, cpMe(), { seen: Date.now() });
  if (path === 'join') {
    await ref.set({ p: { [uid]: Object.assign(meRec(), { dmg: 0 }) } }, { merge: true });
    if (CP && CP.unsub) CP.unsub();
    const box = { doc: null };
    box.unsub = ref.onSnapshot(sn => { box.doc = sn.data() || null; if (CP && CP.box === box) cpPoll(); }, () => {});
    return { pid: uid, box };
  }
  if (path === 'state') {
    const B = CP && CP.box; if (!B) throw new Error('Chưa vào phòng');
    if (!CP.beat || Date.now() - CP.beat > 8000) { CP.beat = Date.now(); const m = cpMe(); ref.update({ [`p.${uid}.seen`]: Date.now(), [`p.${uid}.name`]: m.name, [`p.${uid}.char`]: m.char, [`p.${uid}.xp`]: m.xp, [`p.${uid}.ri`]: m.ri }).catch(() => {}); }
    const st = cpState(B.doc);
    if (st.phase === 'fight' && (st.hp <= 0 || st.left <= 0)) cpFinish(room, st.round).catch(() => {});
    return st;
  }
  if (path === 'start') {
    await CL.db.runTransaction(async tx => {
      const sn = await tx.get(ref), d = sn.data() || {};
      if (d.phase === 'fight' && Date.now() < (d.ends || 0) && (d.max || 0) > (d.dmg || 0)) return; // trận đang diễn ra
      const act = cpActive(d); if (!act.find(([k]) => k === uid)) act.push([uid, meRec()]);
      const top = act.reduce((a, b) => ((b[1].xp || 0) > (a[1].xp || 0) ? b : a));
      const ri = Math.max(0, Math.min(GCFG.bossHp.length - 1, top[1].ri || 0)), max = Math.round(GCFG.bossHp[ri] * (1 + CP_CFG.hpPerPlayer * (act.length - 1)));
      const up = { phase: 'fight', round: (d.round || 0) + 1, boss: Math.floor(Math.random() * GBOSS.length), ri, max, dmg: 0, ends: Date.now() + CP_CFG.sec * 1000, result: null };
      Object.keys(d.p || {}).forEach(k => { up[`p.${k}.dmg`] = 0; });
      tx.update(ref, up);
    });
    return {};
  }
  if (path === 'hit') {
    const d = CP && CP.box && CP.box.doc; if (!d || d.phase !== 'fight' || d.round !== body.round) return {};
    const dmg = Math.max(0, Math.min(Math.round(body.dmg), Math.round((d.max || 0) * CP_CFG.maxHitFrac)));
    await ref.update({ dmg: FV.increment(dmg), [`p.${uid}.dmg`]: FV.increment(dmg) });
    return {};
  }
  if (path === 'leave') {
    if (CP && CP.unsub) CP.unsub();
    await ref.update({ [`p.${uid}`]: FV.delete() });
    return {};
  }
}
const cpMe = () => ({ name: S.hero.name || 'Đạo hữu', char: S.hero.char || 'kiem', xp: S.xp, ri: Math.min(realmInfo(S.xp).ri, GCFG.bossHp.length - 1), cp: gCP(gStats()) });
const fx_vFight = vFight;
vFight = function () {
  fx_vFight();
  const c = view.querySelector('.card'); if (!c) return;
  c.insertAdjacentHTML('afterend', `<div class="card" style="text-align:left"><b>👥 Phòng boss online</b> <span class="mut">· đánh boss cùng bạn bè ở bất kỳ đâu (cần đăng nhập ☁️)</span>
    <p class="mut" style="margin:6px 0">Boss mạnh theo người có tu vi cao nhất phòng, máu tăng theo số người, trận ${CP_CFG.sec} giây. Hạ boss: đồ rơi chỉ số cao hơn thường ${Math.round((CP_CFG.dropMul - 1) * 100)}% (tối đa ${CP_CFG.dropsPerDay} lần/ngày).</p>
    <div class="row"><button class="pri" id="cp-open">👥 Vào phòng</button></div></div>`);
  $('#cp-open').onclick = vCoop;
};
function cpStop() { if (CP) { clearInterval(CP.poll); clearInterval(CP.tm); if (CP.unsub) CP.unsub(); } CP = null; }
const fx_render = render;
render = function () { cpStop(); fx_render(); };
function vCoop() {
  cpStop();
  if (typeof CL === 'undefined' || !CL.ok) { toast('Phòng online cần mở game qua start.bat hoặc link web và có Internet.'); return; }
  if (!CL.user) { toast('Hãy đăng nhập tài khoản trước để vào phòng.'); return cloudPanel(); }
  view.innerHTML = `<div class="card" style="text-align:left"><h3 style="margin:0 0 6px">👥 Phòng boss online</h3>
    <p class="mut" style="margin:0 0 8px">Mọi người (đã đăng nhập) nhập cùng một mã phòng là vào chung phòng, không cần chung mạng. Đặt mã khó đoán (vd: tên nhóm + số) để người lạ không vào nhầm.</p>
    <label class="mut">Mã phòng</label><input id="cp-room" maxlength="12" value="${esc(S.coop.room || '')}" placeholder="vd: 1234">
    <div class="row"><button class="pri" id="cp-join">Vào phòng</button><button id="cp-back">← Về trận chiến</button></div>
    <div id="cp-err" class="bad-t"></div></div>`;
  $('#cp-back').onclick = () => go('fight');
  $('#cp-join').onclick = async () => {
    S.coop.room = ($('#cp-room').value.trim().replace(/[^A-Za-z0-9_-]/g, '') || 'phong1').slice(0, 20); save();
    try {
      const j = await cpApi('join', Object.assign({ room: S.coop.room }, cpMe()));
      CP = { pid: j.pid, room: S.coop.room, st: null, B: null, box: j.box, unsub: j.box.unsub };
      CP.poll = setInterval(cpPoll, 1000);
    } catch (e) { $('#cp-err').textContent = /permission/i.test(e.message) ? 'Firestore chưa cho phép tạo phòng: cần thêm quy tắc rooms trong Firebase Rules.' : 'Không vào được phòng: ' + e.message; }
  };
}
async function cpPoll() {
  if (!CP || !CP.box || !CP.box.doc) return;
  if (tab !== 'fight') return cpStop();
  let st; try { st = await cpApi('state', Object.assign({ room: CP.room, pid: CP.pid }, cpMe())); } catch (e) { return; }
  if (!CP) return;
  st.endsAtLocal = Date.now() + (st.left || 0); CP.st = st;
  if (st.phase === 'fight' && (!CP.B || CP.B.round !== st.round)) return cpStartFight(st);
  if (st.phase !== 'fight' && CP.B && !CP.B.over) return cpEnd(st);
  if (st.phase === 'fight' && CP.B) return cpUpdate(st);
  if (!CP.B || CP.B.over) { if (!CP.B || CP.B.showLobby) cpLobby(st); }
}
function cpLobby(st) {
  const sig = JSON.stringify([st.players, st.result, st.phase]); if (CP.sig === sig && $('#cp-start')) return; CP.sig = sig;
  const ps = st.players.slice().sort((a, b) => b.xp - a.xp), top = ps[0];
  const ri = top ? top.ri : 0, last = st.result;
  view.innerHTML = `<div class="card" style="text-align:left"><b>👥 Phòng "${esc(CP.room)}"</b> <span class="mut">· ${ps.length} người</span>
    ${ps.map(p => `<div class="realm"><img src="${charImg(p.char, 'bust')}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover"><span style="flex:1">${esc(p.name)}${p.pid === CP.pid ? ' (bạn)' : ''}</span><span class="mut">${REALMS[p.ri] ? REALMS[p.ri].n : ''} · ${p.xp} tu vi</span></div>`).join('')}
    <p class="mut">Boss sẽ theo cảnh giới <b>${REALMS[ri].n}</b> (người tu vi cao nhất: ${top ? esc(top.name) : '-'}). Máu boss ×${(1 + .6 * Math.max(0, ps.length - 1)).toFixed(1)} theo số người.</p>
    ${last ? `<p>${last.win ? '👑 Trận trước: đã hạ ' : '⏳ Trận trước: hết giờ với '}${esc(GBOSS[last.boss] ? GBOSS[last.boss].n : '')}</p>` : ''}
    <div class="row"><button class="pri" id="cp-start">⚔️ Bắt đầu đánh boss</button><button id="cp-leave">Rời phòng</button></div></div>`;
  $('#cp-start').onclick = async () => { try { await cpApi('start', { room: CP.room, pid: CP.pid }); cpPoll(); } catch (e) { toast(e.message); } };
  $('#cp-leave').onclick = () => { cpApi('leave', { room: CP.room, pid: CP.pid }).catch(() => {}); go('fight'); };
}
function cpStartFight(st) {
  const bsS = gBossStats(st.ri), stt = gStats(), bs = GBOSS[st.boss];
  const myEls = gElOf(S.hero.char || 'kiem'), els = gBossEls(bs), a = els.filter(e => GEL[myEls].k.includes(e)).length, d = els.filter(e => GEL[e].k.includes(myEls)).length, net = a - d;
  CP.B = { round: st.round, boss: st.boss, ri: st.ri, atk: bsS.atk, def: bsS.def, st: stt, pmax: stt.hp, php: stt.hp, combo: 0, dmg: 0, correct: 0, wrong: 0, over: false,
    mdmg: net >= 2 ? 1.75 : net === 1 ? 1.5 : net === 0 ? 1 : .8, mtaken: net > 0 ? .85 : net === 0 ? 1 : 1.25, endAt: st.endsAtLocal, total: CP_CFG.sec };
  const B = CP.B;
  view.innerHTML = `<div class="card" style="padding:10px"><img src="${GIMG['m_' + bs.id + '_art']}" alt="" style="width:100%;max-width:260px;border-radius:12px;display:block;margin:auto">
    <div style="text-align:left;margin-top:6px"><b>${esc(bs.n)}</b> ${bs.h} <span class="mut">· ${esc(bs.el)} · cảnh giới ${REALMS[st.ri].n}</span>
    <div class="bar" style="height:14px"><i id="cp-bh" style="width:100%;background:#d0402f"></i></div><div class="mut" id="cp-bt"></div><div class="mut" id="cp-ps" style="font-size:12px"></div></div></div>
    <div class="card" style="padding:10px;text-align:left"><div style="display:flex;align-items:center;gap:10px">${bustImg(44)}<div style="flex:1"><b>${esc(S.hero.name)}</b> <span class="mut" id="cp-cb"></span>
    <div class="bar"><i id="cp-ph" style="width:100%"></i></div><div class="mut" id="cp-pt"></div></div><b id="cp-tm" style="font-size:22px"></b></div></div>
    <div class="card" id="cp-q"></div><div id="cp-log" class="mut" style="min-height:44px;text-align:center">Phím 1–4 chọn đáp án · Enter sang câu tiếp</div>`;
  clearInterval(CP.tm); CP.tm = setInterval(() => { const el = $('#cp-tm'); if (el && CP && CP.B && !CP.B.over) el.textContent = B.pauseAt ? '⏸' : Math.max(0, Math.ceil((CP.st.endsAtLocal - Date.now()) / 1000)) + 's'; }, 250);
  cpUpdate(st); cpNextQ();
}
function cpUpdate(st) {
  const B = CP.B; if (!B || B.over) return;
  const hb = $('#cp-bh'); if (hb) { hb.style.width = Math.max(0, st.hp / st.max * 100) + '%'; $('#cp-bt').textContent = Math.max(0, st.hp) + ' / ' + st.max; }
  const ps = $('#cp-ps'); if (ps) ps.textContent = st.players.map(p => `${p.name}: ${p.dmg}`).join(' · ');
  const pb = $('#cp-ph'); if (pb) { pb.style.width = Math.max(0, B.php / B.pmax * 100) + '%'; $('#cp-pt').textContent = Math.max(0, Math.round(B.php)) + ' / ' + B.pmax; }
}
function cpNextQ() {
  const B = CP && CP.B; if (!B || B.over) return;
  if (B.php <= 0) { $('#cp-q').innerHTML = '<div class="mean">😵 Bạn bị trọng thương! Chờ đồng đội kết thúc trận…</div>'; return; }
  const q = B.q = gQuestion(); B.locked = false;
  $('#cp-q').innerHTML = `${q.stem}<div id="cp-o">${q.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="kn">${i + 1}</span>${o.label}</button>`).join('')}</div><div class="row"><button class="pri hide" id="nx">Câu tiếp →</button></div>`;
  $('#cp-cb').textContent = B.combo ? 'Liên kích x' + B.combo : '';
  const sp = $('#gq-spk'); if (sp) sp.onclick = () => speak(q.word);
  if (q.speakOnShow && q.word) speak(q.word);
  $('#nx').onclick = () => { clearTimeout(B.nt); cpNextQ(); };
  $('#cp-o').onclick = e => { const b = e.target.closest('.opt'); if (b && !B.locked && !B.over) cpAnswer(+b.dataset.i); };
}
function cpHit(B, mul) {
  const st = B.st;
  if (Math.random() > Math.min(.97, Math.max(.55, st.hit / (st.hit + 20)))) return 0;
  let d = st.atk * (.9 + Math.random() * .2); if (Math.random() * 100 < st.crit) d *= 1.8;
  d *= 1 + Math.min(.3, B.combo * .03); d *= 1 + (st.fx.burn || 0) / 100; d *= B.mdmg * (mul || 1);
  return Math.round(Math.max(1, d - B.def * (1 - (st.fx.pierce || 0) / 100) * .5));
}
async function cpAnswer(i) {
  const B = CP.B, q = B.q, right = q.opts[i].ok; B.locked = true;
  const btns = [...document.querySelectorAll('#cp-o .opt')];
  btns[i].classList.add(right ? 'ok' : 'no'); btns[q.opts.findIndex(o => o.ok)].classList.add('ok');
  if (q.speakOnAnswer && q.word) speak(q.word);
  rpgOnAnswer(right);
  let log = '', total = 0, ult = null;
  if (right) {
    B.correct++; B.combo++;
    total = cpHit(B); log = total ? `⚔️ ${total} sát thương` : '💨 Trượt!';
    const c = fxCur(); if (c && c.fx === 'heal') { const h = Math.round(B.pmax * c.v / 100); B.php = Math.min(B.pmax, B.php + h); log += ` · 💚 +${h} HP`; }
    if (B.combo % fxUltCombo() === 0) { const ud = Math.max(1, cpHit(B, GULT_MULT * fxUltMul())); total += ud; ult = gUltEl(); log = `🌟 <b>Chiêu cuối</b>: ${ud} sát thương<br>` + log; }
    if (total && B.st.fx.vamp) B.php = Math.min(B.pmax, B.php + Math.round(total * B.st.fx.vamp / 100));
    B.dmg += total;
    if (total) cpApi('hit', { room: CP.room, pid: CP.pid, dmg: total, round: B.round }).catch(() => {});
  } else {
    B.wrong++;
    const sv = fxOnWrong(B);
    if (!sv || !sv.keepCombo) B.combo = 0;
    if (sv) log = sv.log;
    else { const d = Math.round(Math.max(1, B.atk * (.9 + Math.random() * .2) * B.mtaken - B.st.def * .5) * (1 - (B.st.fx.guard || 0) / 100)); B.php -= d; log = `💥 Boss phản công: -${d} HP`; }
  }
  cpUpdate(CP.st);
  $('#cp-log').innerHTML = `${log}<div class="mut" style="margin-top:4px">${q.expl}</div>`;
  const nx = $('#nx'); if (nx) nx.classList.remove('hide');
  const next = () => { if (!CP || !CP.B || CP.B !== B || B.over) return; B.nt = setTimeout(cpNextQ, right ? 1100 : 1700); };
  if (ult) { B.pauseAt = 1; await gUltPlay(ult, { boss: GIMG['m_' + GBOSS[B.boss].id + '_art'] }); B.pauseAt = 0; }
  next();
}
function cpEnd(st) {
  const B = CP.B; B.over = true; clearTimeout(B.nt);
  const r = st.result || {}, win = !!r.win, key = CP.room + ':' + B.round, lines = [];
  const C = S.coop; C.done = C.done || [];
  if (!C.done.includes(key)) {
    C.done.push(key); C.done = C.done.slice(-30);
    const frac = r.max ? B.dmg / r.max : 0, ls = lsGain(Math.round(10 + Math.min(80, frac * 160))), cores = Math.max(1, Math.round(frac * 20)), xp = 15 + B.correct * 8;
    S.ls += ls; S.cores += cores; lines.push(`Thưởng tham gia: +${ls} 💎 · +${cores} Yêu Đan · +${xp} tu vi`);
    if (win && B.dmg > 0) {
      const d = today(); if (C.d !== d) { C.d = d; C.n = 0; }
      if (C.n < CP_CFG.dropsPerDay) {
        C.n++; const it = gDrop('boss', 1);
        Object.keys(it.st).forEach(s => { it.st[s] = gRoundStat(s, it.st[s] * CP_CFG.dropMul); });
        it.name += ' (Phòng)'; it.src = 'coop';
        lines.push('👑 Đồ rơi boss phòng (chỉ số +' + Math.round((CP_CFG.dropMul - 1) * 100) + '%):' + gDropHTML(it));
      } else lines.push(`Hôm nay đã nhận đủ ${CP_CFG.dropsPerDay} lần đồ rơi boss phòng.`);
    }
    save(); addXP(xp);
  }
  view.innerHTML = `<div class="card"><div class="han" style="font-size:52px">${win ? '👑' : '⏳'}</div><h3 style="margin:4px 0">${win ? 'Cả phòng đã hạ boss!' : 'Hết giờ!'}</h3>
    <div class="mean">Sát thương của bạn: <b>${B.dmg}</b> · Đúng ${B.correct} · Sai ${B.wrong}</div>
    <p class="mut">${(r.board || []).map(p => esc(p.name) + ': ' + p.dmg).join(' · ')}</p>
    ${lines.map(l => `<div style="margin:4px 0">${l}</div>`).join('')}</div>
    <div class="row"><button class="pri" id="cp-lobby">Về phòng</button><button id="cp-out">Rời phòng</button></div>`;
  $('#cp-lobby').onclick = () => { B.showLobby = true; cpPoll(); };
  $('#cp-out').onclick = () => { cpApi('leave', { room: CP.room, pid: CP.pid }).catch(() => {}); go('fight'); };
}

fxInit();
