while ($true) {
    Write-Host "[WIRDAK SERVER] Starting node server.js at $(Get-Date)..." -ForegroundColor Cyan
    try {
        node server.js
    } catch {
        Write-Host "[WIRDAK SERVER ERROR] $_" -ForegroundColor Red
    }
    Write-Host "[WIRDAK SERVER] Exited. Auto-restarting in 2 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}
