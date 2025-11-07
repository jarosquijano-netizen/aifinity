@echo off
echo ========================================
echo   Kill Process on Port 5002
echo ========================================
echo.

echo Checking for processes on port 5002...
netstat -ano | findstr :5002
if %errorlevel% equ 0 (
    echo.
    echo Found process(es) using port 5002
    echo Killing process(es)...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5002 ^| findstr LISTENING') do (
        echo Killing process %%a...
        taskkill /F /PID %%a >nul 2>&1
    )
    echo.
    echo ✅ Port 5002 is now free!
    timeout /t 2 /nobreak >nul
) else (
    echo No process found on port 5002
)

echo.
pause

