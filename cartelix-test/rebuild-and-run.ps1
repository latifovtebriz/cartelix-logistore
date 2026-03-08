# Fix Backend Build Script
# This script downloads Maven, rebuilds the project to include Postgres driver, and starts the backend.

$MavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
$MavenZip = "maven.zip"
$MavenDir = "maven-bin"

Write-Host "1. Downloading Maven (3.9.6)..." -ForegroundColor Cyan
if (-not (Test-Path "$MavenDir\apache-maven-3.9.6\bin\mvn.cmd")) {
    Invoke-WebRequest -Uri $MavenUrl -OutFile $MavenZip
    Write-Host "2. Extracting Maven..." -ForegroundColor Cyan
    Expand-Archive $MavenZip -DestinationPath $MavenDir -Force
    Remove-Item $MavenZip
}

Write-Host "3. Rebuilding Backend..." -ForegroundColor Cyan
& "$PWD\$MavenDir\apache-maven-3.9.6\bin\mvn.cmd" -f backend\pom.xml clean package -DskipTests

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Successful! Starting Backend..." -ForegroundColor Green
    ./start-backend.ps1
} else {
    Write-Host "Build Failed. Check logs." -ForegroundColor Red
}
