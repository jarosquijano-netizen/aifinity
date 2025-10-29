# Finova Frontend Startup Script
Write-Host "🎨 Starting Finova Frontend..." -ForegroundColor Cyan

# Navigate to frontend directory
Set-Location -Path "$PSScriptRoot\frontend"

Write-Host "✅ Starting Vite development server..." -ForegroundColor Green
Write-Host "Frontend will run on: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm run dev








