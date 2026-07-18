@echo off
echo ============================================================
echo  SmartCity AI - Backend Server
echo ============================================================
echo.
echo Starting FastAPI backend on http://localhost:8000 ...
echo API Docs available at: http://localhost:8000/docs
echo.
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
