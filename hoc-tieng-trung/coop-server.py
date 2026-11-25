# -*- coding: utf-8 -*-
"""Server phòng boss LAN cho game học tiếng Trung (chỉ dùng thư viện chuẩn của Python).

Chạy trên máy làm chủ phòng:  python coop-server.py   (hoặc nhấp đúp start-coop.bat)
- Phục vụ luôn các file game, nên máy khác cũng có thể mở http://<IP>:8770/index.html
- API JSON (POST body là JSON dạng text/plain để trình duyệt không cần preflight):
    /api/join   {room,name,char,xp,ri}      -> {pid}
    /api/state  {room,pid,name,char,xp,ri}  -> trạng thái phòng
    /api/start  {room,pid}                  -> bắt đầu trận (boss theo người tu vi cao nhất)
    /api/hit    {room,pid,dmg,round}        -> trừ máu boss
    /api/leave  {room,pid}
"""
import json, os, random, socket, sys, threading, time, uuid
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
HOST = sys.argv[2] if len(sys.argv) > 2 else '0.0.0.0'   # 0.0.0.0 = cho máy khác trong mạng LAN vào
FIGHT_SEC = 150                      # thời gian mỗi trận
BOSS_HP = [2000, 4800, 8400, 13000, 19000, 27000, 36000, 48000, 64000]  # như GCFG.bossHp trong rpg.js
BOSS_COUNT = 16                      # số quái trong GBOSS
HP_PER_PLAYER = 0.6                  # mỗi người thêm vào phòng: máu boss +60%
IDLE_SEC = 15                        # quá 15 giây không thấy người chơi thì coi như đã rời phòng

ROOMS = {}
LOCK = threading.Lock()


def room_of(code):
    code = (str(code or 'phong1').strip() or 'phong1')[:12]
    r = ROOMS.get(code)
    if r is None:
        r = ROOMS[code] = {'players': {}, 'phase': 'lobby', 'round': 0, 'boss': 0, 'ri': 0,
                           'max': 0, 'hp': 0, 'ends': 0, 'result': None}
    return r


def touch(r, b):
    pid = b.get('pid')
    p = r['players'].get(pid)
    if p is None:
        return None
    for k in ('name', 'char', 'xp', 'ri'):
        if k in b:
            p[k] = b[k]
    p['name'] = str(p.get('name') or 'Đạo hữu')[:16]
    p['ri'] = max(0, min(len(BOSS_HP) - 1, int(p.get('ri') or 0)))
    p['xp'] = int(p.get('xp') or 0)
    p['seen'] = time.time()
    return p


def tick(r):
    now = time.time()
    for pid in [k for k, p in r['players'].items() if now - p['seen'] > IDLE_SEC]:
        del r['players'][pid]
    if r['phase'] == 'fight' and (r['hp'] <= 0 or now >= r['ends'] or not r['players']):
        win = r['hp'] <= 0
        board = sorted(({'name': p['name'], 'dmg': p['dmg']} for p in r['players'].values()), key=lambda x: -x['dmg'])
        r['phase'] = 'done'
        r['result'] = {'win': win, 'boss': r['boss'], 'max': r['max'], 'board': board, 'round': r['round']}


def public(r, pid):
    return {'phase': r['phase'], 'round': r['round'], 'boss': r['boss'], 'ri': r['ri'], 'max': r['max'], 'hp': max(0, r['hp']),
            'left': int(max(0, r['ends'] - time.time()) * 1000) if r['phase'] == 'fight' else 0, 'result': r['result'],
            'players': [{'pid': k, 'name': p['name'], 'char': p.get('char', 'kiem'), 'xp': p['xp'], 'ri': p['ri'], 'dmg': p['dmg']}
                        for k, p in r['players'].items()], 'me': pid}


def api(path, b):
    with LOCK:
        r = room_of(b.get('room'))
        tick(r)
        if path == 'join':
            pid = uuid.uuid4().hex[:10]
            r['players'][pid] = {'dmg': 0, 'seen': time.time()}
            b['pid'] = pid
            touch(r, b)
            return {'pid': pid}
        p = touch(r, b)
        if p is None:
            return {'error': 'Bạn chưa vào phòng hoặc đã bị ngắt kết nối, hãy vào lại.'}
        if path == 'state':
            return public(r, b.get('pid'))
        if path == 'start':
            if r['phase'] == 'fight':
                return public(r, b.get('pid'))
            top = max(r['players'].values(), key=lambda x: x['xp'])  # boss theo người tu vi cao nhất
            n = len(r['players'])
            r.update(phase='fight', round=r['round'] + 1, boss=random.randrange(BOSS_COUNT), ri=top['ri'],
                     ends=time.time() + FIGHT_SEC, result=None)
            r['max'] = r['hp'] = int(BOSS_HP[top['ri']] * (1 + HP_PER_PLAYER * (n - 1)))
            for q in r['players'].values():
                q['dmg'] = 0
            return public(r, b.get('pid'))
        if path == 'hit':
            if r['phase'] == 'fight' and int(b.get('round') or 0) == r['round']:
                dmg = max(0, min(int(b.get('dmg') or 0), int(r['max'] * 0.25)))  # chặn số sát thương bất thường
                r['hp'] -= dmg
                p['dmg'] += dmg
                tick(r)
            return public(r, b.get('pid'))
        if path == 'leave':
            r['players'].pop(b.get('pid'), None)
            return {'ok': True}
    return {'error': 'Sai đường dẫn'}


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=os.path.dirname(os.path.abspath(__file__)), **k)

    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')

    def end_headers(self):
        if self.path.startswith('/api/'):
            self.cors()
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        if not self.path.startswith('/api/'):
            self.cors()
        self.end_headers()

    def do_POST(self):
        if not self.path.startswith('/api/'):
            return self.send_error(404)
        try:
            n = int(self.headers.get('Content-Length') or 0)
            b = json.loads(self.rfile.read(n).decode('utf-8') or '{}')
            out = api(self.path[5:].split('?')[0].strip('/'), b if isinstance(b, dict) else {})
        except Exception as e:  # noqa
            out = {'error': str(e)}
        data = json.dumps(out, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass  # giữ cửa sổ gọn


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))  # không gửi gói tin nào, chỉ để biết card mạng LAN
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


if __name__ == '__main__':
    srv = ThreadingHTTPServer((HOST, PORT), H)
    ip = lan_ip()
    print('=' * 56)
    print(' Phong boss LAN dang chay (dong cua so nay de tat)')
    print(f' May nay nhap:      http://127.0.0.1:{PORT}')
    print(f' May khac nhap:     http://{ip}:{PORT}')
    print(f' (hoac mo game qua: http://{ip}:{PORT}/index.html)')
    print(' Neu Windows hoi tuong lua: cho phep Python tren mang Rieng tu (Private).')
    print('=' * 56)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
