# Medical Chatbot - Stop Background Services
Write-Host "Stopping Medical Chatbot Databases..." -ForegroundColor Cyan

# 1. Stop PostgreSQL (Windows Service)
Write-Host ">> Stopping PostgreSQL..." -ForegroundColor Yellow
Stop-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($?) { Write-Host "   PostgreSQL stopped!" -ForegroundColor Green }
else { Write-Host "   PostgreSQL was not running or service name differs." -ForegroundColor Gray }

# 2. Stop Redis (Windows Service)
Write-Host ">> Stopping Redis..." -ForegroundColor Yellow
Stop-Service -Name "Redis*" -ErrorAction SilentlyContinue
if ($?) { Write-Host "   Redis stopped!" -ForegroundColor Green }
else { Write-Host "   Redis was not running or service name differs." -ForegroundColor Gray }

Write-Host ""
Write-Host "Background databases stopped." -ForegroundColor Green
Write-Host "To stop the web servers, simply close their terminal windows." -ForegroundColor Gray
Start-Sleep -Seconds 5
