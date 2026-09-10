# Starts the backend and frontend dev servers, each in its own window.
# Run from the repo root:  .\dev.ps1
#   -Stop   kill any running dev servers instead of starting

param([switch]$Stop)

$root = $PSScriptRoot

if ($Stop) {
    Get-CimInstance Win32_Process |
        Where-Object { $_.CommandLine -match 'uvicorn app.main|vite --port 5173' } |
        ForEach-Object { Write-Host "stopping PID $($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force }
    return
}

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\server'; .\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"
)

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\client'; npx vite --port 5173"
)

Write-Host "Backend  -> http://localhost:8000  (docs at /docs)"
Write-Host "Frontend -> http://localhost:5173"
Write-Host "Stop both: .\dev.ps1 -Stop"
