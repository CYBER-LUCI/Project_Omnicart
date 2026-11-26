Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Starting OmniCart Platform               " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Function to safely free occupied ports
function Free-Port([int]$port) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -and $conn.OwningProcess -gt 4) {
            Write-Host "Freeing port $port (PID: $($conn.OwningProcess))..." -ForegroundColor DarkGray
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# Free ports before starting
Free-Port 8080
Free-Port 5000
Free-Port 3000
Start-Sleep -Milliseconds 800

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

# 1. Start Spring Boot Backend
Write-Host "[1/3] Starting Spring Boot Backend (Port 8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\omnicart-backend'; .\mvnw.cmd spring-boot:run" -WorkingDirectory "$rootDir\omnicart-backend"

# 2. Start Python Visual Search
Write-Host "[2/3] Starting Visual Search Microservice (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:KMP_DUPLICATE_LIB_OK='TRUE'; Set-Location '$rootDir\Visual Search'; python app.py" -WorkingDirectory "$rootDir\Visual Search"

# 3. Start Frontend Web Server
Write-Host "[3/3] Starting Frontend Web Server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\omnicart-frontend'; python server.py 3000" -WorkingDirectory "$rootDir\omnicart-frontend"

Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  All OmniCart services launched!                  " -ForegroundColor Green
Write-Host "  - Frontend Web App:  http://localhost:3000       " -ForegroundColor White
Write-Host "  - Spring Boot API:   http://localhost:8080       " -ForegroundColor White
Write-Host "  - Swagger UI Docs:   http://localhost:8080/swagger-ui.html" -ForegroundColor White
Write-Host "  - Visual Search AI:  http://127.0.0.1:5000/api/health" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
