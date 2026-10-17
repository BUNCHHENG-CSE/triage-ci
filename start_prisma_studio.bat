@echo off
echo ========================================================
echo Launching Prisma Studio (Visual Database GUI on Port 5555)
echo ========================================================
node node_modules/prisma/build/index.js studio --port 5555
pause
