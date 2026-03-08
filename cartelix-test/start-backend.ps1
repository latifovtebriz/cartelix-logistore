# Local Development - Start Backend with Supabase
# Run this in PowerShell

Write-Host "Starting Backend with Supabase..." -ForegroundColor Green
Write-Host "Logs: backend/backend_startup.log" -ForegroundColor Cyan

cd backend

# Use Start-Process with ArgumentList array to avoid PowerShell parsing issues
$JavaArgs = @(
    "-Dspring.profiles.active=dev",
    "-jar",
    "target/logistore-0.0.1-SNAPSHOT.jar"
)

# Start process in same window but handle I/O correctly
Start-Process java -ArgumentList $JavaArgs -NoNewWindow -RedirectStandardOutput "backend_startup.log" -RedirectStandardError "backend_error.log"

Write-Host "Backend process launched." -ForegroundColor Yellow
