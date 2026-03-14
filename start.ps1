# Medical Chatbot - Start All Services
Write-Host "Starting Medical Chatbot..." -ForegroundColor Cyan

# 1. Start PostgreSQL
Write-Host ">> Starting PostgreSQL..." -ForegroundColor Yellow
$pgData = "C:\Users\rabin\scoop\apps\postgresql\current\data"
if (Test-Path $pgData) {
    pg_ctl -D "$pgData" -l "$pgData\logfile" start
    Write-Host "   PostgreSQL started via scoop!" -ForegroundColor Green
} else {
    Start-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($?) { Write-Host "   PostgreSQL started via service!" -ForegroundColor Green }
    else { Write-Host "   PostgreSQL may already be running or service unavailable." -ForegroundColor Gray }
}

# 2. Start Redis
Write-Host ">> Starting Redis..." -ForegroundColor Yellow
if (Get-Command "redis-server" -ErrorAction SilentlyContinue) {
    Start-Process redis-server -WindowStyle Hidden
    Write-Host "   Redis started via scoop!" -ForegroundColor Green
} else {
    Start-Service -Name "Redis*" -ErrorAction SilentlyContinue
    if ($?) { Write-Host "   Redis started via service!" -ForegroundColor Green }
    else { Write-Host "   Redis may already be running or service name differs." -ForegroundColor Gray }
}

Start-Sleep -Seconds 2

# 3. Start NestJS Backend
Write-Host ">> Starting NestJS Backend (port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run start:dev"

# 4. Start Python AI Backend
Write-Host ">> Starting Python AI Backend (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .venv\Scripts\python.exe app.py"

# 5. Wait for backends to initialize before launching frontend
Write-Host ">> Waiting for backends to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 7

# 6. Start React Frontend
Write-Host ">> Starting React Frontend (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host ""
Write-Host "All services starting! Open http://localhost:3000 in your browser." -ForegroundColor Green
