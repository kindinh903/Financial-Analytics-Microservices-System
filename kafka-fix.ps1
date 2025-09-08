# Simple Kafka fix script for Windows
# Run this whenever Kafka has Cluster ID mismatch issues

Write-Host "Fixing Kafka Cluster ID mismatch..." -ForegroundColor Yellow

# Stop all services
Write-Host "Stopping all services..." -ForegroundColor Blue
docker-compose down

# Remove Kafka data volume
Write-Host "Removing Kafka data volume..." -ForegroundColor Blue
docker volume rm financial-analytics-microservices-system_kafka-data 2>$null

# Start services again
Write-Host "Starting services with fresh Kafka data..." -ForegroundColor Blue
docker-compose up -d

Write-Host "Kafka reset complete! All services restarted." -ForegroundColor Green
Write-Host "Check status with: docker-compose ps" -ForegroundColor Cyan
