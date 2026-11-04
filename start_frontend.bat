@echo off
echo ===================================================
echo Starting TCT TriageCI Frontend (Vite on Port 5173)...
echo ===================================================
cd /d "%~dp0frontend"
node node_modules/vite/bin/vite.js
pause
