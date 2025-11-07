# Finova Backend Startup Script
Write-Host "🚀 Starting Finova Backend..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please update backend/.env with your DATABASE_URL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Green
    Write-Host "DATABASE_URL=postgresql://user:pass@host:5432/database" -ForegroundColor Gray
    exit 1
}

# Check if database URL is configured
$envContent = Get-Content ".env" -Raw
if ($envContent -match "DATABASE_URL=postgresql://postgres:password@localhost:5432/finova") {
    Write-Host "⚠️  Warning: Using default DATABASE_URL" -ForegroundColor Yellow
    Write-Host "Make sure to update it with your online database URL from Railway/Supabase" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

Write-Host "✅ Environment configured" -ForegroundColor Green

# Run migrations
Write-Host "📊 Running database migrations..." -ForegroundColor Cyan
npm run migrate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations completed" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Starting backend server..." -ForegroundColor Cyan
    Write-Host "Backend will run on: http://localhost:5000" -ForegroundColor Green
    Write-Host ""
    npm run dev
} else {
    Write-Host "❌ Migration failed! Check your DATABASE_URL" -ForegroundColor Red
    Write-Host "Update backend/.env with correct database connection string" -ForegroundColor Yellow
}











