while ($true) {
    Write-Host "[WIRDAK TUNNEL] Starting cloudflared tunnel at $(Get-Date)..." -ForegroundColor Cyan
    try {
        cloudflared tunnel --protocol http2 --edge-ip-version auto --url http://127.0.0.1:5174
    } catch {
        Write-Host "[WIRDAK TUNNEL ERROR] $_" -ForegroundColor Red
    }
    Write-Host "[WIRDAK TUNNEL] Exited. Auto-reconnecting in 3 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
