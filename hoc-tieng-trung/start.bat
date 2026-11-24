@echo off
rem Chay app hoc tieng Trung bang server cuc bo (can Python). Dong cua so nay de tat server.
cd /d "%~dp0"
start "" http://127.0.0.1:8765/index.html
python -m http.server 8765 --bind 127.0.0.1
