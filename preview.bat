@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo プレビュー: http://localhost:8000/  (終了は Ctrl+C)
start "" http://localhost:8000/
where py >nul 2>nul && (py -m http.server 8000) || (where python >nul 2>nul && python -m http.server 8000) || npx --yes serve -l 8000 .
