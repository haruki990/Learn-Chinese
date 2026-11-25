// ============================================================
//  LƯU TIẾN ĐỘ LÊN MÂY (Firebase Auth + Firestore)
//  Đăng nhập bằng email/mật khẩu hoặc Google. Mỗi tài khoản có 1 tài liệu saves/{uid}:
//    { data: JSON của S, slots: JSON nhân vật đã lưu, ts: thời điểm lưu, name }
//  Nạp sau features.js. Cần mở game qua http(s) (start.bat hoặc GitHub Pages), không chạy với file://.
// ============================================================
const CLOUD_CFG = {
  apiKey: 'AIzaSyCWwvnL7ijjbvi2ZQckL9sEPTYknDucqR8',
  authDomain: 'learn-chinese-959b8.firebaseapp.com',
  projectId: 'learn-chinese-959b8',
  storageBucket: 'learn-chinese-959b8.firebasestorage.app',
  messagingSenderId: '80058371267',
  appId: '1:80058371267:web:008471c15705e17ac32676'
};
const CLOUD_UIDKEY = 'zh_cloud_uid', CLOUD_SKIP = 'zh_cloud_skip', CLOUD_DELAY = 4000;
const CL = { ok: false, user: null, ready: false, timer: 0, busy: false, last: 0, err: '' };

function cloudAvail() { return !!window.firebase && /^https?:$/.test(location.protocol); }
function cloudBoot() {
  if (!cloudAvail()) { CL.err = location.protocol === 'file:' ? 'Đăng nhập chỉ chạy khi mở game qua start.bat hoặc link web, không chạy khi nhấp đúp index.html.' : 'Không tải được thư viện Firebase (cần Internet).'; return; }
  try {
    firebase.initializeApp(CLOUD_CFG);
    CL.auth = firebase.auth(); CL.db = firebase.firestore(); CL.ok = true;
    CL.auth.onAuthStateChanged(u => { CL.user = u; CL.ready = true; if (u) cloudPull(); else cloudPrompt(); cloudBar(); });
  } catch (e) { CL.err = 'Lỗi khởi tạo Firebase: ' + e.message; }
}
const cloudDoc = () => CL.db.collection('saves').doc(CL.user.uid);

// Khi đăng nhập: so sánh bản trên mây với bản trên máy, bản nào mới hơn thì dùng bản đó
async function cloudPull() {
  try {
    const snap = await cloudDoc().get(), linked = localStorage.getItem(CLOUD_UIDKEY) === CL.user.uid;
    if (snap.exists) {
      const d = snap.data();
      // máy này chưa từng gắn với tài khoản này (máy mới / người khác) hoặc bản trên mây mới hơn => lấy bản trên mây
      if (!linked || (d.ts || 0) > (S.__ts || 0) + 1000) {
        const data = JSON.parse(d.data);
        window.__noSave = true;
        localStorage.setItem(KEY, d.data);
        if (d.slots) localStorage.setItem(SLOTKEY, d.slots);
        localStorage.setItem(CLOUD_UIDKEY, CL.user.uid);
        toast('☁️ Đã tải tiến độ của ' + (data.hero && data.hero.name || 'bạn') + ' từ tài khoản');
        setTimeout(() => location.reload(), 600); return;
      }
    }
    localStorage.setItem(CLOUD_UIDKEY, CL.user.uid);
    await cloudPush(); // chưa có bản trên mây, hoặc bản trên máy mới hơn
  } catch (e) { cloudFail(e); }
}
async function cloudPush() {
  if (!CL.user || CL.busy || window.__noSave) return;
  CL.busy = true; clearTimeout(CL.timer);
  try {
    const slots = localStorage.getItem(SLOTKEY) || '', data = JSON.stringify(S);
    const doc = { data, ts: S.__ts || Date.now(), name: (S.hero && S.hero.name) || '' };
    if (data.length + slots.length < 900000) doc.slots = slots; // giới hạn 1MB/tài liệu của Firestore
    await cloudDoc().set(doc);
    CL.last = Date.now(); CL.err = '';
  } catch (e) { cloudFail(e); }
  CL.busy = false; cloudBar();
}
function cloudFail(e) {
  CL.err = /permission|PERMISSION/.test(e.message) ? 'Firestore từ chối quyền ghi: kiểm tra mục Rules trong Firebase.' : /offline|unavailable/i.test(e.message) ? 'Đang mất mạng, sẽ lưu lên mây khi có mạng.' : e.message;
  cloudBar();
}
// mọi lần save() đều ghi mốc thời gian và hẹn đẩy lên mây sau vài giây
const cl_save = save;
save = function () {
  if (window.__noSave) return;
  S.__ts = Date.now(); cl_save();
  if (CL.user) { clearTimeout(CL.timer); CL.timer = setTimeout(cloudPush, CLOUD_DELAY); }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && CL.user && CL.timer) cloudPush(); });

// ---------- giao diện ----------
function cloudBar() {
  let b = document.getElementById('cl-bar');
  if (!b) { b = document.createElement('button'); b.id = 'cl-bar'; b.style.cssText = 'position:fixed;right:10px;bottom:74px;z-index:50;border-radius:99px;padding:6px 12px;border:1px solid var(--bd);background:var(--card);color:var(--tx);font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer'; b.onclick = cloudPanel; document.body.appendChild(b); }
  b.textContent = CL.user ? (CL.err ? '☁️⚠️ ' : '☁️ ') + (CL.user.email || CL.user.displayName || 'Đã đăng nhập') : '☁️ Đăng nhập lưu tiến độ';
}
function cloudPrompt() { if (!sessionStorage.getItem(CLOUD_SKIP)) cloudPanel(); }
function cloudPanel() {
  const old = document.getElementById('cl-ov'); if (old) old.remove();
  const ov = document.createElement('div'); ov.id = 'cl-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px';
  const u = CL.user;
  ov.innerHTML = `<div class="card" style="max-width:380px;width:100%;text-align:left;margin:0"><h3 style="margin:0 0 6px">☁️ Tài khoản lưu tiến độ</h3>
    ${!CL.ok ? `<p class="bad-t">${esc(CL.err || 'Chưa dùng được đăng nhập.')}</p>`
      : u ? `<p>Đang đăng nhập: <b>${esc(u.email || u.displayName || '')}</b></p><p class="mut">Tiến độ tự lưu lên mây vài giây sau mỗi thay đổi.${CL.last ? ' Lần lưu gần nhất: ' + new Date(CL.last).toLocaleTimeString() : ''}</p>${CL.err ? `<p class="bad-t">${esc(CL.err)}</p>` : ''}
        <div class="row"><button class="pri" id="cl-now">Lưu ngay</button><button id="cl-out">Đăng xuất</button></div>`
      : `<p class="mut" style="margin:0 0 8px">Đăng nhập để tiến độ (nhân vật, trang bị, tu vi, tháp…) được lưu theo tài khoản. Sang máy khác chỉ cần đăng nhập là có lại dữ liệu.</p>
        <input id="cl-em" type="email" placeholder="Email" autocomplete="username"><input id="cl-pw" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="current-password">
        <div class="row"><button class="pri" id="cl-in">Đăng nhập</button><button id="cl-up">Tạo tài khoản</button></div>
        <div class="row"><button id="cl-g">Đăng nhập bằng Google</button></div><div class="row"><button id="cl-reset" style="font-size:12px">Quên mật khẩu</button></div>`}
    <div id="cl-msg" class="bad-t" style="min-height:18px"></div>
    <div class="row"><button id="cl-x">${u ? 'Đóng' : 'Chơi không cần tài khoản'}</button></div></div>`;
  document.body.appendChild(ov);
  const $$ = id => ov.querySelector('#' + id), msg = t => { $$('cl-msg').textContent = t; };
  const close = () => { sessionStorage.setItem(CLOUD_SKIP, '1'); ov.remove(); };
  $$('cl-x').onclick = close; ov.onclick = e => { if (e.target === ov) close(); };
  const viErr = e => ({ 'auth/invalid-email': 'Email không hợp lệ.', 'auth/missing-password': 'Hãy nhập mật khẩu.', 'auth/weak-password': 'Mật khẩu cần ít nhất 6 ký tự.', 'auth/email-already-in-use': 'Email này đã có tài khoản, hãy bấm Đăng nhập.', 'auth/invalid-credential': 'Sai email hoặc mật khẩu.', 'auth/wrong-password': 'Sai mật khẩu.', 'auth/user-not-found': 'Chưa có tài khoản này, hãy bấm Tạo tài khoản.', 'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase (Authentication → Sign-in method).', 'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Authorized domains của Firebase.', 'auth/popup-closed-by-user': 'Đã đóng cửa sổ đăng nhập.', 'auth/too-many-requests': 'Thử quá nhiều lần, chờ một lát rồi thử lại.' }[e.code] || e.message);
  const run = p => p.then(() => { ov.remove(); }).catch(e => msg(viErr(e)));
  if (!CL.ok) return;
  if (u) {
    $$('cl-now').onclick = () => cloudPush().then(() => { msg(''); toast('☁️ Đã lưu lên mây'); ov.remove(); });
    $$('cl-out').onclick = async () => { await cloudPush(); await CL.auth.signOut(); localStorage.removeItem(CLOUD_UIDKEY); ov.remove(); toast('Đã đăng xuất. Tiến độ trên máy này vẫn giữ.'); };
    return;
  }
  const em = () => $$('cl-em').value.trim(), pw = () => $$('cl-pw').value;
  $$('cl-in').onclick = () => run(CL.auth.signInWithEmailAndPassword(em(), pw()));
  $$('cl-up').onclick = () => run(CL.auth.createUserWithEmailAndPassword(em(), pw()));
  $$('cl-g').onclick = () => run(CL.auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()));
  $$('cl-reset').onclick = () => { if (!em()) return msg('Nhập email trước.'); CL.auth.sendPasswordResetEmail(em()).then(() => msg('Đã gửi email đặt lại mật khẩu.')).catch(e => msg(viErr(e))); };
  $$('cl-pw').onkeydown = e => { if (e.key === 'Enter') $$('cl-in').click(); };
}

cloudBoot();
cloudBar();
