@echo off
title OmniCart Platform Launcher
echo ===================================================
echo           Starting OmniCart Platform
echo ===================================================
echo.

echo Cleaning up previously running port listeners (8080, 5000, 3000)...
for %%p in (8080 5000 3000) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p" ^| findstr "LISTENING"') do (
        taskkill /f /pid %%a >nul 2>&1
    )
)
timeout /t 1 /nobreak >nul

echo [1/3] Starting Spring Boot Backend on Port 8080...
start "OmniCart - Spring Boot Backend (Port 8080)" cmd /k "cd omnicart-backend && mvnw.cmd spring-boot:run"

echo [2/3] Starting Python Visual Search AI on Port 5000...
start "OmniCart - Visual Search AI (Port 5000)" cmd /k "cd /d "%~dp0Visual Search" && set KMP_DUPLICATE_LIB_OK=TRUE && python app.py"

echo [3/3] Starting Frontend HTTP Server on Port 3000...
start "OmniCart - Frontend Web Server (Port 3000)" cmd /k "cd omnicart-frontend && python server.py 3000"

echo.
echo Launching browser in 4 seconds...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo ===================================================
echo  All OmniCart services launched!
echo  - Frontend Web App:  http://localhost:3000
echo  - Spring Boot API:   http://localhost:8080
echo  - Swagger UI Docs:   http://localhost:8080/swagger-ui.html
echo  - Visual Search AI:  http://127.0.0.1:5000/api/health
echo ===================================================
pause
