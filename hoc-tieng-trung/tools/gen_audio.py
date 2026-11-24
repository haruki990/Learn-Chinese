"""Tạo file mp3 cho từng từ trong SEED của index.html (id s0, s1, ...).
Chạy: python tools/gen_audio.py   (cần: pip install edge-tts, có internet)
Bỏ qua file đã tồn tại, nên chạy lại an toàn."""
import asyncio, pathlib, re
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "audio"
VOICE = "zh-CN-XiaoxiaoNeural"

html = (ROOT / "index.html").read_text(encoding="utf-8")
seed = re.search(r"const SEED = `(.*?)`;", html, re.S).group(1).strip().splitlines()
seed = [l.strip() for l in seed if l.strip() and not l.strip().startswith("#")]
words = [(f"s{i}", line.split("|")[0]) for i, line in enumerate(seed)]

async def one(sem, wid, text):
    f = OUT / f"{wid}.mp3"
    if f.exists() and f.stat().st_size > 0:
        return
    async with sem:
        for _ in range(3):
            try:
                await edge_tts.Communicate(text, VOICE, rate="-10%").save(str(f))
                return
            except Exception as e:
                err = e
        print("FAIL", wid, text, err)

async def main():
    OUT.mkdir(exist_ok=True)
    sem = asyncio.Semaphore(5)
    await asyncio.gather(*(one(sem, w, t) for w, t in words))
    print("done:", len(list(OUT.glob("*.mp3"))), "/", len(words))

asyncio.run(main())
