# OmniCart Database Initializer
$ErrorActionPreference = "Stop"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       OmniCart Database Setup / Re-seeder        " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Find MySQL executable
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 9.2\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 26.7\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "mysql.exe"
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $mysqlExe = $path
        break
    }
}

if (-not $mysqlExe) {
    # Try searching MySQL directory
    $found = Get-ChildItem "C:\Program Files\MySQL" -Recurse -Filter "mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($found) {
        $mysqlExe = $found
    }
}

if (-not $mysqlExe) {
    Write-Host "[ERROR] Could not locate mysql.exe! Please ensure MySQL Server is installed." -ForegroundColor Red
    exit 1
}

Write-Host "Using MySQL: $mysqlExe" -ForegroundColor Gray

$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

$dbUser = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "root" }
$dbPass = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "root" }

$sqlFiles = @(
    "omnicart_db/01_schema.sql",
    "omnicart_db/02_indexes.sql",
    "omnicart_db/04_functions.sql",
    "omnicart_db/03_views.sql",
    "omnicart_db/05_procedures.sql",
    "omnicart_db/06_triggers.sql",
    "omnicart_db/07_seed_data.sql"
)

foreach ($file in $sqlFiles) {
    $fullPath = Join-Path $rootDir $file
    if (Test-Path $fullPath) {
        $fileName = Split-Path $fullPath -Leaf
        Write-Host "Executing $fileName..." -ForegroundColor Yellow
        $sqlNormalized = $fullPath.Replace("\", "/")
        & $mysqlExe -u $dbUser "-p$dbPass" -e "SOURCE $sqlNormalized"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Failed executing $fileName (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } else {
        Write-Host "[WARN] File not found: $fullPath" -ForegroundColor Magenta
    }
}

Write-Host ""
Write-Host "Database initialization completed successfully!" -ForegroundColor Green
Write-Host "Connected to OmniCartDB as $dbUser." -ForegroundColor Green
