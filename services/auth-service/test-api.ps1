# Test Auth Service API
Write-Host "Testing Auth Service API..." -ForegroundColor Green

# Test Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8087/health" -Method GET
    Write-Host "✅ Health Check: $($health.status)" -ForegroundColor Green
    Write-Host "   Service: $($health.service)" -ForegroundColor Cyan
    Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Register API
Write-Host "`n2. Testing Register API..." -ForegroundColor Yellow
$registerData = @{
    firstName = "John"
    lastName = "Doe"
    email = "john@example.com"
    password = "Password123"
    confirmPassword = "Password123"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "http://localhost:8087/api/auth/register" -Method POST -ContentType "application/json" -Body $registerData
    Write-Host "✅ Register Success: $($register.message)" -ForegroundColor Green
    Write-Host "   User ID: $($register.user.id)" -ForegroundColor Cyan
    Write-Host "   Access Token: $($register.tokens.accessToken.Substring(0,20))..." -ForegroundColor Cyan
    
    # Store token for login test
    $global:accessToken = $register.tokens.accessToken
} catch {
    Write-Host "❌ Register Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# Test Login API
Write-Host "`n3. Testing Login API..." -ForegroundColor Yellow
$loginData = @{
    email = "john@example.com"
    password = "Password123"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "http://localhost:8087/api/auth/login" -Method POST -ContentType "application/json" -Body $loginData
    Write-Host "✅ Login Success: $($login.message)" -ForegroundColor Green
    Write-Host "   User: $($login.user.firstName) $($login.user.lastName)" -ForegroundColor Cyan
    Write-Host "   Role: $($login.user.role)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n🎉 API Testing Complete!" -ForegroundColor Green 