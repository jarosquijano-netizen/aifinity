                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                @echo off
echo ========================================
echo   Starting AiFinity.app Localhost
echo ========================================
echo.

echo [1/3] Stopping old processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend (Port 5002)...
start "AiFinity Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend (Port 5173)...
start "AiFinity Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   ✅ AiFinity.app Started!
echo ========================================
echo.
echo   Backend:  http://localhost:5002
echo   Frontend: http://localhost:5173
echo.
echo   Wait 10 seconds, then open:
echo   👉 http://localhost:5173
echo.
echo   Press any key to open browser...
pause >nul

start http://localhost:5173

exit

