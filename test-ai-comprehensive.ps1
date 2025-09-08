# Test multiple predictions với AI Predict Service
$uri = "http://localhost:8084/predict"

# Test case 1: BTCUSDT 1m
Write-Host "=== Test Case 1: BTCUSDT 1m ===" -ForegroundColor Cyan
$sampleData1 = Get-Content ".\test-sample-1m.json" -Raw
try {
    $response1 = Invoke-RestMethod -Uri $uri -Method POST -Body $sampleData1 -ContentType "application/json"
    Write-Host "✅ BTCUSDT 1m: $($response1.result.trend) $($response1.result.change_percent.ToString('F4'))%" -ForegroundColor Green
} catch {
    Write-Host "❌ BTCUSDT 1m failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test case 2: ETHUSDT 1m (tạo sample data ETHUSDT)
Write-Host "`n=== Test Case 2: ETHUSDT 1m ===" -ForegroundColor Cyan
$ethSample = @{
    data = @(
        @{
            symbol = "ETHUSDT"
            interval = "1m"
            open = 3800.5
            high = 3805.2
            low = 3795.1
            close = 3802.3
            volume = 125.5
            close_time = 1756515419999
        },
        @{
            symbol = "ETHUSDT"
            interval = "1m"
            open = 3798.1
            high = 3804.7
            low = 3796.0
            close = 3800.5
            volume = 98.3
            close_time = 1756515359999
        },
        @{
            symbol = "ETHUSDT"
            interval = "1m"
            open = 3795.0
            high = 3800.1
            low = 3793.5
            close = 3798.1
            volume = 87.2
            close_time = 1756515299999
        },
        @{
            symbol = "ETHUSDT"
            interval = "1m"
            open = 3790.0
            high = 3796.5
            low = 3788.1
            close = 3795.0
            volume = 76.8
            close_time = 1756515239999
        },
        @{
            symbol = "ETHUSDT"
            interval = "1m"
            open = 3785.5
            high = 3792.0
            low = 3784.0
            close = 3790.0
            volume = 65.4
            close_time = 1756515179999
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Uri $uri -Method POST -Body $ethSample -ContentType "application/json"
    Write-Host "✅ ETHUSDT 1m: $($response2.result.trend) $($response2.result.change_percent.ToString('F4'))%" -ForegroundColor Green
} catch {
    Write-Host "❌ ETHUSDT 1m failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test performance
Write-Host "`n=== Performance Test ===" -ForegroundColor Cyan
$times = @()
for ($i = 1; $i -le 5; $i++) {
    $start = Get-Date
    try {
        $response = Invoke-RestMethod -Uri $uri -Method POST -Body $sampleData1 -ContentType "application/json"
        $end = Get-Date
        $duration = ($end - $start).TotalMilliseconds
        $times += $duration
        Write-Host "Request ${i}: $($duration.ToString('F0'))ms" -ForegroundColor Yellow
    } catch {
        Write-Host "Request ${i} failed" -ForegroundColor Red
    }
}

if ($times.Count -gt 0) {
    $avgTime = ($times | Measure-Object -Average).Average
    Write-Host "Average response time: $($avgTime.ToString('F0'))ms" -ForegroundColor Green
}

Write-Host "`n=== Health Check ===" -ForegroundColor Cyan
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8084/health" -Method GET
    Write-Host "✅ Health: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Health check failed" -ForegroundColor Red
}
