@echo off
echo ========================================================
echo Launching TCT TriageCI Next.js Full-Stack (tct-triage-ci)
echo ========================================================
echo.
echo Database: Local SQLite (triageci.db) or Neon PostgreSQL (via DATABASE_URL in .env)
echo Starting Next.js with Bun...
echo Dashboard ^& API: http://localhost:3000
echo.
bun run dev
