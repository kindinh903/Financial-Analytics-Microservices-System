# Test AI Predict Service với dữ liệu 1m
$uri = "http://localhost:8084/predict"
$sampleJsonPath = ".\test-sample-1m.json"

# Đọc sample data
$sampleData = Get-Content $sampleJsonPath -Raw

# Gửi POST request
try {
    Write-Host "Testing AI Predict Service với BTCUSDT 1m..."
    Write-Host "URI: $uri"
    
    $response = Invoke-RestMethod -Uri $uri -Method POST -Body $sampleData -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body:" $responseBody
    }
}
