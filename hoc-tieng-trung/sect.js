// ============================================================
//  TÔNG MÔN (bang hội): lập / gia nhập tông môn, mời đạo hữu, chat, mở phòng boss chung
//  Nạp SAU cloud.js (cần CL, cloudPanel) và features.js (cần cpApi, cpPoll, cpStop, cpLobby, cpEnd, CP, cpMe).
//  Firestore:
//    sects/{mã}: { name, note, owner, open, created, exp, mids:[uid], inv:[tên tài khoản], boss:{by,name,ts},
//                  m: { uid: { name, acc, char, xp, ri, role:'chu'|'tv', joined, seen, cg } } }
//    sects/{mã}/chat/{id}: { uid, name, char, t, ts, k?:'sys'|'boss' }
//  Phòng boss tông môn dùng lại phòng online sẵn có với mã phòng "tm_<mã tông môn>".
//  Mọi tên toàn cục ở đây dùng tiền tố tm/TM.
// ============================================================
const TM_CFG = { max: 30, chatN: 60, chatLen: 200, chatGap: 1500, online: 180000, bossFresh: 15 * 60000, cache: 60000, lsPerLv: 5, lvMax: 10 };
const TM = { mine: null, mineAt: 0, sid: '', doc: null, msgs: [], unDoc: null, unChat: null, beat: 0, lastSend: 0 };
const TM_SEEN = 'zh_sect_seen';
const tmCol = () => CL.db.collection('sects');
const tmAcc = () => clName(CL.user).toLowerCase();
const tmRoom = sid => 'tm_' + sid;
const tmLv = exp => Math.min(TM_CFG.lvMax, 1 + Math.floor(Math.sqrt((exp || 0) / 400)));
const tmLvNext = lv => lv >= TM_CFG.lvMax ? 0 : Math.pow(lv, 2) * 400;
const tmCan = () => typeof CL !== 'undefined' && CL.ok && CL.user;
const tmFmtT = ts => { const d = new Date(ts || 0), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
const tmErr = e => /permission/i.test(e && e.message || '') ? 'Firestore chưa cho phép: cần thêm quy tắc "sects" trong Firebase Rules.' : (e && e.message) || 'Lỗi không rõ';
function tmGenId() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function tmMeRec() { const m = cpMe(); return { name: m.name, acc: tmAcc(), char: m.char, xp: m.xp, ri: m.ri, seen: Date.now() }; }

// tông môn mình đang ở (có bộ nhớ đệm để không đọc Firestore mỗi lần mở tab)
async function tmMine(force) {
  if (!tmCan()) return null;
  if (!force && TM.mineAt && Date.now() - TM.mineAt < TM_CFG.cache && TM.mineUid === CL.user.uid) return TM.mine;
  const q = await tmCol().where('mids', 'array-contains', CL.user.uid).limit(1).get();
  TM.mine = q.empty ? null : Object.assign({ id: q.docs[0].id }, q.docs[0].data()); TM.mineAt = Date.now(); TM.mineUid = CL.user.uid;
  return TM.mine;
}
async function tmInvites() {
  const q = await tmCol().where('inv', 'array-contains', tmAcc()).limit(10).get();
  return q.docs.map(d => Object.assign({ id: d.id }, d.data()));
}
async function tmSys(sid, t, k, extra) {
  const m = cpMe();
  return tmCol().doc(sid).collection('chat').add(Object.assign({ uid: CL.user.uid, name: m.name, char: m.char, t: String(t).slice(0, TM_CFG.chatLen), ts: Date.now(), k: k || 'sys' }, extra || {}));
}

// ---------- tạo / vào / rời ----------
async function tmCreate(name, open) {
  name = name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) throw new Error('Tên tông môn cần 2–20 ký tự.');
  if (await tmMine(true)) throw new Error('Bạn đang ở một tông môn rồi.');
  let id = '', ref;
  for (let i = 0; i < 5 && !id; i++) { const c = tmGenId(); ref = tmCol().doc(c); if (!(await ref.get()).exists) id = c; }
  if (!id) throw new Error('Không tạo được mã tông môn, thử lại.');
  const uid = CL.user.uid;
  await ref.set({ name, note: '', owner: uid, open: !!open, created: Date.now(), exp: 0, mids: [uid], inv: [], boss: null,
    m: { [uid]: Object.assign(tmMeRec(), { role: 'chu', joined: Date.now(), cg: 0 }) } });
  TM.mineAt = 0;
  await tmSys(id, `🏯 ${cpMe().name} khai lập tông môn "${name}"`);
  return id;
}
async function tmJoin(sid) {
  sid = String(sid || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!sid) throw new Error('Hãy nhập mã tông môn.');
  if (await tmMine(true)) throw new Error('Bạn đang ở một tông môn rồi, hãy rời tông môn cũ trước.');
  const ref = tmCol().doc(sid), uid = CL.user.uid, acc = tmAcc();
  let nm = '';
  await CL.db.runTransaction(async tx => {
    const sn = await tx.get(ref); if (!sn.exists) throw new Error('Không có tông môn mã ' + sid + '.');
    const d = sn.data(); nm = d.name;
    if ((d.mids || []).includes(uid)) return;
    if ((d.mids || []).length >= TM_CFG.max) throw new Error('Tông môn đã đủ ' + TM_CFG.max + ' người.');
    if (!d.open && !(d.inv || []).includes(acc)) throw new Error('Tông môn này chỉ nhận người được mời.');
    tx.update(ref, { mids: firebase.firestore.FieldValue.arrayUnion(uid), inv: firebase.firestore.FieldValue.arrayRemove(acc),
      [`m.${uid}`]: Object.assign(tmMeRec(), { role: 'tv', joined: Date.now(), cg: 0 }) });
  });
  TM.mineAt = 0;
  await tmSys(sid, `👋 ${cpMe().name} đã gia nhập tông môn`).catch(() => {});
  return nm;
}
async function tmDecline(sid) { await tmCol().doc(sid).update({ inv: firebase.firestore.FieldValue.arrayRemove(tmAcc()) }).catch(() => {}); }
async function tmLeave() {
  const d = TM.doc, sid = TM.sid, uid = CL.user.uid, FV = firebase.firestore.FieldValue; if (!d) return;
  const others = Object.entries(d.m || {}).filter(([k]) => k !== uid && (d.mids || []).includes(k));
  await tmSys(sid, `🚶 ${cpMe().name} đã rời tông môn`).catch(() => {});
  if (!others.length) { await tmCol().doc(sid).delete(); }
  else {
    const up = { mids: FV.arrayRemove(uid), [`m.${uid}`]: FV.delete() };
    if (d.owner === uid) { // truyền chức tông chủ cho người tu vi cao nhất
      const nx = others.sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0))[0];
      up.owner = nx[0]; up[`m.${nx[0]}.role`] = 'chu';
      await tmSys(sid, `👑 ${nx[1].name || 'Đạo hữu'} trở thành tông chủ mới`).catch(() => {});
    }
    await tmCol().doc(sid).update(up);
  }
  TM.mine = null; TM.mineAt = Date.now();
}
async function tmInvite(acc) {
  acc = String(acc || '').trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,20}$/.test(acc)) throw new Error('Tên tài khoản cần 3–20 ký tự (chữ không dấu, số, _ . -).');
  const d = TM.doc;
  if (Object.values(d.m || {}).some(v => v.acc === acc)) throw new Error('Người này đã ở trong tông môn.');
  if ((d.inv || []).includes(acc)) throw new Error('Đã mời người này rồi.');
  await tmCol().doc(TM.sid).update({ inv: firebase.firestore.FieldValue.arrayUnion(acc) });
  await tmSys(TM.sid, `📩 ${cpMe().name} đã mời "${acc}" vào tông môn`).catch(() => {});
}
async function tmKick(uid) {
  const d = TM.doc, v = (d.m || {})[uid]; if (!v || d.owner !== CL.user.uid || uid === d.owner) return;
  const FV = firebase.firestore.FieldValue;
  await tmCol().doc(TM.sid).update({ mids: FV.arrayRemove(uid), [`m.${uid}`]: FV.delete() });
  await tmSys(TM.sid, `⛔ ${v.name || 'Đạo hữu'} đã bị mời ra khỏi tông môn`).catch(() => {});
}

// ---------- phòng boss tông môn ----------
async function tmOpenBoss() {
  const sid = TM.sid, m = cpMe();
  await tmCol().doc(sid).update({ boss: { by: CL.user.uid, name: m.name, ts: Date.now() } }).catch(() => {});
  await tmSys(sid, `⚔️ ${m.name} mở phòng boss tông môn, mau vào cùng đánh!`, 'boss', { room: tmRoom(sid) }).catch(() => {});
  return tmEnterRoom(sid);
}
async function tmEnterRoom(sid) {
  tmStop(); cpStop();
  if (tab !== 'fight') { tab = 'fight'; [...$('#nav').children].forEach(x => x.classList.toggle('on', x.dataset.t === 'fight')); }
  const room = tmRoom(sid);
  S.coop.room = room; save();
  view.innerHTML = '<div class="card">Đang vào phòng boss tông môn…</div>';
  try {
    const j = await cpApi('join', { room });
    CP = { pid: j.pid, room, st: null, B: null, box: j.box, unsub: j.box.unsub, sect: sid, sectName: (TM.doc && TM.doc.name) || (TM.mine && TM.mine.name) || '' };
    CP.poll = setInterval(cpPoll, 1000);
  } catch (e) { view.innerHTML = `<div class="card"><p class="bad-t">Không vào được phòng: ${esc(tmErr(e))}</p><div class="row"><button id="tm-back">← Tông môn</button></div></div>`; $('#tm-back').onclick = vSect; }
}
// sảnh phòng: đổi tiêu đề thành tên tông môn, thêm nút quay về tông môn
const tm_cpLobby = cpLobby;
cpLobby = function (st) {
  const had = !!$('#cp-start');
  tm_cpLobby(st);
  if (!CP || !CP.sect || (had && $('#tm-lb'))) return;
  const b = view.querySelector('.card > b'); if (b) b.textContent = '🏯 Phòng boss tông môn "' + (CP.sectName || CP.sect) + '"';
  const lv = $('#cp-leave');
  if (lv && !$('#tm-lb')) { lv.insertAdjacentHTML('afterend', '<button id="tm-lb">🏯 Về tông môn</button>'); $('#tm-lb').onclick = () => { cpApi('leave', { room: CP.room, pid: CP.pid }).catch(() => {}); cpStop(); vSect(); }; }
};
// hết trận phòng tông môn: cộng cống hiến + kinh nghiệm tông môn, thưởng linh thạch theo cấp tông môn
const tm_cpEnd = cpEnd;
cpEnd = function (st) {
  const sid = CP && CP.sect, B = CP && CP.B, key = CP && B ? CP.room + ':' + B.round : '';
  const fresh = sid && key && !((S.coop.done || []).includes(key));
  tm_cpEnd(st);
  if (!fresh || !B) return;
  const r = st.result || {}, gain = Math.round(B.dmg / 10) + (r.win ? 50 : 0), FV = firebase.firestore.FieldValue;
  tmCol().doc(sid).update({ exp: FV.increment(gain), [`m.${CL.user.uid}.cg`]: FV.increment(B.dmg) }).catch(() => {});
  const lv = tmLv(((TM.mine && TM.mine.id === sid ? TM.mine.exp : 0) || 0) + gain), bonus = B.dmg > 0 ? lsGain(TM_CFG.lsPerLv * lv) : 0;
  if (bonus) { S.ls += bonus; save(); }
  const c = view.querySelector('.card');
  if (c) c.insertAdjacentHTML('beforeend', `<div style="margin:4px 0">🏯 Tông môn: +${gain} kinh nghiệm tông môn · cống hiến +${B.dmg}${bonus ? ` · thưởng tông môn cấp ${lv}: +${bonus} 💎` : ''}</div>`);
  if (r.win) tmSys(sid, `👑 Tông môn đã hạ ${GBOSS[r.boss] ? GBOSS[r.boss].n : 'boss'}!${r.killer ? ' Kết liễu: ' + (r.killer.name || '') : ''}`).catch(() => {});
  const back = $('#cp-out'); if (back && !$('#tm-eb')) { back.insertAdjacentHTML('afterend', '<button id="tm-eb">🏯 Về tông môn</button>'); $('#tm-eb').onclick = () => { cpApi('leave', { room: CP.room, pid: CP.pid }).catch(() => {}); cpStop(); vSect(); }; }
};

// ---------- giao diện ----------
function tmStop() { if (TM.unDoc) TM.unDoc(); if (TM.unChat) TM.unChat(); clearInterval(TM.hb); TM.unDoc = TM.unChat = null; TM.doc = null; TM.sid = ''; TM.msgs = []; }
const tm_render = render;
render = function () { tmStop(); tm_render(); };

// thẻ Tông môn trong tab Chiến đấu (ngay dưới thẻ phòng boss online)
const tm_vFight = vFight;
vFight = function () {
  tm_vFight();
  const anchor = ($('#cp-open') && $('#cp-open').closest('.card')) || view.querySelector('.card'); if (!anchor) return;
  anchor.insertAdjacentHTML('afterend', `<div class="card" id="tm-card" style="text-align:left"><b>🏯 Tông môn</b> <span class="mut">· lập bang cùng bạn bè, chat và đánh boss chung</span>
    <div id="tm-sum" class="mut" style="margin:6px 0">${tmCan() ? 'Đang tải…' : 'Cần đăng nhập ☁️ để dùng tông môn.'}</div>
    <div class="row"><button class="pri" id="tm-open">🏯 Vào tông môn</button></div></div>`);
  $('#tm-open').onclick = vSect;
  if (tmCan()) tmSummary().catch(() => { const s = $('#tm-sum'); if (s) s.textContent = 'Chưa tải được tông môn.'; });
};
async function tmSummary() {
  const me = await tmMine(), s = $('#tm-sum'); if (!s) return;
  if (!me) {
    const inv = await tmInvites().catch(() => []); if (!$('#tm-sum')) return;
    s.innerHTML = inv.length ? `📩 Bạn có <b>${inv.length}</b> lời mời vào tông môn: ${inv.map(x => '<b>' + esc(x.name) + '</b>').join(', ')}` : 'Bạn chưa gia nhập tông môn nào. Hãy lập tông môn mới hoặc nhập mã để gia nhập.';
    return;
  }
  let extra = '';
  try {
    const q = await tmCol().doc(me.id).collection('chat').orderBy('ts', 'desc').limit(1).get();
    const last = q.docs[0] && q.docs[0].data(), seen = +localStorage.getItem(TM_SEEN + me.id) || 0;
    if (last && last.ts > seen && last.uid !== CL.user.uid) extra = ` · 💬 tin mới: <i>${esc(last.name)}: ${esc(last.t.slice(0, 40))}</i>`;
  } catch (e) { }
  const live = me.boss && Date.now() - (me.boss.ts || 0) < TM_CFG.bossFresh;
  if (!$('#tm-sum')) return;
  s.innerHTML = `<b>${esc(me.name)}</b> · cấp ${tmLv(me.exp)} · ${(me.mids || []).length}/${TM_CFG.max} người${extra}${live ? `<br>⚔️ <b>${esc(me.boss.name || '')}</b> đang mở phòng boss tông môn <button id="tm-jb" class="pri" style="padding:3px 10px;margin-left:4px">Vào đánh</button>` : ''}`;
  const jb = $('#tm-jb'); if (jb) jb.onclick = () => { TM.mine = me; tmEnterRoom(me.id); };
}

async function vSect() {
  tmStop(); cpStop();
  if (typeof CL === 'undefined' || !CL.ok) { toast('Tông môn cần mở game qua start.bat hoặc link web và có Internet.'); return; }
  if (!CL.user) { toast('Hãy đăng nhập tài khoản trước để vào tông môn.'); return cloudPanel(); }
  view.innerHTML = '<div class="card">Đang tải tông môn…</div>';
  let me;
  try { me = await tmMine(true); } catch (e) { view.innerHTML = `<div class="card"><p class="bad-t">${esc(tmErr(e))}</p><div class="row"><button id="tm-bk">← Về trận chiến</button></div></div>`; $('#tm-bk').onclick = () => go('fight'); return; }
  if (me) return tmPage(me.id);
  tmLobbyView();
}

// chưa có tông môn: lời mời · lập mới · gia nhập bằng mã · danh sách tông môn mở
async function tmLobbyView() {
  view.innerHTML = `<div class="card" style="text-align:left"><h3 style="margin:0 0 6px">🏯 Tông môn</h3>
    <p class="mut" style="margin:0 0 8px">Tài khoản của bạn: <b>${esc(tmAcc())}</b> (bạn bè dùng tên này để mời bạn). Mỗi người ở 1 tông môn, tối đa ${TM_CFG.max} người.</p>
    <div id="tm-inv"></div>
    <b>Lập tông môn mới</b>
    <input id="tm-nm" maxlength="20" placeholder="Tên tông môn (2–20 ký tự)">
    <label class="mut" style="display:block;margin:4px 0"><input type="checkbox" id="tm-op" checked style="width:auto"> Ai có mã cũng vào được (bỏ chọn: chỉ người được mời)</label>
    <div class="row"><button class="pri" id="tm-mk">🏯 Lập tông môn</button></div>
    <b>Gia nhập bằng mã</b>
    <input id="tm-cd" maxlength="6" placeholder="Mã 6 ký tự, vd: AB12CD" autocapitalize="characters" spellcheck="false">
    <div class="row"><button id="tm-jn">Gia nhập</button><button id="tm-bk">← Về trận chiến</button></div>
    <div id="tm-err" class="bad-t"></div></div>
    <div class="card" style="text-align:left"><b>Tông môn đang chiêu mộ</b><div id="tm-pub" class="mut">Đang tải…</div></div>`;
  const err = t => { const e = $('#tm-err'); if (e) e.textContent = t; };
  const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { err(tmErr(e)); } btn.disabled = false; };
  $('#tm-bk').onclick = () => go('fight');
  $('#tm-mk').onclick = e => busy(e.target, async () => { const id = await tmCreate($('#tm-nm').value, $('#tm-op').checked); toast('🏯 Đã lập tông môn! Mã: ' + id); tmPage(id); });
  $('#tm-jn').onclick = e => busy(e.target, async () => { const n = await tmJoin($('#tm-cd').value); toast('🏯 Đã gia nhập ' + n); vSect(); });
  $('#tm-cd').onkeydown = e => { if (e.key === 'Enter') $('#tm-jn').click(); };
  tmInvites().then(inv => {
    const b = $('#tm-inv'); if (!b || !inv.length) return;
    b.innerHTML = `<div style="margin:0 0 10px"><b>📩 Lời mời</b>${inv.map(x => `<div class="realm"><span style="flex:1"><b>${esc(x.name)}</b> <span class="mut">· ${(x.mids || []).length} người · cấp ${tmLv(x.exp)}</span></span><button class="pri" data-ok="${esc(x.id)}">Nhận</button><button data-no="${esc(x.id)}">Từ chối</button></div>`).join('')}</div>`;
    b.onclick = e => {
      const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
      if (ok) busy(ok, async () => { const n = await tmJoin(ok.dataset.ok); toast('🏯 Đã gia nhập ' + n); vSect(); });
      if (no) busy(no, async () => { await tmDecline(no.dataset.no); no.closest('.realm').remove(); });
    };
  }).catch(() => {});
  tmCol().where('open', '==', true).limit(30).get().then(q => {
    const p = $('#tm-pub'); if (!p) return;
    const list = q.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(x => (x.mids || []).length < TM_CFG.max).sort((a, b) => (b.exp || 0) - (a.exp || 0) || (b.mids || []).length - (a.mids || []).length).slice(0, 12);
    p.innerHTML = list.length ? list.map(x => `<div class="realm"><span style="flex:1"><b>${esc(x.name)}</b> <span class="mut">· cấp ${tmLv(x.exp)} · ${(x.mids || []).length}/${TM_CFG.max} người${x.note ? ' · ' + esc(x.note.slice(0, 40)) : ''}</span></span><button data-j="${esc(x.id)}">Gia nhập</button></div>`).join('') : 'Chưa có tông môn nào đang mở. Hãy là người đầu tiên lập tông môn!';
    p.onclick = e => { const j = e.target.closest('[data-j]'); if (j) busy(j, async () => { const n = await tmJoin(j.dataset.j); toast('🏯 Đã gia nhập ' + n); vSect(); }); };
  }).catch(e => { const p = $('#tm-pub'); if (p) p.textContent = tmErr(e); });
}

// trang tông môn: thông tin · phòng boss · chat · thành viên · mời
function tmPage(sid) {
  tmStop(); TM.sid = sid;
  const uid = CL.user.uid;
  view.innerHTML = `<div class="card" style="text-align:left" id="tm-head">Đang tải…</div>
    <div class="card" style="text-align:left"><b>💬 Chat tông môn</b>
      <div id="tm-chat" style="height:300px;overflow-y:auto;margin:6px 0;padding:6px;border:1px solid var(--bd);border-radius:8px;background:rgba(0,0,0,.06)"></div>
      <div style="display:flex;gap:6px"><input id="tm-in" maxlength="${TM_CFG.chatLen}" placeholder="Nhắn cho đồng môn… (Enter để gửi)" style="flex:1;margin:0"><button class="pri" id="tm-send" style="margin:0">Gửi</button></div></div>
    <div class="card" style="text-align:left"><b>👥 Thành viên</b> <span class="mut" id="tm-cnt"></span><div id="tm-mem"></div>
      <div style="margin-top:8px"><b>📩 Mời đạo hữu</b> <span class="mut">(nhập tên tài khoản đăng nhập của họ)</span>
      <div style="display:flex;gap:6px"><input id="tm-ia" maxlength="20" placeholder="Tên tài khoản" autocapitalize="off" spellcheck="false" style="flex:1;margin:0"><button id="tm-ib" style="margin:0">Mời</button></div>
      <div id="tm-il" class="mut" style="font-size:12px;margin-top:4px"></div></div></div>
    <div class="row"><button id="tm-bk">← Về trận chiến</button><button id="tm-lv">Rời tông môn</button></div>`;
  $('#tm-bk').onclick = () => go('fight');
  const send = async () => {
    const i = $('#tm-in'), t = i.value.trim(); if (!t) return;
    if (Date.now() - TM.lastSend < TM_CFG.chatGap) return toast('Nhắn chậm lại một chút nhé.');
    TM.lastSend = Date.now(); i.value = '';
    const m = cpMe();
    tmCol().doc(sid).collection('chat').add({ uid, name: m.name, char: m.char, t: t.slice(0, TM_CFG.chatLen), ts: Date.now() }).catch(e => { toast(tmErr(e)); i.value = t; });
  };
  $('#tm-send').onclick = send;
  $('#tm-in').onkeydown = e => { if (e.key === 'Enter') send(); };
  $('#tm-ib').onclick = async () => { try { await tmInvite($('#tm-ia').value); $('#tm-ia').value = ''; toast('📩 Đã gửi lời mời. Người đó mở Chiến đấu → Tông môn để nhận.'); } catch (e) { toast(tmErr(e)); } };
  $('#tm-ia').onkeydown = e => { if (e.key === 'Enter') $('#tm-ib').click(); };
  $('#tm-lv').onclick = async () => {
    const d = TM.doc; if (!d) return;
    const last = (d.mids || []).length <= 1;
    if (!confirm(last ? 'Bạn là người cuối cùng, rời đi sẽ giải tán tông môn. Tiếp tục?' : d.owner === uid ? 'Rời tông môn? Chức tông chủ sẽ truyền cho người tu vi cao nhất.' : 'Rời tông môn?')) return;
    try { await tmLeave(); toast('Đã rời tông môn.'); vSect(); } catch (e) { toast(tmErr(e)); }
  };
  $('#tm-chat').onclick = e => { const b = e.target.closest('[data-room]'); if (b) tmEnterRoom(sid); };
  const ref = tmCol().doc(sid);
  TM.unDoc = ref.onSnapshot(sn => {
    if (TM.sid !== sid) return;
    if (!sn.exists || !(sn.data().mids || []).includes(uid)) { TM.mineAt = 0; toast('Bạn không còn ở tông môn này.'); tmStop(); vSect(); return; }
    TM.doc = sn.data(); TM.mine = Object.assign({ id: sid }, TM.doc); TM.mineAt = Date.now();
    tmDrawHead(); tmDrawMembers();
  }, e => toast(tmErr(e)));
  TM.unChat = ref.collection('chat').orderBy('ts', 'desc').limit(TM_CFG.chatN).onSnapshot(q => {
    if (TM.sid !== sid) return;
    TM.msgs = q.docs.map(d => d.data()).reverse(); tmDrawChat();
  }, e => { const c = $('#tm-chat'); if (c) c.innerHTML = `<div class="bad-t">${esc(tmErr(e))}</div>`; });
  // nhịp tim: cập nhật tên / nhân vật / tu vi và trạng thái trực tuyến
  const beat = () => { const r = tmMeRec(); ref.update({ [`m.${uid}.name`]: r.name, [`m.${uid}.acc`]: r.acc, [`m.${uid}.char`]: r.char, [`m.${uid}.xp`]: r.xp, [`m.${uid}.ri`]: r.ri, [`m.${uid}.seen`]: r.seen }).catch(() => {}); };
  beat(); TM.hb = setInterval(() => { if (TM.sid === sid && document.visibilityState === 'visible') beat(); }, 60000);
}
function tmDrawHead() {
  const d = TM.doc, h = $('#tm-head'); if (!d || !h) return;
  const uid = CL.user.uid, chu = d.owner === uid, lv = tmLv(d.exp), nx = tmLvNext(lv), owner = (d.m || {})[d.owner] || {};
  const live = d.boss && Date.now() - (d.boss.ts || 0) < TM_CFG.bossFresh;
  h.innerHTML = `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h3 style="margin:0;flex:1">🏯 ${esc(d.name)}</h3><span class="chip">Mã: <b>${esc(TM.sid)}</b></span><button class="chip" id="tm-cp">📋 Chép mã</button></div>
    <div class="mut" style="margin:4px 0">Tông chủ: <b>${esc(owner.name || '')}</b> · Cấp ${lv}${nx ? ` (${d.exp || 0}/${nx} kinh nghiệm)` : ' (tối đa)'} · ${d.open ? 'Ai có mã cũng vào được' : 'Chỉ nhận người được mời'}</div>
    ${nx ? `<div class="bar" style="height:6px"><i style="width:${Math.min(100, (d.exp || 0) / nx * 100)}%"></i></div>` : ''}
    <div style="margin:6px 0">📜 ${d.note ? esc(d.note) : '<span class="mut">Chưa có thông báo.</span>'}${chu ? ' <button class="chip" id="tm-nt">✏️ Sửa</button> <button class="chip" id="tm-ot">' + (d.open ? '🔒 Chỉ nhận người được mời' : '🔓 Cho ai có mã vào') + '</button>' : ''}</div>
    <p class="mut" style="margin:6px 0;font-size:13px">Đánh boss trong phòng tông môn: cống hiến = sát thương gây ra, tông môn lên cấp theo kinh nghiệm, mỗi cấp thêm thưởng linh thạch sau trận.</p>
    <div class="row">${live ? `<button class="pri" id="tm-bj">⚔️ Vào phòng boss (${esc(d.boss.name || '')} đang mở)</button>` : `<button class="pri" id="tm-bo">⚔️ Mở phòng boss tông môn</button>`}</div>`;
  $('#tm-cp').onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(TM.sid) : Promise.reject()).then(() => toast('Đã chép mã ' + TM.sid)).catch(() => toast('Mã tông môn: ' + TM.sid)); };
  const bo = $('#tm-bo'); if (bo) bo.onclick = () => tmOpenBoss();
  const bj = $('#tm-bj'); if (bj) bj.onclick = () => tmEnterRoom(TM.sid);
  const nt = $('#tm-nt'); if (nt) nt.onclick = () => { const t = prompt('Thông báo tông môn (tối đa 120 ký tự):', d.note || ''); if (t !== null) tmCol().doc(TM.sid).update({ note: t.trim().slice(0, 120) }).catch(e => toast(tmErr(e))); };
  const ot = $('#tm-ot'); if (ot) ot.onclick = () => tmCol().doc(TM.sid).update({ open: !d.open }).catch(e => toast(tmErr(e)));
}
function tmDrawMembers() {
  const d = TM.doc, box = $('#tm-mem'); if (!d || !box) return;
  const uid = CL.user.uid, chu = d.owner === uid, now = Date.now();
  const list = Object.entries(d.m || {}).filter(([k]) => (d.mids || []).includes(k)).map(([k, v]) => Object.assign({ uid: k }, v))
    .sort((a, b) => (b.uid === d.owner) - (a.uid === d.owner) || (b.cg || 0) - (a.cg || 0) || (b.xp || 0) - (a.xp || 0));
  const on = list.filter(p => now - (p.seen || 0) < TM_CFG.online).length;
  $('#tm-cnt').textContent = `· ${list.length}/${TM_CFG.max} · ${on} đang trực tuyến`;
  box.innerHTML = list.map(p => `<div class="realm"><img src="${charImg(p.char || 'kiem', 'bust')}" alt="" style="width:34px;height:34px;border-radius:50%;object-fit:cover">
    <span style="flex:1;min-width:0"><span style="color:${now - (p.seen || 0) < TM_CFG.online ? '#3fbf6a' : '#888'}">●</span> <b>${esc(p.name || 'Đạo hữu')}</b>${p.uid === d.owner ? ' 👑' : ''}${p.uid === uid ? ' (bạn)' : ''}
    <br><span class="mut" style="font-size:12px">${REALMS[p.ri] ? REALMS[p.ri].n : ''} · ${p.xp || 0} tu vi · cống hiến ${p.cg || 0}</span></span>
    ${chu && p.uid !== uid ? `<button class="chip" data-kick="${esc(p.uid)}" title="Mời ra khỏi tông môn">✖</button>` : ''}</div>`).join('');
  box.onclick = e => { const k = e.target.closest('[data-kick]'); if (k) { const v = d.m[k.dataset.kick]; if (v && confirm('Mời ' + (v.name || 'người này') + ' ra khỏi tông môn?')) tmKick(k.dataset.kick).catch(er => toast(tmErr(er))); } };
  const il = $('#tm-il'); if (il) il.innerHTML = (d.inv || []).length ? 'Đang chờ nhận lời mời: ' + d.inv.map(a => esc(a)).join(', ') : '';
}
function tmDrawChat() {
  const c = $('#tm-chat'); if (!c) return;
  const near = c.scrollHeight - c.scrollTop - c.clientHeight < 60, uid = CL.user.uid;
  c.innerHTML = TM.msgs.length ? TM.msgs.map(m => {
    if (m.k === 'sys' || m.k === 'boss') return `<div class="mut" style="text-align:center;font-size:12px;margin:6px 0">${esc(m.t)} · ${tmFmtT(m.ts)}${m.k === 'boss' && Date.now() - (m.ts || 0) < TM_CFG.bossFresh ? ' <button class="pri" data-room="1" style="padding:2px 10px;font-size:12px">Vào đánh</button>' : ''}</div>`;
    const me = m.uid === uid;
    return `<div style="display:flex;gap:6px;margin:6px 0;${me ? 'flex-direction:row-reverse' : ''}"><img src="${charImg(m.char || 'kiem', 'bust')}" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex:none">
      <div style="max-width:78%;${me ? 'text-align:right' : ''}"><div class="mut" style="font-size:11px">${esc(m.name || 'Đạo hữu')} · ${tmFmtT(m.ts)}</div>
      <div style="display:inline-block;padding:6px 10px;border-radius:12px;background:${me ? 'var(--ac2)' : 'var(--card)'};color:${me ? '#fff' : 'var(--tx)'};border:1px solid var(--bd);word-break:break-word;text-align:left">${esc(m.t)}</div></div></div>`;
  }).join('') : '<div class="mut" style="text-align:center">Chưa có tin nhắn. Chào đồng môn một câu nhé!</div>';
  if (near || !c.dataset.init) { c.scrollTop = c.scrollHeight; c.dataset.init = '1'; }
  const last = TM.msgs[TM.msgs.length - 1]; if (last) try { localStorage.setItem(TM_SEEN + TM.sid, String(last.ts)); } catch (e) { }
}
