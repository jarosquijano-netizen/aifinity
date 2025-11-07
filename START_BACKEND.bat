@echo off
echo ========================================
echo   Start Backend Server (Port 5000)
echo ========================================
echo.

echo [1/2] Stopping any existing backend processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/2] Starting Backend Server on port 5000...
cd backend
start "AiFinity Backend" cmd /k "npm run dev"

echo.
echo ========================================
echo   ✅ Backend Server Starting!
echo ========================================
echo.
echo   Backend will run on: http://localhost:5000
echo   Wait a few seconds for server to start...
echo.
echo   Press any key to close this window...
pause >nul

