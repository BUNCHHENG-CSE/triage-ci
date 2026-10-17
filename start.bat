@echo off
echo ===================================================
echo Launching TriageCI (Backend + Frontend)
echo ===================================================
start "TriageCI Backend [Port 8000]" cmd /k "%~dp0start_backend.bat"
timeout /t 2 >nul
start "TriageCI Frontend [Port 5173]" cmd /k "%~dp0start_frontend.bat"
echo.
echo TriageCI services launched!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo ===================================================
