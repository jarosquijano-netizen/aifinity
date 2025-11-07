@echo off
echo ========================================
echo QA/UAT Sanity Check Test Runner
echo ========================================
echo.

REM Check if backend server is running
echo Checking if backend server is running...
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Backend server is not running!
    echo.
    echo Please start the backend server first:
    echo   1. Open a new terminal
    echo   2. cd backend
    echo   3. npm run dev
    echo.
    echo Press any key to continue anyway (tests will fail)...
    pause >nul
)

echo.
echo Running QA/UAT Sanity Check Tests...
echo.

cd backend
if %errorlevel% neq 0 (
    echo Error: Could not change to backend directory
    pause
    exit /b 1
)

npm run test:qa

echo.
echo ========================================
echo Tests completed!
echo ========================================
pause

