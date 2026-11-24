"""Gom audio/*.mp3 thành audio-data.js (window.AUDIO = {id: "data:audio/mpeg;base64,..."}).
Chạy sau tools/gen_audio.py:  python tools/build_audio_data.py"""
import base64, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
files = sorted((ROOT / "audio").glob("s*.mp3"), key=lambda f: int(re.sub(r"\D", "", f.stem)))
data = {f.stem: "data:audio/mpeg;base64," + base64.b64encode(f.read_bytes()).decode() for f in files if f.stat().st_size > 0}
(ROOT / "audio-data.js").write_text("window.AUDIO=" + json.dumps(data, separators=(",", ":")) + ";\n", encoding="utf-8")
print("audio-data.js:", len(data), "file mp3")
