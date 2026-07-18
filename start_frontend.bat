@echo off
echo ============================================================
echo  SmartCity AI - Frontend Dev Server
echo ============================================================
echo.
echo Starting Vite frontend on http://localhost:5173 ...
echo.
cd /d "%~dp0frontend"
npm run dev
pause
