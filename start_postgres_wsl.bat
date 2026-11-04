@echo off
echo ============================================================
echo Starting TCT TriageCI PostgreSQL via WSL Docker (Port 5434)
echo ============================================================
wsl -d RockyLinux-10.1 bash -c "cd '$(wslpath '%~dp0')' && ./scripts/wsl-docker.sh start"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Defaulting to default WSL distribution...
    wsl bash -c "cd '$(wslpath '%~dp0')' && ./scripts/wsl-docker.sh start"
)
pause
