@echo off
echo ===================================================
echo Launching TriageCI (Backend + Frontend)
echo ===================================================
start "TriageCI Backend [Port 8000]" cmd /k "%~dp0start_backend.bat"
timeout /t 2 >nul
start "TriageCI Frontend [Port 5173]" cmd /k "%~dp0start_frontend.bat"
echo.
echo TriageCI services launched!
echo - Web Dashboard: http://localhost:5173
echo - API Server:    http://localhost:8000
echo - Swagger Docs:  http://localhost:8000/docs
echo - PostgreSQL DB: localhost:5434 (WSL Docker)
echo - Prisma Studio: http://localhost:5555 (run start_prisma_studio.bat)
echo ===================================================
